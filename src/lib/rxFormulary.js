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

export const RX_VERSION = 'v0.3-DRAFT (2026-07-01) — all 5 disorders built (GAD/MDD/OCD/BPD/PMDD), pending physician sign-off';
export const RX_ACTIVE  = true; // live: comorbidity engine + rx data drive the report

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
  CANMAT_BD:   'Yatham LN et al. CANMAT/ISBD 2018 guidelines for management of bipolar disorder (antidepressant-monotherapy caution).',
  CANMAT_MDD:  'Lam RW et al. CANMAT 2023 update — management of MDD in adults. Can J Psychiatry 2024;69(9):641-687.',
  APA_OCD:     'APA Practice Guideline for OCD (Koran et al.) + subsequent reviews; high-dose SSRI / ERP.',
  ACOG_PMDD:   'ACOG Clinical Practice Guideline No.7 — premenstrual dysphoric disorder (2023).',
  NICE_BPD:    'NICE CG78 — borderline personality disorder (drug treatment not for core BPD; symptom-targeted only).',
  COCHRANE_BPD:'Stoffers-Winterling et al. Pharmacological interventions for BPD — Cochrane reviews.',
  NICKEL2006:  'Nickel MK et al. Aripiprazole in BPD, RCT. Am J Psychiatry 2006.',
  LABILE2018:  'Crawford MJ et al. LABILE — lamotrigine for BPD, RCT (n=276, no benefit). 2018.',
  FDA_VALP:    'FDA/SmPC valproate — teratogenicity boxed warning; avoid in pregnancy / childbearing potential.',
  LINEHAN_DBT: 'Linehan MM. Cognitive-Behavioral Treatment of BPD (Guilford 1993) & DBT Skills Training Manual, 2nd ed. (Guilford 2015) — stages of treatment & target hierarchy.',
  GUNDERSON_GPM:'Gunderson JG, Links PS. Handbook of Good Psychiatric Management for BPD (APPI 2014); Gunderson, Masland, Choi-Kain, review 2018.',
  BATEMAN_MBT: 'Bateman A, Fonagy P. Mentalization-Based Treatment for Personality Disorders (Oxford 2016).',
  YOUNG_SCHEMA:'Young JE, Klosko JS, Weishaar ME. Schema Therapy: A Practitioner\u2019s Guide (Guilford 2003) — mode work for BPD.',
  CLARKIN_TFP: 'Clarkin JF, Yeomans FE, Kernberg OF. Transference-Focused Psychotherapy for BPD (APPI 2006).',
  SHAPIRO_EMDR:'Shapiro F. EMDR: Basic Principles, Protocols and Procedures, 3rd ed. (Guilford 2018) — 8-phase protocol; extended stabilisation in complex trauma/dissociation.',
  BSL23:       'Bohus M et al. The short version of the Borderline Symptom List (BSL-23). Psychopathology 2009;42:32-39.',
  ZANBPD:      'Zanarini MC et al. Zanarini Rating Scale for BPD (ZAN-BPD): a continuous measure. J Pers Disord 2003;17:233-42.',
  HRVB:        'HRV biofeedback / resonance-frequency breathing: Lehrer & Gevirtz 2014; meta-analyses Goessl 2017 (anxiety/stress), Pizzoli 2021 (depression); Laborde 2022 (slow-paced breathing).',
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

  /* ── COMORBIDITY LAYER ────────────────────────────────────────────────
     primary = the disorder in the tab (drives the base protocol).
     These are NOT priority rules (the tab already sets who leads). They are
     source-based MODIFIERS that fire when a comorbid condition is present,
     plus CROSS-COVERAGE picks (one agent covering primary + comorbid).
     Consumed later by the deterministic comorbidity engine.              */

  // "If comorbid X is present → adjust / avoid / prefer (within GAD protocol)."
  comorbidityModifiers: [
    { ifComorbid: 'bipolar',
      action: 'caution', target: 'SSRI/SNRI monotherapy',
      rule: 'Antidepressant monotherapy can precipitate manic/hypomanic switch or mood instability. Do NOT start an antidepressant without adequate mood-stabiliser cover; prefer treating the bipolar protocol first.',
      src: [S('CANMAT_BD')], verified: false },
    { ifComorbid: 'substance use disorder | alcohol use disorder',
      action: 'avoid', target: 'benzodiazepine bridge; caution pregabalin',
      rule: 'Misuse/dependence potential — avoid benzodiazepines and use pregabalin cautiously; prefer SSRI/SNRI. Screen with UDS.',
      src: [S('NICE_GAD'), S('FDA_GABA')], verified: false },
    { ifComorbid: 'cardiac disease | long QT',
      action: 'avoid/adjust', target: 'high-dose escitalopram/citalopram; venlafaxine',
      rule: 'QT risk → ECG, avoid 20 mg escitalopram / citalopram ceilings; venlafaxine raises BP — avoid in uncontrolled HTN. Sertraline lower cardiac signal.',
      src: [S('FDA_CIT_QT'), S('SMPC')], verified: false },
    { ifComorbid: 'chronic pain | fibromyalgia | neuropathic pain',
      action: 'prefer', target: 'duloxetine (or pregabalin)',
      rule: 'Single agent covers anxiety + pain (see crossCoverage).',
      src: [S('SLEE2019'), S('SMPC')], verified: false },
    { ifComorbid: 'OCD',
      action: 'adjust', target: 'SSRI dose/duration',
      rule: 'OCD needs higher SSRI doses and a longer trial (8–12 wk) than GAD — dose to the OCD protocol when comorbid.',
      src: [S('KATZMAN2014')], verified: false },
    { ifComorbid: 'pregnancy',
      action: 'prefer/avoid', target: 'prefer sertraline; avoid paroxetine, pregabalin',
      rule: 'Sertraline preferred SSRI; paroxetine cardiac signal first-trimester; pregabalin malformation signal — confirm against perinatal guidance.',
      src: [S('SMPC')], verified: false },
    { ifComorbid: 'insomnia (prominent)',
      action: 'prefer', target: 'sedating adjunct',
      rule: 'Consider quetiapine XR / hydroxyzine adjunct or evening dosing rather than an activating schedule; treat primary insomnia drivers.',
      src: [S('KATZMAN2014')], verified: false },
  ],

  // One agent that covers GAD + the comorbid condition (best when available).
  crossCoverage: [
    { comorbid: 'MDD', agent: 'escitalopram | sertraline | duloxetine | venlafaxine XR',
      note: 'SSRI/SNRI treats GAD + depression with one agent.', src: [S('NICE_GAD')], verified: false },
    { comorbid: 'chronic pain | fibromyalgia | neuropathic', agent: 'duloxetine (or pregabalin)',
      note: 'SNRI/gabapentinoid covers anxiety + pain.', src: [S('SLEE2019'), S('SMPC')], verified: false },
    { comorbid: 'PTSD', agent: 'sertraline | paroxetine',
      note: 'SSRI cross-covers GAD + PTSD.', src: [S('KATZMAN2014')], verified: false },
    { comorbid: 'panic disorder', agent: 'SSRI/SNRI (start low, go slow)',
      note: 'Same first-line class; low start to avoid early activation.', src: [S('NICE_GAD')], verified: false },
    { comorbid: 'OCD', agent: 'SSRI at OCD doses',
      note: 'Same class, higher dose/longer trial governs.', src: [S('KATZMAN2014')], verified: false },
  ],
};

/* ════════════════════════════════════════════════════════════════════════
   Remaining disorders — SAME SHAPE, built after GAD template sign-off.
   Left as explicit stubs so nothing silently ships half-built.
   ════════════════════════════════════════════════════════════════════════ */
/* ════════════════════════════════════════════════════════════════════════
   MDD — Major Depressive Disorder (CANMAT 2023)
   ════════════════════════════════════════════════════════════════════════ */
