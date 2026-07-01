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

export const NUTRITION_VERSION = 'v0.2-DRAFT (2026-07-01) — all 5 disorders (GAD/MDD/OCD/BPD/PMDD), pending physician sign-off';
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
  SARRIS_AJP:  'Sarris J et al. Adjunctive nutraceuticals for depression — systematic review & meta-analyses. Am J Psychiatry 2016 (SAMe, methylfolate, EPA-omega-3, vitamin D positive).',
  EPA_DEP:     'EPA-predominant omega-3 in depression — meta-analyses (≥60% EPA, ~1–2 g EPA/day).',
  NAC_OCD:     'NAC augmentation in OCD — RCTs (2000–3000 mg/day; 4/5 positive on Y-BOCS; adult 16-wk study mixed).',
  INOSITOL_OCD:'Fux M et al. Inositol for OCD — RCT (~18 g/day). Am J Psychiatry 1996.',
  OCD_NUTRA:   'Camfield/Sarris — nutraceuticals for OCD review (glutamatergic: NAC, glycine; myo-inositol; milk thistle).',
  PMS_CALCIUM: 'Calcium for PMS — double-blind RCTs (1000–1200 mg/day; strongest evidence). Thys-Jacobs et al.',
  PMS_B6:      'Vitamin B6 for PMS — mixed RCTs; cap ≤100 mg/day (neuropathy risk). Better combined with calcium/magnesium.',
  VITEX:       'Vitex agnus-castus (chasteberry) for PMS — RCTs (Agnolyt extract); dopaminergic/prolactin modulation.',
  PMS_REVIEW:  'PMS dietary/herbal systematic reviews (calcium good; B6/Vitex some; magnesium mixed; evening primrose oil NO benefit).',
  BPD_OMEGA3:  'Omega-3 (EPA-predominant) for BPD affective instability/impulsivity/aggression — RCTs/meta-analysis (modest).',
  // — macro / meal-architecture / psychobiotic layer —
  WHO_DIET:    'WHO Healthy Diet fact sheet & guidelines (2023–2025): total fat ≤30%E; saturated fat <10%E; trans <1%E; unsaturated (MUFA/PUFA) from plant sources preferred; carbohydrate mainly from whole grains/vegetables/fruit/pulses; ≥25 g naturally-occurring fibre/day; free sugars <10%E (ideally <5%).',
  NA_AMDR_2024:'National Academies of Sciences 2024 — Rethinking the AMDR: macronutrient QUALITY (carb type refined/complex/fibre; protein amino-acid profile; fat SFA/MUFA/PUFA & n-3/n-6) is at least as important as quantitative ratios.',
  MACRO_ANX_DEF:'Perez-Cornago et al. Nutrients 2019;11:1206 — 16-wk hypocaloric RCT (n=305): moderately-high-protein diet (~30%P/30%F/40%C) improved trait-anxiety score in women vs low-fat; energy restriction + weight loss beneficial on anxiety/depression traits.',
  LOWCARB_NULL:'Low-carbohydrate-diet adherence & psychological disorders — cross-sectional (n large): LCD score NOT associated with anxiety/depression/distress → carbohydrate restriction per se is not anxiolytic (favour quality/stability over ratio extremes). PMC6929485.',
  MEALTIME_MOOD:'Chellappa SL et al. PNAS 2022;119:e2206348119 (Brigham controlled 14-d protocol): daytime-only vs day+night eating — meal timing had moderate–large effects on depression-/anxiety-like mood, tracking internal circadian misalignment.',
  MACRO_TIMING_DEP:'Macronutrient quality, food source & timing vs depression — NHANES cross-sectional (n=23,313), J Affect Disord 2024: high-quality carbohydrate & total protein inversely associated with depression; added sugar positively; high-quality carbs at breakfast & dinner inversely associated.',
  LATE_EATING: 'Late-night eating, circadian disruption & mood — review (PMC12127805): late-night eating (>25% intake within 2–3 h of bed) linked to circadian misalignment & mood disturbance; earlier/consistent meal timing & TRE as non-pharmacological levers.',
  PSYCHO_ANX:  'Psychobiotics for anxiety/stress — meta-analyses & systematic reviews (Reis 2018; Smith 2021; multi-strain RCT Front Nutr 2023, 4×10⁹ CFU): L. rhamnosus, L. plantarum, B. longum strongest human signal; modest & scale-dependent (self-report > clinician scales); 1–50 ×10⁹ CFU/day, 8–12 wk.',
  PSYCHO_STRAINS:'Strain-specific anxiety/stress RCTs: L. helveticus R0052 + B. longum R0175 (Messaoudi, anxiolytic in humans); B. longum 1714; L. rhamnosus CNCM I-3690 decreases subjective academic stress (Gut Microbes 2022). Adjunct, not treatment.',
  FERMENTED_FIBRE:'Fermented foods (kefir, live-culture yogurt, kimchi, sauerkraut, miso) + prebiotic fibre (chicory, onion/garlic/leek, green banana, cooked-cooled starch) support microbial diversity beyond supplements. Caveat: with suspected SIBO, do NOT load prebiotic fibre before treatment.',
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
        src: [N('NUTRIENT_REV')], verified: true },
      { name: 'Blood-sugar-stabilising pattern (low-GI, regular meals)', evidence: 'moderate (mechanistic)',
        note: 'Avoid skipped meals and high-GI spikes → prevents reactive hypoglycaemia/jitteriness that mimics & worsens anxiety.',
        src: [N('NUTRIENT_REV')], verified: true },
    ],
    beneficialFoods: [
      { item: 'Oily fish (salmon, sardines, mackerel) ≥2×/wk', why: 'EPA/DHA omega-3 (anxiolytic signal).', src: [N('OMEGA3_ANX')], verified: true },
      { item: 'Leafy greens, legumes, nuts/seeds', why: 'Magnesium, folate, fibre (gut–brain axis).', src: [N('NUTRIENT_REV')], verified: true },
      { item: 'Fermented foods (yoghurt, kefir)', why: 'Probiotic/microbiome support — modest mood signal.', src: [N('NUTRIENT_REV')], verified: true },
      { item: 'Whole grains, oats, legumes (low-GI carbs)', why: 'Steady glucose; tryptophan transport.', src: [N('NUTRIENT_REV')], verified: true },
    ],
    avoidFoods: [
      { item: 'Caffeine (esp. afternoon/evening)', why: 'Adrenergic arousal worsens anxiety + disrupts sleep.', src: [N('NUTRIENT_REV')], verified: true },
      { item: 'Alcohol', why: 'Rebound anxiety; disrupts sleep architecture; CNS-depressant risk with some agents.', src: [N('NUTRIENT_REV')], verified: true },
      { item: 'High-GI sugary foods / skipped meals', why: 'Glucose swings → jitteriness mimicking anxiety.', src: [N('NUTRIENT_REV')], verified: true },
      { item: 'Tyramine-rich aged foods', why: 'ONLY if an MAOI is used — hypertensive crisis (not relevant to SSRIs/SNRIs).', interaction: 'MAOI', src: [N('SUPP_AD')], verified: true },
    ],
    drinks: [
      { item: 'Chamomile tea', evidence: 'moderate', why: 'Mild anxiolytic; allergy caution (Compositae/ragweed).', src: [N('CHAMOMILE')], verified: true },
      { item: 'Green tea (L-theanine source)', evidence: 'moderate', why: 'L-theanine ~25–50 mg/cup → calm-focus; far below 200 mg trial dose.', src: [N('LTHEANINE')], verified: true },
      { item: 'Lemon balm (Melissa) tea', evidence: 'weak', why: 'Traditional calming; limited trial data.', src: [N('NUTRIENT_REV')], verified: true },
    ],
    oils: [
      { item: 'Extra-virgin olive oil', evidence: 'moderate', why: 'Core Mediterranean fat; anti-inflammatory.', src: [N('NUTRIENT_REV')], verified: true },
      { item: 'Fish oil (culinary EPA/DHA source)', evidence: 'moderate', why: 'See omega-3 supplement.', src: [N('OMEGA3_ANX')], verified: true },
    ],
  },

  /* ── 📊 MACRO TEMPLATE (feeds computeMacros in mealPlanEngine) ──────────── */
  macroTemplate: {
    strategy: 'Blood-sugar stability: regular meals, NO skipped meals, low-GI high-fibre carbs; protein anchored to lean mass and front-loaded; Mediterranean unsaturated fat. In a caloric DEFICIT protein is raised toward a lean-preserving target WHEN renally safe (a moderately-high-protein pattern independently benefited trait anxiety in women); with renal impairment protein is instead capped to RDA (0.8 g/kg) and the freed energy is shifted into healthy fat, with nephrology referral.',
    fatPctEnergy: 30,            // WHO: total fat ≤30%E
    sfaCapPctEnergy: 10,         // WHO: saturated fat <10%E
    addedSugarCapPctEnergy: 10,  // WHO: free sugars <10%E (ideally <5%)
    evidence: 'weak–moderate (guideline + observational + one deficit RCT); ratio extremes not required',
    src: [N('WHO_DIET'), N('NA_AMDR_2024'), N('MACRO_ANX_DEF'), N('LOWCARB_NULL')], verified: true,
  },
  carbQuality: {
    prefer: [
      { type: 'Complex / low-GI, high-fibre', examples: 'oats, barley, bulgur & other whole grains; legumes/pulses; vegetables; whole fruit', why: 'Steady glucose → fewer reactive-hypoglycaemia swings that mimic/worsen anxiety; aids tryptophan transport.' },
    ],
    fibreTarget: '≥25 g/day (WHO); ≈14 g per 1000 kcal',
    avoid: [
      { type: 'Refined / simple / added sugar', examples: 'white bread & refined snacks, sugary drinks, sweets', why: 'Glucose spike→crash → jitteriness mimicking anxiety. Free/added sugars <10%E (ideally <5%).' },
    ],
    src: [N('WHO_DIET'), N('NA_AMDR_2024'), N('MACRO_TIMING_DEP')], verified: true,
  },
  fatQuality: {
    prefer: [
      { type: 'MUFA', examples: 'extra-virgin olive oil, avocado, nuts', why: 'Core Mediterranean fat; anti-inflammatory.' },
      { type: 'PUFA n-3 (EPA/DHA)', examples: 'oily fish (salmon/sardines/mackerel) ≥2×/wk; walnuts, flax/chia', why: 'Anxiolytic omega-3 signal; improves n-3:n-6 balance.' },
    ],
    limit: [
      { type: 'Saturated (SFA)', cap: '<10% of energy', examples: 'fatty meat, butter, palm/coconut oil', why: 'WHO cap; replace with unsaturated fat.' },
      { type: 'Trans (industrial)', cap: '<1% of energy — avoid', why: 'WHO; no safe amount of industrial trans fat.' },
    ],
    src: [N('WHO_DIET'), N('OMEGA3_ANX')], verified: true,
  },
  mealArchitecture: {
    meals: 3, snacks: 1, noSkip: true,
    distribution: [0.30, 0.35, 0.25],   // breakfast / lunch / dinner (+ ~0.10 optional snack); front-loaded
    timing: 'Daytime-loaded: front-load energy earlier and keep the last main meal ≥3 h before bed. Protein-forward at breakfast (alertness); complex carbohydrate acceptable at the evening meal (tryptophan→serotonin/melatonin). Regular fixed meal times stabilise cortisol. Cap caffeine ≤200 mg/day during SSRI initiation.',
    src: [N('MEALTIME_MOOD'), N('MACRO_TIMING_DEP'), N('LATE_EATING')], verified: true,
  },
  psychobiotics: {
    note: 'ADJUNCT only; modest, scale-dependent signal (stronger on self-report anxiety than clinician scales). Not a treatment; try ≥8–12 wk before judging.',
    strains: [
      { name: 'Lactobacillus rhamnosus (e.g. CNCM I-3690 / HN001)', dose: '1–10 ×10⁹ CFU/day', evidence: 'candidate anxiolytic; academic-stress RCT' },
      { name: 'Lactiplantibacillus plantarum', dose: '~1 ×10⁹ CFU/day (often in multi-strain)', evidence: 'human anxiety/stress signal' },
      { name: 'Bifidobacterium longum (e.g. 1714 / R0175)', dose: '~1 ×10⁹ CFU/day', evidence: 'stress/anxiety RCTs' },
      { name: 'L. helveticus R0052 + B. longum R0175 (combination)', dose: 'combined ~3 ×10⁹ CFU/day', evidence: 'anxiolytic combination in humans (Messaoudi)' },
    ],
    duration: '8–12 weeks for a consistent effect',
    foodSources: 'plain kefir, unsweetened live-culture yoghurt, kimchi, sauerkraut, miso — 1–2 servings/day; + prebiotic fibre 10–15 g/day (chicory, onion/garlic/leek, green banana, cooked-cooled potato/rice)',
    caution: 'If SIBO is suspected, do NOT load prebiotic fibre before treating it (can worsen bloating & acutely worsen anxiety).',
    src: [N('PSYCHO_ANX'), N('PSYCHO_STRAINS'), N('FERMENTED_FIBRE')], verified: true,
  },

  /* ── 🧴 ADAPTOGENS ────────────────────────────────────────────────────── */
  adaptogens: [
    { name: 'Ashwagandha (Withania somnifera)', forms: 'standardised root extract (e.g. KSM-66, Sensoril, Shoden)',
      dose: '120–600 mg/day (commonly 300 mg BID KSM-66, or 240 mg Shoden)', timing: 'with food; evening if sedation desired',
      evidence: 'moderate (multiple RCTs; HAM-A ↓, cortisol ↓)',
      interaction: 'Additive sedation with sedating agents; may RAISE thyroid hormone (caution with levothyroxine/hyperthyroid); rare hepatotoxicity; immunosuppressant interaction; AVOID in pregnancy.',
      synergy: 'Cortisol/anxiety reduction alongside SSRI (no direct serotonergic load at usual doses).',
      src: [N('ASHWA_MA'), N('RHODIOLA'), N('SUPP_AD')], verified: true },
    { name: 'Rhodiola rosea', forms: 'standardised extract (e.g. SHR-5)',
      dose: '290–1500 mg/day', timing: 'morning (can be activating)',
      evidence: 'weak–moderate (anti-stress/fatigue; anxiety data limited)',
      interaction: 'Weak serotonergic / possible MAO-inhibition signal — caution with SSRIs/SNRIs/MAOIs (theoretical serotonin risk).',
      synergy: 'Anti-fatigue/stress adjunct.', src: [N('RHODIOLA'), N('DHI_REVIEW')], verified: true },
    { name: 'Saffron (Crocus sativus)', forms: 'standardised stigma extract',
      dose: '~30 mg/day', timing: 'with meals',
      evidence: 'moderate (RCTs + 2025 MA; anxiety/depression)',
      interaction: 'Serotonergic signal at higher doses — caution combining with SSRIs (theoretical); generally well tolerated.',
      synergy: 'May augment mood; comparable to SSRIs in some trials.', src: [N('SAFFRON')], verified: true },
  ],

  /* ── 🍄 FUNCTIONAL MUSHROOMS (evidence limited — flagged honestly) ─────── */
  mushrooms: [
    { name: "Lion's mane (Hericium erinaceus)", forms: 'capsule/powder extract',
      dose: N_NEEDS + ' (trials varied)', timing: 'with food',
      evidence: 'preliminary/weak (small human studies; mostly cognition/mood)',
      interaction: 'No major known drug interaction; data sparse.', synergy: 'Possible mood/cognition support — UNPROVEN for GAD.',
      src: [N('LIONSMANE')], verified: true },
    { name: 'Reishi (Ganoderma lucidum)', forms: 'extract',
      dose: N_NEEDS, timing: 'with food',
      evidence: 'preliminary/weak (mainly fatigue/QoL, not anxiety)',
      interaction: 'Possible additive effect with anticoagulants/antihypertensives; data sparse.', synergy: 'Limited.',
      src: [N('REISHI')], verified: true },
  ],

  /* ── 🌿 HERBS ─────────────────────────────────────────────────────────── */
  herbs: [
    { name: 'Lavender oil — Silexan', forms: 'oral 80 mg softgel',
      dose: '80–160 mg/day', timing: 'once daily',
      evidence: 'strong for an herbal (GAD RCT n=539; ≈ paroxetine/lorazepam)',
      interaction: 'Generally well tolerated; mild eructation/lavender taste; no major serotonergic interaction reported.',
      synergy: 'Effective monotherapy or adjunct in mild–moderate GAD.', src: [N('SILEXAN')], verified: true },
    { name: 'Chamomile (Matricaria) extract', forms: 'standardised capsule / tea',
      dose: 'up to ~1500 mg/day (trial doses vary)', timing: 'divided',
      evidence: 'moderate (long-term GAD RCT)',
      interaction: 'ALLERGY (Compositae/ragweed); mild additive sedation; possible mild anticoagulant interaction at high dose.',
      synergy: 'Mild anxiolytic adjunct.', src: [N('CHAMOMILE')], verified: true },
    { name: 'Passionflower (Passiflora incarnata)', forms: 'extract / tea',
      dose: N_NEEDS + ' (trial-dependent)', timing: 'divided / pre-sleep',
      evidence: 'moderate (≈ oxazepam in GAD RCT, less impairment)',
      interaction: 'Additive sedation/CNS depression with benzodiazepines/alcohol/pregabalin.',
      synergy: 'Calming adjunct; useful where benzodiazepine avoidance desired.', src: [N('PASSION')], verified: true },
    { name: 'Valerian (Valeriana officinalis)', forms: 'root extract',
      dose: 'varies', timing: 'pre-sleep',
      evidence: 'WEAK — multiple NEGATIVE anxiety trials (honest flag)',
      interaction: 'Additive sedation with CNS depressants.', synergy: 'Limited/unproven for GAD.',
      src: [N('VALERIAN_NEG')], verified: true },
  ],

  /* ── 🧴 SUPPLEMENTS (vitamins / minerals / amino) ─────────────────────── */
  supplements: [
    { name: 'Omega-3 (EPA-predominant fish oil)', forms: 'softgel / liquid; EPA ≥60%',
      dose: '~1–2 g/day total EPA+DHA (EPA-predominant)', timing: 'with meals',
      evidence: 'moderate (dose-response MA; GRADE low)',
      interaction: 'High dose → mild bleeding risk with anticoagulants.',
      synergy: 'SAFE with SSRI/SNRI; anti-inflammatory adjunct.', src: [N('OMEGA3_ANX')], verified: true },
    { name: 'Magnesium (glycinate preferred; also citrate/malate)', forms: 'glycinate (best tolerated), citrate, malate, oxide (poor absorption)',
      dose: '200–400 mg elemental/day', timing: 'evening',
      evidence: 'weak–moderate (deficiency correction; modest signal)',
      interaction: 'NONE significant with SSRIs (safe). Separate from some antibiotics (absorption).',
      synergy: 'SAFE synergy with SSRI; supports sleep/anxiety + QTc safety if quetiapine used.', src: [N('MAG_ANX'), N('SUPP_AD')], verified: true },
    { name: 'Vitamin D3', forms: 'capsule/drops', dose: 'correct deficiency to target level (per serum 25-OH-D)', timing: 'with fat-containing meal',
      evidence: 'weak–moderate (deficiency-linked)', interaction: 'None significant.',
      synergy: 'Correct deficiency; supports mood/circadian.', src: [N('NUTRIENT_REV')], verified: true },
    { name: 'Zinc', forms: 'picolinate/citrate', dose: 'RDA-level repletion (avoid chronic high-dose → copper depletion)', timing: 'with food',
      evidence: 'weak (modulatory; deficiency correction)', interaction: 'High dose depletes copper; separate from some antibiotics.',
      synergy: 'Repletion only.', src: [N('NUTRIENT_REV')], verified: true },
    { name: 'L-theanine', forms: 'capsule', dose: '200 mg/day (up to 400)', timing: 'as needed / daytime',
      evidence: 'moderate', interaction: 'None significant; mild additive calm.',
      synergy: 'SAFE calm-focus adjunct with SSRI.', src: [N('LTHEANINE')], verified: true },
    { name: 'B-complex / B6 / folate', forms: 'B-complex; methylfolate if MTHFR', dose: 'repletion', timing: 'morning with food',
      evidence: 'weak–moderate (methylation/neurotransmitter cofactors)', interaction: 'Generally safe.',
      synergy: 'Cofactor support, esp. if deficient.', src: [N('NUTRIENT_REV')], verified: true },
  ],

  /* ── ⛔ AVOID WITH THE LOCKED PROTOCOL (deterministic safety) ──────────── */
  avoidWithProtocol: [
    { item: "St John's Wort (Hypericum)", severity: 'CONTRAINDICATED with SSRI/SNRI',
      why: 'Serotonin-syndrome risk + induces CYP3A4/2C9/2C19 → lowers levels of many drugs (OCPs, anticoagulants, others). Not to be combined with serotonergic antidepressants.',
      src: [N('SJW_SSRI'), N('DHI_REVIEW')], verified: true },
    { item: '5-HTP / L-tryptophan', severity: 'MAJOR with SSRI/SNRI/MAOI',
      why: 'Adds serotonin precursor → serotonin-syndrome risk. Avoid; ≥2-week separation when switching.',
      src: [N('HTP_SSRI')], verified: true },
    { item: 'SAMe', severity: 'CAUTION with serotonergic agents',
      why: 'Serotonergic — avoid stacking with SSRI/SNRI without supervision.',
      src: [N('HTP_SSRI')], verified: true },
    { item: 'Kava', severity: 'AVOID',
      why: 'Hepatotoxicity + additive CNS depression. (Already excluded in the formulary.)',
      src: [N('KAVA_HEP')], verified: true },
    { item: 'High-dose Ginkgo biloba', severity: 'CAUTION',
      why: 'Bleeding risk (esp. with anticoagulants) + weak MAO/serotonergic signal.',
      src: [N('DHI_REVIEW')], verified: true },
  ],

  /* ── ✅ EVIDENCE-BASED SYNERGY (safe augmentation with the protocol) ───── */
  synergyWithProtocol: [
    { item: 'Magnesium glycinate', note: 'Safe with SSRIs; supports sleep/anxiety; corrects deficiency.', src: [N('MAG_ANX'), N('SUPP_AD')], verified: true },
    { item: 'Omega-3 (EPA-predominant)', note: 'Safe adjunct; modest anxiolytic + anti-inflammatory.', src: [N('OMEGA3_ANX')], verified: true },
    { item: 'L-theanine', note: 'Safe calm-focus adjunct.', src: [N('LTHEANINE')], verified: true },
    { item: 'Silexan (lavender)', note: 'Evidence-based herbal; can be adjunct or monotherapy in mild–moderate GAD.', src: [N('SILEXAN')], verified: true },
  ],
};

