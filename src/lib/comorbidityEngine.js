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
import { getMedicalComorbidityUnits, MEDCOMORBID_ACTIVE, MEDCOMORBID_VERSION } from './medicalComorbidityEngine';

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

/* ── Structured accessor: the matched psychiatric modifiers / cross-coverage ─ */
export function getComorbidityOverlay({ primaryKey, comorbidities = '' } = {}) {
  const empty = { mods: [], cross: [], others: [], label: '' };
  if (!RX_ACTIVE) return empty;
  const d = RX[primaryKey];
  if (!d || d.__pending) return empty;
  const text = String(comorbidities || '').trim();
  if (!text) return empty;
  return {
    mods:  (d.comorbidityModifiers || []).filter((m) => ruleMatches(m.ifComorbid, text)),
    cross: (d.crossCoverage || []).filter((c) => ruleMatches(c.comorbid, text)),
    others: detectComorbidDisorders(text, primaryKey),
    label: d.label,
  };
}

/* ════════════════════════════════════════════════════════════════════════
   🔗 COMORBIDITY — DECISION-FIRST HTML overlay (reference-design faithful).
   Renders the locked psychiatric modifiers/cross-coverage AND the medical-
   comorbidity units as decision cards (same .pd- token family as the meds
   renderer). Injected raw (bypasses the markdown escaper). Nothing invented:
   every row is source-backed and rendered VERBATIM from the locked data.
   pdf:true renders collapsibles OPEN (doctor record must be complete).
   ════════════════════════════════════════════════════════════════════════ */
const CO_E = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const CO_SRC = (a) => (a && a.length ? `<div class="pd-src">src: ${CO_E(a.join(' · '))}</div>` : '');
/* action → {label, css-class} for the coloured decision tag */
function coTag(action) {
  const a = String(action || '').toLowerCase();
  if (a.includes('avoid') && a.includes('cap')) return { t: '⛔🔧 AVOID / CAP', c: 'pd-co-avoid' };
  if (a.includes('avoid'))   return { t: '⛔ AVOID',    c: 'pd-co-avoid' };
  if (a.includes('prefer'))  return { t: '✅ PREFER',   c: 'pd-co-prefer' };
  if (a.includes('caution')) return { t: '⚠️ CAUTION',  c: 'pd-co-caution' };
  if (a.includes('adjust'))  return { t: '🔧 ADJUST',   c: 'pd-co-adjust' };
  if (a.includes('ensure'))  return { t: '✅ ENSURE',   c: 'pd-co-prefer' };
  if (a.includes('distinguish') || a.includes('treat')) return { t: '🩺 TREAT', c: 'pd-co-adjust' };
  if (a.includes('refer'))   return { t: '↗️ REFER',    c: 'pd-co-adjust' };
  return { t: 'ℹ️ NOTE', c: 'pd-co-note' };
}
function coRuleRow(item, ruleField = 'rule', nameField = null) {
  const tag = coTag(item.action);
  const name = nameField && item[nameField] ? `<strong>${CO_E(item[nameField])}</strong> — ` : '';
  return `<div class="pd-co-row"><span class="pd-co-tag ${tag.c}">${tag.t}</span>`
    + `<div class="pd-co-txt">${name}${CO_E(item[ruleField] || '')}${CO_SRC(item.src)}</div></div>`;
}
const CO_STYLE = `<style>
.pd-co{font-family:Inter,system-ui,sans-serif;color:#cbd5e1;background:linear-gradient(135deg,#070f0d,#0d1a17);padding:16px;border-radius:14px;font-size:13.5px;line-height:1.5;direction:ltr}
.pd-co .pd-hd{color:#0ea5e9;font-weight:800;font-size:15px}
.pd-co .pd-sub{color:#64748b;font-size:11.5px;margin-bottom:8px}
.pd-co .pd-note{color:#8b98a5;font-size:12px;margin:2px 0 8px}
.pd-co .pd-gd{color:#0ea5e9;font-weight:800;font-size:11px;letter-spacing:.05em;text-transform:uppercase;margin:16px 0 6px;border-top:1px solid rgba(255,255,255,.08);padding-top:12px}
.pd-co .pd-gd2{color:#7fe0d0;font-weight:700;font-size:11px;letter-spacing:.03em;text-transform:uppercase;margin:10px 0 4px}
.pd-co .pd-card{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.08);border-left:3px solid #0ea5e9;border-radius:11px;padding:12px 13px;margin:9px 0}
.pd-co .pd-drug{font-size:14.5px;margin-bottom:6px;display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.pd-co .pd-drug strong{color:#fff;font-weight:700}
.pd-co .pd-bdg{font-size:10px;font-weight:700;padding:2px 7px;border-radius:6px;border:1px solid rgba(14,165,233,.3);color:#7dc9ef;background:rgba(14,165,233,.12)}
.pd-co .pd-co-row{display:flex;gap:8px;margin:6px 0;align-items:flex-start}
.pd-co .pd-co-tag{flex:none;font-size:10px;font-weight:700;border-radius:5px;padding:2px 7px;white-space:nowrap;margin-top:1px}
.pd-co .pd-co-txt{color:#c2cdd6;font-size:12px;line-height:1.45}
.pd-co .pd-co-txt strong{color:#e2e8f0}
.pd-co .pd-co-avoid{color:#f09595;background:rgba(163,45,45,.16)}
.pd-co .pd-co-prefer{color:#97c459;background:rgba(59,109,17,.16)}
.pd-co .pd-co-caution{color:#e0b872;background:rgba(186,117,23,.14)}
.pd-co .pd-co-adjust{color:#85b7eb;background:rgba(55,138,221,.14)}
.pd-co .pd-co-note{color:#9aa8b5;background:rgba(255,255,255,.05)}
.pd-co .pd-mini{font-size:10.5px;font-weight:700;color:#0ea5e9;text-transform:uppercase;letter-spacing:.04em;margin:9px 0 3px}
.pd-co .pd-ceil{display:flex;flex-wrap:wrap;gap:6px;align-items:baseline;font-size:12px;margin:3px 0;color:#c2cdd6}
.pd-co .pd-ceil b{color:#fac775;font-weight:700}
.pd-co .pd-src{font-size:10px;color:#61707b;margin-top:2px}
.pd-co .pd-refer{margin:8px 0 2px;font-size:12px;color:#7dc9ef;background:rgba(14,165,233,.08);border-radius:8px;padding:7px 10px}
.pd-co .pd-refer .k{font-weight:700;color:#0ea5e9}
.pd-co .pd-foot{font-size:10.5px;color:#61707b;margin-top:12px;border-top:1px solid rgba(255,255,255,.06);padding-top:8px}
.pd-co details.pd-exp{margin:6px 0 0;padding-top:6px;border-top:1px dashed rgba(255,255,255,.1)}
.pd-co details.pd-exp>summary{cursor:pointer;color:#6b7d8a;font-size:11.5px;font-weight:700;list-style:none}
.pd-co details.pd-exp>summary::-webkit-details-marker{display:none}
.pd-co details.pd-exp>summary::before{content:"▸ ";color:#0ea5e9}
.pd-co details.pd-exp[open]>summary::before{content:"▾ "}
</style>`;

