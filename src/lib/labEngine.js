/* ════════════════════════════════════════════════════════════════════════
   labEngine.js — DYNAMIC, case-aware lab tiering (deterministic, no API)
   ────────────────────────────────────────────────────────────────────────
   Starts from the disorder's locked lab tiers (rxFormulary) and ESCALATES /
   ADDS labs based on the WHOLE case: comorbidities, current meds, allergies,
   age, and computed BMI. Every added/escalated lab carries its TRIGGER and
   source. Pure data logic — the model never decides labs.
   ════════════════════════════════════════════════════════════════════════ */
import { RX, RX_ACTIVE } from './rxFormulary';

const LAB_SRC = {
  GEN:  'General prescribing safety (SmPC/standard monitoring).',
  QT:   'QT monitoring — FDA/CredibleMeds (correct K⁺/Mg²⁺; ECG).',
  LI:   'Lithium therapeutic monitoring (level, renal, thyroid).',
  PREG:'Teratogen avoidance — pregnancy test before valproate/topiramate; avoid paroxetine.',
  SSRI_BLEED: 'SSRI/SNRI bleeding risk with anticoagulant/NSAID.',
  HEP:  'Hepatic clearance / hepatotoxic agents (duloxetine, valproate, agomelatine).',
  REN:  'Renal dosing (pregabalin, lithium, venlafaxine).',
  ELD:  'Elderly — hyponatraemia (Na⁺), renal decline, fall/ECG risk.',
  MET:  'Metabolic monitoring (antipsychotic / weight-gain agents / obesity).',
};
const LS = (k) => LAB_SRC[k] || k;

/* concept → match terms (EN + AR) for case detection */
const C = {
  hepatic:    ['hepat', 'liver', 'cirrhos', 'كبد', 'الكبد', 'تليف', 'كبدي'],
  renal:      ['renal', 'kidney', 'ckd', 'nephro', 'كلى', 'الكلى', 'كلوي', 'قصور كلوي'],
  cardiac:    ['cardiac', 'heart', 'arrhythm', 'long qt', ' qt', 'ischaem', 'ischem', 'قلب', 'قلبية', 'نظم', 'ذبحة'],
  diabetes:   ['diabet', 'prediabet', 'insulin resist', 'سكري', 'السكري', 'سكر', 'مقاومة الانسولين'],
  thyroid:    ['thyroid', 'hypothyroid', 'hyperthyroid', 'درقية', 'الدرقية', 'غدة'],
  bleeding:   ['bleed', 'anticoag', 'warfarin', 'doac', 'apixaban', 'rivaroxaban', 'nsaid', 'نزيف', 'سيولة', 'مضاد تجلط', 'وارفارين'],
  pregnancy:  ['pregnan', 'gravid', 'childbearing', 'حمل', 'حامل', 'الإنجاب'],
  obesity:    ['obes', 'overweight', 'سمنة', 'بدانة', 'وزن زائد'],
  substance:  ['alcohol', 'substance', 'drug use', 'كحول', 'إدمان', 'مخدر', 'تعاطي'],
  epilepsy:   ['epilep', 'seizure', 'صرع', 'تشنج'],
  lithium:    ['lithium', 'ليثيوم'],
  qtmed:      ['amiodarone', 'sotalol', 'methadone', 'antipsychotic', 'haloperidol', 'quetiapine', 'risperidone', 'ميثادون', 'أميودارون'],
};
const norm = (s) => String(s || '').toLowerCase();
const has = (text, concept) => (C[concept] || []).some((t) => norm(text).includes(norm(t)));

function bmiOf(form) {
  const w = parseFloat(form?.weight), h = parseFloat(form?.height);
  if (!w || !h) return null;
  return +(w / Math.pow(h / 100, 2)).toFixed(1);
}

/* a lab item: { test, tier:'required'|'recommended', why, src } */
const REQ = 'required', REC = 'recommended';