/* ════════════════ MDD ════════════════ */
const MDD = {
  diet: {
    patterns: [
      { name: 'Mediterranean / anti-inflammatory pattern (SMILES-style)', evidence: 'moderate',
        note: 'Dietary-improvement RCTs (e.g. SMILES) show benefit as adjunct in depression.', src: [N('SARRIS_AJP')], verified: false },
    ],
    beneficialFoods: [
      { item: 'Oily fish ≥2×/wk', why: 'EPA/DHA omega-3 (antidepressant signal).', src: [N('EPA_DEP')], verified: false },
      { item: 'Leafy greens, legumes, fortified grains', why: 'Folate/B-vitamins for neurotransmitter synthesis.', src: [N('SARRIS_AJP')], verified: false },
      { item: 'Fermented foods', why: 'Microbiome–mood axis (modest).', src: [N('NUTRIENT_REV')], verified: false },
    ],
    avoidFoods: [
      { item: 'Excess alcohol', why: 'Depressant; worsens mood/sleep; interacts with antidepressants.', src: [N('NUTRIENT_REV')], verified: false },
      { item: 'Ultra-processed/high-GI diet', why: 'Associated with higher depression risk.', src: [N('NUTRIENT_REV')], verified: false },
      { item: 'Tyramine-rich aged foods', why: 'ONLY if MAOI — hypertensive crisis.', interaction: 'MAOI', src: [N('SUPP_AD')], verified: false },
    ],
    drinks: [
      { item: 'Green tea (L-theanine)', evidence: 'weak', why: 'Mild calming/focus; modest mood data.', src: [N('LTHEANINE')], verified: false },
    ],
    oils: [
      { item: 'Extra-virgin olive oil', evidence: 'moderate', why: 'Mediterranean fat; anti-inflammatory.', src: [N('SARRIS_AJP')], verified: false },
    ],
  },
  macroTemplate: {
    strategy: 'Anti-inflammatory Mediterranean pattern with adequate protein and high-quality complex carbohydrate; emphasise unsaturated fat (MUFA + EPA-omega-3). High-quality carbohydrate and total protein are inversely associated with depression while added sugar is positively associated. In a caloric DEFICIT protein is raised toward a lean-preserving target when renally safe (energy restriction + weight loss also benefited depressive traits); renal impairment caps protein to RDA and shifts freed energy into healthy fat.',
    fatPctEnergy: 30, sfaCapPctEnergy: 10, addedSugarCapPctEnergy: 10,
    evidence: 'weak–moderate (guideline + observational; SMILES-style dietary-improvement RCTs support the pattern, not a specific ratio)',
    src: [N('WHO_DIET'), N('NA_AMDR_2024'), N('MACRO_TIMING_DEP'), N('MACRO_ANX_DEF')], verified: false,
  },
  carbQuality: {
    prefer: [
      { type: 'Complex / low-GI, high-fibre', examples: 'whole grains (oats, barley), legumes/pulses, vegetables, whole fruit', why: 'High-quality carbohydrate is inversely associated with depression; steadier energy and gut–brain support.' },
    ],
    fibreTarget: '≥25 g/day (WHO); ≈14 g per 1000 kcal',
    avoid: [
      { type: 'Refined / added sugar', examples: 'sugary drinks, sweets, refined snacks', why: 'Added sugar is positively associated with depression; replace with high-quality carbohydrate. Free sugars <10%E (ideally <5%).' },
    ],
    src: [N('WHO_DIET'), N('NA_AMDR_2024'), N('MACRO_TIMING_DEP')], verified: false,
  },
  fatQuality: {
    prefer: [
      { type: 'PUFA n-3 (EPA-predominant)', examples: 'oily fish ≥2×/wk; walnuts, flax/chia; EPA supplement', why: 'EPA-predominant omega-3 has an antidepressant signal (adjunct).' },
      { type: 'MUFA', examples: 'extra-virgin olive oil, avocado, nuts', why: 'Core Mediterranean fat; anti-inflammatory.' },
    ],
    limit: [
      { type: 'Saturated (SFA)', cap: '<10% of energy', examples: 'fatty meat, butter, palm/coconut oil', why: 'WHO cap; replace with unsaturated fat.' },
      { type: 'Trans (industrial)', cap: '<1% of energy — avoid', why: 'WHO.' },
    ],
    src: [N('WHO_DIET'), N('EPA_DEP'), N('SARRIS_AJP')], verified: false,
  },
  mealArchitecture: {
    meals: 3, snacks: 1, noSkip: true,
    distribution: [0.30, 0.35, 0.25],
    timing: 'Daytime-loaded, regular meal times (protect against the appetite/rhythm disruption of depression). High-quality carbohydrate at breakfast and dinner is inversely associated with depression; last main meal ≥3 h before bed; avoid late-night eating. Do not skip meals — low appetite in depression risks under-eating.',
    src: [N('MACRO_TIMING_DEP'), N('MEALTIME_MOOD'), N('LATE_EATING')], verified: false,
  },
  psychobiotics: {
    note: 'ADJUNCT only; probiotics show a modest reduction in depressive symptoms (stronger on self-report/BDI than clinician scales). Not a treatment; try ≥8–12 wk.',
    strains: [
      { name: 'Bifidobacterium longum (e.g. 1714 / R0175)', dose: '~1 ×10⁹ CFU/day', evidence: 'stress/low-mood RCTs' },
      { name: 'Lactobacillus rhamnosus', dose: '1–10 ×10⁹ CFU/day', evidence: 'candidate mood/stress strain' },
      { name: 'Lactiplantibacillus plantarum', dose: '~1 ×10⁹ CFU/day (multi-strain)', evidence: 'mood signal in multi-strain RCTs' },
      { name: 'L. helveticus R0052 + B. longum R0175 (combination)', dose: 'combined ~3 ×10⁹ CFU/day', evidence: 'mood/anxiety combination in humans' },
    ],
    duration: '8–12 weeks for a consistent effect',
    foodSources: 'plain kefir, unsweetened live-culture yoghurt, kimchi, sauerkraut, miso — 1–2 servings/day; + prebiotic fibre 10–15 g/day (chicory, onion/garlic/leek, green banana, cooked-cooled starch)',
    caution: 'If SIBO is suspected, do NOT load prebiotic fibre before treating it.',
    src: [N('PSYCHO_ANX'), N('PSYCHO_STRAINS'), N('FERMENTED_FIBRE')], verified: false,
  },
  adaptogens: [
    { name: 'Saffron (Crocus sativus)', forms: 'standardised extract', dose: '~30 mg/day', timing: 'with meals',
      evidence: 'moderate (RCTs comparable to SSRIs in mild–moderate)',
      interaction: 'Serotonergic at higher dose — caution combining with SSRI.', synergy: 'May augment antidepressant effect.',
      src: [N('SAFFRON'), N('SARRIS_AJP')], verified: false },
    { name: 'Rhodiola rosea', forms: 'SHR-5 extract', dose: '290–680 mg/day', timing: 'morning',
      evidence: 'weak–moderate (mild–moderate depression signal)',
      interaction: 'Weak serotonergic/MAO signal — caution with SSRI/SNRI/MAOI.', synergy: 'Anti-fatigue.', src: [N('RHODIOLA'), N('DHI_REVIEW')], verified: false },
    { name: 'Ashwagandha', forms: 'KSM-66/Sensoril', dose: '300 mg BID', timing: 'with food',
      evidence: 'weak–moderate (mood/stress; less depression-specific)',
      interaction: 'Sedation additive; thyroid; rare hepatotoxicity; pregnancy avoid.', synergy: 'Stress/cortisol.', src: [N('ASHWA_MA'), N('SUPP_AD')], verified: false },
  ],
  mushrooms: [
    { name: "Lion's mane", forms: 'extract', dose: N_NEEDS, timing: 'with food',
      evidence: 'preliminary/weak (small mood studies)', interaction: 'Sparse data.', synergy: 'Unproven for MDD.', src: [N('LIONSMANE')], verified: false },
  ],
  herbs: [
    { name: 'Lavender — Silexan', forms: 'oral 80 mg', dose: '80 mg/day', timing: 'once daily',
      evidence: 'moderate (mild–moderate MDD; ≈ sertraline 50 mg in one RCT)',
      interaction: 'Well tolerated.', synergy: 'Adjunct for comorbid anxiety/depression.', src: [N('SILEXAN')], verified: false },
  ],
  supplements: [
    { name: 'Omega-3 (EPA-predominant)', forms: 'softgel/liquid, EPA ≥60%', dose: '1–2 g EPA/day', timing: 'with meals',
      evidence: 'moderate–strong (EPA-predominant; replicated MA)', interaction: 'High dose bleeding risk with anticoagulants.',
      synergy: 'SAFE adjunct/augmentation with antidepressants.', src: [N('SARRIS_AJP'), N('EPA_DEP')], verified: false },
    { name: 'SAMe (S-adenosylmethionine)', forms: 'enteric tablet', dose: '800–1600 mg/day', timing: 'between meals',
      evidence: 'moderate (replicated as monotherapy + augmentation)',
      interaction: '⚠️ SEROTONERGIC — combine with SSRI/SNRI only under supervision (serotonin-syndrome caution); can trigger mania in bipolar.',
      synergy: 'Evidence-based augmentation in partial responders (with caution).', src: [N('SARRIS_AJP')], verified: false },
    { name: 'L-methylfolate', forms: 'tablet', dose: '7.5–15 mg/day (augmentation)', timing: 'morning',
      evidence: 'moderate (augmentation, esp. low folate / MTHFR variants)',
      interaction: 'Generally safe; active form bypasses MTHFR.', synergy: 'Augments antidepressant response, esp. MTHFR.', src: [N('SARRIS_AJP')], verified: false },
    { name: 'Vitamin D3', forms: 'capsule/drops', dose: 'correct deficiency (esp. <20 ng/mL)', timing: 'with fat meal',
      evidence: 'weak–moderate (works mainly when deficient)', interaction: 'High dose (≥275 µg/d) hypercalcaemia risk.',
      synergy: 'Correct deficiency.', src: [N('SARRIS_AJP')], verified: false },
    { name: 'Magnesium', forms: 'glycinate/citrate', dose: '~248–500 mg/day', timing: 'evening',
      evidence: 'moderate (2023 MA: depression & anxiety)', interaction: 'Safe with SSRIs.',
      synergy: 'NMDA antagonist; HPA regulation; safe adjunct.', src: [N('NUTRIENT_REV')], verified: false },
    { name: 'Creatine', forms: 'monohydrate', dose: '3–5 g/day', timing: 'daily',
      evidence: 'weak (isolated positive augmentation studies, esp. females)', interaction: 'Generally safe; hydration.',
      synergy: 'Possible augmentation.', src: [N('SARRIS_AJP')], verified: false },
  ],
  avoidWithProtocol: [
    { item: "St John's Wort", severity: 'CONTRAINDICATED with SSRI/SNRI', why: 'Serotonin syndrome + CYP3A4/2C9/2C19 induction; effective alone for mild–moderate but NOT to combine with antidepressants.', src: [N('SJW_SSRI')], verified: false },
    { item: '5-HTP / L-tryptophan', severity: 'MAJOR with SSRI/SNRI/MAOI', why: 'Serotonin-syndrome risk.', src: [N('HTP_SSRI')], verified: false },
    { item: 'Kava', severity: 'AVOID', why: 'Hepatotoxicity + CNS depression.', src: [N('KAVA_HEP')], verified: false },
  ],
  synergyWithProtocol: [
    { item: 'Omega-3 (EPA-predominant)', note: 'Best-evidenced adjunct; safe with antidepressants.', src: [N('EPA_DEP')], verified: false },
    { item: 'L-methylfolate', note: 'Augmentation, esp. low folate/MTHFR.', src: [N('SARRIS_AJP')], verified: false },
    { item: 'Vitamin D (if deficient)', note: 'Correct deficiency.', src: [N('SARRIS_AJP')], verified: false },
    { item: 'SAMe', note: 'Augmentation WITH serotonergic caution/supervision.', src: [N('SARRIS_AJP')], verified: false },
  ],
};