function coMedicalCard(u, pdf) {
  const open = pdf ? ' open' : '';
  const drugAdjust = (u.drugAdjust || []).map((d) => coRuleRow(d, 'rule', 'agent')).join('');
  const ceilings = (u.doseCeilings || []).length
    ? `<div class="pd-mini">Dose ceilings</div>`
      + u.doseCeilings.map((c) => `<div class="pd-ceil"><b>${CO_E(c.agent)} ≤ ${CO_E(c.ceiling)}</b> — <span style="color:#93a3af">${CO_E(c.condition)}</span>${CO_SRC(c.src)}</div>`).join('')
    : '';
  const contra = (u.contraindic || []).length
    ? `<div class="pd-mini">Contraindications / cautions</div>`
      + u.contraindic.map((c) => `<div class="pd-co-row"><span class="pd-co-tag pd-co-avoid">⛔</span><div class="pd-co-txt">${CO_E(c.rule)}${CO_SRC(c.src)}</div></div>`).join('')
    : '';
  const nutrition = (u.nutrition || []).length
    ? `<div class="pd-mini">Nutrition (psych–medical intersection)</div>` + u.nutrition.map((x) => coRuleRow(x, 'rule', 'item')).join('')
    : '';
  const supplements = (u.supplements || []).length
    ? `<div class="pd-mini">Supplements</div>` + u.supplements.map((x) => coRuleRow(x, 'rule', 'item')).join('')
    : '';
  const labs = u.labsRef ? `<div class="pd-co-row"><span class="pd-co-tag pd-co-note">🩸 LABS</span><div class="pd-co-txt">${CO_E(u.labsRef)}${CO_SRC(u.labsSrc)}</div></div>` : '';
  const chrono = u.chrono ? `<div class="pd-co-row"><span class="pd-co-tag pd-co-note">⏱️ CHRONO</span><div class="pd-co-txt">${CO_E(u.chrono)}</div></div>` : '';
  const referral = u.referral ? `<div class="pd-refer"><span class="k">↗️ Referral & team:</span> ${CO_E(u.referral)}${CO_SRC(u.referralSrc)}</div>` : '';
  // Primary decision content (drug selection) is always open; the rest folds into an expandable.
  const detail = (labs || nutrition || supplements || chrono)
    ? `<details class="pd-exp"${open}><summary>Nutrition · supplements · labs · chrono</summary>${labs}${nutrition}${supplements}${chrono}</details>`
    : '';
  return `<div class="pd-card"><div class="pd-drug"><strong>${CO_E(u.label?.en || '')}</strong><span class="pd-bdg">medical comorbidity</span></div>`
    + (drugAdjust ? `<div class="pd-mini">Psychotropic selection</div>${drugAdjust}` : '')
    + ceilings + contra + detail + referral
    + `</div>`;
}