const MDD = {
  label: 'Major Depressive Disorder (MDD)',
  dxNote: 'Diagnosis clinical (DSM-5-TR). Screen for bipolarity / mixed features BEFORE starting an antidepressant (mixed features → refer; antidepressant monotherapy can destabilise).',
  firstLine: [
    { id: 'escitalopram', drug: 'Escitalopram', class: 'SSRI', trade: { generic: 'escitalopram', egypt: NEEDS },
      grade: 'A', mechanism: 'Selective SERT inhibition; cleanest SSRI profile.',
      dosing: { start: '10 mg/day', titration: '→20 mg/day after ≥1 wk', target: '10–20 mg/day', max: '20 mg/day (10 mg elderly/hepatic)', forms: 'tablet; oral solution.' },
      onset: 'Benefit 2–4 wk; adequate trial 4–6 wk.', halfLife: '~27–32 h.',
      withdrawal: { risk: 'moderate', note: 'Taper hyperbolically.' },
      ae: { common: 'nausea, insomnia, sexual dysfunction.', distinctive: 'QTc at 20 mg.' },
      monitoring: { baseline: 'Na+ if elderly; ECG if cardiac risk.', ongoing: 'Suicidality (<25 y); response 4–6 wk.' },
      contraindications: { absolute: 'MAOI within 14 d; pimozide.', relative: 'Long-QT, bleeding risk.', boxed: 'Suicidality <25 y.' },
      pregnancyLactation: 'Case-by-case; sertraline often preferred in pregnancy.',
      chronicDisease: { cardiac: 'QTc at 20 mg.', hepatic: 'Max 10 mg.', renal: 'Caution severe.', hyponatraemia: 'Class.', bleeding: 'Class.' },
      overdose: 'Relatively safe — preferred if suicide risk.',
      specialPops: { elderly: 'Start 5, max 10; Na+.', peds: 'Escitalopram/fluoxetine the approved peds antidepressants.', pgx: 'CYP2C19 PM→↑ exposure ~50% dose; UM→alternative (CPIC).' },
      switching: 'SSRI↔SSRI direct; MAOI 14-d washout.', counseling: 'Delayed effect; no abrupt stop; report early worsening.',
      comparativeEfficacy: { note: 'Among CANMAT-2023 8 superior-efficacy agents; favourable interactions.', stat: NEEDS },
      src: [S('CANMAT_MDD'), S('CPIC_SSRI'), S('FDA_SSRI_BBW'), S('SMPC')], verified: false },

    { id: 'sertraline', drug: 'Sertraline', class: 'SSRI', trade: { generic: 'sertraline', egypt: NEEDS },
      grade: 'A', mechanism: 'SERT inhibition; mild dopaminergic at high dose.',
      dosing: { start: '50 mg/day', titration: '+50 mg at ≥1-wk steps', target: '50–200 mg/day', max: '200 mg/day', forms: 'tablet; oral concentrate.' },
      onset: '2–4 wk; trial 4–6 wk.', halfLife: '~26 h (metabolite 62–104 h).',
      withdrawal: { risk: 'moderate', note: 'Taper.' },
      ae: { common: 'diarrhoea, nausea, sexual dysfunction.', distinctive: 'GI most prominent.' },
      monitoring: { baseline: 'Na+ if elderly; pregnancy status.', ongoing: 'Suicidality; response 4–6 wk.' },
      contraindications: { absolute: 'MAOI 14 d; pimozide; concentrate+disulfiram.', relative: 'Bleeding, hepatic.', boxed: 'Suicidality <25 y.' },
      pregnancyLactation: 'Often preferred SSRI in pregnancy/lactation; confirm perinatal guidance.',
      chronicDisease: { cardiac: 'Low QT signal.', hepatic: 'Reduce.', renal: 'No major change.', hyponatraemia: 'Class.', bleeding: 'Class.' },
      overdose: 'Relatively safe — preferred if suicide risk.',
      specialPops: { elderly: 'Start low; Na+.', peds: 'Used; fluoxetine/escitalopram are the labelled ones.', pgx: 'CYP2C19/2B6; smaller PGx effect.' },
      switching: 'Direct/short cross-taper; MAOI 14-d.', counseling: 'With food; delayed effect; no abrupt stop.',
      comparativeEfficacy: { note: 'CANMAT-2023 superior-efficacy; few interactions.', stat: NEEDS },
      src: [S('CANMAT_MDD'), S('CPIC_SSRI'), S('FDA_SSRI_BBW'), S('SMPC')], verified: false },

    { id: 'venlafaxine_xr', drug: 'Venlafaxine XR', class: 'SNRI', trade: { generic: 'venlafaxine ER/XR', egypt: NEEDS },
      grade: 'A', mechanism: 'SERT (low dose) + NA reuptake (≥150 mg).',
      dosing: { start: '75 mg/day (37.5 if sensitive)', titration: '+75 mg at ≥4–7 d', target: '75–225 mg/day', max: '375 mg/day (MDD, specialist)', forms: 'XR capsule/tablet.' },
      onset: '2–4 wk; trial 4–6 wk.', halfLife: '~5 h (ODV ~11 h) — SHORT.',
      withdrawal: { risk: 'very high', note: 'Severe discontinuation; taper slowly/hyperbolic, liquid often needed.' },
      ae: { common: 'nausea, sweating, sexual dysfunction.', distinctive: 'DOSE-DEPENDENT HYPERTENSION; monitor BP.' },
      monitoring: { baseline: 'BP mandatory.', ongoing: 'BP each titration; suicidality.' },
      contraindications: { absolute: 'MAOI 14 d.', relative: 'Uncontrolled HTN, high cardiac risk.', boxed: 'Suicidality <25 y.' },
      pregnancyLactation: 'Case-by-case; neonatal discontinuation possible.',
      chronicDisease: { cardiac: 'Avoid uncontrolled HTN; BP.', hepatic: 'Reduce ~50%.', renal: 'Reduce 25–50%.', hyponatraemia: 'Class.', bleeding: 'Class.' },
      overdose: 'MORE DANGEROUS (seizures, cardiotoxicity) — caution if suicide risk.',
      specialPops: { elderly: 'BP/Na+.', peds: 'Avoid.', pgx: 'CYP2D6 substrate.' },
      switching: 'Cross-taper; MAOI 14-d.', counseling: 'Never miss/stop abruptly; BP monitoring.',
      comparativeEfficacy: { note: 'CANMAT-2023 superior-efficacy; worst withdrawal/BP.', stat: NEEDS },
      src: [S('CANMAT_MDD'), S('MAUDSLEY_DP'), S('SMPC')], verified: false },

    { id: 'mirtazapine', drug: 'Mirtazapine', class: 'NaSSA (α2 antagonist)', trade: { generic: 'mirtazapine', egypt: NEEDS },
      grade: 'A', mechanism: 'α2-adrenergic antagonism (↑ NA/5-HT) + H1 antagonism (sedation/appetite) + 5-HT2/5-HT3 block (less sexual dysfunction/nausea). The "why" for insomnia + weight loss / poor appetite.',
      dosing: { start: '15 mg at night', titration: '→30–45 mg', target: '30–45 mg at night', max: '45 mg/day', forms: 'tablet, orodispersible.' },
      onset: 'Sleep/appetite early; mood 2–4 wk; trial 4–6 wk.', halfLife: '~20–40 h.',
      withdrawal: { risk: 'low–moderate', note: 'Taper.' },
      ae: { common: 'sedation (more at LOW dose), weight gain, increased appetite, dry mouth.', distinctive: 'rare agranulocytosis; less sexual dysfunction/GI than SSRI.' },
      monitoring: { baseline: 'Weight/metabolic if risk.', ongoing: 'Weight; sedation; suicidality.' },
      contraindications: { absolute: 'MAOI 14 d.', relative: 'Obesity/metabolic, sedation-sensitive roles.', boxed: 'Suicidality <25 y.' },
      pregnancyLactation: 'Limited data.', chronicDisease: { cardiac: 'Generally ok.', hepatic: 'Reduce.', renal: 'Reduce.', metabolic: 'Weight gain caution.' },
      overdose: 'Relatively safe alone.',
      specialPops: { elderly: 'Useful for sleep/appetite; sedation/falls.', peds: 'Specialist.', pgx: 'CYP1A2/2D6/3A4 substrate.' },
      switching: 'Often combined with SSRI/SNRI as augmentation; MAOI 14-d.',
      counseling: 'Sedating + appetite — first pick for insomnia/weight loss depression; lower dose can be MORE sedating.',
      comparativeEfficacy: { note: 'CANMAT-2023 superior-efficacy; targets sleep/appetite.', stat: NEEDS },
      src: [S('CANMAT_MDD'), S('SMPC')], verified: false },

    { id: 'vortioxetine', drug: 'Vortioxetine', class: 'serotonin modulator', trade: { generic: 'vortioxetine', egypt: NEEDS },
      grade: 'A', mechanism: 'SERT inhibition + 5-HT receptor modulation (5-HT3 antagonist, 5-HT1A agonist); evidence for cognitive symptoms; low sexual dysfunction.',
      dosing: { start: '5–10 mg/day', titration: '→10–20 mg', target: '10–20 mg/day', max: '20 mg/day', forms: 'tablet.' },
      onset: '2–4 wk; trial 4–6 wk.', halfLife: '~66 h (long).',
      withdrawal: { risk: 'low', note: 'Long half-life → minimal; taper anyway.' },
      ae: { common: 'nausea (dose-related, early).', distinctive: 'low sexual dysfunction; pro-cognitive signal.' },
      monitoring: { baseline: '—', ongoing: 'Suicidality; response 4–6 wk.' },
      contraindications: { absolute: 'MAOI 14 d.', relative: 'Bleeding.', boxed: 'Suicidality <25 y.' },
      pregnancyLactation: 'Limited data.', chronicDisease: { hepatic: 'Caution severe.', renal: 'No major change.', bleeding: 'Class.' },
      overdose: 'Relatively safe.',
      specialPops: { elderly: 'Cognitive benefit of interest.', peds: 'Not established.', pgx: 'CYP2D6 substrate — PM lower max (10 mg).' },
      switching: 'Cross-taper; MAOI 14-d.', counseling: 'Nausea settles; low sexual side effects.',
      comparativeEfficacy: { note: 'CANMAT-2023 superior-efficacy; cognition.', stat: NEEDS },
      src: [S('CANMAT_MDD'), S('SMPC')], verified: false },

    { id: 'bupropion', drug: 'Bupropion XL', class: 'NDRI', trade: { generic: 'bupropion XL', egypt: NEEDS },
      grade: 'A', mechanism: 'Noradrenaline + dopamine reuptake inhibition. Activating; NO sexual dysfunction / weight gain; aids low energy & smoking cessation.',
      dosing: { start: '150 mg/day (morning)', titration: '→300 mg after ≥1 wk', target: '300 mg/day', max: '300 mg/day (XL)', forms: 'XL/SR tablet.' },
      onset: '2–4 wk; trial 4–6 wk.', halfLife: '~21 h (active metabolites longer).',
      withdrawal: { risk: 'low', note: 'Minimal.' },
      ae: { common: 'insomnia, dry mouth, agitation, headache.', distinctive: 'DOSE-DEPENDENT SEIZURE risk; no sexual dysfunction/weight gain.' },
      monitoring: { baseline: 'Seizure-risk screen; eating-disorder screen.', ongoing: 'BP; agitation; suicidality.' },
      contraindications: { absolute: 'Seizure disorder; current/prior eating disorder (bulimia/anorexia); abrupt alcohol/benzo withdrawal; MAOI 14 d.', relative: 'Conditions lowering seizure threshold.', boxed: 'Suicidality <25 y.' },
      pregnancyLactation: 'Case-by-case.', chronicDisease: { cardiac: 'May raise BP.', hepatic: 'Reduce.', renal: 'Reduce.', neuro: 'Seizure threshold.' },
      overdose: 'Seizure/cardiotoxic in overdose — caution if suicide risk.',
      specialPops: { elderly: 'Activating; useful low energy.', peds: 'Not first-line.', pgx: 'CYP2B6 substrate; strong 2D6 INHIBITOR (raises 2D6 substrates).' },
      switching: 'Add-on to SSRI for sexual dysfunction/energy; MAOI 14-d.',
      counseling: 'Activating (morning dosing); no sexual side effects; absolute contraindication in eating disorders/seizures.',
      comparativeEfficacy: { note: 'CANMAT-2023 superior-efficacy; first-line augmentation.', stat: NEEDS },
      src: [S('CANMAT_MDD'), S('SMPC')], verified: false },
  ],
  adjunct: [
    { id: 'aripiprazole_aug', drug: 'Aripiprazole (augmentation)', class: 'atypical antipsychotic (D2 partial agonist)', grade: 'A',
      trade: { generic: 'aripiprazole', egypt: NEEDS }, mechanism: 'D2/5-HT1A partial agonism; first-line adjunct for partial antidepressant response.',
      dosing: { start: '2–5 mg/day', titration: 'slow', target: '2–10 mg/day', max: '~15 mg/day (aug)', forms: 'tablet.' },
      onset: 'Days–weeks.', halfLife: '~75 h.', withdrawal: { risk: 'low', note: 'Taper.' },
      ae: { common: 'akathisia (notable), insomnia.', distinctive: 'metabolically favourable vs other SGAs; akathisia limiting.' },
      monitoring: { baseline: 'Metabolic baseline.', ongoing: 'Akathisia; metabolic.' },
      contraindications: { absolute: '—', relative: 'Akathisia history.', boxed: 'Elderly dementia mortality (class); suicidality <25 y in MDD context.' },
      pregnancyLactation: 'Case-by-case.', overdose: 'Relatively low.', specialPops: { elderly: 'Boxed dementia.', pgx: 'CYP2D6/3A4 substrate.' },
      counseling: 'Add to antidepressant for partial response; watch restlessness.',
      src: [S('CANMAT_MDD'), S('SMPC')], verified: false },
    { id: 'lithium_aug', drug: 'Lithium (augmentation)', class: 'mood stabiliser', grade: 'B',
      trade: { generic: 'lithium carbonate', egypt: NEEDS }, mechanism: 'Classic antidepressant augmentation; anti-suicidal evidence.',
      dosing: { start: 'per level', titration: 'to target level', target: 'serum 0.6–0.8 mmol/L (aug)', max: 'by level', forms: 'tablet.' },
      onset: 'Weeks.', halfLife: '~24 h.', withdrawal: { risk: 'rebound', note: 'Do not stop abruptly (relapse/mania rebound).' },
      ae: { common: 'tremor, polyuria, thirst.', distinctive: 'NARROW therapeutic index; thyroid/renal effects; toxicity.' },
      monitoring: { baseline: 'Renal, thyroid, ECG, pregnancy.', ongoing: 'LEVELS, renal, thyroid, hydration.' },
      contraindications: { absolute: 'Severe renal impairment; pregnancy (relative—Ebstein).', relative: 'Dehydration, NSAID/ACEi/diuretic interactions.', boxed: 'Lithium toxicity.' },
      pregnancyLactation: 'Cardiac teratogen signal; specialist.', overdose: 'DANGEROUS — narrow index.',
      specialPops: { elderly: 'Lower levels; caution.', pgx: '—' },
      counseling: 'Hydration, consistent salt, level monitoring, signs of toxicity.',
      src: [S('CANMAT_MDD'), S('SMPC')], verified: false },
    { id: 'quetiapine_aug', drug: 'Quetiapine XR (augmentation)', class: 'atypical antipsychotic', grade: 'B',
      trade: { generic: 'quetiapine XR', egypt: NEEDS }, mechanism: 'Adjunct; sedating; norquetiapine NET inhibition.',
      dosing: { start: '50 mg', titration: '→150–300 mg', target: '150–300 mg/day (aug)', max: 'per label', forms: 'XR tablet.' },
      onset: 'Days–weeks.', halfLife: '~7 h.', withdrawal: { risk: 'moderate', note: 'Taper.' },
      ae: { common: 'sedation, weight gain.', distinctive: 'METABOLIC + QTc.' },
      monitoring: { baseline: 'Metabolic, ECG.', ongoing: 'Metabolic panel; ECG if QT combo.' },
      contraindications: { absolute: 'QT-prolonging combos caution.', relative: 'Metabolic syndrome.', boxed: 'Elderly dementia mortality.' },
      pregnancyLactation: 'Case-by-case.', overdose: 'Sedation/QT/hypotension.', specialPops: { elderly: 'Boxed dementia.', pgx: 'CYP3A4.' },
      counseling: 'Sedation/metabolic; useful if insomnia/anxiety prominent.',
      src: [S('CANMAT_MDD'), S('SMPC')], verified: false },
  ],
  excluded: [
    { item: 'MAOI + SSRI/SNRI combination', why: 'Serotonin-syndrome risk — contraindicated.', src: [S('SMPC')], verified: false },
    { item: 'Benzodiazepine monotherapy', why: 'No antidepressant efficacy; short-term adjunct only.', src: [S('CANMAT_MDD')], verified: false },
  ],
  labs: {
    required: [
      { test: 'Bipolarity / mixed-features screen', why: 'Antidepressant monotherapy can destabilise bipolar/mixed — screen before starting.', when: 'before any antidepressant', src: [S('CANMAT_MDD')], verified: false },
      { test: 'Baseline BP', why: 'Mandatory if venlafaxine/duloxetine/bupropion.', when: 'before SNRI/bupropion', src: [S('SMPC')], verified: false },
      { test: 'Seizure & eating-disorder screen', why: 'Bupropion absolutely contraindicated in both.', when: 'before bupropion', src: [S('SMPC')], verified: false },
      { test: 'Renal + thyroid + ECG', why: 'Mandatory before lithium augmentation.', when: 'before lithium', src: [S('SMPC')], verified: false },
    ],
    recommended: [
      { test: 'TSH (±Free T4)', why: 'Hypothyroidism mimics/worsens depression.', when: 'baseline work-up', src: [S('CANMAT_MDD')], verified: false },
      { test: 'Serum Na+', why: 'SSRI/SNRI hyponatraemia, elderly.', when: 'if elderly/diuretic', src: [S('CANMAT_MDD')], verified: false },
      { test: 'Metabolic panel (glucose/lipids/weight)', why: 'Before mirtazapine/quetiapine augmentation.', when: 'before metabolically-active agents', src: [S('SMPC')], verified: false },
    ],
    optional: [
      { test: 'CBC', why: 'Mirtazapine rare agranulocytosis if febrile illness.', when: 'if symptoms', src: [S('SMPC')], verified: false },
      { test: 'B12 / folate / vitamin D', why: 'Reversible contributors to low mood.', when: 'nutritional review', src: [S('CANMAT_MDD')], verified: false },
      { test: 'CYP2D6/2C19 PGx', why: 'Optimises antidepressant choice if pursued.', when: 'if PGx-guided', src: [S('CPIC_SSRI')], verified: false },
    ],
  },
  switchingStrategies: { text: 'Direct switch between most SSRIs/SNRIs; cross-taper when withdrawal risk high (paroxetine, venlafaxine). MAOI: 14-day washout (5 weeks from fluoxetine). Optimise dose once before switch vs augment decision.', src: [S('CANMAT_MDD'), S('MAUDSLEY_DP')], verified: false },
  withdrawalVsRelapse: { text: 'Same framework as GAD: withdrawal is FAST-onset with NEW somatic symptoms (dizziness/brain-zaps/flu-like), resolves quickly on reinstatement, and tracks taper speed; relapse is GRADUAL, reproduces the original depression, and is taper-rate independent. FINISH cluster. Counsel before starting — basis of informed consent.', src: [S('MAUDSLEY_DP'), S('RCPSYCH_DP'), S('HOROWITZ19')], verified: false },
  hyperbolicTaper: { text: 'Reduce by receptor occupancy, largest cuts early, progressively smaller (to liquid/compounded). Maudsley tiers ~10% / 5% / 2.5% of remaining occupancy, held until stable. Slower for paroxetine/venlafaxine and long-term users.', src: [S('HOROWITZ19'), S('MAUDSLEY_DP')], verified: false },
  treatmentPhases: { text: 'Acute (to remission, judge trial at 4–6 wk on therapeutic dose). Continuation: 6–9 months after remission to prevent relapse. Maintenance: ≥2 years (or indefinite) for recurrent/severe/high-risk. Taper hyperbolically when stopping.', src: [S('CANMAT_MDD')], verified: false },
  specifierTargeting: { text: 'Anxious distress / atypical / melancholic → any first/second-line agent. Seasonal (winter) → light therapy first-line + antidepressant. Psychotic features → antidepressant + antipsychotic (do not start structured psychotherapy until psychosis subsides). Mixed features → REFER (bipolar-like; antidepressant monotherapy risk). Prominent insomnia/appetite loss → mirtazapine. Low energy / sexual-side-effect concern / smoking → bupropion. Cognitive symptoms → vortioxetine/bupropion.', src: [S('CANMAT_MDD')], verified: false },
  monitoringTimeline: { text: 'Review 1–2 wk (tolerability, suicidality <25 y), 4 wk (early response), 6–8 wk (decide adequate response vs switch/augment after full trial). Track PHQ-9 baseline + follow-up. <20–25% improvement by 4–6 wk at adequate dose → optimise dose/adherence, then switch or augment.', src: [S('CANMAT_MDD')], verified: false },
  comorbidityModifiers: [
    { ifComorbid: 'bipolar | mixed features', action: 'caution/refer', target: 'antidepressant monotherapy', rule: 'Risk of manic switch/destabilisation — ensure mood-stabiliser cover; mixed features → refer to psychiatry.', src: [S('CANMAT_BD')], verified: false },
    { ifComorbid: 'eating disorder', action: 'avoid', target: 'bupropion', rule: 'Bupropion ABSOLUTELY contraindicated (seizure risk).', src: [S('SMPC')], verified: false },
    { ifComorbid: 'seizure disorder', action: 'avoid', target: 'bupropion', rule: 'Lowers seizure threshold — contraindicated.', src: [S('SMPC')], verified: false },
    { ifComorbid: 'cardiac disease | long QT', action: 'avoid/adjust', target: 'high-dose (es)citalopram; venlafaxine', rule: 'QT/BP — ECG; prefer sertraline; avoid venlafaxine in uncontrolled HTN.', src: [S('FDA_CIT_QT'), S('SMPC')], verified: false },
    { ifComorbid: 'high suicide risk', action: 'avoid', target: 'TCAs, venlafaxine (lethal in overdose)', rule: 'Prefer SSRIs (safer in overdose); consider lithium augmentation (anti-suicidal).', src: [S('CANMAT_MDD')], verified: false },
    { ifComorbid: 'chronic pain', action: 'prefer', target: 'duloxetine/venlafaxine', rule: 'Covers depression + pain.', src: [S('CANMAT_MDD')], verified: false },
    { ifComorbid: 'pregnancy', action: 'prefer/avoid', target: 'prefer sertraline; avoid paroxetine/valproate', rule: 'Confirm against perinatal guidance.', src: [S('SMPC')], verified: false },
  ],
  crossCoverage: [
    { comorbid: 'GAD | anxiety', agent: 'escitalopram | sertraline | duloxetine | venlafaxine', note: 'SSRI/SNRI covers depression + anxiety.', src: [S('CANMAT_MDD')], verified: false },
    { comorbid: 'chronic pain | neuropathic', agent: 'duloxetine | venlafaxine', note: 'SNRI covers both.', src: [S('CANMAT_MDD')], verified: false },
    { comorbid: 'insomnia | appetite loss', agent: 'mirtazapine', note: 'Sedation + appetite.', src: [S('CANMAT_MDD')], verified: false },
    { comorbid: 'smoking cessation | low energy', agent: 'bupropion', note: 'NDRI covers both.', src: [S('CANMAT_MDD')], verified: false },
  ],
};