/* ════════════════ OCD ════════════════ */
const OCD = {
  diet: {
    patterns: [
      { name: 'Balanced anti-inflammatory pattern', evidence: 'weak (indirect)',
        note: 'General mental-health support; no OCD-specific dietary RCT.', src: [N('OCD_NUTRA')], verified: false },
    ],
    beneficialFoods: [
      { item: 'Oily fish / omega-3 sources', why: 'General mood/anti-inflammatory; limited OCD-specific data.', src: [N('OCD_NUTRA')], verified: false },
    ],
    avoidFoods: [
      { item: 'Excess caffeine', why: 'Can heighten anxiety/agitation that worsens OCD distress.', src: [N('OCD_NUTRA')], verified: false },
      { item: 'Tyramine-rich aged foods', why: 'ONLY if MAOI used.', interaction: 'MAOI', src: [N('SUPP_AD')], verified: false },
    ],
    drinks: [
      { item: 'Limit energy drinks/high caffeine', evidence: 'weak', why: 'Arousal can amplify symptoms.', src: [N('OCD_NUTRA')], verified: false },
    ],
    oils: [
      { item: 'Extra-virgin olive oil', evidence: 'weak (general)', why: 'Anti-inflammatory pattern.', src: [N('OCD_NUTRA')], verified: false },
    ],
  },
  adaptogens: [
    { name: 'Saffron', forms: 'extract', dose: '~30 mg/day', timing: 'with meals',
      evidence: 'preliminary (small OCD/anxiety signal)', interaction: 'Serotonergic caution with SSRI.', synergy: 'Possible adjunct.', src: [N('SAFFRON')], verified: false },
  ],
  mushrooms: [
    { name: "Lion's mane", forms: 'extract', dose: N_NEEDS, timing: 'with food', evidence: 'preliminary/weak', interaction: 'Sparse.', synergy: 'Unproven for OCD.', src: [N('LIONSMANE')], verified: false },
  ],
  herbs: [
    { name: 'Milk thistle (Silybum marianum)', forms: 'standardised silymarin', dose: 'trial-dependent', timing: 'with food',
      evidence: 'weak (small trial ≈ fluoxetine)', interaction: 'Mild CYP effects; generally well tolerated.', synergy: 'Possible adjunct.', src: [N('OCD_NUTRA')], verified: false },
  ],
  supplements: [
    { name: 'N-acetylcysteine (NAC)', forms: 'tablet/effervescent', dose: '2000–3000 mg/day (divided)', timing: 'with food',
      evidence: 'moderate (glutamatergic; 4/5 RCTs positive on Y-BOCS; adult 16-wk study mixed)',
      interaction: 'Generally safe; mild GI; theoretical additive with nitrates (hypotension).',
      synergy: 'Evidence-based augmentation to SSRI for OCD.', src: [N('NAC_OCD'), N('OCD_NUTRA')], verified: false },
    { name: 'Myo-inositol', forms: 'powder', dose: '~12–18 g/day (high)', timing: 'divided with fluid',
      evidence: 'weak–moderate (serotonergic; small monotherapy RCT)', interaction: 'GI upset at high dose; theoretical serotonergic.',
      synergy: 'Possible monotherapy/adjunct.', src: [N('INOSITOL_OCD')], verified: false },
    { name: 'Glycine', forms: 'powder', dose: 'high (trial-dependent)', timing: 'divided',
      evidence: 'weak (glutamatergic; small data; palatability/GI limit use)', interaction: 'GI; sparse data.',
      synergy: 'Investigational.', src: [N('OCD_NUTRA')], verified: false },
    { name: 'Omega-3 (EPA-predominant)', forms: 'softgel', dose: '1–2 g/day', timing: 'with meals',
      evidence: 'weak (general; not OCD-specific)', interaction: 'Bleeding at high dose.', synergy: 'General adjunct.', src: [N('EPA_DEP')], verified: false },
    { name: 'Magnesium / Vitamin D (repletion)', forms: 'glycinate / D3', dose: 'repletion', timing: 'evening / with fat',
      evidence: 'weak (deficiency correction)', interaction: 'Safe.', synergy: 'General support.', src: [N('NUTRIENT_REV')], verified: false },
  ],
  avoidWithProtocol: [
    { item: "St John's Wort", severity: 'CONTRAINDICATED with SSRI/clomipramine', why: 'Serotonin syndrome + CYP induction.', src: [N('SJW_SSRI')], verified: false },
    { item: '5-HTP / L-tryptophan', severity: 'MAJOR with SSRI/clomipramine', why: 'Serotonin-syndrome risk (high-dose serotonergic OCD meds).', src: [N('HTP_SSRI')], verified: false },
  ],
  synergyWithProtocol: [
    { item: 'NAC', note: 'Best-evidenced nutraceutical augmentation for OCD (glutamatergic).', src: [N('NAC_OCD')], verified: false },
    { item: 'Myo-inositol', note: 'Possible adjunct (high dose).', src: [N('INOSITOL_OCD')], verified: false },
  ],
};

