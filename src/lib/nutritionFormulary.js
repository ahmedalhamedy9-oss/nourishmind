/* ════════════════════════════════════════════════════════════════════════
   nutritionFormulary.js — DIET + SUPPLEMENTS source of truth (locked)
   ────────────────────────────────────────────────────────────────────────
   Companion to rxFormulary.js. Drives the 🥗 Diet and 🧴 Supplements sections
   deterministically. Built from sources, not opinion.

   GOVERNANCE (same as rxFormulary):
   • Every item carries `evidence` (strong/moderate/weak/preliminary) — HONEST,
     never inflated to pad variety.
   • Every item carries `src` + `verified:false` (until physician sign-off).
   • `interaction` flags drug-supplement risk vs the locked protocol; items that
     are UNSAFE with the first-line protocol go in `avoidWithProtocol`, NOT in
     recommendations.
   • `synergy` marks evidence-based augmentation that is SAFE with the protocol.
   • Variety by design: multiple options per category (markets, cost,
     formulations differ). `⟦NEEDS_CONFIRMATION⟧` for unverified specifics.
   • GAD = TEMPLATE built first for review; MDD/OCD/BPD/PMDD replicate after.
   ════════════════════════════════════════════════════════════════════════ */
import { RX_ACTIVE } from './rxFormulary';

export const NUTRITION_VERSION = 'v0.1-DRAFT (2026-07-01) — GAD template, pending physician sign-off';
export const NUTRITION_ACTIVE = true;
export const N_NEEDS = '⟦NEEDS_CONFIRMATION⟧';

export const NUT_SOURCES = {
  OMEGA3_ANX:  'Bafkar N et al. Omega-3 for anxiety — dose-response meta-analysis (23 RCTs). BMC Psychiatry 2024;24:455 (GRADE low; ~1 g/d, max effect ~2 g/d, EPA-predominant).',
  NUTRIENT_REV:'Nutrients & mental health review of RCTs/MA 2018–2025 (omega-3, B-vitamins, vit D, zinc, magnesium, probiotics).',
  MAG_ANX:     'Magnesium & anxiety — systematic review (modest signal; deficiency correction).',
  ASHWA_MA:    'Ashwagandha for stress/anxiety — systematic review/meta-analysis (15 RCTs, n=873; HAM-A reduction).',
  RHODIOLA:    'Adaptogen RCT review — Withania 120–1000 mg/d, Rhodiola 290–1500 mg/d, 3–16 wk.',
  SAFFRON:     'Saffron for anxiety/depression — RCTs + 2025 meta-analysis (Shafiee); ~30 mg/d standardised.',
  SILEXAN:     'Kasper S et al. Silexan (lavender oil) in GAD — RCT vs paroxetine & placebo (n=539). Int J Neuropsychopharmacol 2014;17:859-69.',
  CHAMOMILE:   'Mao JJ et al. Long-term chamomile for GAD — RCT (n=179, 38 wk).',
  PASSION:     'Passiflora incarnata vs oxazepam in GAD — RCT (comparable, less performance impairment).',
  LTHEANINE:   'L-theanine 200 mg/d for stress/anxiety — RCTs (moderate).',
  VALERIAN_NEG:'Valerian for anxiety — multiple RCTs largely NEGATIVE (e.g. n=391, no difference vs placebo).',
  LIONSMANE:   'Hericium erinaceus (lion\u2019s mane) — small/preliminary human studies on mood/anxiety; evidence limited.',
  REISHI:      'Ganoderma lucidum (reishi) — limited human mood/anxiety evidence; mainly fatigue/QoL.',
  SJW_SSRI:    'St John\u2019s Wort + SSRI — serotonin-syndrome risk + CYP3A4/2C9/2C19 INDUCTION. Maldonado-Puebla et al. Eur Psychiatry 2025; Medsafe; in SSRI datasheets.',
  HTP_SSRI:    '5-HTP / L-tryptophan + SSRI/SNRI/MAOI — serotonin-syndrome risk; avoid (drugs.com; serotonergic-agent lists).',
  DHI_REVIEW:  'Drug–herb interaction pharmacoepidemiology review — serotonin syndrome/arrhythmia (St John\u2019s Wort strong; rhodiola/ashwagandha/ginkgo weaker signal). MDPI 2025.',
  SUPP_AD:     'Supplement–antidepressant interaction guide — ashwagandha (sedation additive, thyroid, rare hepatotoxicity), magnesium (no interaction).',
  KAVA_HEP:    'Kava hepatotoxicity (regulatory warnings) + additive CNS depression.',
};
const N = (k) => NUT_SOURCES[k] || k;

