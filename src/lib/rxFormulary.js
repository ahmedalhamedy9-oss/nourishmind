/* ════════════════════════════════════════════════════════════════════════
   rxFormulary.js — RICH CLINICAL SOURCE OF TRUTH (physician-verified, locked)
   ────────────────────────────────────────────────────────────────────────
   Companion to clinicalFormulary.js. Holds the deep, machine-readable
   pharmacology data + locked narrative blocks that drive the deterministic
   selection / monitoring / tapering layers. Disorder keys MATCH disorderKey()
   in clinicalFormulary.js: GAD, MDD, OCD, BPD, PMDD.

   ── GOVERNANCE (do not weaken) ─────────────────────────────────────────
   • Every clinical claim carries `src` (citation) + `verified` (boolean).
   • `verified: false`  → drafted from the cited source by the build step,
     NOT yet signed off by Dr. Ahmed. The app may show these but must NOT
     present them as final until flipped to true after source-check.
   • `needsConfirmation: true` → could NOT be grounded from a reliable source
     (e.g. Egyptian trade names, local prices, specific NNT/remission %).
     These are placeholders for the physician to fill. NEVER invented.
   • Drug content is from guidelines, NOT clinician opinion. Diagnosis is the
     physician's; the protocol is the source's.

   ── VERSION ─────────────────────────────────────────────────────────────
   RX_VERSION below. GAD = TEMPLATE built first for Dr. Ahmed's review.
   MDD / OCD / BPD / PMDD replicate this exact shape (pending review sign-off).
   ════════════════════════════════════════════════════════════════════════ */

export const RX_VERSION = 'v0.1-DRAFT (2026-07-01) — GAD template, pending physician sign-off';
export const RX_ACTIVE  = false; // inert until GAD reviewed + remaining 4 built

export const NEEDS = '⟦NEEDS_CONFIRMATION⟧'; // sentinel for physician-supplied data

/* ── Citation registry (short keys → full reference) ───────────────────── */
export const RX_SOURCES = {
  NICE_GAD:    'NICE CG113 — GAD & panic disorder in adults (updated 2020).',
  BAP_ANX:     'Baldwin DS et al. BAP evidence-based guidelines for anxiety disorders. J Psychopharmacol 2014.',
  KATZMAN2014: 'Katzman MA et al. Canadian clinical practice guidelines, anxiety/PTSD/OCD. BMC Psychiatry 2014;14(S1):S1.',
  SLEE2019:    'Slee A et al. Pharmacological treatments for GAD: systematic review & network meta-analysis. Lancet 2019;393:768-77.',
  WFSBP2023:   'Bandelow B et al. WFSBP guidelines for anxiety disorders (update). 2023.',
  MAUDSLEY_DP: 'Horowitz MA, Taylor DM. The Maudsley Deprescribing Guidelines. Wiley 2024.',
  HOROWITZ19:  'Horowitz MA, Taylor D. Tapering of SSRI treatment to mitigate withdrawal. Lancet Psychiatry 2019;6:538-46.',
  RCPSYCH_DP:  'Royal College of Psychiatrists — stopping antidepressants guidance (2024).',
  CPIC_SSRI:   'Bousman CA et al. CPIC guideline for CYP2D6/CYP2C19 & SSRIs. Clin Pharmacol Ther 2023.',
  FDA_CIT_QT:  'FDA Drug Safety Communication — citalopram QT, 24 Aug 2011 (rev 28 Mar 2012).',
  FDA_GABA:    'FDA Drug Safety Communication — gabapentinoid respiratory depression, 19 Dec 2019.',
  FDA_SSRI_BBW:'FDA boxed warning — antidepressants & suicidality in patients <25 y.',
  SMPC:        'Manufacturer SmPC / FDA label (drug-specific; verify current label).',
};

/* helper to keep entries terse */
const S = (k) => RX_SOURCES[k] || k;

/* ════════════════════════════════════════════════════════════════════════
   GAD — TEMPLATE (built first, reviewed first)
   ════════════════════════════════════════════════════════════════════════ */