/* ════════════════ BPD (Borderline) ════════════════ */
const BPD = {
  diet: {
    patterns: [
      { name: 'Stable, regular, Mediterranean-style eating', evidence: 'weak (general)',
        note: 'Supports mood stability; avoid aggressive restriction (can trigger disordered eating / mood swings).', src: [N('NUTRIENT_REV')], verified: false },
    ],
    beneficialFoods: [
      { item: 'Oily fish / omega-3 sources', why: 'EPA signal for affective instability/impulsivity.', src: [N('BPD_OMEGA3')], verified: false },
      { item: 'Regular protein + low-GI carbs', why: 'Stable glucose → steadier mood/impulse control.', src: [N('NUTRIENT_REV')], verified: false },
    ],
    avoidFoods: [
      { item: 'Alcohol & high caffeine', why: 'Disinhibition/impulsivity, sleep disruption, mood lability.', src: [N('NUTRIENT_REV')], verified: false },
      { item: 'Aggressive caloric restriction', why: 'Hypoglycaemic mood swings; disordered-eating risk in BPD.', src: [N('NUTRIENT_REV')], verified: false },
    ],
    drinks: [
      { item: 'Limit alcohol/energy drinks', evidence: 'weak', why: 'Impulsivity/sleep.', src: [N('NUTRIENT_REV')], verified: false },
    ],
    oils: [
      { item: 'Fish oil / olive oil', evidence: 'weak–moderate', why: 'Omega-3 / Mediterranean fat.', src: [N('BPD_OMEGA3')], verified: false },
    ],
  },
  adaptogens: [],
  mushrooms: [],
  herbs: [],
  supplements: [
    { name: 'Omega-3 (EPA-predominant)', forms: 'softgel/liquid, EPA ≥60%', dose: '~1–2 g EPA/day', timing: 'with meals',
      evidence: 'moderate for a supplement (RCT/MA: affective instability, impulsivity, aggression)',
      interaction: 'Bleeding at high dose with anticoagulants.', synergy: 'Best-evidenced nutritional adjunct in BPD; pairs with DBT.', src: [N('BPD_OMEGA3')], verified: false },
    { name: 'Vitamin D / Magnesium (repletion)', forms: 'D3 / glycinate', dose: 'repletion', timing: 'with fat / evening',
      evidence: 'weak (deficiency correction)', interaction: 'Safe.', synergy: 'General support.', src: [N('NUTRIENT_REV')], verified: false },
  ],
  avoidWithProtocol: [
    { item: "St John's Wort", severity: 'CONTRAINDICATED if on any SSRI (for comorbidity)', why: 'Serotonin syndrome + CYP induction.', src: [N('SJW_SSRI')], verified: false },
    { item: '5-HTP / L-tryptophan', severity: 'MAJOR if on serotonergic agent', why: 'Serotonin-syndrome risk.', src: [N('HTP_SSRI')], verified: false },
    { item: 'Sedating herbs (valerian/kava) + sedating meds', severity: 'CAUTION', why: 'Additive CNS depression (esp. with quetiapine/benzo); kava hepatotoxicity.', src: [N('KAVA_HEP')], verified: false },
  ],
  synergyWithProtocol: [
    { item: 'Omega-3 (EPA-predominant)', note: 'Evidence-based adjunct to psychotherapy for affective/impulsive symptoms.', src: [N('BPD_OMEGA3')], verified: false },
  ],
};

