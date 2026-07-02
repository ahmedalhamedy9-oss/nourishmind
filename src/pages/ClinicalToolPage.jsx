import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { computeMetrics, renderMetrics, disorderKey, renderFormularyBlock, computeSafetyFlags, renderSafetyGate, FORMULARY_VERSION, FORMULARY } from '@/lib/clinicalFormulary';
import { renderInteractionGate, renderInteractionsReport, renderInteractionsReportSplit, recommendedDrugNames, INTERACTIONS_ACTIVE, INTERACTIONS_VERSION } from '@/lib/interactions';
import { renderComorbidityReport, comorbidDrugNames, renderComorbidityHTML } from '@/lib/comorbidityEngine';
import { renderMedicalComorbidityReport, MEDCOMORBID_ACTIVE } from '@/lib/medicalComorbidityEngine';
import { renderRxMedications, renderRxMedicationsHTML, renderRxLabs, renderRxExcluded, renderRxTherapy, renderRxFollowup, renderTechniqueLibrary, renderVagalToning } from '@/lib/rxRender';
import { renderNutritionDiet, renderNutritionSupplements } from '@/lib/nutritionFormulary';
import { renderMacrosAndMeals, renderPsychobioticsFor } from '@/lib/mealPlanEngine';
import { renderDynamicLabs } from '@/lib/labEngine';
import { renderLabsHTML, renderExcludedHTML, renderSupplementsHTML, renderDietHTML, renderTherapyHTML, renderFollowupHTML, renderBodycompHTML, renderInteractionsHTML, renderChronoHTML, renderSummaryHTML, wrapReportHTML } from '@/lib/reportRender';
import { renderChrono } from '@/lib/chronoEngine';
import { renderDrugDataGate, DRUGDATA_ACTIVE, DRUGDATA_VERSION } from '@/lib/drugData';
import { logGeneration } from '@/lib/audit';
import Header from '@/components/Header';

/* ════════════════════════════════════════════════
   ACCESS GUARD
════════════════════════════════════════════════ */
const TOOL_ID = 'clinical';

const useClinicalAccess = () => {
  const { currentUser, isAdmin } = useAuth();
  const [status, setStatus] = useState('loading');
  useEffect(() => {
    if (!currentUser) { setStatus('no_account'); return; }
    if (isAdmin)      { setStatus('granted');    return; }
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', currentUser.uid));
        if (!snap.exists()) { if (!cancelled) setStatus('no_access'); return; }
        const userData = snap.data();
        const userTools = userData.clinicalTools || [];
        const toolsSnap = await getDocs(collection(db, 'tools'));
        const clinicalToolIds = toolsSnap.docs
          .filter(d => d.data().path === '/tools/clinical')
          .map(d => d.id);
        if (userTools.some(tid => clinicalToolIds.includes(tid))) {
          if (!cancelled) setStatus('granted'); return;
        }
        if (!cancelled) setStatus('no_access');
      } catch { if (!cancelled) setStatus('no_access'); }
    })();
    return () => { cancelled = true; };
  }, [currentUser, isAdmin]);
  return status;
};

/* ════════════════════════════════════════════════
   SYSTEM PROMPTS (EN / AR)
════════════════════════════════════════════════ */
const SYSTEM_PROMPT_EN = `You are a clinical assistant specializing exclusively in five psychiatric disorders: Major Depressive Disorder (MDD), Generalized Anxiety Disorder (GAD), Obsessive-Compulsive Disorder (OCD), Borderline Personality Disorder (BPD), and Premenstrual Dysphoric Disorder (PMDD).
You assist physicians, mental health specialists, and nutrition specialists only.
Strict rules:
- Do not answer any question outside these five disorders
- All recommendations are based on the latest guidelines: APA, NICE, CANMAT, BAP
- Always add a disclaimer that the final decision belongs to the treating physician
- Use scientific drug names with the trade name in parentheses
- Mention the level of scientific evidence (Level A/B/C) when making recommendations
- Respond in English using precise medical terminology
- Do not provide a final diagnosis`;

const SYSTEM_PROMPT_AR = `أنت مساعد سريري متخصص حصراً في خمسة اضطرابات نفسية: الاكتئاب الاكلينيكي (MDD)، اضطراب القلق العام (GAD)، الوسواس القهري (OCD)، اضطراب الشخصية الحدية (BPD)، والاضطراب المزعج ما قبل الطمث (PMDD).
أنت تساعد الأطباء وأخصائيي الصحة النفسية وأخصائيي التغذية فقط.
قواعد صارمة:
- لا تجيب على أي سؤال خارج نطاق هذه الاضطرابات الخمسة
- كل توصياتك مبنية على أحدث الإرشادات: APA، NICE، CANMAT، BAP
- دائماً أضف تنبيهاً بأن القرار النهائي للطبيب المعالج
- استخدم الأسماء العلمية للأدوية مع الاسم التجاري بين قوسين
- اذكر مستوى الدليل العلمي (Level A/B/C) عند التوصية
- الردود باللغة العربية مع الاصطلاحات الطبية الدقيقة
- لا تقدم تشخيصاً نهائياً`;

const ALL_TAGS = "MEDICATIONS|LABS|BODYCOMP|DIET|CHRONO|NUTRIGENOMICS|SUPPLEMENTS|INTERACTIONS|THERAPY|EXCLUDED";

async function callClaude(prompt, lang = 'en') {
  const systemPrompt = lang === 'ar' ? SYSTEM_PROMPT_AR : SYSTEM_PROMPT_EN;
  const r = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      temperature: 0,
      max_tokens: 24000,
      thinking: { type: 'disabled' },
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!r.ok) { const e = await r.json(); throw new Error(e.error?.message || 'Connection error'); }
  const d = await r.json();
  return d.content[0].text;
}

/* ════════════════════════════════════════════════
   STRUCTURED OUTPUT (#1)
   The model is FORCED to call clinical_report, so the
   report comes back as a validated JSON object instead
   of free-text [TAGS] parsed by regex. Locked sections
   (meds/excluded/therapy/chrono/bodycomp/diet) are still
   copied verbatim from the injected formulary.
════════════════════════════════════════════════ */
const REPORT_TOOL = {
  name: 'clinical_report',
  description:
    'Return the full physician-only clinical report. Populate EVERY field. For medications, ' +
    'excluded, therapy, chrono, bodycomp and diet you MUST copy the LOCKED FORMULARY and ' +
    'PRE-COMPUTED METRICS from the case data verbatim — do not add, omit, re-grade, reclassify ' +
    'or recalculate. Labs, nutrigenomics and interactions follow standard APA/NICE/CANMAT/BAP ' +
    'guidelines. Nothing in medications or supplements may also appear in excluded. Never leave ' +
    'an array empty; if nothing truly applies, add one item explaining why.',
  input_schema: {
    type: 'object',
    properties: {
      medications: {
        type: 'array',
        description: 'Locked first-line / adjunct medications, verbatim from the formulary.',
        items: {
          type: 'object',
          properties: {
            drug: { type: 'string', description: 'Scientific name (trade name in parentheses).' },
            line: { type: 'string', description: 'e.g. first-line, adjunct, second-line.' },
            dose: { type: 'string', description: 'Weight-based dose / titration.' },
            evidence: { type: 'string', description: 'Evidence level A/B/C.' },
            notes: { type: 'string', description: 'Switching steps or key caveats. May be empty.' },
          },
          required: ['drug', 'line', 'dose', 'evidence'],
        },
      },
      labs: {
        type: 'array',
        description: 'Required labs with rationale, grouped by category.',
        items: {
          type: 'object',
          properties: {
            category: { type: 'string', description: 'Basic / Micronutrients / Hormonal / Specialized.' },
            test: { type: 'string' },
            rationale: { type: 'string' },
          },
          required: ['category', 'test', 'rationale'],
        },
      },
      bodycomp: { type: 'string', description: 'DEXA/InBody analysis or required metrics — use the pre-computed numbers verbatim.' },
      diet: { type: 'string', description: 'Dietary plan; use the pre-computed calorie/protein targets verbatim.' },
      chrono: { type: 'string', description: 'Chrononutrition: present the LOCKED timing principle verbatim (e.g. early-TRE / phase-advance / luteal-conditional). Do NOT invent a specific clock window.' },
      nutrigenomics: {
        type: 'array',
        description: 'Relevant SNPs and recommendations.',
        items: {
          type: 'object',
          properties: {
            snp: { type: 'string' },
            relevance: { type: 'string' },
            recommendation: { type: 'string' },
          },
          required: ['snp', 'relevance'],
        },
      },
      supplements: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            dose: { type: 'string' },
            timing: { type: 'string' },
            form: { type: 'string', description: 'e.g. glycinate, methylfolate.' },
            evidence: { type: 'string', description: 'Evidence level A/B/C.' },
            notes: { type: 'string' },
          },
          required: ['name', 'dose'],
        },
      },
      interactions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'drug-drug / drug-food / supplement-drug.' },
            items: { type: 'string', description: 'The interacting pair/group.' },
            severity: { type: 'string', description: 'minor / moderate / major.' },
            note: { type: 'string' },
          },
          required: ['type', 'items', 'note'],
        },
      },
      therapy: {
        type: 'array',
        description: 'Therapeutic schools in locked priority order.',
        items: {
          type: 'object',
          properties: {
            approach: { type: 'string', description: 'CBT/DBT/ACT/Schema/GPM/ERP etc.' },
            priority: { type: 'string', description: 'Priority order, e.g. 1, 2, 3.' },
            evidence: { type: 'string', description: 'Evidence level A/B/C.' },
            notes: { type: 'string' },
          },
          required: ['approach', 'priority', 'evidence'],
        },
      },
      excluded: {
        type: 'array',
        description: 'ONLY the locked excluded items, each with a reason.',
        items: {
          type: 'object',
          properties: {
            item: { type: 'string' },
            reason: { type: 'string' },
          },
          required: ['item', 'reason'],
        },
      },
    },
    required: ['medications', 'labs', 'bodycomp', 'diet', 'chrono', 'nutrigenomics', 'supplements', 'interactions', 'therapy', 'excluded'],
  },
};

const REPORT_KEYS = ['medications', 'labs', 'bodycomp', 'diet', 'chrono', 'nutrigenomics', 'supplements', 'interactions', 'therapy', 'excluded'];
const ARRAY_KEYS  = ['medications', 'labs', 'nutrigenomics', 'supplements', 'interactions', 'therapy', 'excluded'];

async function callClaudeStructured(prompt, lang = 'en') {
  const systemPrompt = lang === 'ar' ? SYSTEM_PROMPT_AR : SYSTEM_PROMPT_EN;
  const r = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      temperature: 0,
      max_tokens: 24000,
      thinking: { type: 'disabled' },
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
      tools: [REPORT_TOOL],
      tool_choice: { type: 'tool', name: REPORT_TOOL.name },
    }),
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error?.message || 'Connection error'); }
  const d = await r.json();
  if (d.stop_reason === 'max_tokens') throw new Error('structured_truncated');
  const block = Array.isArray(d.content) && d.content.find(b => b.type === 'tool_use' && b.name === REPORT_TOOL.name);
  if (!block || !block.input || typeof block.input !== 'object') throw new Error('structured_missing_tool_use');
  return block.input;
}

// Guard: object with all 10 keys, correct types, and some real array content.
function validStructured(s) {
  if (!s || typeof s !== 'object') return false;
  for (const k of REPORT_KEYS) {
    if (!(k in s)) return false;
    if (ARRAY_KEYS.includes(k)) { if (!Array.isArray(s[k])) return false; }
    else if (typeof s[k] !== 'string') return false;
  }
  const arrCount = ARRAY_KEYS.reduce((n, k) => n + (Array.isArray(s[k]) ? s[k].length : 0), 0);
  return arrCount > 0;
}