/* CASE RULES — each returns a lab to add/escalate when its predicate matches */
function caseLabs(form) {
  const cm = norm(form?.comorbidities);
  const meds = norm(form?.currentMeds);
  const hist = norm(form?.history);
  const all = `${cm} ${meds} ${hist}`;
  const age = parseFloat(form?.age);
  const bmi = bmiOf(form);
  const out = [];
  const add = (cond, lab) => { if (cond) out.push(lab); };

  add(has(all, 'hepatic'),
    { test: 'Liver function tests (LFTs)', tier: REQ, why: 'Comorbid hepatic disease — dose-adjust/avoid hepatically-cleared & hepatotoxic agents.', trigger: 'comorbid: hepatic disease', src: [LS('HEP')] });
  add(has(all, 'renal'),
    { test: 'Renal function (eGFR/creatinine)', tier: REQ, why: 'Comorbid renal impairment — dose pregabalin/lithium/venlafaxine by CrCl.', trigger: 'comorbid: renal disease', src: [LS('REN')] });
  add(has(all, 'cardiac'),
    { test: 'ECG (QTc) + electrolytes (K⁺/Mg²⁺)', tier: REQ, why: 'Comorbid cardiac disease/QT — baseline & on-treatment ECG; correct electrolytes.', trigger: 'comorbid: cardiac/QT', src: [LS('QT')] });
  add(has(all, 'diabetes') || (bmi != null && bmi >= 30) || has(all, 'obesity'),
    { test: 'Fasting glucose / HbA1c + lipids', tier: REQ, why: 'Diabetes/obesity (or BMI ≥ 30) — metabolic baseline, esp. with weight-gain agents.', trigger: bmi != null && bmi >= 30 ? `BMI ${bmi} ≥ 30` : 'comorbid: diabetes/obesity', src: [LS('MET')] });
  add(has(all, 'thyroid'),
    { test: 'Thyroid function (TSH ± Free T4)', tier: REQ, why: 'Comorbid thyroid disease — exclude/monitor as anxiety/mood driver.', trigger: 'comorbid: thyroid', src: [LS('GEN')] });
  add(has(all, 'bleeding'),
    { test: 'CBC + bleeding-risk review (INR if anticoagulated)', tier: REQ, why: 'Anticoagulant/NSAID/bleeding history — SSRI/SNRI raise GI-bleed risk.', trigger: 'comorbid/med: bleeding risk', src: [LS('SSRI_BLEED')] });
  add(has(all, 'pregnancy'),
    { test: 'Pregnancy test (βhCG)', tier: REQ, why: 'Pregnancy/childbearing potential — exclude before valproate/topiramate; avoid paroxetine.', trigger: 'comorbid: pregnancy', src: [LS('PREG')] });
  add(has(all, 'substance'),
    { test: 'LFTs + urine drug screen (UDS)', tier: REQ, why: 'Alcohol/substance use — hepatic check + baseline before controlled agents.', trigger: 'comorbid: substance/alcohol', src: [LS('HEP')] });
  add(has(meds, 'lithium'),
    { test: 'Lithium level + renal + thyroid + ECG', tier: REQ, why: 'On lithium — narrow therapeutic index monitoring.', trigger: 'current med: lithium', src: [LS('LI')] });
  add(has(meds, 'qtmed'),
    { test: 'ECG (QTc)', tier: REQ, why: 'On a QT-prolonging medication — additive QT risk with several psychotropics.', trigger: 'current med: QT-prolonging', src: [LS('QT')] });
  add(!isNaN(age) && age >= 60,
    { test: 'Serum Na⁺ (+ renal)', tier: REQ, why: 'Age ≥ 60 — SSRI/SNRI hyponatraemia risk; renal decline.', trigger: `age ${Math.round(age)} ≥ 60`, src: [LS('ELD')] });

  return out;
}