const GAD = {
  label: 'Generalized Anxiety Disorder (GAD)',
  dxNote:
    'Diagnosis is clinical (DSM-5-TR / ICD-11). This module supplies the ' +
    'source-based protocol only; it does not diagnose.',

  /* ── FIRST-LINE (SSRIs + SNRIs; pregabalin added by NMA evidence) ─────── */
  firstLine: [
    {
      id: 'escitalopram', drug: 'Escitalopram', class: 'SSRI',
      trade: { generic: 'escitalopram', egypt: NEEDS },
      fdaGad: true, grade: 'A',
      // 1. mechanism / receptor profile = the "why"
      mechanism:
        'Highly selective serotonin reuptake inhibition (SERT). Cleanest ' +
        'SSRI receptor profile → minimal antihistaminic/anticholinergic ' +
        'load; favoured tolerability.',
      // 2. dosing (start / titration / target / max / forms)
      dosing: {
        start: '10 mg once daily',
        titration: 'May increase to 20 mg/day after ≥1 week if needed',
        target: '10–20 mg/day',
        max: '20 mg/day (10 mg/day if elderly/hepatic impairment)',
        forms: 'tablet; oral solution (useful for hyperbolic taper)',
      },
      // 3. onset / adequate trial
      onset: 'Some benefit by 2–4 wk; adequate trial = 4–6 wk at therapeutic dose before switch/augment.',
      // 4. half-life
      halfLife: '~27–32 h (once-daily).',
      // 5. withdrawal
      withdrawal: { risk: 'moderate',
        note: 'Taper hyperbolically. Lower risk than paroxetine/venlafaxine.' },
      // 6. adverse effects
      ae: {
        common: 'nausea, headache, insomnia or somnolence, sexual dysfunction.',
        distinctive: 'dose-dependent QTc prolongation at 20 mg (ECG if risk factors).',
      },
      // 7. monitoring (feeds lab tiering)
      monitoring: {
        baseline: 'Na+ baseline if elderly (SIADH/hyponatraemia risk); ECG if cardiac risk or QT-prolonging co-meds.',
        ongoing: 'Suicidality early (esp <25 y); response at 4–6 wk; Na+ if symptoms suggest hyponatraemia.',
      },
      // 8. contraindications / warnings
      contraindications: {
        absolute: 'Concurrent or recent MAOI (≥14 d washout); concurrent pimozide.',
        relative: 'Congenital long-QT, uncorrected hypokalaemia/hypomagnesaemia, bleeding risk (NSAID/anticoagulant).',
        boxed: 'Suicidality in patients <25 y (class boxed warning).',
      },
      pregnancyLactation:
        'Not first choice vs sertraline in pregnancy by some guidelines; assess case-by-case. Excreted in breast milk (low).',
      chronicDisease: {
        cardiac: 'QTc caution at 20 mg; ECG if risk factors.',
        hepatic: 'Max 10 mg/day.',
        renal: 'Caution if severe impairment.',
        hyponatraemia: 'SSRI class risk, higher in elderly/diuretics.',
        bleeding: 'GI bleed risk ↑ with NSAID/anticoagulant; consider gastroprotection.',
      },
      // 9. overdose toxicity / suicidal-patient safety
      overdose: 'Relatively safe in overdose vs TCAs; QT at very high doses. Lower lethality — preferable when suicide risk present.',
      // 10. special populations + PGx
      specialPops: {
        elderly: 'Start 5 mg, max 10 mg; monitor Na+.',
        peds: 'Not first-line for paediatric GAD per label; specialist only.',
        pgx: 'CYP2C19 PM → ↑ exposure, consider ~50% dose / alternative; UM → ↓ exposure, consider alternative (CPIC).',
      },
      switching: 'From another SSRI: usually direct or short cross-taper. To/from MAOI: 14-day washout.',
      counseling: 'Delayed benefit (weeks), early jitteriness possible, do not stop abruptly, report worsening mood/suicidality early.',
      comparativeEfficacy: { note: 'Among best efficacy+tolerability in 2019 NMA.', stat: NEEDS },
      src: [S('NICE_GAD'), S('SLEE2019'), S('CPIC_SSRI'), S('FDA_SSRI_BBW'), S('SMPC')],
      verified: false,
    },

    {
      id: 'sertraline', drug: 'Sertraline', class: 'SSRI',
      trade: { generic: 'sertraline', egypt: NEEDS },
      fdaGad: false, // NICE first-choice (cost-effective) though off-label for GAD in some regions
      grade: 'A',
      mechanism: 'SERT inhibition; weak dopamine reuptake effect at higher doses.',
      dosing: {
        start: '25–50 mg once daily',
        titration: 'Increase by 25–50 mg at ≥1-week intervals as needed',
        target: '50–200 mg/day',
        max: '200 mg/day',
        forms: 'tablet; oral concentrate (useful for taper).',
      },
      onset: 'Benefit by 2–4 wk; adequate trial 4–6 wk.',
      halfLife: '~26 h (active metabolite desmethylsertraline 62–104 h).',
      withdrawal: { risk: 'moderate', note: 'Taper hyperbolically.' },
      ae: { common: 'GI upset/diarrhoea, nausea, insomnia, sexual dysfunction.',
            distinctive: 'diarrhoea more prominent than other SSRIs.' },
      monitoring: { baseline: 'Na+ if elderly; pregnancy status (commonly preferred agent).',
                    ongoing: 'Suicidality early; response 4–6 wk; Na+ as indicated.' },
      contraindications: {
        absolute: 'MAOI within 14 d; concurrent pimozide; sertraline oral concentrate with disulfiram (alcohol content).',
        relative: 'Bleeding risk, hepatic impairment.',
        boxed: 'Suicidality <25 y.',
      },
      pregnancyLactation: 'Often the preferred SSRI in pregnancy/lactation (low milk transfer); confirm against perinatal guidance.',
      chronicDisease: { cardiac: 'Low QT signal vs citalopram.', hepatic: 'Reduce dose/frequency.',
                        renal: 'No major adjustment.', hyponatraemia: 'Class risk.', bleeding: 'Class risk.' },
      overdose: 'Relatively safe in overdose — preferred when suicide risk present.',
      specialPops: { elderly: 'Start low; monitor Na+.', peds: 'Specialist only for GAD.',
                     pgx: 'CYP2C19/2B6 substrate; PGx effect smaller than escitalopram (CPIC).' },
      switching: 'SSRI↔SSRI direct/short cross-taper; MAOI 14-day washout.',
      counseling: 'Take with food to reduce GI upset; delayed benefit; no abrupt stop.',
      comparativeEfficacy: { note: 'NICE first-choice on cost-effectiveness.', stat: NEEDS },
      src: [S('NICE_GAD'), S('CPIC_SSRI'), S('FDA_SSRI_BBW'), S('SMPC')],
      verified: false,
    },

    {
      id: 'paroxetine', drug: 'Paroxetine', class: 'SSRI',
      trade: { generic: 'paroxetine', egypt: NEEDS },
      fdaGad: true, grade: 'A',
      mechanism: 'Potent SERT inhibition + mild anticholinergic activity + CYP2D6 inhibition (autoinhibition).',
      dosing: { start: '20 mg once daily', titration: 'increase by 10 mg/day at ≥1-wk intervals',
                target: '20–50 mg/day', max: '50 mg/day (40 mg elderly)', forms: 'tablet, CR tablet, suspension.' },
      onset: 'Benefit 2–4 wk; trial 4–6 wk.',
      halfLife: '~21 h (nonlinear; autoinhibition).',
      withdrawal: { risk: 'high', note: 'Short half-life + anticholinergic rebound → prominent discontinuation symptoms; taper very slowly/hyperbolically.' },
      ae: { common: 'sedation, weight gain, sexual dysfunction, constipation/dry mouth (anticholinergic).',
            distinctive: 'most weight gain + highest withdrawal among SSRIs.' },
      monitoring: { baseline: 'Na+ if elderly.', ongoing: 'Suicidality; discontinuation symptoms on dose changes.' },
      contraindications: { absolute: 'MAOI within 14 d; thioridazine/pimozide.',
                           relative: 'Pregnancy (see below); bleeding risk.', boxed: 'Suicidality <25 y.' },
      pregnancyLactation: 'Generally AVOIDED in pregnancy — first-trimester cardiac malformation signal; choose alternative.',
      chronicDisease: { cardiac: 'Avoid in pregnancy-related cardiac concern.', hepatic: 'Reduce dose.',
                        renal: 'Reduce dose.', hyponatraemia: 'Class risk.', bleeding: 'Class risk.' },
      overdose: 'Relatively safe vs TCA but anticholinergic features possible.',
      specialPops: { elderly: 'Max 40 mg.', peds: 'Avoid (higher suicidality signal).',
                     pgx: 'Strong CYP2D6 inhibitor AND 2D6 substrate — interaction-heavy.' },
      switching: 'Taper carefully due to withdrawal; MAOI 14-day washout.',
      counseling: 'Do not miss doses (withdrawal); avoid in pregnancy planning.',
      comparativeEfficacy: { note: 'Effective but tolerability/withdrawal worse than escitalopram/sertraline.', stat: NEEDS },
      src: [S('NICE_GAD'), S('CPIC_SSRI'), S('FDA_SSRI_BBW'), S('SMPC')],
      verified: false,
    },

    {
      id: 'duloxetine', drug: 'Duloxetine', class: 'SNRI',
      trade: { generic: 'duloxetine', egypt: NEEDS },
      fdaGad: true, grade: 'A',
      mechanism: 'Serotonin + noradrenaline reuptake inhibition. NA action → analgesic benefit (useful if comorbid pain/fibromyalgia).',
      dosing: { start: '30 mg once daily', titration: 'increase to 60 mg/day after 1–2 wk',
                target: '60 mg/day', max: '120 mg/day (limited added benefit)', forms: 'delayed-release capsule.' },
      onset: 'Benefit 2–4 wk; trial 4–6 wk.',
      halfLife: '~12 h.',
      withdrawal: { risk: 'moderate', note: 'SNRI discontinuation symptoms; taper hyperbolically.' },
      ae: { common: 'nausea (early), dry mouth, constipation, sweating, insomnia.',
            distinctive: 'can raise BP modestly; hepatotoxicity risk (avoid with heavy alcohol).' },
      monitoring: { baseline: 'BP; LFTs if hepatic risk/alcohol.', ongoing: 'BP; suicidality; response 4–6 wk.' },
      contraindications: { absolute: 'MAOI within 14 d; uncontrolled narrow-angle glaucoma.',
                           relative: 'Hepatic impairment, heavy alcohol use, uncontrolled hypertension.', boxed: 'Suicidality <25 y.' },
      pregnancyLactation: 'Limited data; case-by-case.',
      chronicDisease: { cardiac: 'Monitor BP.', hepatic: 'Avoid in hepatic impairment / chronic alcohol.',
                        renal: 'Avoid if CrCl <30.', hyponatraemia: 'Class risk.', bleeding: 'Class risk.' },
      overdose: 'More toxic than SSRIs but less than venlafaxine/TCA.',
      specialPops: { elderly: 'Useful; monitor Na+/BP.', peds: 'Specialist.',
                     pgx: 'CYP1A2 + 2D6 substrate (smoking ↓ levels via 1A2 induction).' },
      switching: 'Cross-taper from SSRI; MAOI 14-day washout.',
      counseling: 'Nausea usually settles; first-choice if comorbid chronic pain.',
      comparativeEfficacy: { note: 'Among best efficacy in 2019 NMA; logical first pick with comorbid pain.', stat: NEEDS },
      src: [S('NICE_GAD'), S('SLEE2019'), S('SMPC')],
      verified: false,
    },

    {
      id: 'venlafaxine_xr', drug: 'Venlafaxine XR', class: 'SNRI',
      trade: { generic: 'venlafaxine ER/XR', egypt: NEEDS },
      fdaGad: true, grade: 'A',
      mechanism: 'SERT inhibition at low dose; NA reuptake inhibition emerges at higher doses (≥150 mg).',
      dosing: { start: '75 mg once daily (37.5 mg if sensitive)', titration: 'increase by 75 mg at ≥4–7 day intervals',
                target: '75–225 mg/day', max: '225 mg/day (GAD)', forms: 'extended-release capsule/tablet.' },
      onset: 'Benefit 2–4 wk; trial 4–6 wk.',
      halfLife: '~5 h (parent); active metabolite ODV ~11 h — SHORT.',
      withdrawal: { risk: 'very high', note: 'Shortest half-life of the group → severe discontinuation; taper very slowly/hyperbolically, liquid often needed.' },
      ae: { common: 'nausea, sweating, sexual dysfunction, insomnia.',
            distinctive: 'DOSE-DEPENDENT HYPERTENSION (esp ≥150 mg) — monitor BP.' },
      monitoring: { baseline: 'BP mandatory.', ongoing: 'BP at each titration; suicidality; response 4–6 wk.' },
      contraindications: { absolute: 'MAOI within 14 d.', relative: 'Uncontrolled hypertension, high cardiac risk.', boxed: 'Suicidality <25 y.' },
      pregnancyLactation: 'Case-by-case; neonatal discontinuation possible.',
      chronicDisease: { cardiac: 'Avoid/caution in uncontrolled HTN; monitor BP.', hepatic: 'Reduce dose ~50%.',
                        renal: 'Reduce dose ~25–50%.', hyponatraemia: 'Class risk.', bleeding: 'Class risk.' },
      overdose: 'MORE DANGEROUS in overdose (seizures, cardiotoxicity) — caution if suicide risk.',
      specialPops: { elderly: 'Monitor BP/Na+.', peds: 'Avoid.', pgx: 'CYP2D6 substrate (→ ODV).' },
      switching: 'Cross-taper; MAOI 14-day washout. Notorious for withdrawal between doses.',
      counseling: 'Never miss doses / stop abruptly; BP monitoring; report headache/palpitations.',
      comparativeEfficacy: { note: 'Effective (2019 NMA) but worst withdrawal + BP burden.', stat: NEEDS },
      src: [S('NICE_GAD'), S('SLEE2019'), S('MAUDSLEY_DP'), S('SMPC')],
      verified: false,
    },

    {
      id: 'pregabalin', drug: 'Pregabalin', class: 'gabapentinoid (α2δ ligand)',
      trade: { generic: 'pregabalin', egypt: NEEDS },
      fdaGad: false, // EMA-approved for GAD; not FDA-approved for GAD
      grade: 'A',
      mechanism: 'Binds α2δ subunit of voltage-gated Ca²⁺ channels → ↓ excitatory neurotransmitter release. NOT an antidepressant.',
      dosing: { start: '150 mg/day divided (75 mg BID)', titration: 'increase over days as tolerated',
                target: '150–600 mg/day divided (plateau ~300 mg)', max: '600 mg/day', forms: 'capsule, oral solution.' },
      onset: 'Faster than SSRI/SNRI — within days.',
      halfLife: '~6 h; RENAL clearance — dose-adjust for renal impairment.',
      withdrawal: { risk: 'moderate-high', note: 'Taper; abrupt stop → insomnia, anxiety, nausea, sweating.' },
      ae: { common: 'dizziness, somnolence, peripheral oedema, weight gain.',
            distinctive: 'misuse/dependence potential — CONTROLLED; CNS depression additive with opioids/alcohol/benzodiazepines.' },
      monitoring: { baseline: 'Renal function; abuse-risk assessment.', ongoing: 'Sedation, weight, misuse signs.' },
      contraindications: { absolute: 'Hypersensitivity.',
                           relative: 'History of substance misuse; concurrent opioids (respiratory depression).', boxed: '—' },
      pregnancyLactation: 'Possible congenital malformation signal — avoid unless clearly needed.',
      chronicDisease: { cardiac: 'Oedema caution in heart failure.', hepatic: 'No major adjustment.',
                        renal: 'Dose by CrCl — important.', respiratory: 'Caution + opioids/COPD (FDA 2019).' },
      overdose: 'Relatively low lethality alone; danger is CNS/respiratory depression in combination.',
      specialPops: { elderly: 'Lower dose; renal decline; fall risk.', peds: 'Not for GAD.', pgx: 'Minimal CYP metabolism.' },
      switching: 'Can combine with SSRI/SNRI as add-on; taper on stop.',
      counseling: 'Controlled substance; do not combine with alcohol/opioids; rapid onset but taper to stop.',
      comparativeEfficacy: { note: 'Effective in 2019 NMA; rapid onset; reserve given misuse risk.', stat: NEEDS },
      src: [S('NICE_GAD'), S('SLEE2019'), S('FDA_GABA'), S('SMPC')],
      verified: false,
    },
  ],

  /* ── ADJUNCT / SECOND-LINE ────────────────────────────────────────────── */
  adjunct: [
    {
      id: 'buspirone', drug: 'Buspirone', class: '5-HT1A partial agonist (azapirone)', grade: 'B',
      trade: { generic: 'buspirone', egypt: NEEDS },
      mechanism: '5-HT1A partial agonism. No sedation, no dependence, no sexual dysfunction.',
      dosing: { start: '7.5 mg BID', titration: 'increase by 5 mg every few days', target: '15–60 mg/day divided', max: '60 mg/day', forms: 'tablet.' },
      onset: 'Delayed 2–4 wk — counsel; not for acute/PRN relief.', halfLife: '~2–3 h (BID–TID dosing).',
      withdrawal: { risk: 'minimal', note: 'No discontinuation syndrome.' },
      ae: { common: 'dizziness, nausea, headache.', distinctive: 'NO sexual dysfunction / sedation / dependence.' },
      monitoring: { baseline: '—', ongoing: 'response by 4 wk.' },
      contraindications: { absolute: 'MAOI; severe hepatic/renal impairment.', relative: 'CYP3A4 inhibitors/grapefruit ↑ levels.', boxed: '—' },
      pregnancyLactation: 'Limited data.', overdose: 'Low toxicity.',
      specialPops: { elderly: 'Useful (no sedation/falls advantage).', pgx: 'CYP3A4 substrate.' },
      counseling: 'Takes weeks; not a PRN; avoid grapefruit.',
      src: [S('NICE_GAD'), S('SMPC')], verified: false,
    },
    {
      id: 'quetiapine_xr', drug: 'Quetiapine XR', class: 'atypical antipsychotic', grade: 'B',
      trade: { generic: 'quetiapine XR', egypt: NEEDS },
      mechanism: 'Multireceptor; low-dose anxiolysis via H1/5-HT2A/α1 + NA reuptake (norquetiapine).',
      dosing: { start: '50 mg/day', titration: 'to 150 mg/day', target: '50–150 mg/day', max: '150 mg/day (GAD adjunct)', forms: 'XR tablet.' },
      onset: 'Days–weeks.', halfLife: '~7 h (XR pharmacokinetics smoothed).',
      withdrawal: { risk: 'moderate', note: 'Taper; discontinuation insomnia/nausea.' },
      ae: { common: 'sedation, weight gain, dry mouth.', distinctive: 'METABOLIC (weight/glucose/lipids) + QTc; orthostatic hypotension.' },
      monitoring: { baseline: 'Weight/BMI, fasting glucose/HbA1c, lipids, ECG (esp with escitalopram/venlafaxine); correct K+/Mg2+.', ongoing: 'metabolic panel periodically; ECG if QT-prolonging combo.' },
      contraindications: { absolute: 'Strong caution with QT-prolonging combinations.', relative: 'Metabolic syndrome, diabetes, elderly.', boxed: 'Increased mortality in elderly with dementia-related psychosis (class).' },
      pregnancyLactation: 'Case-by-case.', overdose: 'Sedation, QT, hypotension.',
      specialPops: { elderly: 'Boxed dementia warning; lowest dose.', pgx: 'CYP3A4 substrate.' },
      counseling: 'Reserve for inadequate first-line response; metabolic monitoring.',
      src: [S('SLEE2019'), S('KATZMAN2014'), S('FDA_CIT_QT'), S('SMPC')], verified: false,
    },
    {
      id: 'hydroxyzine', drug: 'Hydroxyzine', class: 'antihistamine (H1)', grade: 'B',
      trade: { generic: 'hydroxyzine', egypt: NEEDS },
      mechanism: 'H1 antagonism → short-term anxiolysis/sedation. Non-dependence-forming alternative to benzodiazepines.',
      dosing: { start: '25 mg', titration: '—', target: '50–100 mg/day divided', max: 'per label', forms: 'tablet/syrup.' },
      onset: 'Rapid (hours).', halfLife: '~20 h.',
      withdrawal: { risk: 'minimal', note: '—' },
      ae: { common: 'sedation, dry mouth, dizziness.', distinctive: 'QTc prolongation; anticholinergic in elderly.' },
      monitoring: { baseline: 'ECG if QT risk.', ongoing: 'sedation.' },
      contraindications: { absolute: 'Prolonged QT.', relative: 'Elderly (anticholinergic).', boxed: '—' },
      pregnancyLactation: 'Avoid in early pregnancy per label.', overdose: 'Sedation, QT.',
      specialPops: { elderly: 'Caution (falls/anticholinergic).', pgx: '—' },
      counseling: 'Short-term; sedating.',
      src: [S('KATZMAN2014'), S('SMPC')], verified: false,
    },
    {
      id: 'benzo_bridge', drug: 'Benzodiazepine (short-term bridge only)', class: 'benzodiazepine', grade: 'caution',
      trade: { generic: 'e.g. lorazepam/clonazepam', egypt: NEEDS },
      mechanism: 'GABA-A positive modulation → rapid anxiolysis.',
      dosing: { start: 'lowest effective', titration: '—', target: 'short-term only (≤2–4 wk bridge)', max: 'per label', forms: 'tablet.' },
      onset: 'Rapid.', halfLife: 'agent-dependent.',
      withdrawal: { risk: 'high', note: 'Tolerance/dependence — NOT for maintenance; taper.' },
      ae: { common: 'sedation, falls, cognitive impairment.', distinctive: 'dependence; respiratory depression with opioids/pregabalin/alcohol.' },
      monitoring: { baseline: 'misuse risk.', ongoing: 'duration cap, dependence.' },
      contraindications: { absolute: 'Substance-use history (relative→strong); respiratory failure.', relative: 'Elderly, OSA.', boxed: 'Concomitant opioids — fatal respiratory depression.' },
      pregnancyLactation: 'Avoid.', overdose: 'Dangerous with other CNS depressants.',
      specialPops: { elderly: 'Avoid (Beers).', pgx: '—' },
      counseling: 'Bridge only while antidepressant takes effect; not long-term.',
      src: [S('NICE_GAD'), S('KATZMAN2014')], verified: false,
    },
  ],

  /* ── EXCLUDED / not recommended (with rationale) ─────────────────────── */
  excluded: [
    { item: 'Chronic benzodiazepines for maintenance', why: 'Tolerance/dependence; bridge-only indication.', src: [S('NICE_GAD')], verified: false },
    { item: 'Kava', why: 'Hepatotoxicity risk.', src: [S('KATZMAN2014')], verified: false },
  ],

  /* ── LABS — tiered 🟥 required / 🟨 recommended / 🟩 optional ─────────────
     Rationale + WHEN, driven by the drugs actually selected.               */
  labs: {
    required: [   // 🟥 before treatment, tied to a concrete trigger
      { test: 'Baseline BP + HR', why: 'Mandatory if venlafaxine/duloxetine (SNRI HTN).', when: 'before SNRI', src: [S('SMPC')], verified: false },
      { test: 'Renal function (eGFR/creatinine)', why: 'Pregabalin is renally cleared — dose by CrCl.', when: 'before pregabalin', src: [S('SMPC')], verified: false },
      { test: 'ECG (QTc)', why: 'Before escitalopram 20 mg or quetiapine, or any QT-prolonging combo.', when: 'before high-dose escitalopram / quetiapine', src: [S('FDA_CIT_QT')], verified: false },
      { test: 'Metabolic panel (fasting glucose/HbA1c + lipids + weight)', why: 'Mandatory if quetiapine XR.', when: 'before quetiapine', src: [S('SMPC')], verified: false },
    ],
    recommended: [ // 🟨 broadly useful baseline
      { test: 'Serum Na+', why: 'SSRI/SNRI hyponatraemia, esp elderly/diuretics.', when: 'baseline if elderly/diuretic', src: [S('NICE_GAD')], verified: false },
      { test: 'TSH (± Free T4)', why: 'Exclude thyroid disease mimicking anxiety.', when: 'baseline work-up', src: [S('NICE_GAD')], verified: false },
      { test: 'LFTs', why: 'Duloxetine hepatotoxicity / alcohol.', when: 'before duloxetine', src: [S('SMPC')], verified: false },
    ],
    optional: [    // 🟩 case-dependent
      { test: 'CBC', why: 'Anaemia contributing to fatigue if clinically indicated.', when: 'if symptoms suggest', src: [S('NICE_GAD')], verified: false },
      { test: 'CYP2C19/2D6 PGx panel', why: 'Optimises SSRI/SNRI choice if available; not routine.', when: 'if PGx-guided dosing pursued', src: [S('CPIC_SSRI')], verified: false },
      { test: 'Serum magnesium / vitamin D', why: 'Correct before QT meds / general optimisation.', when: 'pre-QT-drug or nutritional review', src: [S('FDA_CIT_QT')], verified: false },
    ],
  },

  /* ── LOCKED NARRATIVE BLOCKS (verbatim, source-based) ─────────────────── */

  // SWITCHING strategies (general SSRI/SNRI)
  switchingStrategies: {
    text:
      'Direct switch: between most SSRIs/SNRIs at equivalent low dose when ' +
      'half-lives are similar. Taper-and-switch / cross-taper: gradually ' +
      'reduce drug A while introducing drug B — preferred when withdrawal ' +
      'risk is high (paroxetine, venlafaxine). Washout: required to/from an ' +
      'MAOI — 14 days off SSRI/SNRI before MAOI (5 weeks if stopping ' +
      'fluoxetine due to long half-life), and 14 days off MAOI before a ' +
      'serotonergic agent. Fluoxetine\u2019s long half-life makes it the ' +
      'easiest to stop but the slowest to clear before an MAOI.',
    src: [S('MAUDSLEY_DP'), S('SMPC')], verified: false,
  },

  // WITHDRAWAL vs RELAPSE — the informed-consent cornerstone (#8)
  withdrawalVsRelapse: {
    text:
      'Distinguishing antidepressant WITHDRAWAL from RELAPSE (basis of ' +
      'informed consent):\n' +
      '• Timing — withdrawal starts FAST (days of a dose drop/stop); relapse ' +
      'is GRADUAL (weeks–months later).\n' +
      '• Symptom type — withdrawal often brings NEW somatic symptoms not in ' +
      'the original illness (dizziness, \u201cbrain-zaps\u201d/electric-shock ' +
      'sensations, nausea, flu-like feeling, sensory disturbance); relapse ' +
      'reproduces the patient\u2019s ORIGINAL anxiety/depression picture.\n' +
      '• Response to reinstatement — withdrawal resolves FAST (hours–days) ' +
      'when the drug is restarted; relapse does not.\n' +
      '• Rate dependence — withdrawal severity tracks how FAST the drug was ' +
      'reduced; relapse is independent of taper rate.\n' +
      'FINISH cluster (discontinuation): Flu-like, Insomnia, Nausea, ' +
      'Imbalance, Sensory disturbance, Hyperarousal. Misreading withdrawal ' +
      'as relapse leads to unnecessary lifelong treatment or abrupt stops — ' +
      'counsel the patient on the difference BEFORE starting.',
    src: [S('MAUDSLEY_DP'), S('RCPSYCH_DP'), S('HOROWITZ19')], verified: false,
  },

  // HYPERBOLIC TAPER
  hyperbolicTaper: {
    text:
      'Hyperbolic (proportional) tapering: reduce by RECEPTOR OCCUPANCY, not ' +
      'by fixed milligrams. Because the dose–occupancy curve is hyperbolic, ' +
      'equal mg cuts cause progressively larger occupancy drops near the end. ' +
      'Make the LARGEST mg cuts early and progressively SMALLER cuts as the ' +
      'dose lowers, often to tiny final doses (liquid/compounded). Maudsley ' +
      'reduction tiers by remaining SERT occupancy: \u201cfaster\u201d ~10%, ' +
      '\u201cslower\u201d ~5%, \u201ceven slower\u201d ~2.5% steps, each held ' +
      'until stable. Slower for high-withdrawal agents (paroxetine, ' +
      'venlafaxine) and long-term users. Modify to the patient; this is a ' +
      'starting framework, not a fixed recipe.',
    src: [S('HOROWITZ19'), S('MAUDSLEY_DP')], verified: false,
  },

  // TREATMENT PHASES / DURATION
  treatmentPhases: {
    text:
      'Acute (0–12 wk): titrate to response; judge an adequate trial only ' +
      'after 4–6 weeks at a therapeutic dose before switching/augmenting. ' +
      'Continuation: keep the effective dose. Maintenance: continue ≥12 ' +
      'months after response in GAD (longer if recurrent/severe) to reduce ' +
      'relapse, then taper hyperbolically if stopping.',
    src: [S('NICE_GAD'), S('BAP_ANX')], verified: false,
  },

  // SPECIFIER / SYMPTOM TARGETING
  specifierTargeting: {
    text:
      'Comorbid chronic pain/fibromyalgia → duloxetine (NA analgesia). ' +
      'Sexual-side-effect concern → buspirone (no sexual dysfunction). ' +
      'Need for rapid onset / poor antidepressant tolerance → pregabalin ' +
      '(reserve: misuse risk). Hypertension or overdose/suicide risk → avoid ' +
      'venlafaxine; prefer escitalopram/sertraline. Pregnancy → sertraline ' +
      'preferred; avoid paroxetine. Insomnia prominent → consider sedating ' +
      'adjunct (quetiapine XR / hydroxyzine) rather than a stimulating SSRI ' +
      'schedule. These are source-based modifiers, not rigid rules.',
    src: [S('NICE_GAD'), S('SLEE2019'), S('SMPC')], verified: false,
  },

  // MONITORING TIMELINE (#8) — what to expect & when, per intervention
  monitoringTimeline: {
    text:
      'Pharmacotherapy: review at 1–2 wk (tolerability, early jitteriness, ' +
      'suicidality especially <25 y), 4 wk (early response), 6–8 wk (decide ' +
      'adequate response vs switch/augment after a full therapeutic trial), ' +
      'then periodically. Expect gradual symptom reduction over weeks, not ' +
      'days (except pregabalin). If <25% improvement by 4–6 wk at adequate ' +
      'dose → optimise dose, check adherence, then switch or augment. ' +
      'Psychotherapy (CBT): expect measurable change over 8–12+ sessions. ' +
      'Document GAD-7 at baseline and follow-up to track trajectory and ' +
      'separate non-response from withdrawal/relapse later.',
    src: [S('NICE_GAD'), S('BAP_ANX')], verified: false,
  },
};