/* ════════════════════════════════════════════════════════════════════════
   OCD — Obsessive-Compulsive Disorder (APA; SSRI high-dose + ERP)
   ════════════════════════════════════════════════════════════════════════ */
const OCD = {
  label: 'Obsessive-Compulsive Disorder (OCD)',
  dxNote: 'ERP (exposure & response prevention) is the cornerstone psychotherapy. OCD needs HIGHER SSRI doses and a LONGER trial (8–12 wk at max tolerated) than depression/anxiety before judging response.',
  firstLine: [
    { id: 'fluoxetine', drug: 'Fluoxetine', class: 'SSRI', trade: { generic: 'fluoxetine', egypt: NEEDS }, grade: 'A',
      mechanism: 'SERT inhibition; long half-life (self-tapering).',
      dosing: { start: '20 mg/day', titration: 'increase toward OCD range', target: '40–80 mg/day (OCD high-dose)', max: '80 mg/day', forms: 'capsule, liquid.' },
      onset: 'Anti-obsessional benefit slow — judge at 8–12 wk.', halfLife: '~4–6 days (metabolite norfluoxetine longer).',
      withdrawal: { risk: 'low', note: 'Long half-life → easiest to stop; but 5-wk washout before MAOI.' },
      ae: { common: 'insomnia, activation, sexual dysfunction.', distinctive: 'most activating; longest half-life.' },
      monitoring: { baseline: '—', ongoing: 'Suicidality (<25 y); Y-BOCS at 8–12 wk.' },
      contraindications: { absolute: 'MAOI (5-wk washout); pimozide/thioridazine.', relative: 'Bleeding.', boxed: 'Suicidality <25 y.' },
      pregnancyLactation: 'Case-by-case.', chronicDisease: { hepatic: 'Reduce.', renal: 'No major change.', bleeding: 'Class.' },
      overdose: 'Relatively safe.', specialPops: { elderly: 'Lower dose.', peds: 'Approved peds SSRI (also OCD).', pgx: 'CYP2D6 inhibitor + substrate; many interactions.' },
      switching: 'Long washout before MAOI; many drug interactions (2D6).', counseling: 'Slow anti-obsessional onset; activating; high doses expected.',
      comparativeEfficacy: { note: 'High-dose SSRI first-line for OCD.', stat: NEEDS },
      src: [S('APA_OCD'), S('FDA_SSRI_BBW'), S('SMPC')], verified: false },
    { id: 'sertraline', drug: 'Sertraline', class: 'SSRI', trade: { generic: 'sertraline', egypt: NEEDS }, grade: 'A',
      mechanism: 'SERT inhibition.',
      dosing: { start: '50 mg/day', titration: '+50 mg steps', target: '100–200 mg/day (OCD high-dose)', max: '200 mg/day (higher off-label)', forms: 'tablet, concentrate.' },
      onset: 'Judge at 8–12 wk.', halfLife: '~26 h (metabolite long).',
      withdrawal: { risk: 'moderate', note: 'Taper.' }, ae: { common: 'diarrhoea, nausea, sexual dysfunction.', distinctive: 'GI prominent.' },
      monitoring: { baseline: 'Na+ if elderly.', ongoing: 'Suicidality; Y-BOCS 8–12 wk.' },
      contraindications: { absolute: 'MAOI 14 d; pimozide.', relative: 'Bleeding.', boxed: 'Suicidality <25 y.' },
      pregnancyLactation: 'Often preferred SSRI in pregnancy.', chronicDisease: { hepatic: 'Reduce.', bleeding: 'Class.' },
      overdose: 'Relatively safe.', specialPops: { elderly: 'Na+.', peds: 'Used for OCD.', pgx: 'CYP2C19/2B6.' },
      switching: 'Direct/cross-taper; MAOI 14-d.', counseling: 'High dose + long trial; with food.',
      comparativeEfficacy: { note: 'First-line high-dose SSRI for OCD.', stat: NEEDS },
      src: [S('APA_OCD'), S('FDA_SSRI_BBW'), S('SMPC')], verified: false },
    { id: 'fluvoxamine', drug: 'Fluvoxamine', class: 'SSRI', trade: { generic: 'fluvoxamine', egypt: NEEDS }, grade: 'A',
      mechanism: 'SERT inhibition; OCD-specific evidence base.',
      dosing: { start: '50 mg at night', titration: '+50 mg steps', target: '100–300 mg/day (divided >150)', max: '300 mg/day', forms: 'tablet, CR.' },
      onset: 'Judge at 8–12 wk.', halfLife: '~15 h.',
      withdrawal: { risk: 'moderate', note: 'Taper.' }, ae: { common: 'nausea, sedation.', distinctive: 'strong CYP1A2/2C19 inhibitor — interaction-heavy (theophylline, clozapine, caffeine).' },
      monitoring: { baseline: '—', ongoing: 'Suicidality; Y-BOCS; interactions.' },
      contraindications: { absolute: 'MAOI 14 d; with tizanidine/ramelteon (1A2).', relative: 'Caffeine/clozapine interactions.', boxed: 'Suicidality <25 y.' },
      pregnancyLactation: 'Case-by-case.', chronicDisease: { hepatic: 'Reduce.', bleeding: 'Class.' },
      overdose: 'Relatively safe.', specialPops: { elderly: 'Lower dose.', peds: 'Approved for paediatric OCD.', pgx: 'CYP1A2/2C19 inhibitor.' },
      switching: 'Watch interactions; MAOI 14-d.', counseling: 'Night dosing; many drug/caffeine interactions.',
      comparativeEfficacy: { note: 'First-line; classic OCD agent.', stat: NEEDS },
      src: [S('APA_OCD'), S('SMPC')], verified: false },
    { id: 'escitalopram', drug: 'Escitalopram', class: 'SSRI', trade: { generic: 'escitalopram', egypt: NEEDS }, grade: 'A',
      mechanism: 'Selective SERT inhibition.',
      dosing: { start: '10 mg/day', titration: 'up for OCD', target: '20–40 mg/day (OCD high-dose; >20 off-label, ECG)', max: '40 mg off-label — QTc caution', forms: 'tablet, solution.' },
      onset: 'Judge 8–12 wk.', halfLife: '~27–32 h.',
      withdrawal: { risk: 'moderate', note: 'Taper.' }, ae: { common: 'nausea, sexual dysfunction.', distinctive: 'QTc at high dose — ECG.' },
      monitoring: { baseline: 'ECG if >20 mg or cardiac risk.', ongoing: 'Suicidality; Y-BOCS; QTc.' },
      contraindications: { absolute: 'MAOI 14 d; pimozide.', relative: 'Long-QT (limits OCD high dose).', boxed: 'Suicidality <25 y.' },
      pregnancyLactation: 'Case-by-case.', chronicDisease: { cardiac: 'QTc — limits high OCD dosing.', hepatic: 'Reduce.', bleeding: 'Class.' },
      overdose: 'Relatively safe.', specialPops: { elderly: 'Lower max.', peds: 'Used.', pgx: 'CYP2C19 (CPIC).' },
      switching: 'Direct/cross-taper; MAOI 14-d.', counseling: 'High OCD doses constrained by QT — ECG.',
      comparativeEfficacy: { note: 'First-line; high-dose limited by QT.', stat: NEEDS },
      src: [S('APA_OCD'), S('FDA_CIT_QT'), S('CPIC_SSRI'), S('SMPC')], verified: false },
  ],
  adjunct: [
    { id: 'clomipramine', drug: 'Clomipramine', class: 'TCA (serotonergic)', trade: { generic: 'clomipramine', egypt: NEEDS }, grade: 'A',
      mechanism: 'Potent SERT (+NA) inhibition; strongest single-agent OCD efficacy but TCA toxicity — used after SSRI failure.',
      dosing: { start: '25 mg', titration: 'increase gradually', target: '100–250 mg/day', max: '250 mg/day', forms: 'tablet/capsule.' },
      onset: 'Judge 8–12 wk.', halfLife: '~32 h (metabolite longer).',
      withdrawal: { risk: 'moderate', note: 'Taper (cholinergic rebound).' },
      ae: { common: 'anticholinergic (dry mouth, constipation), sedation, weight gain, sexual dysfunction.', distinctive: 'seizure at high dose; CARDIOTOXIC; QTc.' },
      monitoring: { baseline: 'ECG; consider plasma levels.', ongoing: 'ECG; plasma levels; anticholinergic burden.' },
      contraindications: { absolute: 'Recent MI; MAOI 14 d; arrhythmia.', relative: 'Cardiac disease, BPH, glaucoma, elderly.', boxed: 'Suicidality <25 y.' },
      pregnancyLactation: 'Case-by-case.', chronicDisease: { cardiac: 'AVOID/ECG — cardiotoxic.', hepatic: 'Reduce.', renal: 'Caution.', neuro: 'Seizure at high dose.' },
      overdose: 'DANGEROUS — TCA cardiotoxicity/seizures; high lethality — caution if suicide risk.',
      specialPops: { elderly: 'Anticholinergic/cardiac caution.', peds: 'Specialist; ECG.', pgx: 'CYP2D6/2C19 substrate.' },
      switching: 'After ≥2 SSRI failures; careful cross from SSRI (serotonergic load); MAOI 14-d.',
      counseling: 'ECG + levels; overdose-dangerous (assess suicide risk before prescribing).',
      comparativeEfficacy: { note: 'High efficacy; reserved due to toxicity.', stat: NEEDS },
      src: [S('APA_OCD'), S('SMPC')], verified: false },
    { id: 'antipsychotic_aug', drug: 'Aripiprazole / Risperidone (low-dose augmentation)', class: 'atypical antipsychotic', grade: 'B',
      trade: { generic: 'aripiprazole / risperidone', egypt: NEEDS },
      mechanism: 'Add to a stable SSRI for partial response, esp. with comorbid tics.',
      dosing: { start: 'low', titration: 'slow', target: 'low-dose adjunct to stable SSRI', max: 'low', forms: 'tablet.' },
      onset: 'Weeks.', halfLife: 'agent-dependent.', withdrawal: { risk: 'low', note: 'Taper.' },
      ae: { common: 'aripiprazole: akathisia; risperidone: prolactin/metabolic.', distinctive: 'metabolic/EPS/prolactin.' },
      monitoring: { baseline: 'Metabolic; prolactin (risperidone).', ongoing: 'Metabolic; EPS; reassess need.' },
      contraindications: { absolute: '—', relative: 'Metabolic risk.', boxed: 'Elderly dementia mortality.' },
      pregnancyLactation: 'Case-by-case.', overdose: 'Relatively low (aripiprazole).', specialPops: { elderly: 'Boxed dementia.', pgx: 'CYP2D6/3A4.' },
      counseling: 'Augment stable SSRI; reassess; especially if tics.',
      src: [S('APA_OCD'), S('SMPC')], verified: false },
  ],
  excluded: [
    { item: 'Benzodiazepine monotherapy', why: 'No anti-obsessional efficacy.', src: [S('APA_OCD')], verified: false },
  ],
  labs: {
    required: [
      { test: 'ECG (QTc) + plasma levels', why: 'Mandatory before/with clomipramine (cardiotoxicity).', when: 'before clomipramine', src: [S('SMPC')], verified: false },
      { test: 'ECG (QTc)', why: 'Before high-dose escitalopram (>20 mg) in OCD.', when: 'before high-dose escitalopram', src: [S('FDA_CIT_QT')], verified: false },
      { test: 'Metabolic baseline', why: 'Before antipsychotic augmentation.', when: 'before SGA augmentation', src: [S('SMPC')], verified: false },
    ],
    recommended: [
      { test: 'CYP interaction review (esp. fluvoxamine, fluoxetine)', why: 'Strong CYP inhibitors — review co-meds/caffeine.', when: 'before fluvoxamine/fluoxetine', src: [S('SMPC')], verified: false },
    ],
    optional: [
      { test: 'CYP2D6/2C19 PGx', why: 'Optimises high-dose SSRI/clomipramine if pursued.', when: 'if PGx-guided', src: [S('CPIC_SSRI')], verified: false },
      { test: 'TSH', why: 'Exclude thyroid contribution to anxiety symptoms.', when: 'work-up', src: [S('APA_OCD')], verified: false },
    ],
  },
  switchingStrategies: { text: 'Try ≥2 adequate high-dose SSRI trials (each 8–12 wk) before clomipramine. SSRI→clomipramine: cross carefully (additive serotonergic load + clomipramine 2D6 metabolism). MAOI: 14-day washout (5 weeks from fluoxetine).', src: [S('APA_OCD'), S('MAUDSLEY_DP')], verified: false },
  withdrawalVsRelapse: { text: 'Same framework: withdrawal FAST with NEW somatic symptoms, resolves on reinstatement, tracks taper rate; OCD relapse is GRADUAL return of obsessions/compulsions. Note OCD often needs long maintenance — distinguish discontinuation from genuine relapse before restarting.', src: [S('MAUDSLEY_DP'), S('RCPSYCH_DP')], verified: false },
  hyperbolicTaper: { text: 'Same hyperbolic principle. Fluoxetine self-tapers (long t½). Taper slowly given OCD chronicity and relapse risk.', src: [S('HOROWITZ19'), S('MAUDSLEY_DP')], verified: false },
  treatmentPhases: { text: 'Acute: high-dose SSRI + ERP; judge at 8–12 wk. Maintenance: continue ≥1–2 years after response (longer if severe/relapsing) given high relapse rate; taper slowly.', src: [S('APA_OCD')], verified: false },
  specifierTargeting: { text: 'Comorbid tics / poor SSRI response → antipsychotic augmentation. Poor insight → emphasise ERP + longer pharmacotherapy. Severe/refractory after SSRIs → clomipramine (ECG/levels). Always pair pharmacotherapy with ERP.', src: [S('APA_OCD')], verified: false },
  monitoringTimeline: { text: 'Track Y-BOCS at baseline, 4 wk (early), 8–12 wk (decide adequacy at max tolerated dose). Do NOT switch before a full high-dose 8–12 wk trial. Pair with ERP and monitor functional change.', src: [S('APA_OCD')], verified: false },
  comorbidityModifiers: [
    { ifComorbid: 'tics | Tourette', action: 'prefer', target: 'antipsychotic augmentation', rule: 'Low-dose antipsychotic augmentation helps tic-related OCD.', src: [S('APA_OCD')], verified: false },
    { ifComorbid: 'bipolar', action: 'caution', target: 'SSRI monotherapy', rule: 'Manic-switch risk — mood-stabiliser cover.', src: [S('CANMAT_BD')], verified: false },
    { ifComorbid: 'cardiac disease', action: 'avoid', target: 'clomipramine; high-dose (es)citalopram', rule: 'Cardiotoxicity/QT — ECG, prefer non-cardiotoxic SSRI.', src: [S('SMPC'), S('FDA_CIT_QT')], verified: false },
    { ifComorbid: 'MDD', action: 'note', target: 'SSRI dose', rule: 'SSRI covers both but OCD high dose governs.', src: [S('APA_OCD')], verified: false },
  ],
  crossCoverage: [
    { comorbid: 'MDD', agent: 'SSRI (OCD doses)', note: 'Same class covers both; OCD dose governs.', src: [S('APA_OCD')], verified: false },
    { comorbid: 'GAD | anxiety', agent: 'SSRI', note: 'Same class covers both.', src: [S('APA_OCD')], verified: false },
  ],
};