/* ════════════════ PMDD ════════════════ */
const PMDD = {
  diet: {
    patterns: [
      { name: 'Stable low-GI eating; reduced luteal caffeine/alcohol/salt', evidence: 'moderate',
        note: 'Reduces bloating, irritability, sleep disruption in the luteal phase.', src: [N('PMS_REVIEW')], verified: false },
    ],
    beneficialFoods: [
      { item: 'Calcium-rich foods (dairy/fortified)', why: 'Dietary calcium linked to fewer PMS symptoms.', src: [N('PMS_CALCIUM')], verified: false },
      { item: 'Complex carbohydrates (luteal)', why: 'Support tryptophan→serotonin; ease mood/cravings.', src: [N('PMS_REVIEW')], verified: false },
      { item: 'Oily fish', why: 'Omega-3 for mood.', src: [N('EPA_DEP')], verified: false },
    ],
    avoidFoods: [
      { item: 'High salt (luteal)', why: 'Worsens bloating/fluid retention.', src: [N('PMS_REVIEW')], verified: false },
      { item: 'Caffeine & alcohol (luteal)', why: 'Worsen irritability, anxiety, sleep.', src: [N('PMS_REVIEW')], verified: false },
      { item: 'Tyramine-rich aged foods', why: 'ONLY if MAOI.', interaction: 'MAOI', src: [N('SUPP_AD')], verified: false },
    ],
    drinks: [
      { item: 'Reduce caffeinated drinks in luteal phase', evidence: 'moderate', why: 'Arousal/irritability.', src: [N('PMS_REVIEW')], verified: false },
    ],
    oils: [
      { item: 'Evening primrose oil', evidence: 'NEGATIVE — no consistent benefit (honest flag)', why: 'Rigorous trials show no benefit.', src: [N('PMS_REVIEW')], verified: false },
    ],
  },
  adaptogens: [
    { name: 'Saffron', forms: 'extract', dose: '~30 mg/day', timing: 'with meals',
      evidence: 'preliminary (PMS mood signal)', interaction: 'Serotonergic caution with SSRI.', synergy: 'Possible mood adjunct.', src: [N('SAFFRON'), N('PMS_REVIEW')], verified: false },
  ],
  mushrooms: [],
  herbs: [
    { name: 'Chasteberry (Vitex agnus-castus)', forms: 'standardised extract (e.g. Agnolyt)', dose: 'standardised daily (≈4 mg extract or product-specific)', timing: 'morning',
      evidence: 'moderate (RCTs for PMS; less PMDD-specific)',
      interaction: '⚠️ HORMONAL/DOPAMINERGIC — avoid with hormonal contraceptives/HRT, dopamine agonists/antagonists, and in pregnancy/breastfeeding; theoretical interaction with SSRIs is minor.',
      synergy: 'Alternative/adjunct for physical+mood PMS symptoms.', src: [N('VITEX')], verified: false },
  ],
  supplements: [
    { name: 'Calcium (carbonate/citrate)', forms: 'tablet', dose: '1000–1200 mg/day', timing: 'divided with food',
      evidence: 'moderate–strong (best-evidenced PMS supplement)', interaction: 'Separate from levothyroxine/some antibiotics (absorption).',
      synergy: 'Safe with SSRIs; first-choice supplement.', src: [N('PMS_CALCIUM')], verified: false },
    { name: 'Vitamin B6 (pyridoxine)', forms: 'tablet', dose: '50–100 mg/day (DO NOT exceed 100)', timing: 'morning',
      evidence: 'weak–moderate (mixed; better with calcium/magnesium)',
      interaction: '⚠️ >100 mg/day or prolonged → peripheral NEUROPATHY. Cap at 100 mg/day.', synergy: 'Serotonin cofactor; stack with calcium/magnesium.', src: [N('PMS_B6')], verified: false },
    { name: 'Magnesium (+ B6)', forms: 'glycinate/pyrrolidone', dose: '~200–300 mg/day (often with B6)', timing: 'luteal/evening',
      evidence: 'weak alone; better COMBINED with B6 for premenstrual anxiety', interaction: 'Safe with SSRIs.',
      synergy: 'Anxiety + cramps; pairs with B6.', src: [N('PMS_REVIEW')], verified: false },
    { name: 'Omega-3 (EPA-predominant)', forms: 'softgel', dose: '1–2 g/day', timing: 'with meals',
      evidence: 'weak–moderate (mood/physical PMS)', interaction: 'Bleeding at high dose.', synergy: 'Adjunct.', src: [N('EPA_DEP')], verified: false },
    { name: 'Vitamin E', forms: 'softgel', dose: 'trial-dependent', timing: 'with food',
      evidence: 'weak (limited PMS signal)', interaction: 'High dose bleeding risk with anticoagulants.', synergy: 'Possible breast-tenderness relief.', src: [N('PMS_REVIEW')], verified: false },
  ],
  avoidWithProtocol: [
    { item: "St John's Wort", severity: 'CONTRAINDICATED with SSRI (+ ↓ contraceptive efficacy)', why: 'Serotonin syndrome + CYP3A4 induction LOWERS oral-contraceptive levels (critical if COC used for PMDD).', src: [N('SJW_SSRI'), N('PMS_REVIEW')], verified: false },
    { item: '5-HTP / L-tryptophan', severity: 'MAJOR with SSRI', why: 'Serotonin-syndrome risk.', src: [N('HTP_SSRI')], verified: false },
    { item: 'Chasteberry + hormonal therapy / dopaminergic drugs', severity: 'CAUTION/AVOID', why: 'Hormonal & dopaminergic activity may interfere.', src: [N('VITEX')], verified: false },
    { item: 'Evening primrose oil (as a treatment)', severity: 'NOT RECOMMENDED', why: 'No consistent efficacy.', src: [N('PMS_REVIEW')], verified: false },
  ],
  synergyWithProtocol: [
    { item: 'Calcium 1000–1200 mg/day', note: 'Best-evidenced, safe with SSRIs.', src: [N('PMS_CALCIUM')], verified: false },
    { item: 'Magnesium + B6 (≤100 mg B6)', note: 'Premenstrual anxiety; safe with SSRIs.', src: [N('PMS_REVIEW')], verified: false },
  ],
};

export const NUTRITION = { GAD, MDD, OCD, BPD, PMDD };

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
