/* ============================================================================
 * therapyModifiers.js — CASE-AWARE psychotherapy overlay
 * ----------------------------------------------------------------------------
 * The base psychotherapy plan (rxFormulary PSYCHOTHERAPY_PLAN) is disorder-only.
 * This layer surfaces SOURCE-BASED additions/adjustments driven by the individual
 * case — comorbid psychiatric conditions, trauma/suicide history, medical
 * comorbidity, and severity — WITHOUT touching the base plan (additive, like the
 * medication-safety overlay).
 *
 * GOVERNANCE: every modifier carries `src` + `verified:false` (pending physician
 * sign-off), consistent with the rest of the tool. Detection is negation-aware
 * ("no PTSD", "family history of …" do not fire).
 * ========================================================================== */

export const THERAPY_MOD_VERSION = 'v0.1-DRAFT (2026-07-02) — source-based, pending physician sign-off';

/* Drop negated / family-history clauses (mirrors the comorbidity engines). */
function stripNegated(text) {
  return String(text || '')
    .replace(/\b(?:no|not|non|never|denies|denied|deny|without|w\/o|negative for|neg for|r\/o|rule out|ruled out|free of|resolved|family history of|fam hx of|fhx of|fhx|fh of|father|mother|sibling|brother|sister|parent|maternal|paternal)\b[^,.;\n]*/gi, ' ')
    .replace(/(?:لا يوجد|لا توجد|بدون|نفى|ينفى|نفي|سلبي|تاريخ عائلي|تاريخ أسري|تاريخ عائلى|والده|والدته|الأب|الأم|أخ|أخت|عائلي)[^،,.;\n]*/g, ' ');
}
const norm = (s) => String(s || '').toLowerCase();
const hasAny = (text, terms) => { const t = norm(stripNegated(text)); return terms.some((w) => t.includes(norm(w))); };

/* Each modifier: id, terms (EN+AR), label, when (optional gate on primary key),
 * add[] {name, en, ar}, src[], verified. */