/* ════════════════════════════════════════════════════════════════════════
   BPD — Borderline Personality Disorder (NICE/APA; psychotherapy core)
   ════════════════════════════════════════════════════════════════════════ */
const BPD = {
  label: 'Borderline Personality Disorder (BPD)',
  dxNote: 'NO medication is FDA/EMA-approved for BPD. DBT (and other structured psychotherapies: MBT, schema, TFP) is the CORNERSTONE. Drugs are SYMPTOM-TARGETED, time-limited ADJUNCTS only — NICE advises against drug treatment for core BPD; AVOID polypharmacy; agree a target symptom, duration and review/discontinuation up front.',
  // No true "first-line" drug — psychotherapy is first-line. Kept empty by design.
  firstLine: [],
  adjunct: [
    { id: 'aripiprazole', drug: 'Aripiprazole', class: 'atypical antipsychotic', grade: 'B',
      trade: { generic: 'aripiprazole', egypt: NEEDS },
      mechanism: 'D2/5-HT1A partial agonism. Best-supported SGA in BPD (Nickel 2006) for anger / affective / cognitive-perceptual symptoms; metabolically favourable.',
      dosing: { start: 'low (e.g. 2.5–5 mg)', titration: 'slow', target: 'low symptom-targeted dose', max: 'low', forms: 'tablet.' },
      onset: 'Weeks.', halfLife: '~75 h.', withdrawal: { risk: 'low', note: 'Taper; time-limited use.' },
      ae: { common: 'akathisia, insomnia.', distinctive: 'metabolically favourable; akathisia limiting.' },
      monitoring: { baseline: 'Metabolic baseline.', ongoing: 'Akathisia; metabolic; reassess need + STOP if ineffective.' },
      contraindications: { absolute: '—', relative: 'Akathisia history.', boxed: 'Elderly dementia mortality (class).' },
      pregnancyLactation: 'Case-by-case.', overdose: 'Relatively low.', specialPops: { elderly: 'Boxed dementia.', pgx: 'CYP2D6/3A4.' },
      switching: 'Single agent; avoid stacking antipsychotics.', counseling: 'Target symptom + agreed review; not a cure for BPD; time-limited.',
      comparativeEfficacy: { note: 'Best-supported SGA (Nickel 2006); modest, symptom-targeted.', stat: NEEDS },
      src: [S('NICE_BPD'), S('NICKEL2006'), S('COCHRANE_BPD'), S('SMPC')], verified: false },
    { id: 'topiramate', drug: 'Topiramate', class: 'anticonvulsant', grade: 'B',
      trade: { generic: 'topiramate', egypt: NEEDS },
      mechanism: 'Multiple (Na channel / GABA / glutamate). Targets impulsivity / anger; also weight-neutral-to-loss.',
      dosing: { start: 'low, titrate slowly', titration: 'slow (cognitive AEs)', target: 'symptom-targeted', max: 'per tolerability', forms: 'tablet.' },
      onset: 'Weeks.', halfLife: '~21 h.', withdrawal: { risk: 'moderate', note: 'Taper (seizure threshold).' },
      ae: { common: 'cognitive slowing / word-finding, paraesthesia, weight loss.', distinctive: 'renal stones; metabolic acidosis; TERATOGEN (cleft palate).' },
      monitoring: { baseline: 'Renal; pregnancy.', ongoing: 'Cognition; hydration/stones; weight.' },
      contraindications: { absolute: 'Pregnancy (relative—teratogen).', relative: 'Nephrolithiasis history, cognitively demanding roles.', boxed: '—' },
      pregnancyLactation: 'Avoid in pregnancy (teratogen).', overdose: 'Variable.', specialPops: { elderly: 'Cognition/renal.', pgx: '—' },
      switching: 'Single agent.', counseling: 'Slow titration for cognition; hydrate; contraception if childbearing potential.',
      comparativeEfficacy: { note: 'Impulsivity/anger signal; symptom-targeted.', stat: NEEDS },
      src: [S('NICE_BPD'), S('COCHRANE_BPD'), S('SMPC')], verified: false },
    { id: 'valproate', drug: 'Valproate / Divalproex', class: 'mood stabiliser / anticonvulsant', grade: 'C',
      trade: { generic: 'valproate/divalproex', egypt: NEEDS },
      mechanism: 'GABAergic; targets affective dysregulation / impulsivity. Weak BPD-specific evidence (Grade C).',
      dosing: { start: 'per level/tolerability', titration: 'gradual', target: 'symptom-targeted', max: 'by level/tolerability', forms: 'tablet/ER.' },
      onset: 'Weeks.', halfLife: '~9–16 h.', withdrawal: { risk: 'moderate', note: 'Taper.' },
      ae: { common: 'weight gain, tremor, GI, hair loss.', distinctive: 'HEPATOTOXICITY; thrombocytopenia; pancreatitis; HIGHLY TERATOGENIC (neural-tube + neurodevelopmental).' },
      monitoring: { baseline: 'LFTs, CBC/platelets, PREGNANCY TEST.', ongoing: 'LFTs, CBC, levels, weight.' },
      contraindications: { absolute: 'Pregnancy / women of childbearing potential without strict pregnancy-prevention; hepatic disease.', relative: 'Obesity, bleeding.', boxed: 'Hepatotoxicity; teratogenicity; pancreatitis.' },
      pregnancyLactation: 'AVOID — major teratogen + neurodevelopmental harm; do not use in childbearing-potential women unless unavoidable with prevention programme.',
      overdose: 'CNS depression; hepatotoxicity.', specialPops: { elderly: 'Lower dose.', pgx: '—' },
      switching: 'Single agent; avoid polypharmacy.', counseling: 'Strict contraception; hepatic/haematologic monitoring; not a BPD cure.',
      comparativeEfficacy: { note: 'Weak BPD-specific evidence; teratogenicity major limit.', stat: NEEDS },
      src: [S('NICE_BPD'), S('COCHRANE_BPD'), S('FDA_VALP'), S('SMPC')], verified: false },
    { id: 'omega3', drug: 'Omega-3 (EPA-dominant)', class: 'nutraceutical', grade: 'B',
      trade: { generic: 'EPA-dominant fish oil', egypt: NEEDS },
      mechanism: 'Anti-inflammatory/membrane effects; modest signal for affective instability / impulsivity; favourable safety.',
      dosing: { start: 'EPA-dominant', titration: '—', target: 'EPA-dominant (per trials)', max: '—', forms: 'capsule.' },
      onset: 'Weeks.', halfLife: 'n/a.', withdrawal: { risk: 'none', note: '—' },
      ae: { common: 'GI/fishy reflux.', distinctive: 'high-dose bleeding risk.' },
      monitoring: { baseline: '—', ongoing: 'bleeding if anticoagulated.' },
      contraindications: { absolute: '—', relative: 'Anticoagulation (high dose).', boxed: '—' },
      pregnancyLactation: 'Generally acceptable.', overdose: 'Low risk.', specialPops: { elderly: 'Ok.', pgx: '—' },
      switching: 'Adjunct.', counseling: 'Adjunct with favourable safety; EPA-dominant.',
      comparativeEfficacy: { note: 'Modest signal, good tolerability.', stat: NEEDS },
      src: [S('NICE_BPD'), S('COCHRANE_BPD')], verified: false },
  ],
  excluded: [
    { item: 'Lamotrigine for core BPD', why: 'LABILE RCT (Crawford 2018, n=276) found NO benefit; NICE does not recommend.', src: [S('LABILE2018'), S('NICE_BPD')], verified: false },
    { item: 'Benzodiazepines', why: 'Disinhibition, dependence, overdose risk in self-harm; avoid.', src: [S('NICE_BPD')], verified: false },
    { item: 'Olanzapine', why: 'Metabolic burden; weak/inconsistent BPD evidence.', src: [S('COCHRANE_BPD')], verified: false },
    { item: 'SSRIs as monotherapy for core BPD', why: 'No core-BPD efficacy (use only for a comorbid disorder).', src: [S('NICE_BPD')], verified: false },
    { item: 'Polypharmacy', why: 'Not supported; NICE advises a single time-limited agent.', src: [S('NICE_BPD')], verified: false },
  ],
  labs: {
    required: [
      { test: 'LFTs + CBC/platelets + pregnancy test', why: 'Mandatory before valproate (hepatotoxicity, thrombocytopenia, teratogen).', when: 'before valproate', src: [S('FDA_VALP')], verified: false },
      { test: 'Renal function + pregnancy', why: 'Topiramate stones/acidosis; teratogen.', when: 'before topiramate', src: [S('SMPC')], verified: false },
      { test: 'Metabolic baseline', why: 'Before any antipsychotic adjunct.', when: 'before SGA', src: [S('SMPC')], verified: false },
    ],
    recommended: [
      { test: 'Comorbidity screen (MDD, bipolar, PTSD, substance, ED)', why: 'Drugs target comorbidity/crisis, not core BPD.', when: 'baseline', src: [S('NICE_BPD')], verified: false },
    ],
    optional: [
      { test: 'TSH / ferritin / B12', why: 'Reversible contributors to mood/energy.', when: 'if indicated', src: [S('NICE_BPD')], verified: false },
    ],
  },
  switchingStrategies: { text: 'Use a SINGLE agent at a time, targeted at a defined symptom, with an agreed review date; discontinue if ineffective rather than adding another drug. Avoid polypharmacy and antipsychotic stacking.', src: [S('NICE_BPD')], verified: false },
  withdrawalVsRelapse: { text: 'BPD affective instability is rapid and reactive — distinguish it from antidepressant/medication withdrawal and from a comorbid mood-disorder relapse. Time-limited trials mean planned discontinuation is expected; review effect against the agreed target symptom, not global mood.', src: [S('NICE_BPD'), S('MAUDSLEY_DP')], verified: false },
  hyperbolicTaper: { text: 'For any antidepressant used for a comorbidity, taper hyperbolically as in MDD/GAD. For symptom-targeted adjuncts, taper and STOP if the target symptom has not improved.', src: [S('HOROWITZ19'), S('NICE_BPD')], verified: false },
  treatmentPhases: { text: 'Psychotherapy (DBT etc.) is the long-term core. Medication = short, time-limited, symptom-targeted trials with explicit review and discontinuation. Short-term sedative in crisis only (≤1 week per NICE). Do not use drugs as primary therapy.', src: [S('NICE_BPD')], verified: false },
  specifierTargeting: { text: 'Three symptom domains guide adjunct choice: (1) affective dysregulation / mood lability / anger → aripiprazole, topiramate, omega-3; (2) impulsivity / self-harm → topiramate (and psychotherapy); (3) cognitive-perceptual (transient quasi-psychotic) → low-dose aripiprazole. Always adjunct to psychotherapy, time-limited.', src: [S('NICE_BPD'), S('NICKEL2006'), S('COCHRANE_BPD')], verified: false },
  monitoringTimeline: { text: 'Agree the target symptom, expected timeframe, and review date BEFORE prescribing. Review effect at the agreed point; if no benefit on the target symptom → taper and stop (do not add another drug). Keep psychotherapy central and continuous.', src: [S('NICE_BPD')], verified: false },
  comorbidityModifiers: [
    { ifComorbid: 'pregnancy | childbearing potential', action: 'avoid', target: 'valproate (and topiramate)', rule: 'Valproate major teratogen/neurodevelopmental harm; topiramate teratogen — avoid; ensure contraception.', src: [S('FDA_VALP'), S('SMPC')], verified: false },
    { ifComorbid: 'bipolar', action: 'distinguish/treat', target: 'mood stabiliser', rule: 'Separate bipolar mood episodes from BPD affective instability; treat bipolar protocol with a mood stabiliser.', src: [S('CANMAT_BD')], verified: false },
    { ifComorbid: 'MDD', action: 'treat comorbidity', target: 'SSRI for the depression (not core BPD)', rule: 'Use an antidepressant for the comorbid depression, not to treat BPD itself.', src: [S('NICE_BPD')], verified: false },
    { ifComorbid: 'substance use disorder', action: 'avoid', target: 'benzodiazepines', rule: 'Avoid — disinhibition/dependence/overdose risk.', src: [S('NICE_BPD')], verified: false },
    { ifComorbid: 'PTSD', action: 'prefer', target: 'DBT-PE / trauma-focused therapy', rule: 'Integrate trauma-focused psychotherapy.', src: [S('NICE_BPD')], verified: false },
  ],
  crossCoverage: [
    { comorbid: 'bipolar', agent: 'mood stabiliser / SGA', note: 'Treats bipolar; may also help BPD impulsivity/affect.', src: [S('CANMAT_BD')], verified: false },
    { comorbid: 'MDD', agent: 'SSRI (for the depression)', note: 'Antidepressant for comorbid depression only.', src: [S('NICE_BPD')], verified: false },
  ],
};