/* canonical lab category for dedupe/escalation (robust to wording/superscripts) */
function sig(test) {
  const t = norm(test);
  // Lithium panels bundle "renal + thyroid + ECG" — bucket them as 'lithium'
  // FIRST so the level requirement isn't swallowed by the 'ecg'/'renal' branches.
  if (/lithium|ليثيوم/.test(t)) return 'lithium';
  if (/lft|liver|hepat/.test(t)) return 'liver';
  // Word-boundary the sodium exclusion so the "na" inside "re·na·l" doesn't
  // disqualify a genuine renal test (that bug mis-bucketed "Renal function …").
  if (/renal|egfr|creatinin|kidney/.test(t) && !/\bna\b|sodium|na⁺|na\+|صوديوم/.test(t)) return 'renal';
  if (/ecg|qtc|qt\b/.test(t)) return 'ecg';
  if (/glucose|hba1c|lipid|metabolic/.test(t)) return 'metabolic';
  if (/\bna\b|sodium|na⁺|na\+/.test(t) || /صوديوم/.test(t)) return 'sodium';
  if (/cbc|blood count|bleed|inr|platelet/.test(t)) return 'cbc_bleed';
  if (/tsh|thyroid|درقية/.test(t)) return 'thyroid';
  if (/pregnan|βhcg|bhcg|hcg|حمل/.test(t)) return 'pregnancy';
  if (/\bbp\b|blood pressure|heart rate|ضغط/.test(t)) return 'bp';
  if (/magnesium|vitamin d|ماغنيسيوم/.test(t)) return 'mag_vitd';
  if (/pgx|cyp|pharmacogenom/.test(t)) return 'pgx';
  if (/drug screen|uds/.test(t)) return 'uds';
  // fallback: first two significant tokens
  return t.replace(/[^a-z\u0600-\u06ff ]/g, ' ').split(/\s+/).filter((w) => w.length >= 4).slice(0, 2).join(' ') || t;
}
const TIER_RANK = { required: 0, recommended: 1, optional: 2 };

/* Merge base (disorder) labs with case labs: dedupe, escalate tier, tag trigger. */
export function computeDynamicLabs({ key, form }) {
  const base = (RX_ACTIVE && RX[key] && !RX[key].__pending && RX[key].labs) ? RX[key].labs : { required: [], recommended: [], optional: [] };
  const map = new Map(); // sig -> {test, tier, why, when, trigger, src}
  const put = (item, tier) => {
    const s = sig(item.test);
    const cur = map.get(s);
    const next = { test: item.test, tier, why: item.why, when: item.when, trigger: item.trigger, src: item.src || [] };
    if (!cur) { map.set(s, next); return; }
    // escalate to the stronger tier; merge trigger/why
    const strongerTier = TIER_RANK[tier] < TIER_RANK[cur.tier] ? tier : cur.tier;
    map.set(s, {
      ...cur, tier: strongerTier,
      trigger: [cur.trigger, item.trigger].filter(Boolean).join(' + ') || cur.trigger,
      why: cur.why || item.why,
      src: [...new Set([...(cur.src || []), ...(item.src || [])])],
    });
  };
  (base.required || []).forEach((l) => put(l, 'required'));
  (base.recommended || []).forEach((l) => put(l, 'recommended'));
  (base.optional || []).forEach((l) => put(l, 'optional'));
  caseLabs(form).forEach((l) => put(l, l.tier));

  const byTier = { required: [], recommended: [], optional: [] };
  for (const v of map.values()) byTier[v.tier].push(v);
  return byTier;
}

export function renderDynamicLabs({ key, form, lang = 'en' } = {}) {
  if (!(RX_ACTIVE && RX[key] && !RX[key].__pending)) return '';
  const isAr = lang === 'ar';
  const t = computeDynamicLabs({ key, form });
  const row = (r) => {
    const trig = r.trigger ? ` ⟵ _${isAr ? 'لهذه الحالة' : 'for this case'}: ${r.trigger}_` : '';
    const when = r.when ? ` _(${isAr ? 'متى' : 'when'}: ${r.when})_` : '';
    return `- **${r.test}** — ${r.why}${when}${trig} _src: ${(r.src || []).join('; ')}_`;
  };
  const tier = (icon, title, rows) => rows && rows.length ? `\n${icon} **${title}**\n` + rows.map(row).join('\n') : '';
  const out = [
    tier('🟥', isAr ? 'مطلوب قبل العلاج' : 'Required Before Treatment', t.required),
    tier('🟨', isAr ? 'موصى به' : 'Recommended', t.recommended),
    tier('🟩', isAr ? 'اختياري' : 'Optional', t.optional),
  ].filter(Boolean).join('\n');
  const note = isAr
    ? '\n\n_التحاليل المعلّمة "لهذه الحالة" أُضيفت/رُفِّعت أولويتها تلقائياً حسب الأمراض المصاحبة والأدوية الحالية والعمر/الـ BMI._'
    : '\n\n_Labs marked "for this case" were auto-added/escalated from comorbidities, current meds, and age/BMI._';
  return out + note;
}