// Deterministically render the structured object into the {id: string} shape the
// existing UI tabs and PDF generator already consume. Tables are drawn by us, never
// hand-drawn by the model — so a broken/truncated table is no longer possible.
function renderStructured(s, isAr) {
  const L = isAr
    ? { dose: 'الجرعة', level: 'الدليل', timing: 'التوقيت', form: 'الصيغة', severity: 'الخطورة', priority: 'الأولوية', none: '—' }
    : { dose: 'Dose', level: 'Level', timing: 'Timing', form: 'Form', severity: 'Severity', priority: 'Priority', none: '—' };
  const out = {};

  out.medications = (s.medications || []).map(m =>
    `**${m.drug}** (${m.line}${m.evidence ? `, ${L.level} ${m.evidence}` : ''})\n`
    + `${L.dose}: ${m.dose}` + (m.notes ? `\n${m.notes}` : '')
  ).join('\n\n');

  // group labs by category — header line + "- test — rationale" (PDF extractor compatible)
  const byCat = {};
  (s.labs || []).forEach(l => { (byCat[l.category] = byCat[l.category] || []).push(l); });
  out.labs = Object.entries(byCat).map(([cat, rows]) =>
    `${cat}\n` + rows.map(l => `- ${l.test} — ${l.rationale}`).join('\n')
  ).join('\n\n');

  out.bodycomp = s.bodycomp || L.none;
  out.diet     = s.diet || L.none;
  out.chrono   = s.chrono || L.none;

  out.nutrigenomics = (s.nutrigenomics || []).map(n =>
    `**${n.snp}**` + (n.relevance ? ` — ${n.relevance}` : '') + (n.recommendation ? `\n${n.recommendation}` : '')
  ).join('\n\n');

  // each supplement: name line, then a clean "Dose:" line (PDF extractor reads this)
  out.supplements = (s.supplements || []).map(sup => {
    const meta = [
      sup.timing ? `${L.timing}: ${sup.timing}` : '',
      sup.form ? `${L.form}: ${sup.form}` : '',
      sup.evidence ? `${L.level}: ${sup.evidence}` : '',
    ].filter(Boolean).join(' | ');
    return `**${sup.name}**\n${L.dose}: ${sup.dose}`
      + (meta ? `\n${meta}` : '')
      + (sup.notes ? `\n${sup.notes}` : '');
  }).join('\n\n');

  out.interactions = (s.interactions || []).map(i =>
    `- [${i.type}] ${i.items}: ${i.note}` + (i.severity ? ` (${L.severity}: ${i.severity})` : '')
  ).join('\n');

  out.therapy = (s.therapy || []).map(t =>
    `**${t.approach}** (${L.priority} ${t.priority}${t.evidence ? `, ${L.level} ${t.evidence}` : ''})`
    + (t.notes ? `\n${t.notes}` : '')
  ).join('\n\n');

  out.excluded = (s.excluded || []).map(e => `- ${e.item}: ${e.reason}`).join('\n');

  return out;
}

/* ════════════════════════════════════════════════
   CONSTANTS
════════════════════════════════════════════════ */
const DISORDERS = [
  'Major Depressive Disorder (MDD)',
  'Generalized Anxiety Disorder (GAD)',
  'Obsessive-Compulsive Disorder (OCD)',
  'Borderline Personality Disorder (BPD)',
  'Premenstrual Dysphoric Disorder (PMDD)',
];

const SECTIONS_EN = [
  { id:'summary',       icon:'🧭', title:'Executive Summary',          color:'#e0663d' },
  { id:'medications',   icon:'💊', title:'Medication Recommendations', color:'#4a9b8e' },
  { id:'labs',          icon:'🧪', title:'Required Lab Tests',         color:'#5bb8c4' },
  { id:'bodycomp',      icon:'📊', title:'DEXA / InBody',              color:'#8b5cf6' },
  { id:'diet',          icon:'🥗', title:'Dietary Plan',               color:'#4a9b8e' },
  { id:'chrono',        icon:'🕐', title:'Circadian & Chronotherapy',  color:'#f59e0b' },
  { id:'nutrigenomics', icon:'🧬', title:'Nutrigenomics',              color:'#ec4899' },
  { id:'supplements',   icon:'🧴', title:'Supplements',                color:'#5bb8c4' },
  { id:'interactions',  icon:'⚠️', title:'Interactions',               color:'#ef4444' },
  { id:'comorbidity',   icon:'🔗', title:'Comorbidity Plan',           color:'#0ea5e9' },
  { id:'therapy',       icon:'🧠', title:'Therapeutic Approaches',     color:'#8b5cf6' },
  { id:'followup',      icon:'📋', title:'Follow-up & Safety',         color:'#10b981' },
  { id:'excluded',      icon:'🚫', title:'Excluded Options',           color:'#64748b' },
];

const SECTIONS_AR = [
  { id:'summary',       icon:'🧭', title:'الملخص التنفيذي',        color:'#e0663d' },
  { id:'medications',   icon:'💊', title:'التوصيات الدوائية',     color:'#4a9b8e' },
  { id:'labs',          icon:'🧪', title:'التحاليل المطلوبة',     color:'#5bb8c4' },
  { id:'bodycomp',      icon:'📊', title:'DEXA / InBody',         color:'#8b5cf6' },
  { id:'diet',          icon:'🥗', title:'النظام الغذائي',        color:'#4a9b8e' },
  { id:'chrono',        icon:'🕐', title:'الإيقاع اليومي والعلاج',  color:'#f59e0b' },
  { id:'nutrigenomics', icon:'🧬', title:'التغذية الجينية',       color:'#ec4899' },
  { id:'supplements',   icon:'🧴', title:'المكملات الغذائية',     color:'#5bb8c4' },
  { id:'interactions',  icon:'⚠️', title:'التعارضات',             color:'#ef4444' },
  { id:'comorbidity',   icon:'🔗', title:'خطة الاعتلال المصاحب',  color:'#0ea5e9' },
  { id:'therapy',       icon:'🧠', title:'المدارس العلاجية',      color:'#8b5cf6' },
  { id:'followup',      icon:'📋', title:'المتابعة والأمان',      color:'#10b981' },
  { id:'excluded',      icon:'🚫', title:'المستبعدات',            color:'#64748b' },
];

const EMPTY_FORM = {
  patientName:'', age:'', gender:'', weight:'', height:'',
  disorder:'', severity:'', comorbidities:'',
  currentMeds:'', allergies:'', history:'', stopMed:'',
  hasDexa:false, dexaFat:'', dexaMuscle:'', dexaBone:'',
  hasInbody:false, inbodyFat:'', inbodyMuscle:'', inbodyWater:'',
  hasEatingDisorder:false,
  knownGeneticVariants:'',
  cyclePhase:'',
  chronotype:'',
  sleepTime:'', wakeTime:'', sleepTimeFree:'', wakeTimeFree:'',
};

/* ════════════════════════════════════════════════
   VALIDATION
════════════════════════════════════════════════ */
function validateClinical(form) {
  if (form.disorder.includes('PMDD') && form.gender === 'Male')
    return '⚠️ PMDD occurs only in females. Please review the disorder or gender entered.';
  return null;
}

/* ════════════════════════════════════════════════
   REPORT TEXT FORMATTER (display layer — #3)
   Pure presentation transform of already-locked section text. Used identically
   by the on-screen report and the doctor PDF so both read clean instead of raw
   markdown. Does NOT alter clinical content or determinism.
   - escapes HTML first (content is trusted but injection-safe)
   - **bold** → real bold
   - markdown headers (#) stripped; bullets normalised to •
   - markdown table rows → "a — b"; separator rows dropped
   - un-glues "Header- item" (e.g. "Basic- Complete Blood Count") onto two lines
   ════════════════════════════════════════════════ */