/* ════════════════════════════════════════════════════════════════════════
   PMDD — Premenstrual Dysphoric Disorder (ACOG CPG No.7, 2023)
   ════════════════════════════════════════════════════════════════════════ */
const PMDD = {
  label: 'Premenstrual Dysphoric Disorder (PMDD)',
  dxNote: 'Confirm with PROSPECTIVE daily symptom charting over ≥2 cycles (symptoms luteal-bound, remit after menses). SSRIs work for PMDD with a UNIQUE option: continuous OR luteal-phase-only dosing (fast onset in PMDD).',
  firstLine: [
    { id: 'sertraline', drug: 'Sertraline', class: 'SSRI', trade: { generic: 'sertraline', egypt: NEEDS }, grade: 'A',
      mechanism: 'SERT inhibition; rapid anti-PMDD effect allows luteal dosing.',
      dosing: { start: '50 mg/day', titration: '→100 mg', target: '50–100 mg/day — CONTINUOUS or LUTEAL (from ovulation/symptom onset to menses)', max: '100 mg/day (PMDD)', forms: 'tablet, concentrate.' },
      onset: 'Days (PMDD) — enables luteal-only dosing.', halfLife: '~26 h.',
      withdrawal: { risk: 'moderate', note: 'Luteal dosing: less withdrawal but watch; taper if continuous.' },
      ae: { common: 'nausea, diarrhoea, sexual dysfunction.', distinctive: 'GI prominent.' },
      monitoring: { baseline: 'Confirm prospective charting.', ongoing: 'Symptom diary; suicidality.' },
      contraindications: { absolute: 'MAOI 14 d; pimozide.', relative: 'Bleeding.', boxed: 'Suicidality <25 y.' },
      pregnancyLactation: 'Often preferred SSRI if needed in pregnancy.', chronicDisease: { hepatic: 'Reduce.', bleeding: 'Class.' },
      overdose: 'Relatively safe.', specialPops: { elderly: 'n/a (reproductive age).', peds: 'Adolescents specialist.', pgx: 'CYP2C19/2B6.' },
      switching: 'Continuous vs luteal per pattern/comorbidity.', counseling: 'Can dose only in luteal phase; rapid PMDD onset; diary.',
      comparativeEfficacy: { note: 'First-line SSRI for PMDD (ACOG).', stat: NEEDS },
      src: [S('ACOG_PMDD'), S('FDA_SSRI_BBW'), S('SMPC')], verified: false },
    { id: 'escitalopram', drug: 'Escitalopram', class: 'SSRI', trade: { generic: 'escitalopram', egypt: NEEDS }, grade: 'A',
      mechanism: 'Selective SERT inhibition.',
      dosing: { start: '10 mg/day', titration: '→20 mg', target: '10–20 mg/day — continuous or luteal', max: '20 mg/day', forms: 'tablet, solution.' },
      onset: 'Days (PMDD).', halfLife: '~27–32 h.', withdrawal: { risk: 'moderate', note: 'Taper if continuous.' },
      ae: { common: 'nausea, sexual dysfunction.', distinctive: 'QTc at 20 mg.' },
      monitoring: { baseline: 'Prospective charting.', ongoing: 'Diary; suicidality.' },
      contraindications: { absolute: 'MAOI 14 d; pimozide.', relative: 'Long-QT.', boxed: 'Suicidality <25 y.' },
      pregnancyLactation: 'Case-by-case.', chronicDisease: { cardiac: 'QTc 20 mg.', hepatic: 'Max 10.', bleeding: 'Class.' },
      overdose: 'Relatively safe.', specialPops: { peds: 'Specialist.', pgx: 'CYP2C19 (CPIC).' },
      switching: 'Continuous/luteal per pattern.', counseling: 'Luteal option; diary.',
      comparativeEfficacy: { note: 'First-line SSRI (ACOG).', stat: NEEDS },
      src: [S('ACOG_PMDD'), S('CPIC_SSRI'), S('SMPC')], verified: false },
    { id: 'fluoxetine', drug: 'Fluoxetine', class: 'SSRI', trade: { generic: 'fluoxetine', egypt: NEEDS }, grade: 'A',
      mechanism: 'SERT inhibition; long half-life smooths luteal use.',
      dosing: { start: '20 mg/day', titration: '—', target: '20 mg/day — continuous or luteal', max: '20 mg/day (PMDD)', forms: 'capsule, liquid.' },
      onset: 'Days (PMDD).', halfLife: '~4–6 days — long.', withdrawal: { risk: 'low', note: 'Long t½ → minimal withdrawal (good for luteal).' },
      ae: { common: 'insomnia, activation, sexual dysfunction.', distinctive: 'most activating; long t½.' },
      monitoring: { baseline: 'Prospective charting.', ongoing: 'Diary; suicidality.' },
      contraindications: { absolute: 'MAOI (5-wk washout); pimozide.', relative: 'Bleeding.', boxed: 'Suicidality <25 y.' },
      pregnancyLactation: 'Case-by-case.', chronicDisease: { hepatic: 'Reduce.', bleeding: 'Class.' },
      overdose: 'Relatively safe.', specialPops: { peds: 'Specialist.', pgx: 'CYP2D6 inhibitor + substrate.' },
      switching: 'Long washout before MAOI.', counseling: 'Luteal-friendly (long t½); activating.',
      comparativeEfficacy: { note: 'First-line SSRI (ACOG).', stat: NEEDS },
      src: [S('ACOG_PMDD'), S('SMPC')], verified: false },
    { id: 'paroxetine_cr', drug: 'Paroxetine CR', class: 'SSRI', trade: { generic: 'paroxetine CR', egypt: NEEDS }, grade: 'A',
      mechanism: 'Potent SERT inhibition; FDA PMDD indication (CR).',
      dosing: { start: '12.5 mg/day', titration: '→25 mg', target: '12.5–25 mg/day — continuous or luteal', max: '25 mg/day (PMDD)', forms: 'CR tablet.' },
      onset: 'Days (PMDD).', halfLife: '~21 h.', withdrawal: { risk: 'high', note: 'Short t½ + anticholinergic → withdrawal; luteal use mitigates but counsel; avoid if pregnancy planned.' },
      ae: { common: 'sedation, weight gain, sexual dysfunction.', distinctive: 'most withdrawal among these; avoid in pregnancy.' },
      monitoring: { baseline: 'Prospective charting; pregnancy plans.', ongoing: 'Diary; withdrawal on changes.' },
      contraindications: { absolute: 'MAOI 14 d; thioridazine/pimozide.', relative: 'Pregnancy (cardiac signal); bleeding.', boxed: 'Suicidality <25 y.' },
      pregnancyLactation: 'Avoid in pregnancy (first-trimester cardiac signal).', chronicDisease: { hepatic: 'Reduce.', renal: 'Reduce.', bleeding: 'Class.' },
      overdose: 'Relatively safe.', specialPops: { peds: 'Avoid.', pgx: 'Strong CYP2D6 inhibitor + substrate.' },
      switching: 'Careful taper (withdrawal); MAOI 14-d.', counseling: 'Avoid if planning pregnancy; withdrawal-prone.',
      comparativeEfficacy: { note: 'FDA-indicated (CR) for PMDD.', stat: NEEDS },
      src: [S('ACOG_PMDD'), S('SMPC')], verified: false },
  ],
  adjunct: [
    { id: 'drospirenone_coc', drug: 'Drospirenone/EE COC', class: 'combined oral contraceptive', grade: 'A',
      trade: { generic: 'drospirenone 3 mg / EE 20 µg (24/4)', egypt: NEEDS },
      mechanism: 'Ovulation suppression; drospirenone (anti-mineralocorticoid/anti-androgen). FDA-approved for PMDD; 24/4 regimen.',
      dosing: { start: '24/4 regimen', titration: '—', target: '24 active / 4 inactive days', max: '—', forms: 'oral tablet pack.' },
      onset: 'Over cycles.', halfLife: 'n/a.', withdrawal: { risk: 'n/a', note: 'Hormonal — cyclic.' },
      ae: { common: 'breast tenderness, nausea, breakthrough bleeding.', distinctive: 'VTE risk; hyperkalaemia (drospirenone) with K-sparing agents.' },
      monitoring: { baseline: 'BP; VTE risk; smoking/age; K+ if on ACEi/ARB/K-sparing.', ongoing: 'BP; VTE symptoms.' },
      contraindications: { absolute: 'History of VTE/stroke; migraine WITH AURA; smoker ≥35 y; oestrogen-sensitive cancer; uncontrolled HTN.', relative: 'Hyperkalaemia risk.', boxed: 'Thrombosis/CV risk (oestrogen + smoking/age).' },
      pregnancyLactation: 'Contraindicated in pregnancy; lactation caution.', overdose: 'n/a.', specialPops: { adolescents: 'After menarche; counsel.', pgx: '—' },
      switching: 'Hormonal alternative/adjunct to SSRI.', counseling: 'VTE/migraine-aura screening; not if smoker ≥35.',
      comparativeEfficacy: { note: 'FDA-approved hormonal option for PMDD.', stat: NEEDS },
      src: [S('ACOG_PMDD'), S('SMPC')], verified: false },
    { id: 'gnrh_addback', drug: 'GnRH agonist + add-back', class: 'GnRH agonist', grade: 'B',
      trade: { generic: 'leuprolide + add-back HRT', egypt: NEEDS },
      mechanism: 'Medical ovarian suppression for SEVERE/REFRACTORY PMDD; add-back oestrogen/progestogen to protect bone/symptoms.',
      dosing: { start: 'specialist', titration: '—', target: 'with add-back HRT', max: '—', forms: 'depot injection.' },
      onset: 'Weeks.', halfLife: 'depot.', withdrawal: { risk: 'n/a', note: '—' },
      ae: { common: 'menopausal symptoms (flushing).', distinctive: 'BONE DENSITY LOSS — needs add-back + DXA if prolonged.' },
      monitoring: { baseline: 'Bone density consideration.', ongoing: 'Bone health; menopausal symptoms.' },
      contraindications: { absolute: 'Pregnancy.', relative: 'Osteoporosis risk.', boxed: '—' },
      pregnancyLactation: 'Contraindicated in pregnancy.', overdose: 'n/a.', specialPops: { pgx: '—' },
      switching: 'Specialist; reserved.', counseling: 'Severe/refractory only; bone protection with add-back.',
      comparativeEfficacy: { note: 'Reserved severe/refractory (ACOG).', stat: NEEDS },
      src: [S('ACOG_PMDD'), S('SMPC')], verified: false },
  ],
  excluded: [
    { item: 'Progesterone monotherapy', why: 'No consistent benefit over placebo for PMDD.', src: [S('ACOG_PMDD')], verified: false },
  ],
  labs: {
    required: [
      { test: 'Prospective daily symptom charting ≥2 cycles', why: 'Required to CONFIRM PMDD (luteal-bound) before treatment.', when: 'before diagnosis/treatment', src: [S('ACOG_PMDD')], verified: false },
      { test: 'BP + VTE/migraine-aura/smoking screen', why: 'Mandatory before drospirenone COC.', when: 'before COC', src: [S('SMPC')], verified: false },
    ],
    recommended: [
      { test: 'TSH', why: 'Exclude thyroid mimicking mood symptoms.', when: 'work-up', src: [S('ACOG_PMDD')], verified: false },
      { test: 'Serum K+ (if on ACEi/ARB/K-sparing)', why: 'Drospirenone hyperkalaemia interaction.', when: 'before/with COC + those agents', src: [S('SMPC')], verified: false },
    ],
    optional: [
      { test: 'Ferritin / vitamin D / calcium-magnesium status', why: 'Premenstrual symptom contributors / supplement planning.', when: 'nutritional review', src: [S('ACOG_PMDD')], verified: false },
      { test: 'Bone density (DXA)', why: 'If prolonged GnRH agonist therapy.', when: 'with GnRH', src: [S('SMPC')], verified: false },
    ],
  },
  switchingStrategies: { text: 'SSRI continuous ↔ luteal-only depending on pattern and comorbidity (continuous if comorbid MDD/GAD). If one SSRI fails, switch to another; then consider hormonal (drospirenone COC) or, if severe/refractory, GnRH agonist + add-back.', src: [S('ACOG_PMDD')], verified: false },
  withdrawalVsRelapse: { text: 'Luteal-only SSRI use means symptoms recur each late-luteal phase by design (NOT relapse) and remit with menses. Distinguish predictable cyclic recurrence from genuine non-response and from discontinuation symptoms (more likely with short-half-life paroxetine; minimal with fluoxetine).', src: [S('ACOG_PMDD'), S('MAUDSLEY_DP')], verified: false },
  hyperbolicTaper: { text: 'Continuous SSRI: taper hyperbolically as in MDD/GAD. Luteal dosing inherently limits exposure; fluoxetine self-tapers via long half-life.', src: [S('HOROWITZ19'), S('MAUDSLEY_DP')], verified: false },
  treatmentPhases: { text: 'Trial across ≥2 cycles to judge response. Continue effective therapy; reassess periodically. Hormonal/GnRH escalation for inadequate SSRI response per severity.', src: [S('ACOG_PMDD')], verified: false },
  specifierTargeting: { text: 'Comorbid MDD/GAD → CONTINUOUS SSRI (covers both); pure luteal symptoms → luteal-only dosing acceptable. Contraception desired or somatic/physical premenstrual symptoms → drospirenone COC. Severe/refractory → GnRH + add-back. Migraine with aura / VTE risk / smoker ≥35 → AVOID oestrogen COC.', src: [S('ACOG_PMDD')], verified: false },
  monitoringTimeline: { text: 'Use the prospective symptom diary as the outcome measure across cycles. Judge SSRI over ≥2 cycles. For luteal dosing, expect symptom control in the treated luteal window; persistent luteal symptoms → continuous dosing or escalate. Monitor BP/VTE on COC.', src: [S('ACOG_PMDD')], verified: false },
  comorbidityModifiers: [
    { ifComorbid: 'MDD | GAD', action: 'prefer', target: 'CONTINUOUS SSRI', rule: 'Continuous (not luteal-only) dosing covers the comorbid mood/anxiety disorder too.', src: [S('ACOG_PMDD')], verified: false },
    { ifComorbid: 'migraine with aura | VTE risk | smoker ≥35', action: 'avoid', target: 'oestrogen-containing COC', rule: 'Stroke/VTE risk — avoid drospirenone/EE; use SSRI ± non-oestrogen options.', src: [S('SMPC')], verified: false },
    { ifComorbid: 'bipolar', action: 'caution', target: 'SSRI', rule: 'Manic-switch caution — mood-stabiliser cover.', src: [S('CANMAT_BD')], verified: false },
    { ifComorbid: 'pregnancy / planning pregnancy', action: 'avoid', target: 'paroxetine; COC; GnRH', rule: 'Avoid paroxetine (cardiac signal) and hormonal agents; reassess need.', src: [S('SMPC')], verified: false },
  ],
  crossCoverage: [
    { comorbid: 'MDD | GAD', agent: 'continuous SSRI (sertraline/escitalopram/fluoxetine)', note: 'One continuous SSRI covers PMDD + comorbid mood/anxiety.', src: [S('ACOG_PMDD')], verified: false },
    { comorbid: 'contraception need', agent: 'drospirenone/EE COC', note: 'Covers PMDD somatic symptoms + contraception (screen VTE).', src: [S('ACOG_PMDD')], verified: false },
  ],
};

