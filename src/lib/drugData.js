/* ============================================================================
 * PsychDecide — Locked Drug-Data Layer  (Roadmap Group B: #4 + drug monographs)
 * ----------------------------------------------------------------------------
 * STATUS: PROVISIONAL — INERT. Built from evidence-based drafts (CANMAT 2023,
 * NICE, Maudsley Deprescribing 2024, CPIC 2023, LactMed, ACOG). NOT yet signed
 * off clinically → DRUGDATA_ACTIVE=false and every disorder carries verified=false.
 * Activation is a one-line flip after Dr. Ahmed's in-app review & sign-off, exactly
 * like the interaction engine was added inert then activated.
 *
 * MODEL (option B): a shared DRUG_MASTER (pharmacology identical across disorders —
 * mechanism, half-life, pregnancy, pharmacogenomics, overdose) + per-disorder DX
 * overrides (line, role, dose, disorder-specific notes) and disorder-level fields
 * (selection guidance #4, onset/trial, treatment phases, monitoring). Nothing here
 * is produced by the model at run time; output is deterministic from this table.
 * ========================================================================== */

export const DRUGDATA_VERSION = 'v0.1-draft (2026-06-30)';

// Master switch. INERT until clinical sign-off. When false, renderDrugDataGate() -> ''.
export const DRUGDATA_ACTIVE = false;