const escapeHTML = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function formatReportHTML(text) {
  if (!text || !String(text).trim()) return '—';
  let t = escapeHTML(text);

  // markdown table rows → "cell — cell"; drop pure separator rows (|---|---|)
  t = t.split('\n').map((line) => {
    const s = line.trim();
    if (s.includes('|')) {
      if (/^\|?[\s|:\-]+\|?$/.test(s)) return '';                 // separator row
      const cells = s.split('|').map((c) => c.trim()).filter(Boolean);
      if (cells.length >= 2) return '- ' + cells.join(' — ');
    }
    return line;
  }).join('\n');

  t = t
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')           // bold
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')                           // strip headers
    // un-glue "Header- item" (glued: no space before the dash). A normal
    // "Word - value" line keeps its space and is left untouched.
    .replace(/^([^\n\-•|]{1,29}\S)-\s+(?=\S)/gm, '<strong>$1</strong>\n• ')
    .replace(/^\s*[\*•]\s+/gm, '• ')                              // * / • bullets
    .replace(/^\s*-\s+/gm, '• ')                                  // - bullets → •
    // Keep SIGNED numbers intact in RTL (e.g. bone-density T-score −2.5): the
    // leading minus is a bidi-neutral char that Arabic paragraph direction can
    // visually detach or drop. Isolate each sign+number as its own LTR run.
    // Matches only a real numeric sign (delimiter then "-<digit>"), never a
    // hyphen between words or an en-dash range. Display-only — does not touch
    // clinical content or determinism.
    .replace(/(^|[\s(>|:—،])(-\d[\d.,]*)/gm, '$1<span dir="ltr" style="unicode-bidi:isolate">$2</span>')
    .replace(/\n{3,}/g, '\n\n')                                   // collapse blanks
    .trim();

  return t;
}

/* ════════════════════════════════════════════════
   PDF GENERATOR
════════════════════════════════════════════════ */
/* Genetics gate: the 🧬 nutrigenomics section is conditional on the physician
 * actually entering known variants. With no input the section is suppressed
 * entirely (UI tabs + doctor PDF) rather than letting the model fabricate
 * generic SNP/test content from nothing — same input-gated philosophy applied
 * to the rest of the locked report. */
const hasGeneticInput = (form) => !!String(form?.knownGeneticVariants || '').trim();

function generatePDF(form, results, type, lang) {
  const isDoc = type === 'doctor';
  const isAr = lang === 'ar';
  const date = new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US');

  function makeSec(icon, title, body, color, rawHTML) {
    return '<div class="sec">'
      + `<div class="sec-title" style="border-right-color:${color};background:${color}18">${icon} ${title}</div>`
      + (rawHTML ? rawHTML : `<div class="sec-body">${formatReportHTML(body)}</div>`)
      + '</div>';
  }
  // Doctor PDF: decision-first HTML sections rendered with collapsibles OPEN
  // (the physician record must be complete). Extensible map keyed by section id.
  const dk = disorderKey(form.disorder);
  const htmlPdf = isDoc ? {
    summary:     renderSummaryHTML({ key: dk, form, lang, pdf: true }),
    medications: renderRxMedicationsHTML({ key: dk, lang, pdf: true, form }),
    comorbidity: renderComorbidityHTML({ primaryKey: dk, comorbidities: form.comorbidities, history: form.history, lang, pdf: true }),
    labs:        renderLabsHTML({ key: dk, form, lang, pdf: true }),
    excluded:    renderExcludedHTML({ key: dk, lang, pdf: true }),
    diet:        renderDietHTML({ key: dk, lang, pdf: true, extra: (() => { const m = renderMacrosAndMeals({ key: dk, metrics: computeMetrics(form), form, lang }); return m ? formatReportHTML(m) : ''; })() }) || results.dietHTML || null,
    supplements: renderSupplementsHTML({ key: dk, lang, pdf: true, extra: (() => { const p = renderPsychobioticsFor({ key: dk, lang }); return p ? formatReportHTML(p) : ''; })() }) || results.supplementsHTML || null,
    therapy:     renderTherapyHTML({ key: dk, lang, pdf: true, extra: (() => { const e = [renderTechniqueLibrary({ key: dk, lang }), renderVagalToning({ lang })].filter(Boolean).join('\n'); return e ? formatReportHTML(e) : ''; })() }) || results.therapyHTML || null,
    followup:    renderFollowupHTML({ key: dk, lang, pdf: true }) || results.followupHTML || null,
    bodycomp:    renderBodycompHTML({ form, lang, pdf: true }) || results.bodycompHTML || null,
    chrono:      renderChronoHTML({ key: dk, form, lang, pdf: true }) || results.chronoHTML || null,
    // Recompute interactions from the CURRENT form (was stale results.* → the PDF
    // could show interactions for an old form while the rest reflected edits).
    interactions: (() => {
      if (!INTERACTIONS_ACTIVE) return results.interactionsHTML || null;
      const cdn = comorbidDrugNames({ primaryKey: dk, comorbidities: form.comorbidities, recommendedDrugNames, FORMULARY });
      return renderInteractionsHTML({
        primaryFirstLine: cdn.primary.firstLine, primaryAdjunct: cdn.primary.adjunct,
        comorbidFirstLine: cdn.comorbid.firstLine, comorbidAdjunct: cdn.comorbid.adjunct,
        currentMeds: form.currentMeds, supplements: '',
        comorbidLabels: cdn.comorbid.keys, lang, pdf: true,
      }) || results.interactionsHTML || null;
    })(),
    nutrigenomics: results.nutrigenomicsHTML || null,
  } : {};

  const sections = (isAr ? SECTIONS_AR : SECTIONS_EN)
    .filter(s => s.id !== 'nutrigenomics' || hasGeneticInput(form))
    .filter(s => s.id !== 'comorbidity' || (results.comorbidity && String(results.comorbidity).trim()))
    .filter(s => s.id !== 'followup' || (results.followup && String(results.followup).trim()));
  const docContent = sections.map(s => makeSec(s.icon, s.title, results[s.id], s.color, isDoc ? (htmlPdf[s.id] || null) : null)).join('');

  function buildPatientContent(form, results) {
    function simplify(text) {
      if (!text) return '';
      const lines = text.split('\n');
      const filtered = lines.filter(line => {
        const l = line.toLowerCase();
        return !(
          l.includes('circadian rhythm') ||
          l.includes('car (') ||
          l.includes('gaba activity') ||
          l.includes('cyp') ||
          l.includes('bbb') ||
          l.includes('melatonin → serotonin') ||
          (l.includes('late night eating') && l.includes('leptin'))
        );
      });
      return filtered.join('\n')
        .replace(/→\s*[↑↓][^،.\n]*/g, '')
        .replace(/\([^)]*(?:GABA|Serotonin|Dopamine|BDNF|NMDA|BBB|CYP|HPA|CAR|Leptin|Cortisol awakening)[^)]*\)/gi, '')
        .trim();
    }

    function extractLabs(text) {
      if (!text) return '';
      const lines = text.split('\n');
      const labLines = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('###') || trimmed.startsWith('---') || trimmed.startsWith('##')) continue;
        if (trimmed.startsWith('|')) {
          const cells = trimmed.split('|').map(c => c.trim()).filter(Boolean);
          if (cells.length >= 1 && cells[0] !== '---' && !cells[0].toLowerCase().includes('test') && !cells[0].includes('التحليل')) {
            const labName = cells[0].replace(/\*+/g, '').trim();
            if (labName && labName !== '---') {
              labLines.push(`<div class="check-row"><span class="checkbox">☐</span><span class="check-label">${labName}</span></div>`);
            }
          }
        } else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
          // Prefer the bolded test name (**Renal function**); the rest is
          // rationale/when/src and must not leak into the checkbox label.
          const bold = trimmed.match(/\*\*([^*]+)\*\*/);
          const labName = (bold
            ? bold[1]
            : trimmed.replace(/^[-*]+\s*/, '').split(/\s[—–|]\s|:/)[0]
          ).replace(/\*+/g, '').trim();
          if (labName) {
            labLines.push(`<div class="check-row"><span class="checkbox">☐</span><span class="check-label">${escapeHTML(labName)}</span></div>`);
          }
        } else if (trimmed.match(/^[أ-ي]/) || trimmed.match(/^[A-Z]/)) {
          labLines.push(`<div class="lab-group">${trimmed}</div>`);
        }
      }
      return labLines.join('\n');
    }

    function extractSupplements(text) {
      if (!text) return '';
      const lines = text.split('\n');
      const out = [];
      let currentName = '';
      let currentDose = '';
      const flush = () => {
        if (!currentName) return;
        out.push(`<div class="check-row supp-row"><span class="checkbox">☐</span><div class="supp-info"><span class="supp-name">${escapeHTML(currentName)}</span>${currentDose ? `<span class="supp-dose">${escapeHTML(currentDose)}</span>` : ''}</div></div>`);
        currentName = ''; currentDose = '';
      };
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        // A supplement item is a BULLET line ("- **Name**" or "1. **Name**").
        // Section headers ("**🧴 …**") have no dash/number → correctly skipped
        // (the old regex accepted them and listed headers as supplements).
        const nameMatch = trimmed.match(/^(?:-\s+|\d+\.\s*)\*\*([^*]+)\*\*/);
        if (nameMatch) {
          flush();
          currentName = nameMatch[1].trim();
        } else if ((trimmed.includes('Dose:') || trimmed.includes('الجرعة:')) && currentName) {
          // Take ONLY the Dose segment from "Forms: … | Dose: … | Timing: …".
          const seg = trimmed.split('|').find((s) => /Dose|الجرعة/.test(s)) || trimmed;
          currentDose = seg.replace(/.*(?:Dose|الجرعة)\s*:\s*/, '').replace(/\*+/g, '').trim();
        }
      }
      flush();
      return out.join('\n');
    }

    function extractSchedule(text) {
      if (!text) return '';
      const lines = text.split('\n');
      const out = [];
      const skipPatterns = [
        /circadian/i, /car \(/i, /gaba activity/i, /melatonin.*serotonin/i,
        /cortisol awakening/i, /late night eating.*leptin/i,
        /ideal eating window/i, /\btre\b/i, /time-restricted/i,
        /importance of/i
      ];
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (skipPatterns.some(p => p.test(trimmed))) continue;
        const cleaned = trimmed
          .replace(/→\s*[↑↓][^،.\n،]*/g, '')
          .replace(/\([^)]*(?:Serotonin|Dopamine|GABA|Cortisol|Melatonin|Tryptophan|Tyrosine)[^)]*\)/gi, '')
          .trim();
        if (cleaned) out.push(cleaned);
      }
      return out.join('\n');
    }

    function simplifyFood(text) {
      if (!text) return '';
      return text
        .replace(/→\s*[↑↓][^،.\n]*/g, '')
        .replace(/\([^)]*(?:Serotonin|Dopamine|GABA|BDNF|NMDA|BBB|CYP|Cortisol|Melatonin|Tryptophan|Anthocyanins|precursor|pathway)[^)]*\)/gi, '')
        .replace(/— [A-Z][a-z]+ [A-Z][a-z]+/g, '')
        .trim();
    }

    const css = `
      .note{background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px 16px;margin-bottom:18px;font-size:12px;line-height:1.8;color:#166534}
      .rx-box{border:2px dashed #4a9b8e;border-radius:10px;padding:16px 18px;margin-bottom:18px;min-height:90px;background:#f8fffe}
      .rx-title{font-size:13px;font-weight:700;color:#4a9b8e;margin-bottom:8px}
      .rx-lines{display:flex;flex-direction:column;gap:10px}
      .rx-line{border-bottom:1px solid #cde;padding-bottom:6px;min-height:22px}
      .rx-hint{font-size:10px;color:#94a3b8;margin-top:6px}
      .lab-group{font-size:12px;font-weight:700;color:#1e293b;margin:10px 0 4px;padding-right:4px;border-right:3px solid #5bb8c4}
      .check-row{display:flex;align-items:flex-start;gap:8px;padding:5px 0;border-bottom:1px solid #f1f5f9}
      .checkbox{font-size:16px;line-height:1;flex-shrink:0;color:#475569}
      .check-label{font-size:12px;color:#334155;line-height:1.5}
      .supp-row{align-items:center}
      .supp-info{display:flex;flex-direction:column;gap:2px}
      .supp-name{font-size:12px;font-weight:600;color:#1e293b}
      .supp-dose{font-size:11px;color:#64748b}
    `;

    const drugLabel   = isAr ? '💊 الدواء الموصوف'      : '💊 Prescribed Medication';
    const drugHint    = isAr ? 'يُكمل الطبيب المعالج هذا القسم بإيده' : 'To be completed by the treating physician';
    const labsLabel   = isAr ? '🧪 التحاليل المطلوبة'    : '🧪 Required Lab Tests';
    const foodLabel   = isAr ? '🥗 نظامك الغذائي'        : '🥗 Your Dietary Plan';
    const schedLabel  = isAr ? '🕐 جدول يومك'            : '🕐 Your Daily Schedule';
    const suppLabel   = isAr ? '🧴 المكملات الغذائية'    : '🧴 Supplements';
    const noteText    = isAr
      ? 'عزيزي المريض، هذه خطتك العلاجية بإشراف طبيبك. لا تعدل أي دواء بدون استشارته.'
      : 'Dear Patient, this is your treatment plan under your physician\'s supervision. Do not modify any medication without consulting them.';

    const drugSection = `<div class="rx-box">`
      + `<div class="rx-title">${drugLabel}</div>`
      + `<div class="rx-lines"><div class="rx-line"></div><div class="rx-line"></div><div class="rx-line"></div></div>`
      + `<div class="rx-hint">${drugHint}</div>`
      + `</div>`;

    const labsSection = `<div class="sec">`
      + `<div class="sec-title" style="border-right-color:#5bb8c4;background:#5bb8c418">${labsLabel}</div>`
      + `<div class="sec-body">${extractLabs(results.labs)}</div>`
      + `</div>`;

    const foodSection = `<div class="sec">`
      + `<div class="sec-title" style="border-right-color:#4a9b8e;background:#4a9b8e18">${foodLabel}</div>`
      + `<div class="sec-body" style="white-space:pre-wrap">${simplifyFood(results.diet)}</div>`
      + `</div>`;

    const scheduleSection = `<div class="sec">`
      + `<div class="sec-title" style="border-right-color:#f59e0b;background:#f59e0b18">${schedLabel}</div>`
      + `<div class="sec-body" style="white-space:pre-wrap">${results.chrono || '—'}</div>`
      + `</div>`;

    const suppSection = `<div class="sec">`
      + `<div class="sec-title" style="border-right-color:#5bb8c4;background:#5bb8c418">${suppLabel}</div>`
      + `<div class="sec-body">${extractSupplements(results.supplements)}</div>`
      + `</div>`;

    return `<style>${css}</style>`
      + `<div class="note">${noteText}</div>`
      + drugSection + labsSection + foodSection + scheduleSection + suppSection;
  }

  const patContent = buildPatientContent(form, results);

  const dirAttr  = isAr ? 'rtl' : 'ltr';
  const langAttr = isAr ? 'ar'  : 'en';
  const docBadge    = isAr ? '🔒 سري طبي'        : '🔒 Confidential — Physician Only';
  const patBadge    = isAr ? '👤 نسخة المريض'     : '👤 Patient Copy';
  const docSubtitle = isAr ? 'تقرير سريري شامل — للطبيب فقط' : 'Comprehensive Clinical Report — Physician Only';
  const patSubtitle = isAr ? 'خطة العلاج — نسخة المريض'       : 'Treatment Plan — Patient Copy';
  const discText    = isDoc
    ? (isAr ? 'هذا التقرير أداة دعم للقرار السريري فقط. القرار النهائي للطبيب المعالج. التوصيات مبنية على APA، NICE، CANMAT، BAP.'
             : 'This report is a clinical decision support tool only. The final decision rests with the treating physician. Recommendations are based on APA, NICE, CANMAT, BAP.')
    : (isAr ? 'هذه الخطة وضعها طبيبك المعالج. لا تعدل أي دواء بدون استشارته.'
             : 'This plan was prepared by your treating physician. Do not modify any medication without their consultation.');

  const labels = {
    disorder:  isAr ? 'الاضطراب'       : 'Disorder',
    ageGender: isAr ? 'العمر / الجنس'  : 'Age / Gender',
    weightHeight: isAr ? 'الوزن / الطول' : 'Weight / Height',
    severity:  isAr ? 'الشدة'          : 'Severity',
    reportDate: isAr ? 'تاريخ التقرير' : 'Report Date',
    patient:   isAr ? 'اسم المريض'     : 'Patient Name',
    unspecified: isAr ? 'غير محددة'    : 'Unspecified',
    yrs: isAr ? ' سنة' : ' yrs',
    kg: isAr ? ' كجم' : ' kg',
    cm: isAr ? ' سم'  : ' cm',
  };

  const html = `<!DOCTYPE html><html dir="${dirAttr}" lang="${langAttr}"><head><meta charset="UTF-8">
<title>NourishMind Clinical — ${isDoc ? docSubtitle : patSubtitle} — ${date}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Inter:wght@400;600;700;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:${isAr ? "'Cairo'" : "'Inter'"}, sans-serif;background:#fff;color:#1a1a2e;padding:36px;direction:${dirAttr};font-size:13px}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:18px;border-bottom:3px solid ${isDoc?'#4a9b8e':'#5bb8c4'}}
.logo{font-size:20px;font-weight:900;color:${isDoc?'#4a9b8e':'#5bb8c4'}}
.logo span{font-size:11px;font-weight:400;color:#666;display:block;margin-top:2px}
.bdg{background:${isDoc?'#f0fdf4':'#eff6ff'};border:1px solid ${isDoc?'#86efac':'#bfdbfe'};color:${isDoc?'#166534':'#1d4ed8'};padding:5px 12px;border-radius:20px;font-size:12px;font-weight:600}
.info{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px;margin-bottom:20px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
.il{font-size:11px;color:#64748b;margin-bottom:2px}.iv{font-weight:700;color:#1e293b;font-size:12px}
.sec{margin-bottom:18px;page-break-inside:avoid}
.sec-title{font-size:13px;font-weight:700;margin-bottom:8px;padding:7px 12px;border-radius:7px;border-right:4px solid}
.sec-body{font-size:12px;line-height:2;color:#374151;padding:0 12px;white-space:pre-wrap}
.note{background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px 16px;margin-bottom:18px;font-size:12px;line-height:1.8;color:#166534}
.disc{background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 14px;margin-top:18px;font-size:11px;color:#9a3412;line-height:1.7}
.ftr{margin-top:24px;padding-top:14px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:11px;color:#94a3b8}
@media print{body{padding:14mm 12mm}}
/* Zero the PAGE margin so the browser's auto header/footer (which printed the
   about:blank source URL) has no margin box to render into. Our own .ftr stays
   as body content; safe content margins are restored via the print padding. */
@page{margin:0}
</style></head><body>
<div class="hdr">
  <div class="logo">🧠 NourishMind Clinical<span>${isDoc ? docSubtitle : patSubtitle}</span></div>
  <div class="bdg">${isDoc ? docBadge : patBadge}</div>
</div>
<div class="info">
  ${form.patientName ? `<div><div class="il">${labels.patient}</div><div class="iv">${escapeHTML(form.patientName)}</div></div>` : ''}
  <div><div class="il">${labels.disorder}</div><div class="iv">${escapeHTML(form.disorder)}</div></div>
  <div><div class="il">${labels.ageGender}</div><div class="iv">${escapeHTML(form.age)}${labels.yrs} / ${escapeHTML(form.gender)}</div></div>
  <div><div class="il">${labels.weightHeight}</div><div class="iv">${escapeHTML(form.weight||'—')}${labels.kg} / ${escapeHTML(form.height||'—')}${labels.cm}</div></div>
  <div><div class="il">${labels.severity}</div><div class="iv">${escapeHTML(form.severity || labels.unspecified)}</div></div>
  <div><div class="il">${labels.reportDate}</div><div class="iv">${date}</div></div>
</div>
${isDoc ? docContent : patContent}
<div class="disc">⚠️ ${discText}</div>
<div class="ftr"><span>NourishMind Clinical Tool</span><span>${isAr ? 'تم الإنشاء' : 'Generated'}: ${date}</span></div>
<script>window.onload=()=>window.print();</script>
</body></html>`;
  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
}