export const RX = { GAD, MDD, OCD, BPD, PMDD };

/* ════════════════════════════════════════════════════════════════════════
   THERAPY TECHNIQUES (#7) — SPECIFIC techniques per school, source-based.
   Not "use CBT" but WHICH techniques. verified:false until physician sign-off.
   ════════════════════════════════════════════════════════════════════════ */
export const THERAPY_TECHNIQUES = {
  GAD: [
    { school: 'CBT', priority: 1, grade: 'A',
      techniques: 'Cognitive restructuring of worry/catastrophising; worry postponement ("worry time"); problem-solving training; behavioural experiments testing feared outcomes; interoceptive & in-vivo exposure to uncertainty; reduce reassurance-seeking/avoidance.',
      course: '12–20 sessions; concurrent with pharmacotherapy in severe GAD.', src: [S('NICE_GAD'), S('BAP_ANX')], verified: false },
    { school: 'Applied Relaxation', priority: 2, grade: 'B',
      techniques: 'Progressive muscle relaxation → cue-controlled & rapid relaxation applied in anxiety-provoking situations; targets somatic/autonomic arousal.',
      course: '12–15 sessions.', src: [S('KATZMAN2014')], verified: false },
    { school: 'Mindfulness / MBCT', priority: 3, grade: 'B',
      techniques: 'Present-moment attention, decentering from worry thoughts, body scan.',
      course: 'group programme.', src: [S('KATZMAN2014')], verified: false },
  ],
  MDD: [
    { school: 'CBT', priority: 1, grade: 'A',
      techniques: 'Cognitive restructuring of negative automatic thoughts; behavioural activation (activity scheduling, mastery/pleasure); graded task assignment; relapse-prevention plan.',
      course: '12–20 sessions.', src: [S('CANMAT_MDD')], verified: false },
    { school: 'Behavioural Activation', priority: 1, grade: 'A',
      techniques: 'Activity monitoring + scheduling, values-based activation, avoidance reduction.',
      course: 'first-line, esp. lower complexity.', src: [S('CANMAT_MDD')], verified: false },
    { school: 'IPT', priority: 1, grade: 'A',
      techniques: 'Focus on grief, role transitions, role disputes, interpersonal deficits.',
      course: '12–16 sessions.', src: [S('CANMAT_MDD')], verified: false },
  ],
  OCD: [
    { school: 'ERP (Exposure & Response Prevention)', priority: 1, grade: 'A',
      techniques: 'Build a fear/trigger hierarchy; graded in-vivo + imaginal exposure to obsessional triggers WITH response (ritual/compulsion) prevention; eliminate reassurance & covert neutralising; homework between sessions. ERP is the core, evidence-based OCD psychotherapy.',
      course: 'CORNERSTONE; pair with high-dose SSRI.', src: [S('APA_OCD')], verified: false },
    { school: 'Cognitive therapy (OCD-specific)', priority: 2, grade: 'B',
      techniques: 'Address inflated responsibility, thought-action fusion, overestimation of threat; behavioural experiments.',
      course: 'adjunct to ERP.', src: [S('APA_OCD')], verified: false },
  ],
  BPD: [
    { school: 'DBT', priority: 1, grade: 'A',
      techniques: 'Four skills modules — mindfulness, distress tolerance (TIPP, radical acceptance), emotion regulation (opposite action, check the facts), interpersonal effectiveness (DEAR MAN); individual therapy + skills group + phone coaching + diary cards; chain analysis of target behaviours.',
      course: 'Cornerstone structured psychotherapy for BPD.', src: [S('NICE_BPD')], verified: false },
    { school: 'MBT (Mentalization-Based)', priority: 1, grade: 'B',
      techniques: 'Strengthen mentalizing (understanding mental states of self/other) under attachment stress; stance of curiosity/not-knowing.',
      course: 'structured programme.', src: [S('NICE_BPD')], verified: false },
    { school: 'Schema / TFP', priority: 2, grade: 'B',
      techniques: 'Schema mode work / transference-focused techniques targeting identity & relational patterns.',
      course: 'specialist.', src: [S('NICE_BPD')], verified: false },
  ],
  PMDD: [
    { school: 'CBT (PMDD-adapted)', priority: 1, grade: 'B',
      techniques: 'Psychoeducation + symptom charting; cognitive restructuring of premenstrual cognitions; coping-skills & relaxation timed to the luteal phase; behavioural scheduling around the cycle.',
      course: 'adjunct/alternative to SSRI.', src: [S('ACOG_PMDD')], verified: false },
    { school: 'Lifestyle / self-management', priority: 2, grade: 'C',
      techniques: 'Aerobic exercise, sleep regularity, reduced caffeine/alcohol in luteal phase, stress management.',
      course: 'supportive.', src: [S('ACOG_PMDD')], verified: false },
  ],
};