/* ════════════════════════════════════════════════════════════════════════
   GAD — TEMPLATE
   ════════════════════════════════════════════════════════════════════════ */
const GAD = {
  /* ── 🥗 DIET ──────────────────────────────────────────────────────────── */
  diet: {
    patterns: [
      { name: 'Mediterranean-style dietary pattern', evidence: 'moderate',
        note: 'Whole foods, vegetables, legumes, fish, olive oil; anti-inflammatory; supports mood/anxiety in nutritional-psychiatry data.',
        src: [N('NUTRIENT_REV')], verified: false },
      { name: 'Blood-sugar-stabilising pattern (low-GI, regular meals)', evidence: 'moderate (mechanistic)',
        note: 'Avoid skipped meals and high-GI spikes → prevents reactive hypoglycaemia/jitteriness that mimics & worsens anxiety.',
        src: [N('NUTRIENT_REV')], verified: false },
    ],
    beneficialFoods: [
      { item: 'Oily fish (salmon, sardines, mackerel) ≥2×/wk', why: 'EPA/DHA omega-3 (anxiolytic signal).', src: [N('OMEGA3_ANX')], verified: false },
      { item: 'Leafy greens, legumes, nuts/seeds', why: 'Magnesium, folate, fibre (gut–brain axis).', src: [N('NUTRIENT_REV')], verified: false },
      { item: 'Fermented foods (yoghurt, kefir)', why: 'Probiotic/microbiome support — modest mood signal.', src: [N('NUTRIENT_REV')], verified: false },
      { item: 'Whole grains, oats, legumes (low-GI carbs)', why: 'Steady glucose; tryptophan transport.', src: [N('NUTRIENT_REV')], verified: false },
    ],
    avoidFoods: [
      { item: 'Caffeine (esp. afternoon/evening)', why: 'Adrenergic arousal worsens anxiety + disrupts sleep.', src: [N('NUTRIENT_REV')], verified: false },
      { item: 'Alcohol', why: 'Rebound anxiety; disrupts sleep architecture; CNS-depressant risk with some agents.', src: [N('NUTRIENT_REV')], verified: false },
      { item: 'High-GI sugary foods / skipped meals', why: 'Glucose swings → jitteriness mimicking anxiety.', src: [N('NUTRIENT_REV')], verified: false },
      { item: 'Tyramine-rich aged foods', why: 'ONLY if an MAOI is used — hypertensive crisis (not relevant to SSRIs/SNRIs).', interaction: 'MAOI', src: [N('SUPP_AD')], verified: false },
    ],
    drinks: [
      { item: 'Chamomile tea', evidence: 'moderate', why: 'Mild anxiolytic; allergy caution (Compositae/ragweed).', src: [N('CHAMOMILE')], verified: false },
      { item: 'Green tea (L-theanine source)', evidence: 'moderate', why: 'L-theanine ~25–50 mg/cup → calm-focus; far below 200 mg trial dose.', src: [N('LTHEANINE')], verified: false },
      { item: 'Lemon balm (Melissa) tea', evidence: 'weak', why: 'Traditional calming; limited trial data.', src: [N('NUTRIENT_REV')], verified: false },
    ],
    oils: [
      { item: 'Extra-virgin olive oil', evidence: 'moderate', why: 'Core Mediterranean fat; anti-inflammatory.', src: [N('NUTRIENT_REV')], verified: false },
      { item: 'Fish oil (culinary EPA/DHA source)', evidence: 'moderate', why: 'See omega-3 supplement.', src: [N('OMEGA3_ANX')], verified: false },
    ],
  },

  /* ── 🧴 ADAPTOGENS ────────────────────────────────────────────────────── */
  adaptogens: [
    { name: 'Ashwagandha (Withania somnifera)', forms: 'standardised root extract (e.g. KSM-66, Sensoril, Shoden)',
      dose: '120–600 mg/day (commonly 300 mg BID KSM-66, or 240 mg Shoden)', timing: 'with food; evening if sedation desired',
      evidence: 'moderate (multiple RCTs; HAM-A ↓, cortisol ↓)',
      interaction: 'Additive sedation with sedating agents; may RAISE thyroid hormone (caution with levothyroxine/hyperthyroid); rare hepatotoxicity; immunosuppressant interaction; AVOID in pregnancy.',
      synergy: 'Cortisol/anxiety reduction alongside SSRI (no direct serotonergic load at usual doses).',
      src: [N('ASHWA_MA'), N('RHODIOLA'), N('SUPP_AD')], verified: false },
    { name: 'Rhodiola rosea', forms: 'standardised extract (e.g. SHR-5)',
      dose: '290–1500 mg/day', timing: 'morning (can be activating)',
      evidence: 'weak–moderate (anti-stress/fatigue; anxiety data limited)',
      interaction: 'Weak serotonergic / possible MAO-inhibition signal — caution with SSRIs/SNRIs/MAOIs (theoretical serotonin risk).',
      synergy: 'Anti-fatigue/stress adjunct.', src: [N('RHODIOLA'), N('DHI_REVIEW')], verified: false },
    { name: 'Saffron (Crocus sativus)', forms: 'standardised stigma extract',
      dose: '~30 mg/day', timing: 'with meals',
      evidence: 'moderate (RCTs + 2025 MA; anxiety/depression)',
      interaction: 'Serotonergic signal at higher doses — caution combining with SSRIs (theoretical); generally well tolerated.',
      synergy: 'May augment mood; comparable to SSRIs in some trials.', src: [N('SAFFRON')], verified: false },
  ],

  /* ── 🍄 FUNCTIONAL MUSHROOMS (evidence limited — flagged honestly) ─────── */
  mushrooms: [
    { name: "Lion's mane (Hericium erinaceus)", forms: 'capsule/powder extract',
      dose: N_NEEDS + ' (trials varied)', timing: 'with food',
      evidence: 'preliminary/weak (small human studies; mostly cognition/mood)',
      interaction: 'No major known drug interaction; data sparse.', synergy: 'Possible mood/cognition support — UNPROVEN for GAD.',
      src: [N('LIONSMANE')], verified: false },
    { name: 'Reishi (Ganoderma lucidum)', forms: 'extract',
      dose: N_NEEDS, timing: 'with food',
      evidence: 'preliminary/weak (mainly fatigue/QoL, not anxiety)',
      interaction: 'Possible additive effect with anticoagulants/antihypertensives; data sparse.', synergy: 'Limited.',
      src: [N('REISHI')], verified: false },
  ],

  /* ── 🌿 HERBS ─────────────────────────────────────────────────────────── */
  herbs: [
    { name: 'Lavender oil — Silexan', forms: 'oral 80 mg softgel',
      dose: '80–160 mg/day', timing: 'once daily',
      evidence: 'strong for an herbal (GAD RCT n=539; ≈ paroxetine/lorazepam)',
      interaction: 'Generally well tolerated; mild eructation/lavender taste; no major serotonergic interaction reported.',
      synergy: 'Effective monotherapy or adjunct in mild–moderate GAD.', src: [N('SILEXAN')], verified: false },
    { name: 'Chamomile (Matricaria) extract', forms: 'standardised capsule / tea',
      dose: 'up to ~1500 mg/day (trial doses vary)', timing: 'divided',
      evidence: 'moderate (long-term GAD RCT)',
      interaction: 'ALLERGY (Compositae/ragweed); mild additive sedation; possible mild anticoagulant interaction at high dose.',
      synergy: 'Mild anxiolytic adjunct.', src: [N('CHAMOMILE')], verified: false },
    { name: 'Passionflower (Passiflora incarnata)', forms: 'extract / tea',
      dose: N_NEEDS + ' (trial-dependent)', timing: 'divided / pre-sleep',
      evidence: 'moderate (≈ oxazepam in GAD RCT, less impairment)',
      interaction: 'Additive sedation/CNS depression with benzodiazepines/alcohol/pregabalin.',
      synergy: 'Calming adjunct; useful where benzodiazepine avoidance desired.', src: [N('PASSION')], verified: false },
    { name: 'Valerian (Valeriana officinalis)', forms: 'root extract',
      dose: 'varies', timing: 'pre-sleep',
      evidence: 'WEAK — multiple NEGATIVE anxiety trials (honest flag)',
      interaction: 'Additive sedation with CNS depressants.', synergy: 'Limited/unproven for GAD.',
      src: [N('VALERIAN_NEG')], verified: false },
  ],

  /* ── 🧴 SUPPLEMENTS (vitamins / minerals / amino) ─────────────────────── */
  supplements: [
    { name: 'Omega-3 (EPA-predominant fish oil)', forms: 'softgel / liquid; EPA ≥60%',
      dose: '~1–2 g/day total EPA+DHA (EPA-predominant)', timing: 'with meals',
      evidence: 'moderate (dose-response MA; GRADE low)',
      interaction: 'High dose → mild bleeding risk with anticoagulants.',
      synergy: 'SAFE with SSRI/SNRI; anti-inflammatory adjunct.', src: [N('OMEGA3_ANX')], verified: false },
    { name: 'Magnesium (glycinate preferred; also citrate/malate)', forms: 'glycinate (best tolerated), citrate, malate, oxide (poor absorption)',
      dose: '200–400 mg elemental/day', timing: 'evening',
      evidence: 'weak–moderate (deficiency correction; modest signal)',
      interaction: 'NONE significant with SSRIs (safe). Separate from some antibiotics (absorption).',
      synergy: 'SAFE synergy with SSRI; supports sleep/anxiety + QTc safety if quetiapine used.', src: [N('MAG_ANX'), N('SUPP_AD')], verified: false },
    { name: 'Vitamin D3', forms: 'capsule/drops', dose: 'correct deficiency to target level (per serum 25-OH-D)', timing: 'with fat-containing meal',
      evidence: 'weak–moderate (deficiency-linked)', interaction: 'None significant.',
      synergy: 'Correct deficiency; supports mood/circadian.', src: [N('NUTRIENT_REV')], verified: false },
    { name: 'Zinc', forms: 'picolinate/citrate', dose: 'RDA-level repletion (avoid chronic high-dose → copper depletion)', timing: 'with food',
      evidence: 'weak (modulatory; deficiency correction)', interaction: 'High dose depletes copper; separate from some antibiotics.',
      synergy: 'Repletion only.', src: [N('NUTRIENT_REV')], verified: false },
    { name: 'L-theanine', forms: 'capsule', dose: '200 mg/day (up to 400)', timing: 'as needed / daytime',
      evidence: 'moderate', interaction: 'None significant; mild additive calm.',
      synergy: 'SAFE calm-focus adjunct with SSRI.', src: [N('LTHEANINE')], verified: false },
    { name: 'B-complex / B6 / folate', forms: 'B-complex; methylfolate if MTHFR', dose: 'repletion', timing: 'morning with food',
      evidence: 'weak–moderate (methylation/neurotransmitter cofactors)', interaction: 'Generally safe.',
      synergy: 'Cofactor support, esp. if deficient.', src: [N('NUTRIENT_REV')], verified: false },
  ],

  /* ── ⛔ AVOID WITH THE LOCKED PROTOCOL (deterministic safety) ──────────── */
  avoidWithProtocol: [
    { item: "St John's Wort (Hypericum)", severity: 'CONTRAINDICATED with SSRI/SNRI',
      why: 'Serotonin-syndrome risk + induces CYP3A4/2C9/2C19 → lowers levels of many drugs (OCPs, anticoagulants, others). Not to be combined with serotonergic antidepressants.',
      src: [N('SJW_SSRI'), N('DHI_REVIEW')], verified: false },
    { item: '5-HTP / L-tryptophan', severity: 'MAJOR with SSRI/SNRI/MAOI',
      why: 'Adds serotonin precursor → serotonin-syndrome risk. Avoid; ≥2-week separation when switching.',
      src: [N('HTP_SSRI')], verified: false },
    { item: 'SAMe', severity: 'CAUTION with serotonergic agents',
      why: 'Serotonergic — avoid stacking with SSRI/SNRI without supervision.',
      src: [N('HTP_SSRI')], verified: false },
    { item: 'Kava', severity: 'AVOID',
      why: 'Hepatotoxicity + additive CNS depression. (Already excluded in the formulary.)',
      src: [N('KAVA_HEP')], verified: false },
    { item: 'High-dose Ginkgo biloba', severity: 'CAUTION',
      why: 'Bleeding risk (esp. with anticoagulants) + weak MAO/serotonergic signal.',
      src: [N('DHI_REVIEW')], verified: false },
  ],

  /* ── ✅ EVIDENCE-BASED SYNERGY (safe augmentation with the protocol) ───── */
  synergyWithProtocol: [
    { item: 'Magnesium glycinate', note: 'Safe with SSRIs; supports sleep/anxiety; corrects deficiency.', src: [N('MAG_ANX'), N('SUPP_AD')], verified: false },
    { item: 'Omega-3 (EPA-predominant)', note: 'Safe adjunct; modest anxiolytic + anti-inflammatory.', src: [N('OMEGA3_ANX')], verified: false },
    { item: 'L-theanine', note: 'Safe calm-focus adjunct.', src: [N('LTHEANINE')], verified: false },
    { item: 'Silexan (lavender)', note: 'Evidence-based herbal; can be adjunct or monotherapy in mild–moderate GAD.', src: [N('SILEXAN')], verified: false },
  ],
};

