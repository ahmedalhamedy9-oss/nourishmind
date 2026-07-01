/* ════════════════════════════════════════════════════════════════════════
   PsychDecide — Locked Clinical Formulary + Deterministic Metrics
   ------------------------------------------------------------------------
   Purpose: remove run-to-run variability from clinical decisions and numbers.
   The LLM no longer *derives* first-line / excluded drugs, evidence grades,
   or body-composition / nutrition figures — it only presents the locked
   values below verbatim. Edit THIS file to change clinical policy.

   Evidence anchors: APA, NICE, CANMAT, BAP + 2022 Cochrane review.
   STATUS: all five verified against current guidelines (Jun 2026 review):
     - BPD  -> 2022 Cochrane + LABILE 2018 (lamotrigine excluded).
     - MDD  -> CANMAT 2023.
     - GAD  -> Canadian anxiety CPG / consensus (SSRI-SNRI-pregabalin first-line).
     - OCD  -> APA OCD guideline (high-dose SSRI + ERP first-line).
     - PMDD -> ACOG Clinical Practice Guideline No. 7 (2023).
   Physician should still spot-check on first use.
   ════════════════════════════════════════════════════════════════════════ */

export const FORMULARY_VERSION = 'v1.1 (2026-06-29)';

export const FORMULARY = {
  /* ─────────────────────────── BPD (verified) ─────────────────────────── */
  BPD: {
    verified: true,
    overview:
      'No medication is FDA/EMA-approved for BPD. Psychotherapy (esp. DBT) is the cornerstone. ' +
      'Pharmacotherapy is ADJUNCTIVE and symptom-domain–targeted only; overall evidence is weak ' +
      '(2022 Cochrane: mostly small single trials).',
    medications: {
      firstLine: [
        { drug: 'Topiramate', trade: 'Topamax', grade: 'B', domain: 'Impulsivity / anger',
          dose: 'Start 25 mg/day, titrate +25 mg/week to 100–200 mg/day',
          notes: 'Cognitive blunting & paresthesia risk; possible weight loss (useful if obese)' },
        { drug: 'Aripiprazole', trade: 'Abilify', grade: 'B', domain: 'Anger / affective / cognitive-perceptual',
          dose: '5–15 mg/day',
          notes: 'Best-supported SGA in BPD (Nickel 2006); metabolically favorable' },
        { drug: 'Valproate / Divalproex', trade: 'Depakote', grade: 'C', domain: 'Affective dysregulation / impulsivity',
          dose: '500–1000 mg/day divided (serum 50–100 µg/mL)',
          notes: 'Monitor LFTs/CBC/weight. Teratogenic — avoid in females of childbearing potential' },
      ],
      adjunct: [
        { drug: 'Omega-3 (EPA-dominant)', grade: 'B', domain: 'Affective instability / impulsivity',
          dose: '1–2 g/day EPA+DHA', notes: 'Favorable safety; adjunct only' },
      ],
      excluded: [
        { drug: 'Lamotrigine', trade: 'Lamictal',
          reason: 'LABILE RCT (Crawford 2018, n=276, 1-yr) found NO clinical benefit in BPD; NICE does not recommend. Earlier "Level B" rested on two small trials now superseded.' },
        { drug: 'Benzodiazepines', trade: 'clonazepam, alprazolam, lorazepam',
          reason: 'Contraindicated (APA/NICE): dependence, behavioral disinhibition, worsened impulsivity' },
        { drug: 'Olanzapine', trade: 'Zyprexa',
          reason: 'Has Level B evidence but metabolic risk (weight/dyslipidemia/T2DM) — avoid in obesity/HTN' },
        { drug: 'Lithium', trade: '—', reason: 'Narrow therapeutic index; weak BPD-specific evidence' },
        { drug: 'Typical antipsychotics (haloperidol)', trade: 'Haldol', reason: 'EPS/TD risk; superseded by SGAs' },
        { drug: 'MAOIs', trade: 'phenelzine, tranylcypromine', reason: 'Dietary/interaction risk; obsolete vs safer agents' },
        { drug: 'Carbamazepine', trade: 'Tegretol', reason: 'CYP inducer, interactions, hyponatremia; weak BPD evidence' },
        { drug: 'SSRIs as monotherapy for core BPD', trade: '—',
          reason: 'Lack high-level evidence for core features; adjunct only for comorbid depression/anxiety' },
      ],
    },
    therapies: [
      { name: 'DBT', grade: 'A', priority: 1, note: 'Gold standard (Linehan; multiple RCTs)' },
      { name: 'GPM (Good Psychiatric Management)', grade: 'A', priority: 2, note: 'McMain 2009 RCT non-inferior to DBT; more accessible' },
      { name: 'MBT (Mentalization-Based Treatment)', grade: 'B', priority: 3 },
      { name: 'Schema Therapy', grade: 'B', priority: 4 },
      { name: 'ACT', grade: 'C', priority: 5, note: 'Adjunctive after stabilization' },
    ],
    excludedTherapies: [
      { name: 'Standard (non-adapted) CBT as primary', reason: 'Insufficient for core BPD; DBT/Schema are the BPD-adapted forms' },
      { name: 'ERP as primary', reason: 'OCD-specific; only if comorbid OCD' },
      { name: 'Unstructured psychodynamic therapy', reason: 'Destabilization risk; MBT is the structured evidence-based variant' },
    ],
    supplements: [
      { name: 'Omega-3 (EPA+DHA, EPA-dominant)', grade: 'B', dose: '1–2 g/day', timing: 'with largest meal' },
      { name: 'Vitamin D3', grade: 'C', dose: 'per 25-OH-D level', timing: 'with a fat-containing meal' },
      { name: 'Magnesium glycinate', grade: 'C', dose: '200–400 mg elemental', timing: 'evening' },
    ],
    excludedSupplements: [
      { name: "St. John's Wort", reason: 'CYP/P-gp inducer; serotonin-syndrome risk; undermines pharmacotherapy' },
      { name: '5-HTP', reason: 'Serotonin-syndrome risk with serotonergic agents' },
      { name: 'High-dose melatonin (>3 mg)', reason: 'Use low-dose 0.5–1 mg ONLY if circadian delay is confirmed' },
      { name: 'Empiric iron', reason: 'Only if lab-confirmed deficiency; excess is pro-oxidant' },
    ],
    chrono: {
      principle: 'Regular ~12 h eating window with stable daily meal timing; do NOT recommend aggressive (<10 h) restriction.',
      detail: 'Aggressive restriction risks hypoglycaemic mood swings and may trigger disordered eating in BPD.',
      source: 'Clinical caution (NICE/APA); disordered-eating & affective-instability risk',
    },
  },

  /* ───────────────────────────── MDD (CANMAT 2023) ───────────────────────────── */
  MDD: {
    verified: true,
    overview:
      'First-line: a second-generation antidepressant (SSRI/SNRI/mirtazapine/bupropion) and/or ' +
      'first-line psychotherapy (CBT, IPT, BA). For partial response after dose optimization, CANMAT 2023 ' +
      'favors earlier adjunctive therapy over serial monotherapy switches.',
    medications: {
      firstLine: [
        { drug: 'Escitalopram', trade: 'Lexapro', grade: 'A', domain: 'Core MDD (SSRI)', dose: '10 mg/day → 10–20 mg/day' },
        { drug: 'Sertraline', trade: 'Zoloft', grade: 'A', domain: 'Core MDD (SSRI)', dose: '50 mg/day → 100–200 mg/day' },
        { drug: 'Venlafaxine XR', trade: 'Effexor XR', grade: 'A', domain: 'Core MDD (SNRI)', dose: '75 → 150–225 mg/day' },
        { drug: 'Mirtazapine', trade: 'Remeron', grade: 'A', domain: 'Core MDD; sleep/appetite', dose: '15 → 30–45 mg/day at night' },
      ],
      adjunct: [
        { drug: 'Aripiprazole', trade: 'Abilify', grade: 'A', domain: 'Augmentation (partial response)', dose: '2–10 mg/day' },
        { drug: 'Bupropion', trade: 'Wellbutrin XL', grade: 'A', domain: 'Augmentation / low energy', dose: '150–300 mg/day' },
      ],
      excluded: [
        { drug: 'MAOI + SSRI/SNRI combination', trade: '—', reason: 'Serotonin-syndrome risk — contraindicated' },
        { drug: 'Benzodiazepine monotherapy', trade: '—', reason: 'No antidepressant efficacy; adjunct/short-term only' },
      ],
    },
    therapies: [
      { name: 'CBT', grade: 'A', priority: 1 },
      { name: 'Interpersonal Therapy (IPT)', grade: 'A', priority: 2 },
      { name: 'Behavioral Activation (BA)', grade: 'A', priority: 3 },
    ],
    supplements: [
      { name: 'Omega-3 (EPA-dominant)', grade: 'B', dose: '1–2 g/day EPA', timing: 'with meal' },
      { name: 'Adjunctive exercise', grade: 'B', dose: '≥150 min/week moderate', timing: '—' },
    ],
    excludedSupplements: [
      { name: "St. John's Wort with an antidepressant", reason: 'Serotonin-syndrome risk; CYP3A4/P-gp induction lowers drug levels' },
    ],
    chrono: {
      principle: 'Early time-restricted eating: front-load calories to the first half of the day; finish the last meal ≥3 h before bed (phase-advancing direction).',
      detail: 'Earlier eating windows are associated with lower depressive symptoms, less fatigue and better glycaemic control; late-night eating aggravates circadian misalignment and mood.',
      source: 'Chrononutrition/TRE reviews 2025; early-eating-window trial signal',
    },
  },

  /* ───────────────────── GAD (Canadian anxiety CPG / consensus) ───────────────────── */
  GAD: {
    verified: true,
    overview:
      'First-line: SSRI or SNRI (or pregabalin) + CBT. Benzodiazepines are short-term bridges only ' +
      '(tolerance/dependence). Most patients respond to standard antidepressant doses.',
    medications: {
      firstLine: [
        { drug: 'Escitalopram', trade: 'Lexapro', grade: 'A', domain: 'Core GAD (SSRI)', dose: '10–20 mg/day' },
        { drug: 'Sertraline', trade: 'Zoloft', grade: 'A', domain: 'Core GAD (SSRI)', dose: '50–200 mg/day' },
        { drug: 'Duloxetine', trade: 'Cymbalta', grade: 'A', domain: 'Core GAD (SNRI)', dose: '30–60 mg/day' },
        { drug: 'Venlafaxine XR', trade: 'Effexor XR', grade: 'A', domain: 'Core GAD (SNRI)', dose: '75–225 mg/day' },
        { drug: 'Pregabalin', trade: 'Lyrica', grade: 'A', domain: 'Core GAD (non-antidepressant)', dose: '150–600 mg/day divided; controlled substance' },
      ],
      adjunct: [
        { drug: 'Buspirone', trade: 'Buspar', grade: 'B', domain: 'Adjunct / antidepressant-sparing', dose: '15–60 mg/day divided' },
        { drug: 'Quetiapine XR', trade: 'Seroquel XR', grade: 'B', domain: 'Second-line monotherapy', dose: '50–150 mg/day; metabolic caution' },
      ],
      excluded: [
        { drug: 'Chronic benzodiazepines', trade: 'alprazolam, clonazepam', reason: 'Tolerance/dependence; short-term bridge only, not maintenance' },
      ],
    },
    therapies: [
      { name: 'CBT', grade: 'A', priority: 1 },
      { name: 'Applied Relaxation', grade: 'B', priority: 2 },
    ],
    supplements: [
      { name: 'Magnesium glycinate', grade: 'C', dose: '200–400 mg elemental', timing: 'evening' },
    ],
    excludedSupplements: [
      { name: 'Kava', reason: 'Hepatotoxicity risk' },
    ],
    chrono: {
      principle: 'Fixed, regular 12 h eating window with consistent meal times; phase-advance where eveningness is present; limit caffeine after midday; avoid <10 h restriction.',
      detail: 'Eveningness/circadian misalignment is linked to higher anxiety and disrupted melatonin–cortisol rhythms; unstable timing and afternoon/evening caffeine worsen arousal; over-restriction risks hypoglycaemic jitteriness.',
      source: 'Chronotype–anxiety studies (Cox & Olatunji 2019; SEM analysis 2024)',
    },
  },

  /* ──────────────────────── OCD (APA OCD guideline) ──────────────────────── */
  OCD: {
    verified: true,
    overview:
      'First-line: ERP (CBT) and/or a HIGH-dose SSRI (often above the depression maximum). ' +
      'Adequate SSRI trial = 8–12 weeks, ≥4–6 weeks at max tolerated dose. SSRIs preferred over ' +
      'clomipramine (better tolerability).',
    medications: {
      firstLine: [
        { drug: 'Fluoxetine', trade: 'Prozac', grade: 'A', domain: 'Core OCD (SSRI, high-dose)', dose: '40–80 mg/day' },
        { drug: 'Sertraline', trade: 'Zoloft', grade: 'A', domain: 'Core OCD (SSRI, high-dose)', dose: '100–200 mg/day' },
        { drug: 'Fluvoxamine', trade: 'Luvox', grade: 'A', domain: 'Core OCD (SSRI, high-dose)', dose: '100–300 mg/day' },
        { drug: 'Escitalopram', trade: 'Lexapro', grade: 'A', domain: 'Core OCD (SSRI, high-dose)', dose: '20–40 mg/day' },
      ],
      adjunct: [
        { drug: 'Clomipramine', trade: 'Anafranil', grade: 'A', domain: 'Alternative SRI (after SSRI)', dose: '100–250 mg/day; ECG + plasma levels' },
        { drug: 'Aripiprazole or Risperidone (low-dose)', trade: 'Abilify / Risperdal', grade: 'B', domain: 'Antipsychotic augmentation (partial response)', dose: 'low-dose, added to a stable SSRI' },
      ],
      excluded: [
        { drug: 'Benzodiazepine monotherapy', trade: '—', reason: 'No anti-obsessional efficacy' },
      ],
    },
    therapies: [
      { name: 'ERP (Exposure & Response Prevention)', grade: 'A', priority: 1, note: 'Therapist-guided > self-guided' },
      { name: 'CBT (with ERP)', grade: 'A', priority: 2 },
    ],
    excludedTherapies: [
      { name: 'Dynamic psychotherapy / psychoanalysis for core OCD', reason: 'No controlled evidence for core symptoms' },
    ],
    supplements: [
      { name: 'NAC', grade: 'C', dose: '1200–2400 mg/day divided', timing: 'with food' },
    ],
    excludedSupplements: [],
    chrono: {
      principle: 'Strict timing regularity with a FIXED daily lights-out and wake time; phase-advance (earlier) meals to counter the delayed/evening phase commonly seen in OCD.',
      detail: 'Adults with OCD show later dim-light melatonin onset and higher eveningness; inpatient settings with a fixed lights-out time show higher response rates, suggesting consistent entrainment cues are therapeutic. Evidence is mixed/preliminary — present as a timing principle, not a fixed clock.',
      source: 'Coles et al. 2020 (delayed DLMO); Coles & Stewart 2019 (fixed lights-out); mixed evidence (review 2019)',
    },
  },

  /* ───────────────────── PMDD (ACOG CPG No. 7, 2023) ───────────────────── */
  PMDD: {
    verified: true,
    overview:
      'First-line: an SSRI dosed CONTINUOUSLY or in the LUTEAL phase (rapid onset for this indication). ' +
      'Drospirenone-containing COC is FDA-approved for PMDD. GnRH agonists (with add-back) for severe/refractory.',
    medications: {
      firstLine: [
        { drug: 'Sertraline', trade: 'Zoloft', grade: 'A', domain: 'Core PMDD (SSRI)', dose: '50–100 mg/day, continuous or luteal' },
        { drug: 'Escitalopram', trade: 'Lexapro', grade: 'A', domain: 'Core PMDD (SSRI)', dose: '10–20 mg/day, continuous or luteal' },
        { drug: 'Fluoxetine', trade: 'Prozac/Sarafem', grade: 'A', domain: 'Core PMDD (SSRI)', dose: '20 mg/day, continuous or luteal' },
        { drug: 'Paroxetine CR', trade: 'Paxil CR', grade: 'A', domain: 'Core PMDD (SSRI)', dose: '12.5–25 mg/day' },
      ],
      adjunct: [
        { drug: 'Drospirenone/EE COC', trade: 'Yaz', grade: 'A', domain: 'Hormonal (FDA-approved for PMDD)', dose: '24/4 regimen' },
        { drug: 'GnRH agonist + add-back', trade: 'leuprolide', grade: 'B', domain: 'Severe/refractory', dose: 'specialist use; add-back HRT' },
      ],
      excluded: [
        { drug: 'Progesterone monotherapy', trade: '—', reason: 'No consistent benefit over placebo for PMDD' },
      ],
    },
    therapies: [
      { name: 'CBT', grade: 'B', priority: 1 },
    ],
    supplements: [
      { name: 'Calcium', grade: 'B', dose: '1000–1200 mg/day', timing: 'divided' },
      { name: 'Vitamin B6 (P5P)', grade: 'C', dose: '≤100 mg/day', timing: 'morning' },
    ],
    excludedSupplements: [],
    chrono: {
      phaseConditional: true,
      follicular: {
        principle: 'Follicular phase: maintain a regular ~12 h eating window with stable meal timing as the baseline.',
        detail: 'Symptom-free baseline phase; goal is a stable circadian anchor so the patient enters the luteal phase well-entrained.',
        source: 'ACOG CPG No.7 (2023) — PMDD symptoms are luteal-bound',
      },
      luteal: {
        principle: 'Luteal phase: allow measured flexibility; include complex (low-GI) carbohydrates in the evening to support the tryptophan→serotonin→melatonin pathway; protect a consistent sleep/meal schedule.',
        detail: 'PMDD women show reduced nocturnal melatonin secretion and reduced circadian amplitude during the luteal phase; evening complex carbohydrates aid tryptophan transport and melatonin synthesis, and stable timing buffers luteal mood worsening.',
        source: 'Shechter et al., PLOS One 2012 (luteal melatonin amplitude); tryptophan–melatonin pathway',
      },
    },
  },
};