const MODIFIERS = [
  {
    id: 'trauma',
    terms: ['ptsd', 'post-traumatic', 'post traumatic', 'trauma', 'sexual abuse', 'childhood abuse', 'صدمة', 'الكرب', 'كرب ما بعد الصدمة', 'اعتداء', 'إساءة', 'اساءة'],
    label: { en: 'Comorbid PTSD / trauma history', ar: 'اضطراب كرب تالٍ للصدمة / تاريخ صدمة مصاحب' },
    add: [
      { name: 'Trauma-focused CBT (TF-CBT / Cognitive Processing Therapy)', en: 'Add a trauma-focused protocol; if the base plan is exposure-heavy, sequence STABILISATION first (affect regulation, safety).', ar: 'أضف بروتوكولاً مركّزاً على الصدمة؛ ولو الخطة الأساسية تعريضية كثيفة ابدأ بالتثبيت (تنظيم الانفعال والأمان) أولاً.' },
      { name: 'EMDR', en: 'First-line for PTSD (8-phase); extended stabilisation in complex/dissociative trauma.', ar: 'خط أول لـPTSD (٨ مراحل)؛ تثبيت ممتد في الصدمة المعقّدة/الانشقاقية.' },
    ],
    src: ['NICE NG116 — PTSD (2018): TF-CBT & EMDR first-line', 'Bisson et al., Cochrane 2013 — psychological therapies for chronic PTSD'],
    verified: false,
  },
  {
    id: 'substance',
    terms: ['substance', 'alcohol', 'drug use', 'addiction', 'opioid use', 'cannabis', 'إدمان', 'مخدر', 'مخدرات', 'كحول', 'تعاطي'],
    label: { en: 'Comorbid substance use', ar: 'تعاطي مواد مصاحب' },
    add: [
      { name: 'Motivational Interviewing (MI)', en: 'Engage ambivalence early; precede/interleave with the disorder protocol.', ar: 'تعامل مع التردد مبكراً؛ قبل/مع بروتوكول الاضطراب.' },
      { name: 'Relapse-prevention CBT + integrated (concurrent) care', en: 'Treat both conditions concurrently, not sequentially; add relapse-prevention skills.', ar: 'عالج الحالتين معاً لا بالتتابع؛ أضف مهارات منع الانتكاسة.' },
    ],
    src: ['NICE CG115 — alcohol-use disorders', 'NICE CG51 — drug misuse (psychosocial)', 'Cochrane — MI for substance use'],
    verified: false,
  },
  {
    id: 'insomnia',
    terms: ['insomnia', 'sleep-onset', 'sleep onset', 'can\'t sleep', 'أرق', 'اضطراب النوم', 'صعوبة النوم'],
    label: { en: 'Comorbid insomnia', ar: 'أرق مصاحب' },
    add: [
      { name: 'CBT-I (Cognitive Behavioural Therapy for Insomnia)', en: 'First-line for chronic insomnia even when comorbid — treat it directly (stimulus control, sleep restriction, cognitive work), do NOT rely on sedatives.', ar: 'خط أول للأرق المزمن حتى لو مصاحباً — عالجه مباشرة (ضبط المثير، تقييد النوم، العمل المعرفي)، ولا تعتمد على المهدئات.' },
    ],
    src: ['AASM Clinical Practice Guideline (2021) — CBT-I first-line', 'NICE — insomnia'],
    verified: false,
  },
  {
    id: 'panic',
    terms: ['panic', 'panic attack', 'agoraphobia', 'هلع', 'نوبات هلع', 'رهاب الخلاء'],
    label: { en: 'Comorbid panic / agoraphobia', ar: 'هلع / رهاب الخلاء مصاحب' },
    add: [
      { name: 'Panic-focused CBT + interoceptive exposure', en: 'Add interoceptive & situational exposure targeting catastrophic misinterpretation of bodily sensations.', ar: 'أضف تعريضاً داخلياً وموقفياً يستهدف التأويل الكارثي للأحاسيس الجسدية.' },
    ],
    src: ['APA panic disorder guideline; Barlow — panic-focused CBT'],
    verified: false,
  },
  {
    id: 'ocd_comorbid',
    terms: ['ocd', 'obsessive', 'compulsion', 'وسواس', 'الوسواس', 'قهري'],
    when: (key) => key !== 'OCD', // OCD-primary already has ERP as its core plan
    label: { en: 'Comorbid OCD', ar: 'وسواس قهري مصاحب' },
    add: [
      { name: 'ERP (Exposure & Response Prevention)', en: 'Add ERP for the obsessive-compulsive symptoms — the OCD-specific active ingredient the base plan lacks.', ar: 'أضف ERP لأعراض الوسواس القهري — المكوّن الفعّال الخاص بالوسواس وغير الموجود في الخطة الأساسية.' },
    ],
    src: ['NICE CG31 — OCD; APA OCD guideline', 'Foa — ERP therapist guide'],
    verified: false,
  },
  {
    id: 'eating',
    terms: ['eating disorder', 'anorexia', 'bulimia', 'binge eating', 'disordered eating', 'اضطراب الأكل', 'اضطراب اكل', 'نهام', 'قهم', 'بوليميا'],
    label: { en: 'Comorbid eating disorder', ar: 'اضطراب أكل مصاحب' },
    add: [
      { name: 'CBT-E (adults) / FBT (adolescents), ED-informed', en: 'Use an eating-disorder-specific protocol; do NOT use interventions that reinforce restriction, and coordinate with the nutrition safety block (numeric targets withheld).', ar: 'استخدم بروتوكولاً خاصاً باضطرابات الأكل؛ وتجنّب التدخلات التي تعزّز التقييد، ونسّق مع بلوك أمان التغذية (الأهداف الرقمية محجوبة).' },
    ],
    src: ['NICE NG69 — eating disorders (CBT-ED, FBT)'],
    verified: false,
  },
  {
    id: 'pain',
    terms: ['chronic pain', 'fibromyalgia', 'neuropathic pain', 'ألم مزمن', 'الألم المزمن', 'فيبروميالجيا', 'اعتلال عصبي'],
    label: { en: 'Comorbid chronic pain', ar: 'ألم مزمن مصاحب' },
    add: [
      { name: 'CBT for chronic pain / ACT', en: 'Add pain-focused CBT or Acceptance & Commitment Therapy (function & acceptance, not pain elimination).', ar: 'أضف CBT موجّهاً للألم أو علاج القبول والالتزام (الوظيفة والقبول لا إزالة الألم).' },
    ],
    src: ['Williams et al., Cochrane 2020 — psychological therapies for chronic pain', 'ACT for chronic pain (Veehof 2016 MA)'],
    verified: false,
  },
  {
    id: 'perinatal',
    terms: ['pregnan', 'perinatal', 'postpartum', 'post-partum', 'breastfeed', 'lactation', 'حمل', 'حامل', 'نفاس', 'ما بعد الولادة', 'رضاعة'],
    label: { en: 'Pregnancy / perinatal', ar: 'حمل / محيط الولادة' },
    add: [
      { name: 'IPT or CBT (perinatal-adapted)', en: 'Psychotherapy is preferred first-line in the perinatal period; IPT and CBT have the strongest evidence. Weigh psychotherapy before/with medication.', ar: 'العلاج النفسي مُفضَّل كخط أول في فترة الحمل/النفاس؛ IPT وCBT الأقوى دليلاً. وازِن العلاج النفسي قبل/مع الدواء.' },
    ],
    src: ['NICE CG192 — antenatal & postnatal mental health'],
    verified: false,
  },
  {
    id: 'bipolar',
    terms: ['bipolar', 'mania', 'manic', 'hypomania', 'ثنائي القطب', 'هوس'],
    label: { en: 'Bipolar spectrum', ar: 'الطيف ثنائي القطب' },
    add: [
      { name: 'Psychoeducation + IPSRT (social-rhythm) + relapse-prevention CBT', en: 'Prioritise mood-stabilising psychosocial work (regular social/sleep rhythms, early-warning-sign plans); avoid unstructured activating exposure that can destabilise.', ar: 'قدّم العمل النفسي المثبِّت للمزاج (انتظام الإيقاع الاجتماعي/النوم، خطط الإنذار المبكر)؛ وتجنّب التعريض المُنشِّط غير المنظّم الذي قد يزعزع الاستقرار.' },
    ],
    src: ['CANMAT/ISBD 2018 — bipolar psychosocial interventions', 'Frank — IPSRT'],
    verified: false,
  },
  {
    id: 'suicide',
    terms: ['suicid', 'self-harm', 'self harm', 'self-injur', 'انتحار', 'الانتحار', 'إيذاء النفس', 'ايذاء النفس', 'اذى النفس'],
    label: { en: 'Suicide risk / self-harm', ar: 'خطورة انتحار / إيذاء ذات' },
    add: [
      { name: 'Safety planning + means restriction', en: 'Build a collaborative safety plan and restrict access to means BEFORE routine protocol work.', ar: 'ابنِ خطة أمان تعاونية وقيّد الوصول للوسائل قبل عمل البروتوكول الروتيني.' },
      { name: 'DBT skills + increased contact', en: 'Add DBT skills (distress tolerance, emotion regulation) and increase session frequency / crisis access.', ar: 'أضف مهارات DBT (تحمّل الضيق، تنظيم الانفعال) وكثّف الجلسات/الوصول وقت الأزمات.' },
    ],
    src: ['Stanley & Brown — Safety Planning Intervention', 'NICE NG225 — self-harm (2022)', 'Linehan — DBT'],
    verified: false,
  },
];