const PENDING = { __pending: true };
export const NUTRITION = { GAD, MDD: PENDING, OCD: PENDING, BPD: PENDING, PMDD: PENDING };

/* ════════════════════════════════════════════════════════════════════════
   RENDERERS — deterministic 🥗 Diet & 🧴 Supplements sections
   ════════════════════════════════════════════════════════════════════════ */
const okN = (key) => RX_ACTIVE && NUTRITION_ACTIVE && NUTRITION[key] && !NUTRITION[key].__pending;
const ev = (e) => e ? ` _(${e})_` : '';
const sj = (a) => (a || []).join('; ');

export function renderNutritionDiet({ key, lang = 'en' } = {}) {
  if (!okN(key)) return '';
  const d = NUTRITION[key].diet; const isAr = lang === 'ar'; const o = [];
  const sec = (title, rows, fmt) => rows && rows.length ? `\n**${title}**\n` + rows.map(fmt).join('\n') : '';
  o.push(sec(isAr ? 'أنماط غذائية مدعومة' : 'Evidence-based patterns', d.patterns,
    (p) => `- **${p.name}**${ev(p.evidence)}: ${p.note} _src: ${sj(p.src)}_`));
  o.push(sec(isAr ? 'أطعمة مفيدة' : 'Beneficial foods', d.beneficialFoods,
    (f) => `- **${f.item}** — ${f.why} _src: ${sj(f.src)}_`));
  o.push(sec(isAr ? 'أطعمة تُتجنّب' : 'Foods to limit/avoid', d.avoidFoods,
    (f) => `- **${f.item}** — ${f.why}${f.interaction ? ` ⚠️(${f.interaction})` : ''} _src: ${sj(f.src)}_`));
  o.push(sec(isAr ? 'مشروبات' : 'Drinks', d.drinks,
    (f) => `- **${f.item}**${ev(f.evidence)} — ${f.why} _src: ${sj(f.src)}_`));
  o.push(sec(isAr ? 'زيوت' : 'Oils', d.oils,
    (f) => `- **${f.item}**${ev(f.evidence)} — ${f.why} _src: ${sj(f.src)}_`));
  return o.filter(Boolean).join('\n');
}