/* Resolve a free-text disorder label (e.g. "Borderline Personality Disorder (BPD)") to a key. */
export function disorderKey(label = '') {
  const s = String(label).toUpperCase();
  // PMDD must be tested before MDD — the string "PMDD" contains "MDD".
  return ['BPD', 'PMDD', 'GAD', 'OCD', 'MDD'].find((k) => s.includes(k)) || null;
}

/* ───────────────────────── Deterministic metrics ─────────────────────────
   All body-composition & nutrition numbers are computed HERE, never by the LLM. */
/* Age/sex healthy body-fat % ranges — Gallagher DA et al., Am J Clin Nutr 2000;72:694-701. */
function healthyFatRange(male, age) {
  const a = age || 30;
  if (male) {
    if (a < 40) return [8, 19];
    if (a < 60) return [11, 21];
    return [13, 24];
  }
  if (a < 40) return [21, 33];
  if (a < 60) return [23, 34];
  return [24, 35];
}

/* Fail-safe eating-disorder detection from free-text history/comorbidities.
   Only ever BLOCKS a deficit, so liberal matching is acceptable. */
function edTextPresent(raw) {
  const t = (raw || '').toLowerCase()
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
  const kw = [
    'anorexia', 'bulimia', 'binge eating', 'binge-eating', 'eating disorder',
    'arfid', 'ednos', 'osfed', 'orthorexia', 'purging',
    'اضطراب اكل', 'اضطرابات الاكل', 'فقدان الشهيه العصبي', 'فقدان شهيه عصبي',
    'قهم', 'نهام', 'بوليميا', 'انوريكسيا', 'الشره العصبي', 'شره الاكل',
  ];
  return kw.some((k) => t.includes(k));
}