/* Severity-driven intensity adjustment (uses the Mild/Moderate/Severe select). */
function severityMod(severity, isAr) {
  const s = norm(severity);
  if (/severe|شديد/.test(s))
    return { label: isAr ? 'شدة: شديدة' : 'Severity: severe',
      text: isAr ? 'فضّل علاجاً مكثّفاً/مدمجاً (دواء + علاج نفسي منظّم) وكثافة جلسات أعلى؛ راجع الحاجة لرعاية متخصصة/أعلى مستوى.' : 'Prefer combined/high-intensity care (medication + structured psychotherapy) and higher session frequency; review need for specialist/higher level of care.',
      src: 'NICE stepped-care (step up for severe/complex)' };
  if (/mild|خفيف/.test(s))
    return { label: isAr ? 'شدة: خفيفة' : 'Severity: mild',
      text: isAr ? 'يمكن البدء بعلاج نفسي منظّم كخط أول (مع الدواء حسب التفضيل/عدم الاستجابة).' : 'A structured psychotherapy can be first-line (medication by preference / on inadequate response).',
      src: 'NICE stepped-care (low-intensity first for mild)' };
  return null;
}

export function detectTherapyModifiers({ primaryKey, comorbidities = '', history = '', severity = '' } = {}) {
  const text = `${comorbidities} ${history}`;
  const hits = MODIFIERS.filter((m) => (!m.when || m.when(primaryKey)) && hasAny(text, m.terms));
  return { hits, severity: severityMod(severity, false) };
}

/* Bilingual markdown block appended to the therapy section ('' when nothing fires). */
export function renderTherapyModifiers({ primaryKey, comorbidities = '', history = '', severity = '', lang = 'en' } = {}) {
  const isAr = lang === 'ar';
  const text = `${comorbidities} ${history}`;
  const hits = MODIFIERS.filter((m) => (!m.when || m.when(primaryKey)) && hasAny(text, m.terms));
  const sev = severityMod(severity, isAr);
  if (!hits.length && !sev) return '';

  const L = [`\n\n**${isAr ? '🎯 تعديلات العلاج النفسي حسب الحالة (مصدرية — تُضاف للخطة الأساسية)' : '🎯 Case-specific psychotherapy adjustments (source-based — added to the base plan)'}**`];
  L.push(isAr
    ? '_تُضاف فوق الخطة الأساسية للاضطراب، لا تحلّ محلها. بنود مسوّدة (verified:false) بانتظار اعتماد الطبيب._'
    : '_These augment (not replace) the base disorder plan. Draft entries (verified:false) pending physician sign-off._');
  if (sev) L.push(`- **${sev.label}** — ${sev.text} _src: ${sev.src}_`);
  hits.forEach((m) => {
    L.push(`\n**${isAr ? 'لأجل' : 'For'}: ${isAr ? m.label.ar : m.label.en}**`);
    m.add.forEach((a) => L.push(`- **${a.name}** — ${isAr ? a.ar : a.en}${m.verified === false ? (isAr ? ' ⚠ مسودة' : ' ⚠ draft') : ''} _src: ${(m.src || []).join('; ')}_`));
  });
  return L.join('\n');
}