/* ════════════════════════════════════════════════════════════════════════
   PSYCHOTHERAPY_PLAN — staged INTEGRATIVE plan (phases · techniques-by-school ·
   measurement · non-response review · alternatives). Deterministic, source-anchored.
   BPD is the reviewed TEMPLATE; MDD/GAD/OCD/PMDD replicate this exact shape.
   Schools: DBT · MBT · Schema · TFP · GPM · EMDR · CBT/ERP/ACT (woven by presentation).
   ════════════════════════════════════════════════════════════════════════ */
export const PSYCHOTHERAPY_ACTIVE = true;

export const PSYCHOTHERAPY_PLAN = {
  BPD: {
    model:
      'Stage-based integrative plan on a DBT staging spine (Linehan) with a GPM generalist backbone. MBT / Schema / TFP techniques woven in by presentation; EMDR reserved for comorbid trauma AFTER behavioural control. Psychotherapy is first-line; medication is symptom-targeted and adjunct only.',
    coreMeasures: [
      { tool: 'BSL-23', kind: 'self-report (past week)', cadence: 'baseline + every 4 wk / at each phase boundary',
        interpret: 'mean 0–4 (or sum 0–92); mean ≥1.50 = BPD-range; sensitive to change — track the downward trend, not a single value.', src: [S('BSL23')], verified: false },
      { tool: 'ZAN-BPD', kind: 'clinician-rated (9 DSM items)', cadence: 'baseline + every 8–12 wk',
        interpret: '0–36; a clinically significant change ≈ 6–8 points.', src: [S('ZANBPD')], verified: false },
      { tool: 'NSSI / suicidality frequency (DBT diary card)', kind: 'behavioural log', cadence: 'weekly',
        interpret: 'PRIMARY Stage-1 target — frequency & intensity must trend down before advancing.', src: [S('LINEHAN_DBT')], verified: false },
      { tool: 'PHQ-9', kind: 'self-report', cadence: 'baseline + biweekly',
        interpret: 'tracks comorbid depression; do NOT mistake BPD affective lability for MDD.', src: [S('BSL23')], verified: false },
    ],
    phases: [
      { phase: 0, name: 'Pretreatment — commitment & framing (GPM + DBT)', duration: '1–4 sessions',
        goals: 'Diagnostic disclosure + psychoeducation (medicalise the disorder); interpersonal-hypersensitivity formulation; agree targets & hierarchy; crisis/safety plan; set realistic expectations of the improvement course.',
        techniques: [
          { school: 'GPM', name: 'psychoeducation + medicalising the diagnosis', how: 'Frame BPD as treatable with a known improvement trajectory; organise around interpersonal hypersensitivity; involve family where useful.', src: [S('GUNDERSON_GPM')] },
          { school: 'DBT', name: 'commitment strategies + target hierarchy + diary card', how: 'Orient to the frame; build the personalised behavioural-target hierarchy; begin diary-card self-monitoring.', src: [S('LINEHAN_DBT')] },
        ],
        phaseTarget: 'Patient understands the diagnosis, is oriented to the frame, has a safety plan, and has started self-monitoring.' },
      { phase: 1, name: 'Behavioural control & safety (DBT Stage 1)', duration: 'typically ≥ 6–12 months',
        goals: 'Reduce IN STRICT ORDER: (1) life-threatening behaviours (suicide, NSSI); (2) therapy-interfering behaviours; (3) quality-of-life-interfering behaviours; (4) acquire skills.',
        techniques: [
          { school: 'DBT', name: 'four skills modules', how: 'Mindfulness; distress tolerance (TIPP, radical acceptance); emotion regulation (opposite action, check-the-facts, PLEASE); interpersonal effectiveness (DEAR MAN).', src: [S('LINEHAN_DBT')] },
          { school: 'DBT', name: 'chain & solution analysis', how: 'Behavioural chain analysis of each target behaviour → insert skilful alternatives.', src: [S('LINEHAN_DBT')] },
          { school: 'DBT', name: 'inter-session (phone) coaching', how: 'Generalise skills to real crises in vivo.', src: [S('LINEHAN_DBT')] },
          { school: 'GPM', name: 'suicidality / self-harm management', how: 'Distinguish chronic from acute-on-chronic risk; avoid reflexive hospitalisation; keep the patient active in their own life.', src: [S('GUNDERSON_GPM')] },
          { school: 'Vagal', name: 'bottom-up arousal down-regulation', how: 'Slow-paced (~6/min) breathing + TIPP temperature as distress-tolerance adjuncts (see VAGAL_TONING).', src: [S('HRVB')] },
        ],
        phaseTarget: 'NSSI/suicidal behaviour clearly trending down; core skills in use; attendance stable. DO NOT advance to trauma work until behavioural control is achieved.' },
      { phase: 2, name: 'Emotional processing & trauma (DBT Stage 2 · EMDR if indicated)', duration: 'variable',
        goals: 'Move from "quiet desperation" to full emotional experiencing; process trauma/invalidation ONLY after Stage-1 control.',
        techniques: [
          { school: 'DBT', name: 'exposure-based emotion processing', how: 'Reduce avoidance of primary emotions; address shame and traumatic invalidation.', src: [S('LINEHAN_DBT')] },
          { school: 'MBT', name: 'mentalizing under attachment stress', how: 'Not-knowing/curious stance; restore mentalizing when high arousal collapses it.', src: [S('BATEMAN_MBT')] },
          { school: 'EMDR', name: '8-phase reprocessing (comorbid PTSD/trauma)', how: 'ONLY with adequate stabilisation (extended Phase-2 preparation) and reliable dual attention; hold while active dissociation or behavioural dyscontrol persists. Strong evidence in PTSD; adjunct-for-trauma in BPD.', src: [S('SHAPIRO_EMDR')] },
        ],
        phaseTarget: 'Trauma-linked triggers lose charge; affect tolerated without dyscontrol; dissociation reduced.' },
      { phase: 3, name: 'Identity, relationships & building a life (DBT Stage 3 · Schema/TFP · GPM)', duration: 'variable',
        goals: 'Self-respect, more stable identity, ordinary problem-solving, vocational/relational functioning.',
        techniques: [
          { school: 'Schema', name: 'mode work', how: 'Target modes — vulnerable/abandoned child, angry-impulsive child, punitive/demanding parent, detached protector → strengthen the Healthy Adult via limited reparenting.', src: [S('YOUNG_SCHEMA')] },
          { school: 'TFP', name: 'transference-focused clarification', how: 'Work identity diffusion and split self/other representations in the here-and-now therapeutic relationship.', src: [S('CLARKIN_TFP')] },
          { school: 'GPM', name: '"build a life" / social adaptation', how: 'Prioritise work/structure over a patient identity; a getting-a-life agenda.', src: [S('GUNDERSON_GPM')] },
        ],
        phaseTarget: 'Improved role functioning; more stable identity & relationships; reduced reliance on crisis services.' },
    ],
    nonResponse: {
      reviewAt: 'Stage 1: reassess ~12 wk if NSSI/suicidality is not trending down. Overall: a formal review at every phase boundary.',
      checklist: [
        'Diary-card adherence & homework completion',
        'Correct target hierarchy — is a higher-priority behaviour being skipped?',
        'Therapeutic alliance & therapy-interfering behaviours (both patient and therapist)',
        'Missed comorbidity — PTSD, substance use, eating disorder, ADHD, bipolar',
        'Dose of therapy — are individual + skills group + coaching all present?',
        'Iatrogenic sedation / polypharmacy masking progress (esp. benzodiazepines)',
        'Diagnostic accuracy — BPD vs bipolar vs complex-PTSD',
      ],
      alternatives: [
        { ifX: 'Cannot sustain full DBT intensity / limited access', switchTo: 'GPM generalist model (once-weekly) — near-equivalent outcomes, easier to deliver.', src: [S('GUNDERSON_GPM')] },
        { ifX: 'Predominant mentalizing collapse / attachment-driven crises', switchTo: 'MBT programme.', src: [S('BATEMAN_MBT')] },
        { ifX: 'Entrenched identity/relational schemas persist after behavioural control', switchTo: 'Schema Therapy or TFP.', src: [S('YOUNG_SCHEMA'), S('CLARKIN_TFP')] },
        { ifX: 'Dominant comorbid PTSD once stabilised', switchTo: 'Add EMDR / trauma-focused module (Stage 2).', src: [S('SHAPIRO_EMDR')] },
      ],
    },
    crossSchool: [
      'Mindfulness — shared by DBT, MBT, Schema (grounding) and ACT.',
      'Distress tolerance / crisis-survival — DBT TIPP overlaps vagal down-regulation.',
      'Chain / functional analysis — DBT ↔ CBT.',
      'Validation — DBT ↔ GPM ↔ MBT relational stance.',
      'Exposure principle — DBT Stage-2 emotion exposure ↔ EMDR reprocessing ↔ ERP logic.',
    ],
  },
};