export function computeMetrics(form) {
  const w = parseFloat(form.weight);
  const h = parseFloat(form.height);
  const age = parseFloat(form.age);
  if (!w || !h || !age) return null;

  const male = form.gender === 'Male' || form.gender === 'ذكر';
  const bmi = w / Math.pow(h / 100, 2);
  // Mifflin–St Jeor
  const bmr = Math.round(10 * w + 6.25 * h - 5 * age + (male ? 5 : -161));
  const tdee = { sedentary: Math.round(bmr * 1.2), light: Math.round(bmr * 1.375), moderate: Math.round(bmr * 1.55) };

  const fatPct = parseFloat(form.inbodyFat || form.dexaFat) || null;
  const smm = parseFloat(form.inbodyMuscle || form.dexaMuscle) || null;
  let fatMass = null, ffm = null, fmr = null;
  if (fatPct != null) {
    fatMass = +(w * fatPct / 100).toFixed(1);
    ffm = +(w - fatMass).toFixed(1);
  }
  if (fatMass != null && smm) fmr = +(fatMass / smm).toFixed(2); // fat : skeletal-muscle

  // Protein: prefer fat-free mass basis (more accurate in obesity than total weight)
  let proteinLow, proteinHigh, proteinBasis;
  if (ffm) {
    proteinLow = Math.round(ffm * 1.6);
    proteinHigh = Math.round(ffm * 2.2);
    proteinBasis = 'fat-free mass (1.6–2.2 g/kg FFM)';
  } else {
    proteinLow = Math.round(w * 1.2);
    proteinHigh = Math.round(w * 1.6);
    proteinBasis = 'body weight (1.2–1.6 g/kg, FFM unavailable)';
  }

  // ── Caloric DIRECTION — deterministic, source-anchored (Gallagher 2000 AJCN
  //    fat ranges · ACE essential-fat floor · ERS FFMI low-muscle cut-off · WHO BMI).
  //    Serves OPTIMUM body composition, not weight loss. The safety gate runs FIRST
  //    and can only ever BLOCK a deficit (fail-safe).
  const ffmi = ffm != null ? +(ffm / Math.pow(h / 100, 2)).toFixed(1) : null;
  const [fatLow, fatHigh] = healthyFatRange(male, age);
  const essentialFloor = male ? 6 : 14;   // ACE dangerous-low body fat %
  const ffmiLow = male ? 17 : 15;         // ERS low-FFMI (undernutrition) cut-off

  const edFlag = !!form.hasEatingDisorder ||
    edTextPresent(`${form.history || ''} ${form.comorbidities || ''} ${form.stopMed || ''}`);

  const underweight = bmi < 18.5;                          // WHO
  const belowEssential = fatPct != null && fatPct < essentialFloor;
  const lowMuscle = ffmi != null && ffmi < ffmiLow;
  const overfat = fatPct != null && fatPct > fatHigh;
  const depleted = underweight || belowEssential || lowMuscle;

  let calDirection, calRationale, calNote = null;
  if (edFlag) {
    if (depleted) {
      calDirection = 'surplus';
      calRationale = 'Eating-disorder flag + nutritional depletion → supervised repletion.';
      calNote = 'REFEEDING must be medically supervised (refeeding-syndrome risk). Do NOT present weight/body-composition figures as patient-facing targets.';
    } else {
      calDirection = 'maintenance';
      calRationale = 'Eating-disorder flag → caloric restriction is contraindicated.';
      calNote = 'Caloric restriction CONTRAINDICATED. Do NOT pursue body-composition goals; refer to an eating-disorder specialist.';
    }
  } else if (depleted) {
    calDirection = 'surplus';
    const why = [];
    if (underweight) why.push(`BMI ${bmi.toFixed(1)} < 18.5 (WHO underweight)`);
    if (belowEssential) why.push(`fat ${fatPct}% < essential floor ${essentialFloor}% (ACE)`);
    if (lowMuscle) why.push(`FFMI ${ffmi} < ${ffmiLow} kg/m² (ERS low muscle mass)`);
    calRationale = 'Repletion — ' + why.join('; ') + '.';
  } else if (overfat) {
    calDirection = 'deficit';
    calRationale = `Fat ${fatPct}% above healthy range for age/sex (${fatLow}–${fatHigh}%, Gallagher 2000) → modest lean-preserving fat-loss deficit.`;
  } else if (fatPct == null && bmi >= 30) {
    calDirection = 'maintenance';
    calRationale = `BMI ${bmi.toFixed(1)} ≥ 30 but no body-composition data → maintenance; measure DEXA/InBody before considering any deficit (weight alone does not justify restriction).`;
  } else {
    calDirection = 'maintenance';
    calRationale = fatPct != null
      ? `Fat ${fatPct}% within healthy range for age/sex (${fatLow}–${fatHigh}%, Gallagher 2000) → eucaloric.`
      : 'Normal metrics or insufficient body-composition data → eucaloric maintenance.';
  }

  let calLow, calHigh;
  if (calDirection === 'deficit') {
    // ~15% below maintenance, never below BMR
    calLow = Math.max(bmr, Math.round(tdee.sedentary * 0.85));
    calHigh = Math.max(bmr, Math.round(tdee.light * 0.85));
  } else if (calDirection === 'surplus') {
    // ~12% above maintenance for repletion / lean gain
    calLow = Math.round(tdee.sedentary * 1.12);
    calHigh = Math.round(tdee.light * 1.12);
  } else {
    calLow = tdee.sedentary;
    calHigh = tdee.light;
  }

  return {
    bmi: +bmi.toFixed(1), bmr, tdee, fatPct, fatMass, ffm, ffmi, smm, fmr,
    proteinLow, proteinHigh, proteinBasis, calLow, calHigh,
    calDirection, calRationale, calNote,
  };
}