/* ── 1. Shared drug master (pharmacology constant across disorders) ───────── */
export const DRUG_MASTER = {
  escitalopram: { label: 'Escitalopram', cls: 'SSRI',
    mechanism: 'Pure SERT inhibition (allosteric); cleanest off-target profile',
    halfLife: '~27–32 h', withdrawalRisk: 'moderate',
    keyAE: 'nausea, insomnia, sexual dysfunction, QT at higher doses',
    pregnancy: 'reasonable option', lactation: 'higher milk excretion & t½ than sertraline',
    pgx: 'CYP2C19 PM → consider 50% lower dose/alt; UM → alt',
    overdose: 'relatively safe (QT at high dose)', brands: 'Cipralex, Lexapro' },
  sertraline: { label: 'Sertraline', cls: 'SSRI',
    mechanism: 'SERT inhibition + mild DAT inhibition + sigma-1',
    halfLife: '~26 h (metabolite 62–104 h)', withdrawalRisk: 'moderate',
    keyAE: 'diarrhoea/nausea, sexual dysfunction, insomnia',
    pregnancy: 'preferred (largest safety base)', lactation: 'preferred (lowest milk)',
    pgx: 'CYP2C19 PM → consider lower dose/alt',
    overdose: 'relatively safe', brands: 'Lustral, Zoloft' },
  citalopram: { label: 'Citalopram', cls: 'SSRI',
    mechanism: 'SERT inhibition', halfLife: '~35 h', withdrawalRisk: 'moderate',
    keyAE: 'QT prolongation (dose cap 40mg; 20mg elderly/2C19 inhibitor)',
    pregnancy: 'option', lactation: 'higher milk excretion',
    pgx: 'CYP2C19 PM → consider lower dose/alt',
    overdose: 'QT risk in OD', brands: 'Cipram, Celexa' },
  paroxetine: { label: 'Paroxetine', cls: 'SSRI',
    mechanism: 'SERT inhibition; anticholinergic; CYP2D6 inhibitor',
    halfLife: '~21 h (no active metabolite)', withdrawalRisk: 'very high',
    keyAE: 'anticholinergic, weight gain, sexual dysfunction',
    pregnancy: 'AVOID (cardiac septal-defect signal, attenuated in newer data)',
    lactation: 'low milk but generally avoided', pgx: 'CYP2D6 PM → ↑exposure (reduce/alt); UM → avoid',
    overdose: 'relatively safe', brands: 'Seroxat, Paxil' },
  fluoxetine: { label: 'Fluoxetine', cls: 'SSRI',
    mechanism: 'SERT inhibition; CYP2D6/2C19 inhibitor; long half-life',
    halfLife: '4–6 d (norfluoxetine 7–15 d)', withdrawalRisk: 'very low (self-tapering)',
    keyAE: 'activation/insomnia, sexual dysfunction',
    pregnancy: 'more data; infant accumulation in lactation', lactation: 'long t½ → infant accumulation',
    pgx: 'CYP2D6/2C19 substrate', overdose: 'relatively safe',
    brands: 'Prozac' },
  fluvoxamine: { label: 'Fluvoxamine', cls: 'SSRI',
    mechanism: 'SERT inhibition; potent CYP1A2/2C19 inhibitor',
    halfLife: '~15 h', withdrawalRisk: 'moderate',
    keyAE: 'nausea, sedation; many CYP interactions',
    pregnancy: 'limited data', lactation: 'low milk',
    pgx: 'CYP2D6 substrate', overdose: 'relatively safe', brands: 'Faverin, Luvox' },
  venlafaxine: { label: 'Venlafaxine XR', cls: 'SNRI',
    mechanism: 'SERT (low dose) then NET (≥150mg) — dose-dependent',
    halfLife: '~5 h (ODV ~11 h) — short', withdrawalRisk: 'very high',
    keyAE: 'dose-dependent hypertension, sweating, sexual dysfunction',
    pregnancy: 'less data', lactation: 'limited data',
    pgx: 'CYP2D6 (active metabolite)', overdose: 'higher toxicity (seizures, cardiac)',
    brands: 'Effexor XR' },
  duloxetine: { label: 'Duloxetine', cls: 'SNRI',
    mechanism: 'Balanced SERT/NET inhibition', halfLife: '~12 h', withdrawalRisk: 'moderate',
    keyAE: 'nausea, sweating; useful for comorbid pain',
    pregnancy: 'limited data', lactation: 'limited data',
    pgx: 'CYP1A2/2D6 substrate', overdose: 'moderate', brands: 'Cymbalta' },
  mirtazapine: { label: 'Mirtazapine', cls: 'atypical (NaSSA)',
    mechanism: 'α2-antagonist (↑NE/5-HT) + 5-HT2A/2C/3 antagonist + H1 (sedation/appetite)',
    halfLife: '~20–40 h', withdrawalRisk: 'low–moderate',
    keyAE: 'sedation, weight/appetite gain; less sexual dysfunction',
    pregnancy: 'limited data', lactation: 'limited data',
    pgx: '—', overdose: 'relatively safe', brands: 'Remeron' },
  bupropion: { label: 'Bupropion XL', cls: 'NDRI',
    mechanism: 'NE + DA reuptake inhibition; no serotonergic action',
    halfLife: '~21 h (metabolite ~20 h)', withdrawalRisk: 'low',
    keyAE: 'insomnia, anxiety, lowers seizure threshold; weight-neutral/loss',
    pregnancy: 'limited data', lactation: 'limited data', pgx: 'CYP2D6 inhibitor',
    overdose: 'seizures in OD', brands: 'Wellbutrin (limited availability in EG — confirm)' },
  vortioxetine: { label: 'Vortioxetine', cls: 'atypical',
    mechanism: 'SERT inhibition + 5-HT receptor modulation (3/7/1D antag, 1A agonist)',
    halfLife: '~66 h', withdrawalRisk: 'low', keyAE: 'nausea; less sexual dysfunction',
    pregnancy: 'limited data', lactation: 'limited data',
    pgx: 'CYP2D6 PM → max 10 mg', overdose: 'relatively safe', brands: 'Brintellix/Trintellix' },
  agomelatine: { label: 'Agomelatine', cls: 'MT agonist',
    mechanism: 'MT1/MT2 agonist + 5-HT2C antagonist', halfLife: '~1–2 h',
    withdrawalRisk: 'minimal', keyAE: 'hepatotoxicity risk — monitor LFTs',
    pregnancy: 'limited data', lactation: 'limited data', pgx: 'CYP1A2 substrate',
    overdose: 'limited data; CONTRAINDICATED in hepatic impairment', brands: 'Valdoxan' },
  clomipramine: { label: 'Clomipramine', cls: 'TCA (SRI)',
    mechanism: 'Potent serotonin reuptake inhibition (+ NE via metabolite)',
    halfLife: '~32 h (norclomipramine longer)', withdrawalRisk: 'moderate (cholinergic rebound)',
    keyAE: 'anticholinergic, sedation, weight gain, orthostasis, cardiac/QT, lowers seizure threshold',
    pregnancy: 'caution', lactation: 'caution',
    pgx: 'CYP2D6 substrate (PM → ↑levels)', overdose: 'CARDIOTOXIC/lethal in OD',
    brands: 'Anafranil', monitor: 'ECG + drug level (clomi+norclomi <500 ng/mL)' },
  pregabalin: { label: 'Pregabalin', cls: 'gabapentinoid',
    mechanism: 'Binds α2δ subunit of voltage-gated Ca channels → ↓excitatory release',
    halfLife: '~6 h (renal clearance)', withdrawalRisk: 'moderate (taper)',
    keyAE: 'dizziness (≤39%), somnolence, peripheral oedema, weight gain',
    pregnancy: 'caution', lactation: 'caution',
    pgx: '—', overdose: 'CNS/respiratory depression (esp. with opioids/alcohol)',
    brands: 'Lyrica', flags: 'controlled substance; CNS depressant; taper; renal dose-adjust' },
  buspirone: { label: 'Buspirone', cls: 'azapirone',
    mechanism: '5-HT1A partial agonist (no GABA action → no dependence)',
    halfLife: '~2–3 h (active 1-PP)', withdrawalRisk: 'none',
    keyAE: 'dizziness, nausea, headache; no sexual dysfunction/sedation',
    pregnancy: 'limited data', lactation: 'limited data',
    pgx: 'CYP3A4 substrate (grapefruit/inhibitors ↑)', overdose: 'relatively safe',
    brands: 'Buspar', flags: 'delayed onset 2–4 wk; BID–TID; CI severe hepatic/renal' },
  aripiprazole: { label: 'Aripiprazole', cls: 'atypical antipsychotic',
    mechanism: 'D2/5-HT1A partial agonist, 5-HT2A antagonist', halfLife: '~75 h',
    withdrawalRisk: 'low', keyAE: 'akathisia/restlessness, insomnia; lower metabolic burden',
    pregnancy: 'limited data', lactation: 'limited data', pgx: 'CYP2D6/3A4 substrate',
    overdose: 'moderate', brands: 'Abilify' },
  risperidone: { label: 'Risperidone', cls: 'atypical antipsychotic',
    mechanism: 'D2/5-HT2A antagonist', halfLife: '~20 h (active 9-OH ~24 h)',
    withdrawalRisk: 'low', keyAE: 'hyperprolactinaemia, QT, EPS, weight',
    pregnancy: 'limited data', lactation: 'limited data', pgx: 'CYP2D6 substrate',
    overdose: 'moderate', brands: 'Risperdal' },
  quetiapine: { label: 'Quetiapine', cls: 'atypical antipsychotic',
    mechanism: 'D2/5-HT2/H1 antagonist', halfLife: '~6–7 h', withdrawalRisk: 'low',
    keyAE: 'sedation, metabolic/weight, QT', pregnancy: 'limited data', lactation: 'limited data',
    pgx: 'CYP3A4 substrate', overdose: 'moderate', brands: 'Seroquel' },
  olanzapine: { label: 'Olanzapine', cls: 'atypical antipsychotic',
    mechanism: 'D2/5-HT2 antagonist', halfLife: '~30 h', withdrawalRisk: 'low',
    keyAE: 'HIGH metabolic/weight gain, sedation', pregnancy: 'limited data', lactation: 'limited data',
    pgx: 'CYP1A2 substrate', overdose: 'moderate', brands: 'Zyprexa' },
  lamotrigine: { label: 'Lamotrigine', cls: 'mood stabiliser',
    mechanism: 'Na-channel blockade → ↓glutamate release', halfLife: '~25 h (varies w/ valproate)',
    withdrawalRisk: 'low', keyAE: 'RASH / Stevens-Johnson (slow titration mandatory), headache',
    pregnancy: 'relatively preferred MS', lactation: 'caution',
    pgx: '—', overdose: 'moderate', brands: 'Lamictal',
    flags: 'mandatory slow titration; valproate doubles level' },
  topiramate: { label: 'Topiramate', cls: 'mood stabiliser',
    mechanism: 'GABA↑, AMPA/kainate block, carbonic-anhydrase inhibition', halfLife: '~21 h',
    withdrawalRisk: 'low', keyAE: 'paraesthesia, cognitive slowing, weight LOSS, renal stones, acidosis',
    pregnancy: 'caution (cleft)', lactation: 'caution',
    pgx: '—', overdose: 'moderate', brands: 'Topamax', flags: 'reduces OCP efficacy' },
  valproate: { label: 'Valproate / Divalproex', cls: 'mood stabiliser',
    mechanism: 'GABA↑ + Na-channel block', halfLife: '~9–16 h', withdrawalRisk: 'low',
    keyAE: 'weight gain, sedation, tremor, hepatotoxicity, thrombocytopenia; enzyme inhibitor',
    pregnancy: 'CONTRAINDICATED (strong teratogen)', lactation: 'caution',
    pgx: '—', overdose: 'moderate', brands: 'Depakine, Depakote',
    monitor: 'level 50–100 mcg/mL, LFTs, CBC' },
  memantine: { label: 'Memantine', cls: 'glutamatergic (NMDA antagonist)',
    mechanism: 'NMDA receptor antagonist', halfLife: '~60–80 h', withdrawalRisk: 'low',
    keyAE: 'dizziness, headache; well tolerated', pregnancy: 'limited data', lactation: 'limited data',
    pgx: '—', overdose: 'limited data', brands: 'Namenda' },
  drospirenone_ee: { label: 'Drospirenone/Ethinyl-estradiol', cls: 'combined OCP',
    mechanism: 'Anti-mineralocorticoid/anti-androgen progestin + EE; 24/4 regimen stabilises mood',
    halfLife: 'n/a', withdrawalRisk: 'n/a', keyAE: 'nausea, breast tenderness, VTE risk, hyperkalaemia',
    pregnancy: 'n/a (contraceptive)', lactation: 'per OCP guidance',
    pgx: '—', overdose: 'n/a', brands: 'Yaz, Yasmin',
    flags: 'CI: VTE, migraine w/ aura, smoker >35, hyperkalaemia' },
  hydroxyzine: { label: 'Hydroxyzine', cls: 'antihistamine',
    mechanism: 'H1 antagonist (anxiolytic)', halfLife: '~20 h', withdrawalRisk: 'none',
    keyAE: 'sedation, dry mouth, QT at high dose', pregnancy: 'caution late', lactation: 'caution',
    pgx: '—', overdose: 'relatively safe', brands: 'Atarax' },
};