/* ════════════════════════════════════════════════
   SHARED UI COMPONENTS
════════════════════════════════════════════════ */
const Card = ({ children, className = '' }) => (
  <div className={`bg-[#0d1a17] border border-white/8 rounded-2xl p-5 ${className}`}>{children}</div>
);

const SectionLabel = ({ children }) => (
  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">{children}</p>
);

const FormInput = ({ label, children }) => (
  <div className="mb-3">
    <label className="block text-xs font-semibold text-gray-400 mb-1.5">{label}</label>
    {children}
  </div>
);

const inputCls = "w-full bg-[#0a1510] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-teal-500/50 transition-colors";

/* ════════════════════════════════════════════════
   GATE SCREENS
════════════════════════════════════════════════ */
const GateScreen = ({ icon, title, subtitle, children }) => (
  <div className="min-h-screen flex flex-col items-center justify-center px-4"
    style={{ background: 'linear-gradient(135deg,#070f0d 0%,#0d1a17 60%,#071210 100%)' }}>
    <div className="text-6xl mb-6">{icon}</div>
    <h1 className="text-white font-bold text-2xl mb-2 text-center">{title}</h1>
    <p className="text-gray-400 text-sm text-center mb-8 max-w-sm">{subtitle}</p>
    {children}
  </div>
);

/* ════════════════════════════════════════════════
   LANGUAGE TOGGLE
════════════════════════════════════════════════ */
const LangToggle = ({ lang, setLang }) => (
  <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)' }}>
    <button
      onClick={() => setLang('en')}
      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
      style={lang === 'en'
        ? { background:'#4a9b8e', color:'#fff' }
        : { color:'#64748b', background:'transparent' }}>
      EN
    </button>
    <button
      onClick={() => setLang('ar')}
      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
      style={lang === 'ar'
        ? { background:'#4a9b8e', color:'#fff' }
        : { color:'#64748b', background:'transparent' }}>
      AR
    </button>
  </div>
);