export function renderComorbidityHTML({ primaryKey, comorbidities = '', history = '', lang = 'en', pdf = false } = {}) {
  if (!RX_ACTIVE) return '';
  const psych = getComorbidityOverlay({ primaryKey, comorbidities });
  const medUnits = MEDCOMORBID_ACTIVE ? getMedicalComorbidityUnits({ comorbidities, history }) : [];
  const hasPsych = psych.mods.length || psych.cross.length;
  if (!hasPsych && !medUnits.length) return '';

  const out = [CO_STYLE, `<div class="pd-co">`];
  out.push(`<div class="pd-hd">🔗 Comorbidity-Aware Plan${psych.label ? ` — ${CO_E(psych.label)}` : ''}</div>`);
  out.push(`<div class="pd-sub">primary disorder drives the base protocol · these source-based modifiers adjust drug SELECTION</div>`);

  if (hasPsych) {
    out.push(`<div class="pd-gd">Psychiatric comorbidity</div>`);
    if (psych.cross.length) {
      out.push(`<div class="pd-gd2">Cross-coverage — one agent for both</div>`);
      psych.cross.forEach((c) => out.push(
        `<div class="pd-co-row"><span class="pd-co-tag pd-co-prefer">✅ ${CO_E(c.comorbid)}</span>`
        + `<div class="pd-co-txt"><strong>${CO_E(c.agent)}</strong> — ${CO_E(c.note)}${CO_SRC(c.src)}</div></div>`));
    }
    if (psych.mods.length) {
      out.push(`<div class="pd-gd2">Modifiers — adjust the primary protocol</div>`);
      psych.mods.forEach((m) => out.push(coRuleRow(m, 'rule', 'target')));
    }
    if (psych.others.length)
      out.push(`<div class="pd-note">The locked interaction table screens drug pairs across BOTH protocols (included: ${CO_E(psych.others.join(', '))}).</div>`);
  }

  if (medUnits.length) {
    out.push(`<div class="pd-gd">Medical comorbidity</div>`);
    out.push(`<div class="pd-note">Psychiatric-protocol adjustments below are source-based; internal-medicine care is handled by specialty referral, not by inventing a protocol.</div>`);
    medUnits.forEach((u) => out.push(coMedicalCard(u, pdf)));
  }

  out.push(`<div class="pd-foot">Deterministic overlay · every row source-backed · medical layer ${CO_E(MEDCOMORBID_VERSION)}</div>`);
  out.push(`</div>`);
  return out.join('');
}

/* ── Widen the interaction screen: primary + comorbid disorders' drug names ─ */
export function comorbidDrugNames({ primaryKey, comorbidities = '', recommendedDrugNames, FORMULARY }) {
  const comorbidKeys = detectComorbidDisorders(comorbidities, primaryKey);
  const keys = [primaryKey, ...comorbidKeys];
  const pull = (k) => (FORMULARY[k] ? recommendedDrugNames(FORMULARY[k]) : { firstLine: [], adjunct: [] });

  // primary protocol (the active prescription base)
  const p = pull(primaryKey);
  const primary = {
    firstLine: [...new Set(p.firstLine || [])],
    adjunct: [...new Set(p.adjunct || [])],
  };

  // comorbid protocols only (drugs that would be ADDED if the physician treats them)
  const cFirst = [];
  const cAdj = [];
  comorbidKeys.forEach((k) => {
    const r = pull(k);
    cFirst.push(...(r.firstLine || []));
    cAdj.push(...(r.adjunct || []));
  });
  const comorbid = {
    firstLine: [...new Set(cFirst)],
    adjunct: [...new Set(cAdj)],
    keys: comorbidKeys,
  };

  return {
    // merged view (backward-compatible with earlier callers)
    firstLine: [...new Set([...primary.firstLine, ...comorbid.firstLine])],
    adjunct: [...new Set([...primary.adjunct, ...comorbid.adjunct])],
    disorders: keys,
    // split view (used by renderInteractionsReportSplit)
    primary,
    comorbid,
  };
}