export function renderMetrics(m) {
  if (!m) return '';
  const L = [];
  L.push('PRE-COMPUTED METRICS (use these EXACT numbers; do NOT recalculate):');
  L.push(`- BMI: ${m.bmi} kg/m²`);
  L.push(`- BMR (Mifflin–St Jeor): ${m.bmr} kcal/day`);
  L.push(`- TDEE: sedentary ${m.tdee.sedentary} / light ${m.tdee.light} / moderate ${m.tdee.moderate} kcal/day`);
  L.push(`- Caloric DIRECTION: ${m.calDirection.toUpperCase()} — ${m.calRationale}`);
  L.push(`- Caloric target: ${m.calLow}–${m.calHigh} kcal/day (${m.calDirection}; floored at BMR; serves optimum body composition — weight is not a treatment goal)`);
  if (m.calNote) L.push(`- ⚠ SAFETY: ${m.calNote}`);
  L.push(`- Protein target: ${m.proteinLow}–${m.proteinHigh} g/day — basis: ${m.proteinBasis}`);
  if (m.fatMass != null) L.push(`- Fat mass: ${m.fatMass} kg | Fat-free mass: ${m.ffm} kg${m.ffmi != null ? ` | FFMI: ${m.ffmi} kg/m²` : ''}`);
  if (m.fmr != null) L.push(`- Fat-to-skeletal-muscle ratio: ${m.fmr}`);
  return L.join('\n');
}