/* ── 2. Per-disorder Rx: framework + per-drug overrides (reference DRUG_MASTER) */
export const DX = {
  MDD: {
    verified: false,
    onset: 'Onset 2–4 wk; adequate trial 4–6 wk at therapeutic dose; partial response → extend 6–12 wk',
    phases: 'Acute 8–12 wk → Continuation 4–9 mo (same dose) → Maintenance ≥2 yr if recurrent/severe',
    selection: [
      { ifFeature: 'Insomnia / poor appetite / weight loss', prefer: 'Mirtazapine (nocte)', because: 'sedating + appetite-stimulating', grade: 'A' },
      { ifFeature: 'Chronic pain / somatic / low energy', prefer: 'Venlafaxine XR', because: 'noradrenergic action aids pain/energy', grade: 'B' },
      { ifFeature: 'Polypharmacy / minimise CYP interactions', prefer: 'Sertraline or Escitalopram', because: 'cleaner CYP profile', grade: 'A' },
      { ifFeature: 'Cardiac / QT concern', prefer: 'Sertraline', because: 'lowest QT signal, preferred post-MI', grade: 'B' },
      { ifFeature: 'Sexual side-effect concern', prefer: 'Bupropion (adjunct) / Mirtazapine', because: 'minimal sexual dysfunction', grade: 'A' },
    ],
    combine: { when: 'Partial response after ≥4–6 wk at optimised dose', basis: 'CANMAT 2023 favours early adjunct (aripiprazole; bupropion for energy/sexual SE) over serial switches; switch if NO response/intolerable', grade: 'A' },
    default: 'SSRI (escitalopram or sertraline) absent a differentiating feature',
    drugs: [
      { id: 'escitalopram', line: 'first', role: 'firstLine', dose: '10 → 10–20 mg/d' },
      { id: 'sertraline', line: 'first', role: 'firstLine', dose: '50 → 100–200 mg/d' },
      { id: 'venlafaxine', line: 'first', role: 'firstLine', dose: '75 → 150–225 mg/d' },
      { id: 'mirtazapine', line: 'first', role: 'firstLine', dose: '15 → 30–45 mg nocte' },
      { id: 'aripiprazole', line: 'adjunct', role: 'adjunct', dose: '2–10 mg/d (augmentation)' },
      { id: 'bupropion', line: 'adjunct', role: 'adjunct', dose: '150–300 mg/d' },
    ],
    monitoring: 'Baseline: weight/BMI, BP, ECG if cardiac/QT or high-dose citalopram, Na if elderly/diuretic, LFTs if agomelatine, pregnancy, suicidality. Follow-up: suicidality 1–2 wk, response 4–6 wk, BP (venlafaxine), Na (early), metabolic (mirtazapine)',
    cautions: 'Boxed warning suicidality <25; MAOI+serotonergic contraindicated; bupropion CI in seizure/eating disorder',
  },

  GAD: {
    verified: false,
    onset: 'SSRI/SNRI/buspirone 2–6 wk; pregabalin/BZD days. Adequate trial 4–6 wk',
    phases: 'Continue ≥12 mo after response (chronic/relapsing)',
    selection: [
      { ifFeature: 'Need rapid relief / severe acute anxiety', prefer: 'Pregabalin (or short BZD bridge)', because: 'onset within days', grade: 'B' },
      { ifFeature: 'Comorbid pain', prefer: 'Duloxetine / Venlafaxine', because: 'SNRI helps pain', grade: 'A' },
      { ifFeature: 'Substance-use history', prefer: 'SSRI/SNRI (avoid BZD & pregabalin)', because: 'misuse potential', grade: 'A' },
      { ifFeature: 'Hesitant about SSRIs / mild-moderate', prefer: 'Buspirone', because: 'no dependence/sexual SE', grade: 'B' },
    ],
    combine: { when: 'Partial response to first-line', basis: 'Augment with buspirone or pregabalin; try buspirone before a BZD', grade: 'B' },
    default: 'SSRI first-line absent a differentiating feature',
    drugs: [
      { id: 'escitalopram', line: 'first', role: 'firstLine', dose: '10 → 10–20 mg/d' },
      { id: 'sertraline', line: 'first', role: 'firstLine', dose: '50 → 100–200 mg/d' },
      { id: 'venlafaxine', line: 'first', role: 'firstLine', dose: '75 → 150–225 mg/d' },
      { id: 'duloxetine', line: 'first', role: 'firstLine', dose: '30 → 60 mg/d' },
      { id: 'pregabalin', line: 'first', role: 'firstLine', dose: '150 → 300–600 mg/d (plateau ~300)' },
      { id: 'buspirone', line: 'second', role: 'adjunct', dose: '15 → 30–60 mg/d BID–TID' },
      { id: 'hydroxyzine', line: 'second', role: 'adjunct', dose: '25–100 mg' },
    ],
    monitoring: 'Baseline: BP, weight, Na if elderly/diuretic, renal if pregabalin, abuse risk if BZD/pregabalin. Follow-up: suicidality early, response 4–6 wk, BP (venlafaxine)',
    cautions: 'BZD short-term only; pregabalin controlled + CNS depressant synergy w/ opioids/alcohol; boxed warning <25',
  },

  OCD: {
    verified: false,
    onset: 'Slower than MDD: trial 8–12 wk, ≥4–6 at MAX tolerated dose (some 12–16 wk). Augment only after adequate trial',
    phases: 'Continue 1–2 yr after remission (same dose); most need long-term',
    selection: [
      { ifFeature: 'First-line', prefer: 'High-dose SSRI (often above MDD max)', because: 'anti-obsessional effect needs higher doses', grade: 'A' },
      { ifFeature: 'SSRI failure ×1', prefer: 'Try a SECOND SSRI', because: 'idiosyncratic response', grade: 'A' },
      { ifFeature: 'SSRI failure ×2 / refractory', prefer: 'Clomipramine or antipsychotic augmentation', because: 'larger effect size / NMA evidence', grade: 'B' },
      { ifFeature: 'QT / cardiac concern', prefer: 'Avoid citalopram & clomipramine', because: 'QT/cardiotoxicity', grade: 'A' },
    ],
    combine: { when: 'Refractory after adequate high-dose SSRI trial', basis: 'Add low-dose antipsychotic (aripiprazole preferred, then risperidone); response in 4–6 wk, stop if none by 2 mo', grade: 'B' },
    default: 'High-dose SSRI first-line; citalopram NOT preferred (QT cap limits dose)',
    drugs: [
      { id: 'fluoxetine', line: 'first', role: 'firstLine', dose: 'up to 80 mg/d' },
      { id: 'sertraline', line: 'first', role: 'firstLine', dose: 'up to 200 (–400) mg/d' },
      { id: 'escitalopram', line: 'first', role: 'firstLine', dose: '20–40 (–50) mg/d' },
      { id: 'fluvoxamine', line: 'first', role: 'firstLine', dose: 'up to 300 mg/d' },
      { id: 'paroxetine', line: 'first', role: 'firstLine', dose: 'up to 60 mg/d' },
      { id: 'clomipramine', line: 'second', role: 'second', dose: '25 → up to 250 mg/d (level <500 ng/mL, ECG)' },
      { id: 'aripiprazole', line: 'augment', role: 'adjunct', dose: '2–15 mg/d (preferred)' },
      { id: 'risperidone', line: 'augment', role: 'adjunct', dose: '≤2 mg/d' },
      { id: 'memantine', line: 'augment', role: 'adjunct', dose: '10–20 mg/d' },
    ],
    monitoring: 'Baseline as MDD + ECG/level if clomipramine, metabolic if antipsychotic, YBOCS. Follow-up: clomipramine ECG/level, antipsychotic metabolic panel',
    cautions: 'Citalopram not preferred; clomipramine cardiotoxic in OD; boxed warning <25; combine with ERP',
  },

  BPD: {
    verified: false,
    onset: 'Antipsychotics (cognitive-perceptual/anger) weeks; mood stabilisers weeks (lamotrigine slow). Stop if no clear benefit',
    phases: 'TIME-LIMITED & reviewed; antipsychotics show benefit when used ≤6 mo. Psychotherapy is first-line',
    selection: [
      { ifFeature: 'Affective dysregulation / mood lability / anger', prefer: 'Mood stabiliser (lamotrigine/topiramate/valproate) or SGA', because: 'highest effect on this dimension', grade: 'C' },
      { ifFeature: 'Impulsivity / behavioural dyscontrol', prefer: 'Mood stabiliser / SGA', because: 'reduces impulsivity', grade: 'C' },
      { ifFeature: 'Cognitive-perceptual (paranoia/dissociation)', prefer: 'Low-dose antipsychotic', because: 'only class effective here', grade: 'C' },
      { ifFeature: 'Comorbid depression/anxiety', prefer: 'SSRI (weak for core BPD)', because: 'targets comorbidity not core BPD', grade: 'C' },
    ],
    combine: { when: 'Symptom not controlled', basis: 'Add stepwise, taper what lacks benefit; AVOID polypharmacy & benzodiazepines', grade: 'C' },
    default: 'Psychotherapy first-line; medication is adjunctive, symptom-targeted, time-limited (no agent improves BPD overall)',
    drugs: [
      { id: 'lamotrigine', line: 'symptom', role: 'moodStabiliser', dose: 'slow titration → ~100–200 mg/d' },
      { id: 'topiramate', line: 'symptom', role: 'moodStabiliser', dose: '→ ~50–200 mg/d' },
      { id: 'valproate', line: 'symptom', role: 'moodStabiliser', dose: 'per level 50–100 mcg/mL' },
      { id: 'aripiprazole', line: 'symptom', role: 'antipsychotic', dose: '2.5–15 mg/d' },
      { id: 'quetiapine', line: 'symptom', role: 'antipsychotic', dose: '50–300 mg/d' },
      { id: 'olanzapine', line: 'symptom', role: 'antipsychotic', dose: '2.5–10 mg/d' },
    ],
    monitoring: 'Valproate level/LFTs/CBC/pregnancy; lamotrigine rash watch during titration; antipsychotic weight/glucose/lipids/prolactin/ECG; topiramate bicarbonate/stones',
    cautions: 'AVOID benzodiazepines & polypharmacy; valproate teratogen (avoid in childbearing potential); lamotrigine SJS; HIGH suicide risk → limit quantities, avoid TCA',
  },

  PMDD: {
    verified: false,
    onset: 'RAPID (days, not weeks) — allows intermittent dosing. Diagnosis needs prospective daily ratings ×2 cycles',
    phases: 'Continue while cyclical symptoms persist; luteal intermittent suits long-term (less exposure)',
    selection: [
      { ifFeature: 'Follicular-phase symptoms or comorbid depression/anxiety', prefer: 'Continuous SSRI', because: 'covers whole cycle; slightly higher efficacy', grade: 'A' },
      { ifFeature: 'Luteal-only symptoms / minimise exposure', prefer: 'Luteal-phase SSRI (start ~14 d pre-menses, stop at onset)', because: 'less drug, avoids withdrawal', grade: 'A' },
      { ifFeature: 'Contraception also desired / SSRI not tolerated', prefer: 'Drospirenone/EE 24/4', because: 'FDA-approved alternative', grade: 'B' },
      { ifFeature: 'SSRI failure', prefer: 'SNRI (venlafaxine 75mg) → GnRH agonist + add-back', because: 'next-step evidence', grade: 'C' },
    ],
    combine: { when: 'Partial response', basis: 'Increase dose or switch luteal→continuous; add Ca/exercise/CBT', grade: 'B' },
    default: 'SSRI first-line (continuous or luteal); lower doses than MDD; rapid response',
    drugs: [
      { id: 'sertraline', line: 'first', role: 'firstLine', dose: '50–100 mg (continuous/luteal)' },
      { id: 'fluoxetine', line: 'first', role: 'firstLine', dose: '20 mg (continuous/luteal)' },
      { id: 'paroxetine', line: 'first', role: 'firstLine', dose: '12.5–25 mg CR (continuous/luteal)' },
      { id: 'escitalopram', line: 'first', role: 'firstLine', dose: '10–20 mg (continuous/luteal)' },
      { id: 'drospirenone_ee', line: 'second', role: 'hormonal', dose: '24/4 regimen' },
      { id: 'venlafaxine', line: 'refractory', role: 'second', dose: '75 mg' },
    ],
    monitoring: 'Diagnosis: prospective DRSP ×2 cycles. OCP: BP, VTE risk; drospirenone: K+ if risk factors. SSRI: as MDD',
    cautions: 'OCP CI: VTE/aura migraine/smoker>35/hyperkalaemia; boxed warning <25; luteal dosing avoids withdrawal',
  },
};

