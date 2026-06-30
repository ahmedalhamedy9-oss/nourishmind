/* ════════════════════════════════════════════════════════════════════════
   comorbidityEngine.js — DETERMINISTIC comorbidity layer
   ────────────────────────────────────────────────────────────────────────
   primary disorder = the one in the disorder tab (drives the base protocol).
   comorbid input   = free text in the comorbidity tab (EN or AR).

   This engine does NOT invent: it only surfaces source-based rules that are
   already locked in rxFormulary.js (comorbidityModifiers + crossCoverage),
   and it widens the locked interaction screen to cover the comorbid
   disorder's drugs too. All output is reproducible every run.
   ════════════════════════════════════════════════════════════════════════ */
import { RX, RX_ACTIVE } from './rxFormulary';

/* Concept → match terms (English seeds + Arabic). Used to bridge the English
   `ifComorbid` rule strings to Arabic free-text the physician may type. */
const CONCEPTS = {
  bipolar:    ['bipolar', 'mania', 'manic', 'ثنائي القطب', 'ثنائي', 'هوس'],
  substance:  ['substance', 'alcohol', 'drug use', 'إدمان', 'مخدر', 'مخدرات', 'كحول', 'تعاطي'],
  cardiac:    ['cardiac', 'long qt', 'qt', 'arrhythmia', 'heart', 'قلب', 'قلبية', 'نظم', 'اضطراب نظم'],
  pain:       ['chronic pain', 'pain', 'fibromyalgia', 'neuropathic', 'ألم', 'الألم', 'فيبروما', 'اعتلال عصبي', 'عصبي'],
  ocd:        ['ocd', 'obsessive', 'وسواس', 'الوسواس'],
  mdd:        ['depress', 'mdd', 'major depressive', 'اكتئاب', 'الاكتئاب'],
  gad:        ['anxiety', 'gad', 'generalized anxiety', 'قلق', 'القلق'],
  ptsd:       ['ptsd', 'post-traumatic', 'trauma', 'صدمة', 'كرب', 'الكرب'],
  panic:      ['panic', 'هلع', 'الهلع'],
  pregnancy:  ['pregnan', 'childbearing', 'breastfeed', 'lactation', 'حمل', 'حامل', 'مرضع', 'رضاعة', 'الإنجاب'],
  insomnia:   ['insomnia', 'أرق', 'الأرق', 'نوم'],
  eating:     ['eating disorder', 'bulimia', 'anorexia', 'نهام', 'بوليميا', 'فقدان الشهية', 'اضطراب الأكل', 'اضطراب اكل'],
  seizure:    ['seizure', 'epilep', 'صرع', 'الصرع', 'تشنج'],
  migraine:   ['migraine', 'aura', 'صداع نصفي', 'شقيقة', 'أورة', 'هالة'],
  vte:        ['vte', 'thromb', 'embol', 'جلطة', 'تخثر', 'انصمام'],
  smoker:     ['smok', 'مدخن', 'تدخين'],
  tics:       ['tic', 'tourette', 'عرات', 'توريت', 'لزمة'],
  pmdd:       ['pmdd', 'premenstrual', 'سابق للطمث', 'ما قبل الطمث', 'سابق للحيض'],
};

/* the 5 in-formulary disorders (for cross-protocol interaction widening) */
const DISORDER_CONCEPT = { MDD: 'mdd', GAD: 'gad', OCD: 'ocd', PMDD: 'pmdd' /* BPD intentionally absent: no drug protocol */ };

function norm(s) { return String(s || '').toLowerCase(); }

/* does the patient's free text reference a concept? */
function textHasConcept(text, concept) {
  const t = norm(text);
  return (CONCEPTS[concept] || []).some((term) => t.includes(norm(term)));
}

/* which concepts does an English rule string (`ifComorbid`) reference? */
function ruleConcepts(ifComorbid) {
  const s = norm(ifComorbid);
  return Object.keys(CONCEPTS).filter((c) =>
    (CONCEPTS[c] || []).some((term) => /[a-z]/.test(term) && s.includes(norm(term)))
  );
}

/* a rule fires if any of its concepts is present in the patient text */
function ruleMatches(ifComorbid, text) {
  const cons = ruleConcepts(ifComorbid);
  if (!cons.length) {
    // fallback: direct token match on the rule's own first words
    return norm(ifComorbid).split('|').some((tok) => {
      const w = tok.trim().split(/\s+/).find((x) => x.length >= 4);
      return w && norm(text).includes(w);
    });
  }
  return cons.some((c) => textHasConcept(text, c));
}