/* Render the locked formulary for a disorder as a text block injected into the prompt. */
export function renderFormularyBlock(key, opts = {}) {
  const f = key && FORMULARY[key];
  if (!f) return '';
  const out = [];
  out.push(`LOCKED CLINICAL FORMULARY — ${key}${f.verified ? '' : ' (PROVISIONAL DRAFT — pending physician verification)'}`);
  if (f.overview) out.push(`Overview: ${f.overview}`);

  const med = f.medications || {};
  if (med.firstLine?.length) {
    out.push('\nMEDICATIONS · First-line (present these, with grade & dosing):');
    med.firstLine.forEach((d) => out.push(`  • ${d.drug} (${d.trade}) [Level ${d.grade}] — ${d.domain}; ${d.dose}${d.notes ? '; ' + d.notes : ''}`));
  }
  if (med.adjunct?.length) {
    out.push('MEDICATIONS · Adjunct:');
    med.adjunct.forEach((d) => out.push(`  • ${d.drug}${d.trade ? ' (' + d.trade + ')' : ''} [Level ${d.grade}] — ${d.domain}; ${d.dose}${d.notes ? '; ' + d.notes : ''}`));
  }
  if (med.excluded?.length) {
    out.push('MEDICATIONS · Excluded (put ONLY these in [EXCLUDED], with the given reason):');
    med.excluded.forEach((d) => out.push(`  • ${d.drug}${d.trade && d.trade !== '—' ? ' (' + d.trade + ')' : ''} — ${d.reason}`));
  }
  if (f.therapies?.length) {
    out.push('\nTHERAPY (present in this priority order, with grade):');
    f.therapies.forEach((t) => out.push(`  ${t.priority}. ${t.name} [Level ${t.grade}]${t.note ? ' — ' + t.note : ''}`));
  }
  if (f.excludedTherapies?.length) {
    out.push('THERAPY · Excluded:');
    f.excludedTherapies.forEach((t) => out.push(`  • ${t.name} — ${t.reason}`));
  }
  if (f.supplements?.length) {
    out.push('\nSUPPLEMENTS (recommended):');
    f.supplements.forEach((s) => out.push(`  • ${s.name} [Level ${s.grade}] — ${s.dose}${s.timing ? '; ' + s.timing : ''}`));
  }
  if (f.excludedSupplements?.length) {
    out.push('SUPPLEMENTS · Excluded:');
    f.excludedSupplements.forEach((s) => out.push(`  • ${s.name} — ${s.reason}`));
  }
  if (f.chrono) {
    const c = f.chrono;
    out.push('\nCHRONO (LOCKED timing PRINCIPLE — present this verbatim; do NOT invent a specific clock window):');
    const emit = (p) => {
      out.push(`  • ${p.principle}`);
      if (p.detail) out.push(`    ${p.detail}`);
      if (p.source) out.push(`    [source: ${p.source}]`);
    };
    // (1) CENTRAL clock principle (disorder-specific; phase-conditional for PMDD)
    if (c.phaseConditional) {
      const phase = String(opts.cyclePhase || '').toLowerCase();
      if (phase === 'luteal') {
        out.push('  • Menstrual cycle phase: LUTEAL');
        emit(c.luteal);
      } else if (phase === 'follicular') {
        out.push('  • Menstrual cycle phase: FOLLICULAR');
        emit(c.follicular);
      } else {
        out.push('  • Menstrual cycle phase: UNSPECIFIED — present BOTH principles below and prompt the physician to confirm the phase:');
        out.push('  — FOLLICULAR:');
        emit(c.follicular);
        out.push('  — LUTEAL:');
        emit(c.luteal);
      }
    } else {
      emit(c);
    }
    // (2) PERIPHERAL (metabolic) clock — transdiagnostic, always applies
    out.push(`  • PERIPHERAL clock: ${CHRONO_PERIPHERAL.principle}`);
    out.push(`    [source: ${CHRONO_PERIPHERAL.source}]`);
    // (3) CHRONOTYPE personalisation — modifies the strength/direction of the above
    out.push(`  • ${chronotypeGuidance(opts.chronotype)}`);
  }
  return out.join('\n');
}