/* ── 3. Deterministic render (locked block for the context / report) ──────── */
const sevDash = '— ';
function renderSelection(dx, ar) {
  if (!dx.selection || !dx.selection.length) return '';
  const head = ar ? 'اختيار الدواء (كيف تختار):' : 'TREATMENT SELECTION (how to choose):';
  const lines = dx.selection.map((s) =>
    `  ${sevDash}If ${s.ifFeature} → ${s.prefer} (${s.because}) [${s.grade}]`);
  const comb = dx.combine
    ? `\n  When one is not enough: ${dx.combine.when} → ${dx.combine.basis} [${dx.combine.grade}]`
    : '';
  const def = dx.default ? `\n  Default: ${dx.default}` : '';
  return `${head}\n${lines.join('\n')}${comb}${def}`;
}

function renderDrugs(dx, ar) {
  if (!dx.drugs || !dx.drugs.length) return '';
  const head = ar ? 'الأدوية (الجرعة/الدور + ملف مختصر):' : 'AGENTS (dose/role + brief profile):';
  const lines = dx.drugs.map((d) => {
    const m = DRUG_MASTER[d.id] || {};
    return `  ${sevDash}${m.label || d.id} [${d.line}] — ${d.dose}`
      + `\n      ${m.cls || ''}; t½ ${m.halfLife || '—'}; withdrawal ${m.withdrawalRisk || '—'}`
      + `\n      AE: ${m.keyAE || '—'}`
      + `\n      Pregnancy: ${m.pregnancy || '—'}; PGx: ${m.pgx || '—'}; OD: ${m.overdose || '—'}`
      + (m.monitor ? `\n      Monitor: ${m.monitor}` : '')
      + (m.flags ? `\n      Flags: ${m.flags}` : '');
  });
  return `${head}\n${lines.join('\n')}`;
}

export function renderDrugDataBlock(disorderKey, { lang = 'en' } = {}) {
  const dx = disorderKey && DX[disorderKey];
  if (!dx) return '';
  const ar = lang === 'ar';
  const out = [];
  out.push(`LOCKED DRUG-DATA (${DRUGDATA_VERSION})${dx.verified ? '' : ' — PROVISIONAL DRAFT, pending physician verification'} — present verbatim; do NOT invent:`);
  if (dx.onset) out.push(`Onset/trial: ${dx.onset}`);
  if (dx.phases) out.push(`Phases/duration: ${dx.phases}`);
  const sel = renderSelection(dx, ar); if (sel) out.push('\n' + sel);
  const dr = renderDrugs(dx, ar); if (dr) out.push('\n' + dr);
  if (dx.monitoring) out.push(`\nMonitoring: ${dx.monitoring}`);
  if (dx.cautions) out.push(`Cautions: ${dx.cautions}`);
  return out.join('\n');
}

/* One-call gate for clinicalLock(): '' while inert (mirrors interaction gate). */
export function renderDrugDataGate({ disorderKey, lang } = {}) {
  if (!DRUGDATA_ACTIVE) return '';
  return renderDrugDataBlock(disorderKey, { lang });
}