/* detect which of the 5 formulary disorders appear as comorbid (excl. primary) */
export function detectComorbidDisorders(text = '', excludeKey = null) {
  return Object.keys(DISORDER_CONCEPT).filter(
    (k) => k !== excludeKey && textHasConcept(text, DISORDER_CONCEPT[k])
  );
}

const ACTION_TAG = (action, isAr) => {
  const a = norm(action);
  if (a.includes('avoid')) return isAr ? '⛔ تجنّب' : '⛔ AVOID';
  if (a.includes('prefer')) return isAr ? '✅ فضّل' : '✅ PREFER';
  if (a.includes('caution')) return isAr ? '⚠️ احذر' : '⚠️ CAUTION';
  if (a.includes('refer')) return isAr ? '↗️ حوّل' : '↗️ REFER';
  if (a.includes('adjust')) return isAr ? '🔧 عدّل' : '🔧 ADJUST';
  return isAr ? 'ℹ️ ملاحظة' : 'ℹ️ NOTE';
};

/* ── Deterministic [COMORBIDITY] block ────────────────────────────────── */
export function renderComorbidityReport({ primaryKey, comorbidities = '', lang = 'en' } = {}) {
  if (!RX_ACTIVE) return '';
  const isAr = lang === 'ar';
  const d = RX[primaryKey];
  if (!d || d.__pending) return '';
  const text = String(comorbidities || '').trim();
  if (!text) return '';

  const mods = (d.comorbidityModifiers || []).filter((m) => ruleMatches(m.ifComorbid, text));
  const cross = (d.crossCoverage || []).filter((c) => ruleMatches(c.comorbid, text));
  if (!mods.length && !cross.length) return '';

  const L = [];
  L.push(isAr
    ? `خطة واعية بالاعتلال المصاحب (الأساسي: ${d.label}؛ المُدخَل: "${text}")`
    : `COMORBIDITY-AWARE PLAN (primary: ${d.label}; comorbid input: "${text}")`);
  L.push(isAr
    ? 'الاضطراب الأساسي يقود البروتوكول الأساسي بالأعلى. التعديلات التالية مصدرية وتُطبَّق على اختيار الدواء داخل البروتوكول الأساسي:'
    : 'The primary disorder drives the base protocol above. The following source-based modifiers apply to drug SELECTION within that protocol:');

  if (cross.length) {
    L.push(isAr ? '\nتغطية متقاطعة (دواء واحد يغطّي الاتنين):' : '\nCROSS-COVERAGE (one agent for both):');
    cross.forEach((c) => L.push(`- ${c.comorbid} → ${c.agent}: ${c.note} [${(c.src || []).join('; ')}]`));
  }
  if (mods.length) {
    L.push(isAr ? '\nتعديلات على البروتوكول الأساسي:' : '\nMODIFIERS (adjust the primary protocol):');
    mods.forEach((m) => L.push(`- ${ACTION_TAG(m.action, isAr)} [${m.target}]: ${m.rule} [${(m.src || []).join('; ')}]`));
  }

  const others = detectComorbidDisorders(text, primaryKey);
  L.push(isAr
    ? `\nملاحظة: جدول التعارضات المقفول يفحص أزواج الأدوية عبر البروتوكولين${others.length ? ' (شمل أدوية: ' + others.join(', ') + ')' : ''}.`
    : `\nNote: the locked interaction table screens drug pairs across BOTH protocols${others.length ? ' (included: ' + others.join(', ') + ')' : ''}.`);

  return L.join('\n');
}

/* ── Widen the interaction screen: primary + comorbid disorders' drug names ─ */
export function comorbidDrugNames({ primaryKey, comorbidities = '', recommendedDrugNames, FORMULARY }) {
  const keys = [primaryKey, ...detectComorbidDisorders(comorbidities, primaryKey)];
  const firstLine = [];
  const adjunct = [];
  keys.forEach((k) => {
    if (!FORMULARY[k]) return;
    const r = recommendedDrugNames(FORMULARY[k]);
    firstLine.push(...(r.firstLine || []));
    adjunct.push(...(r.adjunct || []));
  });
  return { firstLine: [...new Set(firstLine)], adjunct: [...new Set(adjunct)], disorders: keys };
}