export function renderNutritionSupplements({ key, lang = 'en' } = {}) {
  if (!okN(key)) return '';
  const n = NUTRITION[key]; const isAr = lang === 'ar'; const o = [];
  const item = (s) => `- **${s.name}**${ev(s.evidence)}\n  ${isAr ? 'الشكل' : 'Forms'}: ${s.forms} | ${isAr ? 'الجرعة' : 'Dose'}: ${s.dose} | ${isAr ? 'التوقيت' : 'Timing'}: ${s.timing}` +
    (s.synergy ? `\n  ✅ ${isAr ? 'تآزر' : 'Synergy'}: ${s.synergy}` : '') +
    (s.interaction ? `\n  ⚠️ ${isAr ? 'تفاعل' : 'Interaction'}: ${s.interaction}` : '') +
    `\n  _src: ${sj(s.src)}_`;
  const block = (title, rows) => rows && rows.length ? `\n**${title}**\n` + rows.map(item).join('\n') : '';

  o.push(block(isAr ? '🧴 فيتامينات/معادن/أحماض أمينية' : '🧴 Vitamins / minerals / amino acids', n.supplements));
  o.push(block(isAr ? '🌿 أعشاب' : '🌿 Herbs', n.herbs));
  o.push(block(isAr ? '🧪 أدابتوجين' : '🧪 Adaptogens', n.adaptogens));
  o.push(block(isAr ? '🍄 فطر وظيفي' : '🍄 Functional mushrooms', n.mushrooms));

  if (n.synergyWithProtocol?.length)
    o.push(`\n**✅ ${isAr ? 'تآزر آمن مع البروتوكول الدوائي' : 'Evidence-based synergy with the locked protocol'}**\n` +
      n.synergyWithProtocol.map((s) => `- **${s.item}**: ${s.note} _src: ${sj(s.src)}_`).join('\n'));

  if (n.avoidWithProtocol?.length)
    o.push(`\n**⛔ ${isAr ? 'يُتجنّب مع البروتوكول الدوائي (أمان)' : 'AVOID with the locked protocol (safety)'}**\n` +
      n.avoidWithProtocol.map((s) => `- **${s.item}** [${s.severity}]: ${s.why} _src: ${sj(s.src)}_`).join('\n'));

  return o.filter(Boolean).join('\n');
}