// Transdiagnostic peripheral-clock principle (liver/pancreas/muscle entrained by feeding).
const CHRONO_PERIPHERAL = {
  principle:
    'Glucose tolerance and insulin sensitivity are higher in the morning and decline toward evening (melatonin rises in antiphase to glucose tolerance). Weight carbohydrate/calorie load earlier in the day and keep the final meal well before melatonin onset/sleep to avoid late postprandial hyperglycaemia and central↔peripheral desynchrony.',
  source: 'Morning>evening insulin sensitivity (clamp/OGTT); melatonin–glucose antiphase',
};

// Chronotype modifies the strength/direction of the timing principle.
function chronotypeGuidance(ct) {
  const t = String(ct || '').toLowerCase();
  if (t === 'morning')
    return 'Chronotype = MORNING: already aligned with diurnal insulin sensitivity — keep the standard early-loaded schedule.';
  if (t === 'evening')
    return 'Chronotype = EVENING: higher risk of eating during melatonin secretion → impaired glucose tolerance. Apply a STRONGER phase-advance, set an earlier hard stop for the last meal, and screen for the MTNR1B risk allele (amplified melatonin-mediated insulin suppression with late eating).';
  if (t === 'intermediate')
    return 'Chronotype = INTERMEDIATE: apply the standard principle; individualise toward earlier eating if eveningness emerges.';
  return 'Chronotype = UNSPECIFIED: assess morningness–eveningness (e.g. MEQ/MCTQ) and default to earlier eating until confirmed, to personalise meal timing.';
}