/* ════════════════════════════════════════════════════════════════════════
   VAGAL_TONING — global adjunct module (bottom-up autonomic regulation).
   Honest evidence: HRVB / slow-paced breathing = Level B; other maneuvers = Level C.
   ════════════════════════════════════════════════════════════════════════ */
export const VAGAL_TONING = {
  rationale:
    'Raise cardiac vagal tone & baroreflex sensitivity to widen the window of tolerance and support top-down therapy (neurovisceral-integration model). Adjunct — never a stand-alone treatment.',
  evidence:
    'Slow-paced / resonance-frequency breathing & HRV biofeedback: meta-analytic benefit for stress/anxiety (Goessl 2017) and depression (Pizzoli 2021); effect present even without a biofeedback device (Laborde 2022) — Level B. Other maneuvers are physiologically plausible with limited outcome data — Level C.',
  techniques: [
    { name: 'Resonance-frequency / slow-paced breathing', grade: 'B', how: '~6 breaths/min (individual resonance ~4.5–7 bpm ≈ 0.1 Hz); inhale ~4 s / exhale ~6 s; exhale longer than inhale; 10–20 min daily.', src: [S('HRVB')] },
    { name: 'HRV biofeedback', grade: 'B', how: 'Same breathing with an HRV display/app to find and train the personal resonance frequency over weeks.', src: [S('HRVB')] },
    { name: 'Extended-exhale / physiological sigh', grade: 'C', how: 'Double inhale then a long slow exhale; rapid acute down-regulation for arousal spikes.', src: [S('HRVB')] },
    { name: 'Humming / chanting / gargling', grade: 'C', how: 'Laryngeal–pharyngeal vagal activation via a prolonged voiced exhale.', src: [S('HRVB')] },
    { name: 'Cold exposure (diving reflex)', grade: 'C', how: 'Cold water on the face / brief cold → parasympathetic surge; overlaps DBT TIPP. Caution with cardiac disease.', src: [S('HRVB')] },
  ],
  integratesWith: 'Slots into DBT distress-tolerance (TIPP), ACT/mindfulness, applied relaxation, and Stage-1 arousal regulation.',
  cautions: 'Avoid over-breathing (can trigger vagal withdrawal); cold-exposure caution with cardiac disease; adjunct only — does not replace evidence-based psychotherapy.',
};

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
  ['comorbidityModifiers','crossCoverage'].forEach((k) => (d[k] || []).forEach((m) => scan(k, m)));
  ['switchingStrategies','withdrawalVsRelapse','hyperbolicTaper','treatmentPhases','specifierTargeting','monitoringTimeline'].forEach((k) => scan(k, d[k]));
  return flags;
}