/* ════════════════════════════════════════════════
   MAIN TOOL
════════════════════════════════════════════════ */
const ClinicalTool = () => {
  const { currentUser } = useAuth();
  const [lang, setLang] = useState('en');
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [results, setResults] = useState(null);
  const [resultsStructured, setResultsStructured] = useState(null); // #1: structured object, for future UI (#5)
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(null);
  const [hideGenetics, setHideGenetics] = useState(false);
  const [hideComorbidity, setHideComorbidity] = useState(true);
  const [hideFollowup, setHideFollowup] = useState(true);
  const chatEndRef = useRef(null);

  const SECTIONS = lang === 'ar' ? SECTIONS_AR : SECTIONS_EN;

  const isAr = lang === 'ar';
  const dir  = isAr ? 'rtl' : 'ltr';

  const T = {
    // Form labels
    patientData:   isAr ? 'بيانات المريض'          : 'Patient Information',
    patientName:   isAr ? 'اسم المريض (اختياري)'   : 'Patient Name (optional)',
    age:           isAr ? 'العمر'                   : 'Age',
    gender:        isAr ? 'الجنس'                   : 'Gender',
    chooseGender:  isAr ? 'اختر'                    : 'Select',
    male:          isAr ? 'ذكر'                     : 'Male',
    female:        isAr ? 'أنثى'                    : 'Female',
    weight:        isAr ? 'الوزن (كجم)'             : 'Weight (kg)',
    height:        isAr ? 'الطول (سم)'              : 'Height (cm)',
    disorder:      isAr ? 'الاضطراب الرئيسي'        : 'Primary Disorder',
    chooseDisorder:isAr ? 'اختر الاضطراب'           : 'Select disorder',
    severity:      isAr ? 'شدة الأعراض'             : 'Symptom Severity',
    chooseSev:     isAr ? 'اختر'                    : 'Select',
    cyclePhase:    isAr ? 'طور الدورة الشهرية'       : 'Menstrual Cycle Phase',
    choosePhase:   isAr ? 'اختر الطور'              : 'Select phase',
    follicular:    isAr ? 'الطور الجريبي (Follicular)' : 'Follicular',
    luteal:        isAr ? 'الطور الأصفري (Luteal)'   : 'Luteal',
    phaseUnknown:  isAr ? 'غير معروف'               : 'Unknown',
    chronotype:    isAr ? 'النمط الزمني (Chronotype)' : 'Chronotype',
    chooseCt:      isAr ? 'اختر النمط'              : 'Select chronotype',
    sleepHdr:      isAr ? 'ساعات النوم (لحساب منتصف النوم واختلاف التوقيت الاجتماعي)' : 'Sleep times (for mid-sleep & social jet lag)',
    bedWork:       isAr ? 'ميعاد النوم المعتاد (س:د)'   : 'Usual bedtime (HH:MM)',
    wakeWork:      isAr ? 'ميعاد الصحيان — أيام الشغل'   : 'Wake time (workday)',
    bedFree:       isAr ? 'النوم — أيام الأجازة (اختياري)' : 'Bedtime (free days, optional)',
    wakeFree:      isAr ? 'الصحيان — أيام الأجازة (اختياري)' : 'Wake (free days, optional)',
    ctMorning:     isAr ? 'صباحي (Morning)'          : 'Morning',
    ctInter:       isAr ? 'متوسط (Intermediate)'     : 'Intermediate',
    ctEvening:     isAr ? 'مسائي (Evening)'          : 'Evening',
    ctUnknown:     isAr ? 'غير معروف'               : 'Unknown',
    mild:          isAr ? 'خفيفة'                   : 'Mild',
    moderate:      isAr ? 'متوسطة'                  : 'Moderate',
    severe:        isAr ? 'شديدة'                   : 'Severe',
    medHistory:    isAr ? 'التاريخ الطبي'           : 'Medical History',
    comorbidities: isAr ? 'الأمراض المصاحبة'        : 'Comorbidities',
    comorbPh:      isAr ? 'سكري، ضغط الدم، قصور الغدة...' : 'Diabetes, hypertension, hypothyroidism...',
    currentMeds:   isAr ? 'الأدوية الحالية'         : 'Current Medications',
    currentMedsPh: isAr ? 'ميتفورمين 500mg، أتينولول 50mg...' : 'Metformin 500mg, Atenolol 50mg...',
    allergies:     isAr ? 'الحساسية والموانع'        : 'Allergies & Contraindications',
    allergiesPh:   isAr ? 'حساسية من البنسلين...'   : 'Penicillin allergy...',
    history:       isAr ? 'التاريخ النفسي والعلاجي' : 'Psychiatric & Treatment History',
    historyPh:     isAr ? 'fluoxetine سابقاً بدون استجابة...' : 'fluoxetine previously without response...',
    stopMed:       isAr ? 'دواء مراد إيقافه'        : 'Medication to Discontinue',
    stopMedPh:     isAr ? 'إيقاف paroxetine بسبب زيادة الوزن...' : 'Discontinue paroxetine due to weight gain...',
    hasDexa:       isAr ? 'عندي نتائج DEXA'         : 'I have DEXA results',
    hasInbody:     isAr ? 'عندي نتائج InBody'       : 'I have InBody results',
    edHistory:     isAr ? 'تاريخ أو اشتباه اضطراب أكل' : 'Eating-disorder history / suspicion',
    edHint:        isAr ? 'يمنع أي عجز سعري ويحوّل لإشراف متخصص' : 'Blocks any caloric deficit; routes to specialist supervision',
    fat:           isAr ? 'دهون %'                  : 'Fat %',
    muscle:        isAr ? 'عضلات kg'                : 'Muscle kg',
    bone:          isAr ? 'العظام'                  : 'Bone',
    water:         isAr ? 'ماء L'                   : 'Water L',
    genetics:      isAr ? 'الجينات'                 : 'Genetics',
    geneticSNPs:   isAr ? 'تغيرات جينية معروفة (SNPs)' : 'Known Genetic Variants (SNPs)',
    geneticPh:     isAr ? 'مثال: MTHFR C677T heterozygous، COMT Val158Met...' : 'e.g., MTHFR C677T heterozygous, COMT Val158Met...',
    analyzeBtn:    isAr ? '🔍 تحليل الحالة وإنشاء التقرير' : '🔍 Analyze Case & Generate Report',
    analyzingBtn:  isAr ? 'جاري التحليل...'          : 'Analyzing...',
    // Results
    analyzing:     isAr ? 'جاري تحليل الحالة'       : 'Analyzing the case',
    analyzingNote: isAr ? 'يتم مراجعة أحدث الإرشادات الطبية المعتمدة' : 'Reviewing the latest evidence-based guidelines',
    emptyTitle:    isAr ? 'أدخل بيانات المريض'      : 'Enter Patient Information',
    emptyNote:     isAr ? 'أدخل المعلومات السريرية واضغط تحليل للحصول على التقرير الشامل' : 'Enter the clinical information and click Analyze to generate a comprehensive report',
    reportLabel:   isAr ? 'تقرير'                   : 'Report',
    analyzed:      isAr ? '✓ تم التحليل'            : '✓ Analyzed',
    physDecision:  isAr ? 'القرار للطبيب'           : 'Physician decides',
    pdfDoctor:     isAr ? '🖨️ تقرير الطبيب PDF'     : '🖨️ Physician Report PDF',
    pdfPatient:    isAr ? '📄 نسخة المريض PDF'      : '📄 Patient Copy PDF',
    chatTitle:     isAr ? '💬 اسأل عن الحالة'       : '💬 Ask About the Case',
    chatPh:        isAr ? 'اسأل عن الجرعات، البدائل، التوقيتات...' : 'Ask about doses, alternatives, timing...',
    chatThinking:  isAr ? 'جاري التفكير...'         : 'Thinking...',
    chatSuccess:   isAr ? 'تم تحليل الحالة بنجاح ✅\nيمكنك الآن سؤالي عن أي تفاصيل.' : 'Case analyzed successfully ✅\nYou can now ask me about any details.',
    chatError:     isAr ? 'حدث خطأ، يرجى المحاولة مجدداً.' : 'An error occurred. Please try again.',
    disclaimer:    isAr
      ? '⚠️ للأطباء والمتخصصين فقط. هذه الأداة دعم للقرار السريري وليست بديلاً عن التقييم الطبي. القرار النهائي دائماً للطبيب المعالج.'
      : '⚠️ For physicians and specialists only. This tool is a clinical decision support aid and is not a substitute for medical evaluation. The final decision always rests with the treating physician.',
    errRequired:   isAr ? 'يرجى إدخال العمر والجنس والاضطراب على الأقل' : 'Please enter at least age, gender, and disorder',
    errPMDD:       isAr ? '⚠️ PMDD يحدث فقط في الإناث. يرجى مراجعة الاضطراب أو الجنس المدخل.' : '⚠️ PMDD occurs only in females. Please review the disorder or gender entered.',
    yrs:           isAr ? ' سنة'  : ' yrs',
    kg:            isAr ? ' كجم'  : ' kg',
    severity_lbl:  isAr ? 'شدة'   : 'Severity',
    unspecified:   isAr ? 'غير محددة' : 'Unspecified',
  };

  const DISORDERS_DISPLAY = isAr
    ? ['الاكتئاب الاكلينيكي (MDD)', 'اضطراب القلق العام (GAD)', 'الوسواس القهري (OCD)', 'اضطراب الشخصية الحدية (BPD)', 'الاضطراب المزعج ما قبل الطمث (PMDD)']
    : DISORDERS;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const clinicalLock = () => {
    const key = disorderKey(form.disorder);
    const fb = renderFormularyBlock(key, { cyclePhase: form.cyclePhase, chronotype: form.chronotype });
    const mt = renderMetrics(computeMetrics(form));
    const sg = renderSafetyGate(computeSafetyFlags(form, key));
    const ig = renderInteractionGate({ formularyBlock: FORMULARY[key], currentMeds: form.currentMeds, supplements: '', lang });
    // Locked drug-data layer (selection #4 + monographs). INERT until clinically
    // signed off (DRUGDATA_ACTIVE=false → returns '' and is filtered out below).
    const dd = renderDrugDataGate({ disorderKey: key, lang });
    const cm = renderComorbidityReport({ primaryKey: key, comorbidities: form.comorbidities, lang });
    const mc = MEDCOMORBID_ACTIVE ? renderMedicalComorbidityReport({ comorbidities: form.comorbidities, history: form.history, lang }) : '';
    const ver = `FORMULARY_VERSION: ${FORMULARY_VERSION}`;
    return [sg, mt, fb, ig, dd, cm, mc, ver].filter(Boolean).join('\n\n');
  };

  const buildContext = () => isAr
    ? `بيانات المريض:\n- الاسم: ${form.patientName || 'غير مذكور'}\n- العمر: ${form.age} سنة | الجنس: ${form.gender} | الوزن: ${form.weight||'غير محدد'} كجم | الطول: ${form.height||'غير محدد'} سم\n- الاضطراب: ${form.disorder} | الشدة: ${form.severity||'غير محددة'}\n- الأمراض المصاحبة: ${form.comorbidities||'لا يوجد'}\n- الأدوية الحالية: ${form.currentMeds||'لا يوجد'}\n- الحساسية والموانع: ${form.allergies||'لا يوجد'}\n- التاريخ النفسي: ${form.history||'لا يوجد'}\n- طلب وقف دواء: ${form.stopMed||'لا يوجد'}\n${form.hasDexa?`- DEXA: دهون ${form.dexaFat||'—'}% | عضلات ${form.dexaMuscle||'—'}kg | كثافة عظام ${form.dexaBone||'—'}`:'- DEXA: غير متوفر'}\n${form.hasInbody?`- InBody: دهون ${form.inbodyFat||'—'}% | عضلات ${form.inbodyMuscle||'—'}kg | ماء ${form.inbodyWater||'—'}L`:'- InBody: غير متوفر'}\n- تغيرات جينية: ${form.knownGeneticVariants||'غير معروفة'}${form.disorder.includes('PMDD')?`\n- طور الدورة الشهرية: ${form.cyclePhase||'غير محدد'}`:''}\n- النمط الزمني (chronotype): ${form.chronotype||'غير محدد'}\n\n${clinicalLock()}`
    : `Patient Data:\n- Name: ${form.patientName || 'Not provided'}\n- Age: ${form.age} yrs | Gender: ${form.gender} | Weight: ${form.weight||'N/A'} kg | Height: ${form.height||'N/A'} cm\n- Disorder: ${form.disorder} | Severity: ${form.severity||'Not specified'}\n- Comorbidities: ${form.comorbidities||'None'}\n- Current Medications: ${form.currentMeds||'None'}\n- Allergies/Contraindications: ${form.allergies||'None'}\n- Psychiatric/Treatment History: ${form.history||'None'}\n- Medication to stop: ${form.stopMed||'None'}\n${form.hasDexa?`- DEXA: Fat ${form.dexaFat||'—'}% | Muscle ${form.dexaMuscle||'—'}kg | Bone density ${form.dexaBone||'—'}`:'- DEXA: Not available'}\n${form.hasInbody?`- InBody: Fat ${form.inbodyFat||'—'}% | Muscle ${form.inbodyMuscle||'—'}kg | Water ${form.inbodyWater||'—'}L`:'- InBody: Not available'}\n- Known genetic variants: ${form.knownGeneticVariants||'Unknown'}${form.disorder.includes('PMDD')?`\n- Menstrual cycle phase: ${form.cyclePhase||'Not specified'}`:''}\n- Chronotype: ${form.chronotype||'Not specified'}\n\n${clinicalLock()}`;

  function validateForm() {
    if (!form.disorder || !form.age || !form.gender) return T.errRequired;
    if (form.disorder.includes('PMDD') && (form.gender === 'Male' || form.gender === 'ذكر')) return T.errPMDD;
    return null;
  }

  const buildPrompt = () => isAr
    ? `${buildContext()}\n\nأنت طبيب نفسي وأخصائي تغذية علاجية وأخصائي nutrigenomics خبير. حلل الحالة تحليلاً شاملاً ومتسقاً — أي دواء أو مكمل تذكره في التوصيات لا يجب أن يظهر في المستبعدات. يوجد في بيانات الحالة بالأعلى دليل دوائي مقفول (LOCKED FORMULARY) وأرقام محسوبة مسبقاً. يجب استخدامها حرفياً: لا تُضِف أو تحذف أو تُعِد تصنيف أي دواء/علاج/مكمل، ولا تُعِد حساب أي رقم — انسخ القيم المحسوبة كما هي. اعرض القرارات المقفولة واشرحها فقط، ولا تجتهد باختيارات جديدة. [MEDICATIONS]=الخط الأول/المساعد المقفول بدرجاته وجرعاته؛ [EXCLUDED]=المستبعدات المقفولة فقط؛ [THERAPY]=بترتيب الأولوية والدرجات المقفولة؛ [BODYCOMP]/[DIET]=الأرقام المحسوبة مسبقاً؛ [CHRONO]=المبدأ الزمني المقفول حرفياً (لا تخترع نافذة ساعات محددة). الأقسام بلا إدخال مقفول (التحاليل، التغذية الجينية) تتبع إرشادات APA/NICE/CANMAT/BAP. أما التعارضات (interactions) فيوجد بالأعلى جدول تعارضات مقفول — انسخ بنوده حرفياً ولا تضف أو تحذف أو تغيّر أي شيء؛ هذا القسم يُولَّد من الجدول المقفول فقط.\n\nأجب بهذا التنسيق بالضبط:\n\n[MEDICATIONS]\nالتوصيات الدوائية المثلى: الدواء الأول والبدائل مع الجرعات بناءً على الوزن. خطوات التحول إن طُلب. مستوى الدليل (A/B/C).\n\n[LABS]\nالتحاليل المطلوبة مقسمة: أ) أساسية ب) Micronutrients ج) هرمونية د) متخصصة — مع سبب كل تحليل.\n\n[BODYCOMP]\nتحليل DEXA/InBody إن توفرت، وإلا: المؤشرات المطلوبة وأهميتها.\n\n[DIET]\nالنظام الغذائي الأمثل: الأطعمة المفيدة والممنوعة، التوقيتات.\n\n[CHRONO]\nChrononutrition: أفضل توقيت للوجبات، تأثير Circadian Rhythm، Time-Restricted Eating.\n\n[NUTRIGENOMICS]\nالتغذية الجينية: أهم SNPs المرتبطة، الفحوصات الجينية الموصى بها.\n\n[SUPPLEMENTS]\nالمكملات الموصى بها: الجرعات والأوقات والصيغ، مستوى الدليل.\n\n[INTERACTIONS]\nالتعارضات: بين الأدوية، بين الأدوية والغذاء، بين المكملات والأدوية.\n\n[THERAPY]\nالمدارس العلاجية الأنسب من CBT/DBT/ACT/Schema/GPM/ERP.\n\n[EXCLUDED]\nالمستبعدات فقط (ما لم يُذكر سابقاً) مع سبب كل استبعاد.`
    : `${buildContext()}\n\nYou are an expert psychiatrist, therapeutic nutritionist, and nutrigenomics specialist. Analyze this case comprehensively and consistently — any medication or supplement mentioned in recommendations must NOT appear in the excluded section. A LOCKED CLINICAL FORMULARY and PRE-COMPUTED METRICS are included in the case data above. You MUST use them verbatim: do NOT add, omit, re-grade, or reclassify any drug/therapy/supplement, and do NOT recalculate any number — copy the pre-computed values exactly. Present and explain the locked decisions; never derive your own. [MEDICATIONS]=locked first-line/adjunct with their grades & dosing; [EXCLUDED]=ONLY the locked excluded items; [THERAPY]=locked priority order & grades; [BODYCOMP]/[DIET]=the pre-computed metrics; [CHRONO]=the locked timing principle verbatim (do NOT invent a specific clock window). Sections with no locked entry (labs, nutrigenomics) follow standard APA/NICE/CANMAT/BAP guidelines. For [INTERACTIONS], a LOCKED INTERACTION TABLE is included above — copy its entries verbatim and do NOT add, omit, or change any; this section is generated solely from the locked table.\n\nRespond in exactly this format:\n\n[MEDICATIONS]\nOptimal medication recommendations: first-line and alternatives with weight-based dosing. Switching steps if requested. Evidence level (A/B/C).\n\n[LABS]\nRequired labs categorized: a) Basic b) Micronutrients c) Hormonal d) Specialized — with rationale for each.\n\n[BODYCOMP]\nDEXA/InBody analysis if available, otherwise: required metrics and their significance.\n\n[DIET]\nOptimal dietary plan: beneficial and contraindicated foods, timing, drug-food interactions.\n\n[CHRONO]\nChrononutrition: optimal meal timing, Circadian Rhythm impact, Time-Restricted Eating.\n\n[NUTRIGENOMICS]\nNutrigenomics: key relevant SNPs, recommended genetic tests.\n\n[SUPPLEMENTS]\nRecommended supplements: doses, timing, forms (glycinate, methylfolate), evidence level.\n\n[INTERACTIONS]\nInteractions: drug-drug, drug-food, supplement-drug.\n\n[THERAPY]\nMost appropriate therapeutic schools from CBT/DBT/ACT/Schema/GPM/ERP: techniques and priority.\n\n[EXCLUDED]\nExcluded options only (not mentioned above) with rationale for each exclusion.`;

  // #1: prompt for the structured (tool-use) path. Context already carries the locked
  // formulary + pre-computed metrics + safety gate; the schema carries the field shapes.
  const buildStructuredPrompt = () => isAr
    ? `${buildContext()}\n\nأنت طبيب نفسي وأخصائي تغذية علاجية وأخصائي nutrigenomics خبير. حلّل الحالة وأعِد التقرير عبر استدعاء أداة clinical_report. يوجد بالأعلى دليل دوائي مقفول (LOCKED FORMULARY) وأرقام محسوبة مسبقاً — انسخها حرفياً في medications وexcluded وtherapy وchrono وbodycomp وdiet: لا تُضِف أو تحذف أو تُعِد تصنيف أو تُعِد حساب أي شيء. أقسام labs وnutrigenomics تتبع إرشادات APA/NICE/CANMAT/BAP. أما التعارضات (interactions) فيوجد بالأعلى جدول تعارضات مقفول (LOCKED INTERACTION TABLE) — انسخ بنوده حرفياً ولا تضف أو تحذف أو تغيّر أي شيء؛ هذا القسم يُولَّد من الجدول المقفول فقط. املأ كل الحقول، ولا تضع أي دواء/مكمل من التوصيات داخل المستبعدات.`
    : `${buildContext()}\n\nYou are an expert psychiatrist, therapeutic nutritionist, and nutrigenomics specialist. Analyze this case and return the report by calling the clinical_report tool. A LOCKED CLINICAL FORMULARY and PRE-COMPUTED METRICS are in the case data above — copy them verbatim into medications, excluded, therapy, chrono, bodycomp and diet: do NOT add, omit, re-grade, reclassify or recalculate. Labs and nutrigenomics follow standard APA/NICE/CANMAT/BAP guidelines. For interactions, a LOCKED INTERACTION TABLE is included in the case data above — copy its entries verbatim and do NOT add, omit, or change any; this section is generated solely from the locked table. Populate every field, and never place a recommended drug/supplement into the excluded list.`;

  async function analyze() {
    const validErr = validateForm();
    if (validErr) { setError(validErr); return; }
    setError(''); setLoading(true); setResults(null); setResultsStructured(null); setActiveTab(null);
    setLoadingMsg(T.analyzing);

    const failMsg = isAr ? 'لم يتم تحميل هذا القسم — يرجى إعادة التحليل.' : 'Section not loaded — please re-analyze.';
    const order = ['medications','labs','bodycomp','diet','chrono','nutrigenomics','supplements','interactions','therapy','excluded'];

    // ── FALLBACK: the proven free-text [TAG] + regex path (kept verbatim) ──
    const runFreeText = async () => {
      const parseFrom = (text, tag) => {
        const m = text.match(new RegExp('\\[' + tag + '\\]([\\s\\S]*?)(?=\\[(?:' + ALL_TAGS + ')\\]|$)', 'i'));
        return (m && m[1].trim()) ? m[1].trim() : '';
      };
      const validSection = (txt) => {
        if (!txt) return false;
        if (/^لم يتم تحميل|^Section not loaded/.test(txt.trim())) return false;
        return txt.replace(/[|\-\s]/g, '').length >= 30;
      };
      const buildSectionPrompt = (tags) => {
        const blocks = tags.map((t) => `[${t}]`).join('\n\n');
        return isAr
          ? `${buildContext()}\n\nأكمل الأقسام التالية فقط، بنفس قواعد الفورمولاري المقفول والأرقام المحسوبة وبوابة الأمان. أجب بهذه الوسوم فقط وبهذا التنسيق بالضبط:\n\n${blocks}`
          : `${buildContext()}\n\nProduce ONLY the following sections, using the same locked formulary, pre-computed metrics, and safety gate. Respond with these tags only, in exactly this format:\n\n${blocks}`;
      };
      const raw = await callClaude(buildPrompt(), lang);
      const parsed = {};
      order.forEach((k) => { parsed[k] = parseFrom(raw, k.toUpperCase()); });
      const failed = order.filter((k) => !validSection(parsed[k]));
      if (failed.length) {
        setLoadingMsg(isAr ? 'إعادة تحميل أقسام ناقصة…' : 'Reloading incomplete sections…');
        try {
          const raw2 = await callClaude(buildSectionPrompt(failed.map((k) => k.toUpperCase())), lang);
          failed.forEach((k) => { const v = parseFrom(raw2, k.toUpperCase()); if (validSection(v)) parsed[k] = v; });
        } catch (_) { /* keep what we have */ }
      }
      order.forEach((k) => { if (!validSection(parsed[k])) parsed[k] = failMsg; });
      return parsed;
    };

    try {
      let parsed = null;
      let structured = null;

      // ── PRIMARY: structured JSON via forced tool-use ──
      try {
        structured = await callClaudeStructured(buildStructuredPrompt(), lang);
        if (!validStructured(structured)) throw new Error('structured_invalid');
        parsed = renderStructured(structured, isAr);
        order.forEach((k) => { if (!parsed[k] || !parsed[k].trim()) parsed[k] = failMsg; });
      } catch (structErr) {
        // structured failed → fall back to the proven path; never worse than before
        structured = null;
        setLoadingMsg(isAr ? 'إعادة المحاولة…' : 'Retrying…');
        parsed = await runFreeText();
      }

      // ── TABLE-ONLY: the [INTERACTIONS] section is generated entirely from the
      //    deterministic engine, replacing whatever the model produced (identical
      //    every run). Covers both the structured and free-text paths. The drug
      //    set is WIDENED to include any comorbid in-formulary disorder so the
      //    screen catches cross-protocol pairs.
      if (INTERACTIONS_ACTIVE && parsed) {
        const key = disorderKey(form.disorder);
        const cdn = comorbidDrugNames({
          primaryKey: key, comorbidities: form.comorbidities, recommendedDrugNames, FORMULARY,
        });
        // Split output: active prescription first, comorbid cross-protocol
        // cautions second (labelled conditional) — kills the alert-fatigue that
        // came from printing not-yet-prescribed comorbid alternatives as if they
        // were active conflicts. Single-disorder cases render one block as before.
        const ixArgs = {
          primaryFirstLine: cdn.primary.firstLine,
          primaryAdjunct:   cdn.primary.adjunct,
          comorbidFirstLine: cdn.comorbid.firstLine,
          comorbidAdjunct:   cdn.comorbid.adjunct,
          currentMeds: form.currentMeds, supplements: '',
          comorbidLabels: cdn.comorbid.keys, lang,
        };
        parsed.interactions = renderInteractionsReportSplit(ixArgs);
        // decision-first severity-triaged cards (most dangerous first)
        parsed.interactionsHTML = renderInteractionsHTML(ixArgs) || '';
      }

      // ── COMORBIDITY: deterministic, source-based merge layer. Surfaces the
      //    locked modifiers/cross-coverage for the primary protocol when a
      //    comorbid condition is entered. Section is hidden when empty.
      {
        const key = disorderKey(form.disorder);
        const cmReport = renderComorbidityReport({ primaryKey: key, comorbidities: form.comorbidities, lang });
        const medReport = MEDCOMORBID_ACTIVE
          ? renderMedicalComorbidityReport({ comorbidities: form.comorbidities, history: form.history, lang })
          : '';
        const combined = [cmReport, medReport].filter(Boolean).join('\n\n');
        if (parsed) parsed.comorbidity = combined || '';
        // Decision-first HTML overlay (reference-design cards) — injected raw in
        // the tab + doctor PDF, same path as the medications HTML.
        const cmHTML = renderComorbidityHTML({ primaryKey: key, comorbidities: form.comorbidities, history: form.history, lang });
        if (parsed) parsed.comorbidityHTML = cmHTML || '';
        setHideComorbidity(!combined);
      }

      // ── RX DETERMINISTIC SECTIONS: medications / labs / excluded / therapy /
      //    follow-up are built VERBATIM from rxFormulary (source of truth),
      //    overriding the model for these sections (same philosophy as the
      //    interaction table). The model still writes diet/chrono/bodycomp/
      //    supplements/nutrigenomics from the locked context.
      if (parsed) {
        const key = disorderKey(form.disorder);
        const rxMed  = renderRxMedications({ key, lang, form });
        const rxMedHTML = renderRxMedicationsHTML({ key, lang, form });
        const rxLab  = renderDynamicLabs({ key, form, lang });
        const rxExc  = renderRxExcluded({ key, lang });
        const rxThr  = renderRxTherapy({ key, lang });
        const rxFup  = renderRxFollowup({ key, lang });
        if (rxMed) parsed.medications = rxMed;
        if (rxMedHTML) parsed.medicationsHTML = rxMedHTML;
        if (rxLab) parsed.labs = rxLab;
        if (rxExc) parsed.excluded = rxExc;
        // Decision-first HTML for labs + excluded (injected raw, same path as meds).
        const labHTML = renderLabsHTML({ key, form, lang });
        const excHTML = renderExcludedHTML({ key, lang });
        if (labHTML) parsed.labsHTML = labHTML;
        if (excHTML) parsed.excludedHTML = excHTML;
        if (rxThr) parsed.therapy = rxThr;
        parsed.followup = rxFup || '';
        setHideFollowup(!rxFup);
        // Decision-first HTML for therapy (staged timeline + technique library as
        // `extra`) and follow-up (phases/monitoring/taper timeline).
        const techExtra = [renderTechniqueLibrary({ key, lang }), renderVagalToning({ lang })].filter(Boolean).join('\n');
        const thrHTML = renderTherapyHTML({ key, lang, extra: techExtra ? formatReportHTML(techExtra) : '' });
        const fupHTML = renderFollowupHTML({ key, lang });
        if (thrHTML) parsed.therapyHTML = thrHTML;
        if (fupHTML) parsed.followupHTML = fupHTML;

        // 🥗 Diet & 🧴 Supplements — deterministic from nutritionFormulary
        // (evidence-graded, with drug-supplement interaction & synergy safety).
        const nDiet = renderNutritionDiet({ key, lang });
        const nSupp = renderNutritionSupplements({ key, lang });
        if (nDiet) parsed.diet = nDiet;
        if (nSupp) parsed.supplements = nSupp;

        // 📊🍽️ Macros + carb/fat quality + meal architecture — deterministic,
        //    computed from computeMetrics (ED-gate + renal/muscle-aware protein↔fat
        //    logic). Non-empty only for disorders with a macroTemplate (GAD first);
        //    the other 4 append nothing until rolled out. 🦠 Psychobiotics → supplements.
        const macroBlock = renderMacrosAndMeals({ key, metrics: computeMetrics(form), form, lang });
        if (macroBlock) parsed.diet = [parsed.diet, macroBlock].filter(Boolean).join('\n');
        const psycho = renderPsychobioticsFor({ key, lang });
        if (psycho) parsed.supplements = [parsed.supplements, psycho].filter(Boolean).join('\n');

        // Decision-first HTML for diet + supplements — the macro/meal and
        // psychobiotics blocks are folded in as `extra` so NO content is lost.
        const dietHTML = renderDietHTML({ key, lang, extra: macroBlock ? formatReportHTML(macroBlock) : '' });
        const suppHTML = renderSupplementsHTML({ key, lang, extra: psycho ? formatReportHTML(psycho) : '' });
        if (dietHTML) parsed.dietHTML = dietHTML;
        if (suppHTML) parsed.supplementsHTML = suppHTML;

        // 🕐 Circadian & Chronotherapy — deterministic two-clock model
        // (central: light/sleep + drug chronotiming; peripheral: meal timing).
        const chr = renderChrono({ key, form, lang });
        if (chr) parsed.chrono = chr;
      }

      // ── GENETICS GATE: the nutrigenomics section is suppressed entirely when
      //    no known variants were entered (no model-fabricated SNP content). The
      //    tab/PDF section disappears; this note is a defensive fallback only.
      const genShown = hasGeneticInput(form);
      setHideGenetics(!genShown);
      if (parsed && !genShown) {
        parsed.nutrigenomics = isAr
          ? 'لم تُدخَل تغيرات جينية معروفة، لذلك حُذف هذا القسم. أدخل SNPs معروفة للحصول على توجيه دوائي/غذائي مبني على الجينات.'
          : 'No known genetic variants entered, so this section is omitted. Enter known SNPs to receive pharmacogenomic/nutrigenomic guidance.';
      }

      // ── DECISION-FIRST HTML for the remaining tabs, built once here after all
      //    parsed fields are final. bodycomp = deterministic metric tiles
      //    (overrides model text); chrono/interactions/nutrigenomics keep their
      //    content but are wrapped in the shared design shell for consistency.
      if (parsed) {
        const bcHTML = renderBodycompHTML({ form, lang });
        if (bcHTML) parsed.bodycompHTML = bcHTML;
        const wrap = (id, title, accent, sub) => {
          const html = wrapReportHTML({ title, accent, sub, bodyHTML: formatReportHTML(parsed[id]) });
          if (html) parsed[id + 'HTML'] = html;
        };
        const chrHTML = renderChronoHTML({ key: disorderKey(form.disorder), form, lang });
        if (chrHTML) parsed.chronoHTML = chrHTML;
        // interactionsHTML already built (severity cards) in the interactions block above.
        const genShownNow = hasGeneticInput(form);
        if (genShownNow && parsed.nutrigenomics) wrap('nutrigenomics', isAr ? '🧬 التغذية الجينية' : '🧬 Nutrigenomics', '#ec4899', isAr ? 'مبني على المتغيرات المُدخَلة' : 'gated on entered variants');
        // Phase D — Executive Summary (snapshot + red-flags banner + timeline).
        const sumHTML = renderSummaryHTML({ key: disorderKey(form.disorder), form, lang });
        if (sumHTML) parsed.summaryHTML = sumHTML;
      }

      setResults(parsed);
      setResultsStructured(structured);
      setActiveTab(parsed.summaryHTML ? 'summary' : 'medications');
      setChatMessages([{ role:'ai', text: T.chatSuccess }]);

      // ── #4 AUDIT LOG: record this generation (gated by AUDIT_ENABLED, never blocks) ──
      logGeneration({
        userId: currentUser?.uid || null,
        userEmail: currentUser?.email || null,
        disorder: form.disorder,
        severity: form.severity,
        lang,
        inputs: { ...form },
        formularyVersion: FORMULARY_VERSION,
        interactionsVersion: INTERACTIONS_VERSION,
        model: 'claude-sonnet-4-6',
        temperature: 0,
        path: structured ? 'structured' : 'free-text',
        sectionsStatus: order.map((k) => ({ section: k, ok: !!parsed[k] && parsed[k] !== failMsg })),
        output: parsed,
        structuredRaw: structured || null,
      });
    } catch(e) { setError(e.message); }
    setLoading(false); setLoadingMsg('');
  }

  async function sendChat() {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim(); setChatInput('');
    const msgs = [...chatMessages, { role:'user', text:msg }];
    setChatMessages(msgs); setChatLoading(true);
    try {
      const hist = msgs.map(m => `${m.role==='user'?(isAr?'الطبيب':'Physician'):(isAr?'المساعد':'Assistant')}: ${m.text}`).join('\n\n');
      const contextPrompt = isAr
        ? `${buildContext()}\n\nتاريخ المحادثة:\n${hist}\n\nسؤال الطبيب: ${msg}`
        : `${buildContext()}\n\nConversation history:\n${hist}\n\nPhysician question: ${msg}`;
      const reply = await callClaude(contextPrompt, lang);
      setChatMessages(p => [...p, { role:'ai', text:reply }]);
    } catch { setChatMessages(p => [...p, { role:'ai', text: T.chatError }]); }
    setChatLoading(false);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior:'smooth' }), 100);
  }

  return (
    <div className="min-h-screen pt-16" style={{ background:'linear-gradient(135deg,#070f0d 0%,#0d1a17 60%,#071210 100%)' }} dir={dir}>

      {/* Disclaimer + Lang Toggle */}
      <div className="mx-4 mt-4 flex items-start gap-3">
        <div className="flex-1 px-4 py-3 rounded-xl text-xs leading-relaxed"
          style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', color:'#fbbf24' }}>
          {T.disclaimer}
        </div>
        <LangToggle lang={lang} setLang={(l) => { setLang(l); setResults(null); setResultsStructured(null); setChatMessages([]); setActiveTab(null); }} />
      </div>

      <div className="flex flex-col md:flex-row gap-0" style={{ minHeight:'calc(100vh - 80px)' }}>

        {/* ── Form Panel ── */}
        <div className="w-full md:w-96 flex-shrink-0 border-b md:border-b-0 md:border-l border-white/8 p-5 md:overflow-y-auto md:sticky md:top-16"
          style={{ background:'rgba(13,26,23,0.95)' }}>

          <SectionLabel>{T.patientData}</SectionLabel>

          <FormInput label={T.patientName}>
            <input className={inputCls} placeholder={isAr ? 'أحمد محمد' : 'John Smith'} value={form.patientName} onChange={e=>set('patientName',e.target.value)} />
          </FormInput>

          <div className="grid grid-cols-2 gap-2">
            <FormInput label={T.age}><input className={inputCls} type="number" placeholder="35" value={form.age} onChange={e=>set('age',e.target.value)} /></FormInput>
            <FormInput label={T.gender}>
              <select className={inputCls} value={form.gender} onChange={e=>set('gender',e.target.value)}>
                <option value="">{T.chooseGender}</option>
                <option value="Male">{T.male}</option>
                <option value="Female">{T.female}</option>
              </select>
            </FormInput>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <FormInput label={T.weight}><input className={inputCls} type="number" placeholder="75" value={form.weight} onChange={e=>set('weight',e.target.value)} /></FormInput>
            <FormInput label={T.height}><input className={inputCls} type="number" placeholder="170" value={form.height} onChange={e=>set('height',e.target.value)} /></FormInput>
          </div>
          <FormInput label={T.disorder}>
            <select className={inputCls} value={form.disorder} onChange={e=>set('disorder',e.target.value)}>
              <option value="">{T.chooseDisorder}</option>
              {DISORDERS_DISPLAY.map(d=><option key={d}>{d}</option>)}
            </select>
          </FormInput>
          <FormInput label={T.severity}>
            <select className={inputCls} value={form.severity} onChange={e=>set('severity',e.target.value)}>
              <option value="">{T.chooseSev}</option>
              <option value="Mild">{T.mild}</option>
              <option value="Moderate">{T.moderate}</option>
              <option value="Severe">{T.severe}</option>
            </select>
          </FormInput>

          {form.disorder.includes('PMDD') && (
            <FormInput label={T.cyclePhase}>
              <select className={inputCls} value={form.cyclePhase} onChange={e=>set('cyclePhase',e.target.value)}>
                <option value="">{T.choosePhase}</option>
                <option value="Follicular">{T.follicular}</option>
                <option value="Luteal">{T.luteal}</option>
                <option value="Unknown">{T.phaseUnknown}</option>
              </select>
            </FormInput>
          )}
          <FormInput label={T.chronotype}>
            <select className={inputCls} value={form.chronotype} onChange={e=>set('chronotype',e.target.value)}>
              <option value="">{T.chooseCt}</option>
              <option value="Morning">{T.ctMorning}</option>
              <option value="Intermediate">{T.ctInter}</option>
              <option value="Evening">{T.ctEvening}</option>
              <option value="Unknown">{T.ctUnknown}</option>
            </select>
          </FormInput>

          <div className="text-[11px] font-semibold text-teal-500/70 mt-1 mb-1">{T.sleepHdr}</div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label={T.bedWork}>
              <input type="time" className={inputCls} value={form.sleepTime} onChange={e=>set('sleepTime',e.target.value)} />
            </FormInput>
            <FormInput label={T.wakeWork}>
              <input type="time" className={inputCls} value={form.wakeTime} onChange={e=>set('wakeTime',e.target.value)} />
            </FormInput>
            <FormInput label={T.bedFree}>
              <input type="time" className={inputCls} value={form.sleepTimeFree} onChange={e=>set('sleepTimeFree',e.target.value)} />
            </FormInput>
            <FormInput label={T.wakeFree}>
              <input type="time" className={inputCls} value={form.wakeTimeFree} onChange={e=>set('wakeTimeFree',e.target.value)} />
            </FormInput>
          </div>

          <div className="my-4 flex items-center gap-2">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-xs font-bold text-teal-500/60 uppercase tracking-widest">{T.medHistory}</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          {[
            { id:'comorbidities', label:T.comorbidities, ph:T.comorbPh },
            { id:'currentMeds',   label:T.currentMeds,   ph:T.currentMedsPh },
            { id:'allergies',     label:T.allergies,      ph:T.allergiesPh },
            { id:'history',       label:T.history,        ph:T.historyPh },
            { id:'stopMed',       label:T.stopMed,        ph:T.stopMedPh },
          ].map(f=>(
            <FormInput key={f.id} label={f.label}>
              <textarea className={`${inputCls} resize-y min-h-14 leading-relaxed`} placeholder={f.ph}
                value={form[f.id]} onChange={e=>set(f.id,e.target.value)} />
            </FormInput>
          ))}

          <div className="my-4 flex items-center gap-2">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-xs font-bold text-teal-500/60 uppercase tracking-widest">📊 DEXA / InBody</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          <label className="flex items-center gap-2 mb-2 text-sm cursor-pointer text-gray-300">
            <input type="checkbox" className="accent-teal-500" checked={form.hasDexa} onChange={e=>set('hasDexa',e.target.checked)} />
            {T.hasDexa}
          </label>
          {form.hasDexa && <div className="grid grid-cols-3 gap-2 mb-3">
            <FormInput label={T.fat}><input className={inputCls} placeholder="25" value={form.dexaFat} onChange={e=>set('dexaFat',e.target.value)} /></FormInput>
            <FormInput label={T.muscle}><input className={inputCls} placeholder="35" value={form.dexaMuscle} onChange={e=>set('dexaMuscle',e.target.value)} /></FormInput>
            <FormInput label={T.bone}><input className={inputCls} placeholder="1.2" value={form.dexaBone} onChange={e=>set('dexaBone',e.target.value)} /></FormInput>
          </div>}

          <label className="flex items-center gap-2 mb-2 text-sm cursor-pointer text-gray-300">
            <input type="checkbox" className="accent-teal-500" checked={form.hasInbody} onChange={e=>set('hasInbody',e.target.checked)} />
            {T.hasInbody}
          </label>
          {form.hasInbody && <div className="grid grid-cols-3 gap-2 mb-3">
            <FormInput label={T.fat}><input className={inputCls} placeholder="25" value={form.inbodyFat} onChange={e=>set('inbodyFat',e.target.value)} /></FormInput>
            <FormInput label={T.muscle}><input className={inputCls} placeholder="35" value={form.inbodyMuscle} onChange={e=>set('inbodyMuscle',e.target.value)} /></FormInput>
            <FormInput label={T.water}><input className={inputCls} placeholder="30" value={form.inbodyWater} onChange={e=>set('inbodyWater',e.target.value)} /></FormInput>
          </div>}

          <label className="flex items-start gap-2 mt-1 mb-2 text-sm cursor-pointer text-amber-300/90 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
            <input type="checkbox" className="accent-amber-500 mt-0.5" checked={form.hasEatingDisorder} onChange={e=>set('hasEatingDisorder',e.target.checked)} />
            <span>⚠ {T.edHistory}<br/><span className="text-xs text-amber-300/50">{T.edHint}</span></span>
          </label>

          <div className="my-4 flex items-center gap-2">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-xs font-bold text-teal-500/60 uppercase tracking-widest">🧬 {T.genetics}</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          <FormInput label={T.geneticSNPs}>
            <textarea className={`${inputCls} resize-y min-h-14 leading-relaxed`}
              placeholder={T.geneticPh}
              value={form.knownGeneticVariants} onChange={e=>set('knownGeneticVariants',e.target.value)} />
          </FormInput>

          {error && (
            <div className="mb-3 px-3 py-2.5 rounded-xl text-sm leading-relaxed"
              style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#f87171' }}>
              {error}
            </div>
          )}

          <button
            onClick={analyze} disabled={loading}
            className="w-full py-3.5 rounded-xl text-white font-bold text-sm mt-1 transition-all"
            style={{ background: loading ? 'rgba(74,155,142,0.4)' : 'linear-gradient(135deg,#4a9b8e,#5bb8c4)', cursor: loading?'not-allowed':'pointer' }}>
            {loading ? `⏳ ${T.analyzingBtn}` : T.analyzeBtn}
          </button>
        </div>

        {/* ── Results Panel ── */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">

          {!loading && !results && (
            <div className="flex flex-col items-center justify-center h-full min-h-96 text-center gap-4">
              <div className="text-6xl opacity-20">🩺</div>
              <h3 className="text-gray-300 font-bold text-lg">{T.emptyTitle}</h3>
              <p className="text-gray-500 text-sm max-w-xs leading-relaxed">{T.emptyNote}</p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center h-full min-h-96 gap-5">
              <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-teal-400 animate-spin" />
              <div className="text-gray-300 font-semibold">{T.analyzing}</div>
              <div className="text-teal-400 text-sm animate-pulse">{loadingMsg}</div>
              <div className="text-gray-600 text-xs">{T.analyzingNote}</div>
            </div>
          )}

          {results && (<>
            {/* Report header */}
            <div className="flex justify-between items-center mb-5 p-4 rounded-2xl" style={{ background:'rgba(13,26,23,0.8)', border:'1px solid rgba(255,255,255,0.08)' }}>
              <div>
                <div className="font-bold text-white text-base">{form.patientName?`${form.patientName} — `:''}{T.reportLabel}: {form.disorder}</div>
                <div className="text-xs text-gray-500 mt-1">{form.gender} | {form.age}{T.yrs} {form.weight?`| ${form.weight}${T.kg}`:''} | {T.severity_lbl}: {form.severity||T.unspecified}</div>
              </div>
              <div className="text-center px-4 py-2 rounded-xl text-xs font-semibold"
                style={{ background:'rgba(74,155,142,0.12)', border:'1px solid rgba(74,155,142,0.3)', color:'#5fbfb0' }}>
                {T.analyzed}<br /><span className="opacity-60 text-[10px]">{T.physDecision}</span>
              </div>
            </div>

            {/* PDF buttons */}
            <div className="flex flex-col sm:flex-row gap-2 mb-5">
              <button onClick={()=>generatePDF(form,results,'doctor',lang)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{ border:'1px solid rgba(74,155,142,0.4)', color:'#5fbfb0', background:'transparent' }}>
                {T.pdfDoctor}
              </button>
              <button onClick={()=>generatePDF(form,results,'patient',lang)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{ border:'1px solid rgba(91,184,196,0.4)', color:'#5bb8c4', background:'transparent' }}>
                {T.pdfPatient}
              </button>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {SECTIONS.filter(sec => (sec.id !== 'nutrigenomics' || !hideGenetics) && (sec.id !== 'comorbidity' || !hideComorbidity) && (sec.id !== 'followup' || !hideFollowup)).map(sec=>(
                <button key={sec.id}
                  onClick={()=>setActiveTab(activeTab===sec.id?null:sec.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    border:`1px solid ${activeTab===sec.id?sec.color:'rgba(255,255,255,0.08)'}`,
                    background: activeTab===sec.id?sec.color+'22':'transparent',
                    color: activeTab===sec.id?sec.color:'#64748b',
                    fontFamily: isAr ? 'Cairo,sans-serif' : 'Inter,sans-serif'
                  }}>
                  {sec.icon} {sec.title}
                </button>
              ))}
            </div>

            {/* Active section */}
            {activeTab && (
              <Card className="mb-4">
                <div className="flex items-center gap-3 mb-4 pb-3" style={{ borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
                  <span className="text-2xl">{SECTIONS.find(s=>s.id===activeTab)?.icon}</span>
                  <span className="font-bold text-white">{SECTIONS.find(s=>s.id===activeTab)?.title}</span>
                </div>
                {results[activeTab + 'HTML'] ? (
                  <div className="text-sm"
                    dangerouslySetInnerHTML={{ __html: results[activeTab + 'HTML'] }} />
                ) : (
                  <div className="text-sm leading-loose text-gray-400 whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: formatReportHTML(results[activeTab]) }} />
                )}
              </Card>
            )}

            {/* Chat */}
            <Card>
              <div className="flex items-center gap-2 mb-4 pb-3 font-bold text-sm" style={{ borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
                <span>💬</span> {T.chatTitle}
              </div>
              <div className="flex flex-col gap-3 max-h-72 overflow-y-auto mb-3">
                {chatMessages.map((m,i)=>(
                  <div key={i} className={`px-3.5 py-2.5 rounded-xl text-sm leading-relaxed max-w-[85%] whitespace-pre-wrap ${
                    m.role==='user' ? 'self-start' : 'self-end text-gray-400'
                  }`}
                  style={m.role==='user'
                    ? { background:'rgba(74,155,142,0.15)', border:'1px solid rgba(74,155,142,0.2)', color:'#e2e8f0' }
                    : { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
                    {m.text}
                  </div>
                ))}
                {chatLoading && <div className="self-end px-3.5 py-2.5 rounded-xl text-sm text-gray-500 animate-pulse"
                  style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>{T.chatThinking}</div>}
                <div ref={chatEndRef} />
              </div>
              <div className="flex gap-2">
                <input
                  className={`${inputCls} flex-1`}
                  placeholder={T.chatPh}
                  value={chatInput} onChange={e=>setChatInput(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&sendChat()} />
                <button onClick={sendChat} disabled={chatLoading}
                  className="px-4 rounded-xl text-white font-bold text-lg transition-opacity"
                  style={{ background:'#4a9b8e', opacity:chatLoading?0.5:1 }}>↩</button>
              </div>
            </Card>
          </>)}
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════
   PAGE WRAPPER WITH ACCESS GUARD
════════════════════════════════════════════════ */
const ClinicalToolPage = () => {
  const navigate = useNavigate();
  const access = useClinicalAccess();

  if (access === 'loading') return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background:'linear-gradient(135deg,#070f0d 0%,#0d1a17 60%,#071210 100%)' }}>
      <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-teal-400 animate-spin" />
    </div>
  );

  if (access === 'no_account') return (
    <GateScreen icon="🔐" title="For Subscribers Only"
      subtitle="Sign in or subscribe to access the clinical tool">
      <button onClick={()=>navigate('/login')}
        className="px-8 py-3 rounded-xl text-white font-bold"
        style={{ background:'linear-gradient(135deg,#4a9b8e,#5bb8c4)' }}>
        Sign In
      </button>
    </GateScreen>
  );

  if (access === 'no_access') return (
    <GateScreen icon="💼" title="Subscribe to the Clinical Tool"
      subtitle="Get full access to the integrated clinical decision support tool">
      <button onClick={()=>navigate('/pricing')}
        className="px-8 py-3 rounded-xl text-white font-bold"
        style={{ background:'linear-gradient(135deg,#4a9b8e,#5bb8c4)' }}>
        Subscribe Now
      </button>
    </GateScreen>
  );

  if (access === 'expired') return (
    <GateScreen icon="⏰" title="Subscription Expired"
      subtitle="Renew your subscription to continue using the clinical tool">
      <button onClick={()=>navigate('/pricing')}
        className="px-8 py-3 rounded-xl text-white font-bold"
        style={{ background:'linear-gradient(135deg,#4a9b8e,#5bb8c4)' }}>
        Renew Subscription
      </button>
    </GateScreen>
  );

  return (
    <>
      <Header />
      <ClinicalTool />
    </>
  );
};

export default ClinicalToolPage;