/* ════════════════════════════════════════════════════════════════════════
   Remaining disorders — SAME SHAPE, built after GAD template sign-off.
   Left as explicit stubs so nothing silently ships half-built.
   ════════════════════════════════════════════════════════════════════════ */
const PENDING = { __pending: true };
const MDD  = PENDING;
const OCD  = PENDING;
const BPD  = PENDING;
const PMDD = PENDING;

export const RX = { GAD, MDD, OCD, BPD, PMDD };

/* Convenience: list unverified claims so the review pass is mechanical. */
export function rxAuditUnverified(disorder = 'GAD') {
  const d = RX[disorder];
  if (!d || d.__pending) return [{ note: `${disorder} not built yet` }];
  const flags = [];
  const scan = (label, node) => {
    if (node && node.verified === false) flags.push({ label, drug: node.drug || node.test || node.item || '—' });
    if (node && typeof node === 'object')
      Object.values(node).forEach((v) => { if (v && typeof v === 'object' && 'verified' in v && v.verified === false) flags.push({ label, sub: v.drug || v.test || v.item }); });
  };
  ['firstLine','adjunct','excluded'].forEach((k) => (d[k] || []).forEach((m) => scan(k, m)));
  ['switchingStrategies','withdrawalVsRelapse','hyperbolicTaper','treatmentPhases','specifierTargeting','monitoringTimeline'].forEach((k) => scan(k, d[k]));
  return flags;
}