/* ─────────────────────── Deterministic safety gate ───────────────────────
   Cross-checks the patient form against the locked formulary + a curated,
   extensible contraindication ruleset. Returns [{level, drug, msg}].
   Levels: ALLERGY / CONTRAINDICATION (hard — never recommend) | CAUTION (flag). */
export function computeSafetyFlags(form, key) {
  const flags = [];
  const f = key && FORMULARY[key];
  const norm = (x) => String(x || '').toLowerCase();
  const allergies = norm(form.allergies);
  const current = norm(form.currentMeds);
  const comorb = norm(form.comorbidities);
  const female = form.gender === 'Female' || form.gender === 'أنثى';
  const has = (txt, arr) => arr.some((a) => txt.includes(a));
  const blank = (x) => !x || x === 'none' || x === 'لا يوجد';

  const recs = [];
  if (f) {
    (f.medications?.firstLine || []).forEach((d) => recs.push(d));
    (f.medications?.adjunct || []).forEach((d) => recs.push(d));
  }
  const tokens = (d) =>
    [d.drug, d.trade]
      .filter(Boolean)
      .flatMap((x) => String(x).toLowerCase().split(/[\/,()]| or | and |\s/))
      .map((t) => t.trim())
      .filter((t) => t.length > 3);

  // 1) ALLERGY cross-match against recommended drugs
  if (!blank(allergies)) {
    recs.forEach((d) => {
      const hit = tokens(d).find((t) => allergies.includes(t));
      if (hit) flags.push({ level: 'ALLERGY', drug: d.drug, msg: `Allergy text mentions "${hit}" — do NOT recommend ${d.drug}; offer a formulary alternative.` });
    });
  }

  // 2) Curated contraindication ruleset
  const maois = ['phenelzine', 'tranylcypromine', 'isocarboxazid', 'selegiline', 'moclobemide', 'maoi'];
  if (has(current, maois))
    flags.push({ level: 'CONTRAINDICATION', drug: 'SSRI/SNRI', msg: 'Current meds include an MAOI — co-prescribing any recommended SSRI/SNRI risks serotonin syndrome. Require washout; do NOT co-prescribe.' });

  if (recs.some((d) => /valproate|divalproex|depakote/i.test(d.drug)) && female)
    flags.push({ level: 'CONTRAINDICATION', drug: 'Valproate', msg: 'Teratogenic — contraindicated in females of childbearing potential unless pregnancy-prevention conditions are met. Prefer an alternative.' });

  if (has(comorb, ['pregnan', 'breastfeed', 'lactation']))
    flags.push({ level: 'CONTRAINDICATION', drug: 'Teratogens', msg: 'Pregnancy/lactation noted — avoid valproate/topiramate/paroxetine; choose best perinatal-safety agents and involve OB.' });

  if (has(comorb, ['long qt', 'qtc', 'arrhythmia', 'cardiac', 'heart']))
    flags.push({ level: 'CAUTION', drug: 'QTc-prolonging agents', msg: 'Cardiac/QTc history — baseline + on-treatment ECG before escitalopram >20 mg or clomipramine; avoid stacking QTc-prolonging agents.' });

  if (has(comorb, ['hepatic', 'liver', 'cirrhosis', 'hepatitis']))
    flags.push({ level: 'CAUTION', drug: 'Hepatic dosing', msg: 'Hepatic impairment — retitrate hepatically-metabolized agents; monitor LFTs; valproate relatively contraindicated.' });

  if (has(comorb, ['renal', 'kidney', 'ckd', 'dialysis']))
    flags.push({ level: 'CAUTION', drug: 'Renal dosing', msg: 'Renal impairment — dose-adjust renally-cleared agents (pregabalin, topiramate, lithium) to eGFR.' });

  return flags;
}

export function renderSafetyGate(flags) {
  if (!flags || !flags.length) return '';
  const L = ['DETERMINISTIC SAFETY GATE (overrides the formulary — honor every item):'];
  flags.forEach((fl) => L.push(`  [${fl.level}] ${fl.drug}: ${fl.msg}`));
  L.push('Drugs marked ALLERGY or CONTRAINDICATION must NOT be recommended. Surface every warning explicitly in [MEDICATIONS] and [INTERACTIONS].');
  return L.join('\n');
}
