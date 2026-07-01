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

export const RX_VERSION = 'v0.4-DRAFT (2026-07-02) — BPD benefit/strength layer sourced (Cochrane 2022 CD012956 + BJP 2024 secondary analysis + Karaszewska 2021, GRADE-rated); other disorders pending physician sign-off';
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
  DRSP:        'Endicott J, Nee J, Harrison W. Daily Record of Severity of Problems (DRSP): reliability & validity. Arch Womens Ment Health 2006;9:41-9 (prospective daily rating over ≥2 cycles; luteal vs follicular cyclicity confirms PMDD).',
  PMDD_SSRI:   'PMDD pharmacotherapy — SSRIs (continuous, luteal-phase-only, or symptom-onset dosing) are first-line/gold-standard with rapid low-dose response (scoping review Focus 2023; Cochrane; FDA-approved fluoxetine/sertraline/paroxetine-CR). CBT evidence is modest/inconsistent — adjunct or by preference.',
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
  KOMORI2018:  'Komori T. The relaxation effect of prolonged expiratory breathing. Ment Illn 2018;10(1):7669.',
  GHATI2021:   'Ghati N et al. RCT of bee-humming (Bhramari) breathing on BP & HRV in essential hypertension. EXPLORE 2021;17(4):312-319.',
  VANDEKAMP2019:'van de Kamp MM et al. Body- & movement-oriented interventions for PTSD: systematic review & meta-analysis. J Trauma Stress 2019;32(6):967-976.',
  DREISOERNER2021:'Dreisoerner A et al. Self-soothing touch and being hugged reduce cortisol responses to stress: RCT. Compr Psychoneuroendocrinol 2021;8:100091.',
  LEVENSON1990:'Levenson RW, Ekman P, Friesen WV. Voluntary facial action generates emotion-specific ANS activity. Psychophysiology 1990;27(4):363-384.',
  JINDANI2015: 'Jindani F et al. A yoga intervention for PTSD: a preliminary RCT. Evid Based Complement Alternat Med 2015;351746.',
  BECK_CBT:    'Beck JS. Cognitive Behavior Therapy: Basics and Beyond, 3rd ed. Guilford 2020.',
  HAYES_ACT:   'Hayes SC, Strosahl KD, Wilson KG. Acceptance and Commitment Therapy, 2nd ed. Guilford 2012.',
  HARRIS_ACT:  'Harris R. ACT Made Simple, 2nd ed. New Harbinger 2019 (dropping anchor / ACE).',
  ARNTZ_SCHEMA:'Arntz A, Jacob G. Schema Therapy in Practice. Wiley-Blackwell 2013 (mode & chair work, imagery rescripting).',
  FOA_ERP:     'Foa EB, Yadin E, Lichner TK. Exposure and Response (Ritual) Prevention for OCD, Therapist Guide, 2nd ed. Oxford 2012.',
  NICE_OCD:    'NICE CG31 — obsessive-compulsive disorder & body dysmorphic disorder (2005; 2019 surveillance). Stepped care; CBT incl. ERP first-line; add SSRI for inadequate response/severe.',
  YBOCS:       'Goodman WK et al. The Yale-Brown Obsessive-Compulsive Scale (Y-BOCS). Arch Gen Psychiatry 1989;46:1006-16 (clinician-rated; 0–40: 8–15 mild, 16–23 moderate, 24–31 severe, 32–40 extreme).',
  VANOPPEN_CT: 'van Oppen P, Arntz A. Cognitive therapy for OCD. Behav Res Ther 1994;32:79-87; OCCWG belief domains (inflated responsibility, over-importance/control of thoughts, threat/perfectionism, intolerance of uncertainty).',
  TWOHIG_ACT:  'Twohig MP et al. ACT vs progressive relaxation for OCD — RCT. J Consult Clin Psychol 2010;78:705-16 (ACT as alternative/adjunct).',
  KLERMAN_IPT: 'Weissman MM, Markowitz JC, Klerman GL. The Guide to Interpersonal Psychotherapy, updated ed. Oxford 2018.',
  OST_RELAX:   'Öst L-G. Applied relaxation: description of a coping technique and review of controlled studies. Behav Res Ther 1987;25(5):397-409.',
  WELLS_MCT:   'Wells A. Metacognitive Therapy for Anxiety and Depression. Guilford 2009 (detached mindfulness; metacognitive beliefs about worry).',
  DUGAS_IU:    'Dugas MJ, Robichaud M. Cognitive-Behavioral Treatment for GAD: From Science to Practice. Routledge 2007 (intolerance-of-uncertainty model).',
  VDHEIDEN2012:'van der Heiden C et al. RCT of metacognitive therapy vs intolerance-of-uncertainty therapy for GAD. Behav Res Ther 2012;50(2):100-9 (both effective; MCT numerically strongest).',
  GAD7:        'Spitzer RL, Kroenke K, Williams JBW, Löwe B. A brief measure for assessing generalized anxiety disorder: the GAD-7. Arch Intern Med 2006;166(10):1092-7.',
  PSWQ:        'Meyer TJ, Miller ML, Metzger RL, Borkovec TD. Development & validation of the Penn State Worry Questionnaire. Behav Res Ther 1990;28(6):487-95.',
  IUS12:       'Carleton RN, Norton MAPJ, Asmundson GJG. Fearing the unknown: a short version of the Intolerance of Uncertainty Scale (IUS-12). J Anxiety Disord 2007;21(1):105-17.',
  SEGAL_MBCT:  'Segal ZV, Williams JMG, Teasdale JD. Mindfulness-Based Cognitive Therapy for Depression, 2nd ed. Guilford 2013.',
  MARTELL_BA:  'Martell CR, Dimidjian S, Herman-Dunn R. Behavioral Activation for Depression: A Clinician\u2019s Guide, 2nd ed. Guilford 2022.',
  PHQ9:        'Kroenke K, Spitzer RL, Williams JBW. The PHQ-9: validity of a brief depression severity measure. J Gen Intern Med 2001;16(9):606-13 (0–27; 5/10/15/20 = mild/moderate/mod-severe/severe; <5 remission; ≥50% drop = response).',
  SMPC:        'Manufacturer SmPC / FDA label (drug-specific; verify current label).',
  COCHRANE_BPD22:'Stoffers-Winterling JM, Storeb\\u00f8 OJ, Pereira Ribeiro J, et al. Pharmacological interventions for people with borderline personality disorder. Cochrane Database Syst Rev 2022;11:CD012956.pub2 (46 RCTs, 2769 pts; supersedes Stoffers 2010). Pooled effects on core BPD outcomes small/near-null with very-low-to-low certainty; e.g. antipsychotics vs placebo — suicide-related SMD 0.05 (95% CI \\u22120.18 to 0.29; 7 trials, 854 pts); psychosocial functioning SMD \\u22120.16 (95% CI \\u22120.33 to 0.00; 7 trials, 904 pts). Conclusion: probably no reliable benefit for core BPD; evidence unclear.',
  BJP_BPD24:   'Pereira Ribeiro J, Juul S, Kongerslev MT, \\u2026 Stoffers-Winterling JM, Storeb\\u00f8 OJ. Pharmacological interventions for co-occurring psychopathology in people with BPD: secondary analysis of the Cochrane systematic review with meta-analyses. Br J Psychiatry 2024;226(4):226-237. GRADE-rated pooled SMDs: antipsychotics \\u2014 depressive SMD \\u22120.22 (P=0.04, very-low certainty), psychotic\\u2013dissociative SMD \\u22120.28 (P=0.007, low certainty); anticonvulsants \\u2014 depressive SMD \\u22120.44 (P=0.02, low certainty), anxious SMD \\u22121.11 (P<0.00001, very-low certainty); antidepressants \\u2014 no significant findings (very-low certainty). Conclusion: evidence does not support pharmacotherapy to target co-occurring psychopathology; use cautiously.',
  KARASZEWSKA21:'Karaszewska DM, Ingenhoven T, Mocking RJT. Marine omega-3 fatty acid supplementation for borderline personality disorder: a meta-analysis. J Clin Psychiatry 2021;82(3):20r13613 (4 RCTs, ~137 pts). Overall BPD symptom severity SMD 0.54 (95% CI 0.17\\u20130.91; Z=2.87; P=.0041); signal strongest for impulsive behavioural dyscontrol and affective dysregulation; small evidence base.',
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
      src: [S('CANMAT_MDD'), S('CPIC_SSRI'), S('FDA_SSRI_BBW'), S('SMPC')], verified: true },

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
      src: [S('CANMAT_MDD'), S('CPIC_SSRI'), S('FDA_SSRI_BBW'), S('SMPC')], verified: true },

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
      src: [S('CANMAT_MDD'), S('MAUDSLEY_DP'), S('SMPC')], verified: true },

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
      src: [S('CANMAT_MDD'), S('SMPC')], verified: true },

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
      src: [S('CANMAT_MDD'), S('SMPC')], verified: true },

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
      src: [S('CANMAT_MDD'), S('SMPC')], verified: true },
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
      src: [S('CANMAT_MDD'), S('SMPC')], verified: true },
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
      src: [S('CANMAT_MDD'), S('SMPC')], verified: true },
    { id: 'quetiapine_aug', drug: 'Quetiapine XR (augmentation)', class: 'atypical antipsychotic', grade: 'B',
      trade: { generic: 'quetiapine XR', egypt: NEEDS }, mechanism: 'Adjunct; sedating; norquetiapine NET inhibition.',
      dosing: { start: '50 mg', titration: '→150–300 mg', target: '150–300 mg/day (aug)', max: 'per label', forms: 'XR tablet.' },
      onset: 'Days–weeks.', halfLife: '~7 h.', withdrawal: { risk: 'moderate', note: 'Taper.' },
      ae: { common: 'sedation, weight gain.', distinctive: 'METABOLIC + QTc.' },
      monitoring: { baseline: 'Metabolic, ECG.', ongoing: 'Metabolic panel; ECG if QT combo.' },
      contraindications: { absolute: 'QT-prolonging combos caution.', relative: 'Metabolic syndrome.', boxed: 'Elderly dementia mortality.' },
      pregnancyLactation: 'Case-by-case.', overdose: 'Sedation/QT/hypotension.', specialPops: { elderly: 'Boxed dementia.', pgx: 'CYP3A4.' },
      counseling: 'Sedation/metabolic; useful if insomnia/anxiety prominent.',
      src: [S('CANMAT_MDD'), S('SMPC')], verified: true },
  ],
  excluded: [
    { item: 'MAOI + SSRI/SNRI combination', why: 'Serotonin-syndrome risk — contraindicated.', src: [S('SMPC')], verified: true },
    { item: 'Benzodiazepine monotherapy', why: 'No antidepressant efficacy; short-term adjunct only.', src: [S('CANMAT_MDD')], verified: true },
  ],
  labs: {
    required: [
      { test: 'Bipolarity / mixed-features screen', why: 'Antidepressant monotherapy can destabilise bipolar/mixed — screen before starting.', when: 'before any antidepressant', src: [S('CANMAT_MDD')], verified: true },
      { test: 'Baseline BP', why: 'Mandatory if venlafaxine/duloxetine/bupropion.', when: 'before SNRI/bupropion', src: [S('SMPC')], verified: true },
      { test: 'Seizure & eating-disorder screen', why: 'Bupropion absolutely contraindicated in both.', when: 'before bupropion', src: [S('SMPC')], verified: true },
      { test: 'Renal + thyroid + ECG', why: 'Mandatory before lithium augmentation.', when: 'before lithium', src: [S('SMPC')], verified: true },
    ],
    recommended: [
      { test: 'TSH (±Free T4)', why: 'Hypothyroidism mimics/worsens depression.', when: 'baseline work-up', src: [S('CANMAT_MDD')], verified: true },
      { test: 'Serum Na+', why: 'SSRI/SNRI hyponatraemia, elderly.', when: 'if elderly/diuretic', src: [S('CANMAT_MDD')], verified: true },
      { test: 'Metabolic panel (glucose/lipids/weight)', why: 'Before mirtazapine/quetiapine augmentation.', when: 'before metabolically-active agents', src: [S('SMPC')], verified: true },
    ],
    optional: [
      { test: 'CBC', why: 'Mirtazapine rare agranulocytosis if febrile illness.', when: 'if symptoms', src: [S('SMPC')], verified: true },
      { test: 'B12 / folate / vitamin D', why: 'Reversible contributors to low mood.', when: 'nutritional review', src: [S('CANMAT_MDD')], verified: true },
      { test: 'CYP2D6/2C19 PGx', why: 'Optimises antidepressant choice if pursued.', when: 'if PGx-guided', src: [S('CPIC_SSRI')], verified: true },
    ],
  },
  switchingStrategies: { text: 'Direct switch between most SSRIs/SNRIs; cross-taper when withdrawal risk high (paroxetine, venlafaxine). MAOI: 14-day washout (5 weeks from fluoxetine). Optimise dose once before switch vs augment decision.', src: [S('CANMAT_MDD'), S('MAUDSLEY_DP')], verified: true },
  withdrawalVsRelapse: { text: 'Same framework as GAD: withdrawal is FAST-onset with NEW somatic symptoms (dizziness/brain-zaps/flu-like), resolves quickly on reinstatement, and tracks taper speed; relapse is GRADUAL, reproduces the original depression, and is taper-rate independent. FINISH cluster. Counsel before starting — basis of informed consent.', src: [S('MAUDSLEY_DP'), S('RCPSYCH_DP'), S('HOROWITZ19')], verified: true },
  hyperbolicTaper: { text: 'Reduce by receptor occupancy, largest cuts early, progressively smaller (to liquid/compounded). Maudsley tiers ~10% / 5% / 2.5% of remaining occupancy, held until stable. Slower for paroxetine/venlafaxine and long-term users.', src: [S('HOROWITZ19'), S('MAUDSLEY_DP')], verified: true },
  treatmentPhases: { text: 'Acute (to remission, judge trial at 4–6 wk on therapeutic dose). Continuation: 6–9 months after remission to prevent relapse. Maintenance: ≥2 years (or indefinite) for recurrent/severe/high-risk. Taper hyperbolically when stopping.', src: [S('CANMAT_MDD')], verified: true },
  specifierTargeting: { text: 'Anxious distress / atypical / melancholic → any first/second-line agent. Seasonal (winter) → light therapy first-line + antidepressant. Psychotic features → antidepressant + antipsychotic (do not start structured psychotherapy until psychosis subsides). Mixed features → REFER (bipolar-like; antidepressant monotherapy risk). Prominent insomnia/appetite loss → mirtazapine. Low energy / sexual-side-effect concern / smoking → bupropion. Cognitive symptoms → vortioxetine/bupropion.', src: [S('CANMAT_MDD')], verified: true },
  monitoringTimeline: { text: 'Review 1–2 wk (tolerability, suicidality <25 y), 4 wk (early response), 6–8 wk (decide adequate response vs switch/augment after full trial). Track PHQ-9 baseline + follow-up. <20–25% improvement by 4–6 wk at adequate dose → optimise dose/adherence, then switch or augment.', src: [S('CANMAT_MDD')], verified: true },
  comorbidityModifiers: [
    { ifComorbid: 'bipolar | mixed features', action: 'caution/refer', target: 'antidepressant monotherapy', rule: 'Risk of manic switch/destabilisation — ensure mood-stabiliser cover; mixed features → refer to psychiatry.', src: [S('CANMAT_BD')], verified: true },
    { ifComorbid: 'eating disorder', action: 'avoid', target: 'bupropion', rule: 'Bupropion ABSOLUTELY contraindicated (seizure risk).', src: [S('SMPC')], verified: true },
    { ifComorbid: 'seizure disorder', action: 'avoid', target: 'bupropion', rule: 'Lowers seizure threshold — contraindicated.', src: [S('SMPC')], verified: true },
    { ifComorbid: 'cardiac disease | long QT', action: 'avoid/adjust', target: 'high-dose (es)citalopram; venlafaxine', rule: 'QT/BP — ECG; prefer sertraline; avoid venlafaxine in uncontrolled HTN.', src: [S('FDA_CIT_QT'), S('SMPC')], verified: true },
    { ifComorbid: 'high suicide risk', action: 'avoid', target: 'TCAs, venlafaxine (lethal in overdose)', rule: 'Prefer SSRIs (safer in overdose); consider lithium augmentation (anti-suicidal).', src: [S('CANMAT_MDD')], verified: true },
    { ifComorbid: 'chronic pain', action: 'prefer', target: 'duloxetine/venlafaxine', rule: 'Covers depression + pain.', src: [S('CANMAT_MDD')], verified: true },
    { ifComorbid: 'pregnancy', action: 'prefer/avoid', target: 'prefer sertraline; avoid paroxetine/valproate', rule: 'Confirm against perinatal guidance.', src: [S('SMPC')], verified: true },
  ],
  crossCoverage: [
    { comorbid: 'GAD | anxiety', agent: 'escitalopram | sertraline | duloxetine | venlafaxine', note: 'SSRI/SNRI covers depression + anxiety.', src: [S('CANMAT_MDD')], verified: true },
    { comorbid: 'chronic pain | neuropathic', agent: 'duloxetine | venlafaxine', note: 'SNRI covers both.', src: [S('CANMAT_MDD')], verified: true },
    { comorbid: 'insomnia | appetite loss', agent: 'mirtazapine', note: 'Sedation + appetite.', src: [S('CANMAT_MDD')], verified: true },
    { comorbid: 'smoking cessation | low energy', agent: 'bupropion', note: 'NDRI covers both.', src: [S('CANMAT_MDD')], verified: true },
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
      src: [S('APA_OCD'), S('FDA_SSRI_BBW'), S('SMPC')], verified: true },
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
      src: [S('APA_OCD'), S('FDA_SSRI_BBW'), S('SMPC')], verified: true },
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
      src: [S('APA_OCD'), S('SMPC')], verified: true },
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
      src: [S('APA_OCD'), S('FDA_CIT_QT'), S('CPIC_SSRI'), S('SMPC')], verified: true },
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
      src: [S('APA_OCD'), S('SMPC')], verified: true },
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
      src: [S('APA_OCD'), S('SMPC')], verified: true },
  ],
  excluded: [
    { item: 'Benzodiazepine monotherapy', why: 'No anti-obsessional efficacy.', src: [S('APA_OCD')], verified: true },
  ],
  labs: {
    required: [
      { test: 'ECG (QTc) + plasma levels', why: 'Mandatory before/with clomipramine (cardiotoxicity).', when: 'before clomipramine', src: [S('SMPC')], verified: true },
      { test: 'ECG (QTc)', why: 'Before high-dose escitalopram (>20 mg) in OCD.', when: 'before high-dose escitalopram', src: [S('FDA_CIT_QT')], verified: true },
      { test: 'Metabolic baseline', why: 'Before antipsychotic augmentation.', when: 'before SGA augmentation', src: [S('SMPC')], verified: true },
    ],
    recommended: [
      { test: 'CYP interaction review (esp. fluvoxamine, fluoxetine)', why: 'Strong CYP inhibitors — review co-meds/caffeine.', when: 'before fluvoxamine/fluoxetine', src: [S('SMPC')], verified: true },
    ],
    optional: [
      { test: 'CYP2D6/2C19 PGx', why: 'Optimises high-dose SSRI/clomipramine if pursued.', when: 'if PGx-guided', src: [S('CPIC_SSRI')], verified: true },
      { test: 'TSH', why: 'Exclude thyroid contribution to anxiety symptoms.', when: 'work-up', src: [S('APA_OCD')], verified: true },
    ],
  },
  switchingStrategies: { text: 'Try ≥2 adequate high-dose SSRI trials (each 8–12 wk) before clomipramine. SSRI→clomipramine: cross carefully (additive serotonergic load + clomipramine 2D6 metabolism). MAOI: 14-day washout (5 weeks from fluoxetine).', src: [S('APA_OCD'), S('MAUDSLEY_DP')], verified: true },
  withdrawalVsRelapse: { text: 'Same framework: withdrawal FAST with NEW somatic symptoms, resolves on reinstatement, tracks taper rate; OCD relapse is GRADUAL return of obsessions/compulsions. Note OCD often needs long maintenance — distinguish discontinuation from genuine relapse before restarting.', src: [S('MAUDSLEY_DP'), S('RCPSYCH_DP')], verified: true },
  hyperbolicTaper: { text: 'Same hyperbolic principle. Fluoxetine self-tapers (long t½). Taper slowly given OCD chronicity and relapse risk.', src: [S('HOROWITZ19'), S('MAUDSLEY_DP')], verified: true },
  treatmentPhases: { text: 'Acute: high-dose SSRI + ERP; judge at 8–12 wk. Maintenance: continue ≥1–2 years after response (longer if severe/relapsing) given high relapse rate; taper slowly.', src: [S('APA_OCD')], verified: true },
  specifierTargeting: { text: 'Comorbid tics / poor SSRI response → antipsychotic augmentation. Poor insight → emphasise ERP + longer pharmacotherapy. Severe/refractory after SSRIs → clomipramine (ECG/levels). Always pair pharmacotherapy with ERP.', src: [S('APA_OCD')], verified: true },
  monitoringTimeline: { text: 'Track Y-BOCS at baseline, 4 wk (early), 8–12 wk (decide adequacy at max tolerated dose). Do NOT switch before a full high-dose 8–12 wk trial. Pair with ERP and monitor functional change.', src: [S('APA_OCD')], verified: true },
  comorbidityModifiers: [
    { ifComorbid: 'tics | Tourette', action: 'prefer', target: 'antipsychotic augmentation', rule: 'Low-dose antipsychotic augmentation helps tic-related OCD.', src: [S('APA_OCD')], verified: true },
    { ifComorbid: 'bipolar', action: 'caution', target: 'SSRI monotherapy', rule: 'Manic-switch risk — mood-stabiliser cover.', src: [S('CANMAT_BD')], verified: true },
    { ifComorbid: 'cardiac disease', action: 'avoid', target: 'clomipramine; high-dose (es)citalopram', rule: 'Cardiotoxicity/QT — ECG, prefer non-cardiotoxic SSRI.', src: [S('SMPC'), S('FDA_CIT_QT')], verified: true },
    { ifComorbid: 'MDD', action: 'note', target: 'SSRI dose', rule: 'SSRI covers both but OCD high dose governs.', src: [S('APA_OCD')], verified: true },
  ],
  crossCoverage: [
    { comorbid: 'MDD', agent: 'SSRI (OCD doses)', note: 'Same class covers both; OCD dose governs.', src: [S('APA_OCD')], verified: true },
    { comorbid: 'GAD | anxiety', agent: 'SSRI', note: 'Same class covers both.', src: [S('APA_OCD')], verified: true },
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
      comparativeEfficacy: { note: 'Best-supported SGA historically (Nickel 2006, single RCT); the 2022 Cochrane update finds only small, very-low-to-low-certainty pooled effects. Symptom-targeted adjunct only.', stat: NEEDS },
      strength: { level: 'Weak', certainty: 'very low–low (GRADE)', note: 'Guidelines advise against drug treatment for core BPD; adjunct, symptom-targeted, time-limited.', src: [S('NICE_BPD'), S('COCHRANE_BPD22'), S('BJP_BPD24')], verified: true },
      bestIf: [
        { text: 'Anger / affective dysregulation / mood lability', src: [S('NICE_BPD'), S('NICKEL2006'), S('COCHRANE_BPD')], verified: true },
        { text: 'Cognitive-perceptual / transient quasi-psychotic symptoms (low dose)', src: [S('NICE_BPD'), S('NICKEL2006')], verified: true },
        { text: 'Weight a concern — metabolically favourable vs other SGAs', src: [S('COCHRANE_BPD'), S('SMPC')], verified: true, derived: true },
      ],
      avoidIf: [
        { text: 'Prior akathisia', tier: 'relative', src: [S('SMPC')], verified: true },
        { text: 'Elderly with dementia — class mortality warning', tier: 'boxed', src: [S('SMPC')], verified: true },
      ],
      benefit: [
        { symptom: 'Depressive symptoms', smd: '−0.22', ci: null, p: '0.04', certainty: 'very low', basis: 'antipsychotic class, pooled', src: [S('BJP_BPD24')], verified: true, derived: true },
        { symptom: 'Psychotic–dissociative symptoms', smd: '−0.28', ci: null, p: '0.007', certainty: 'low', basis: 'antipsychotic class, pooled', src: [S('BJP_BPD24')], verified: true, derived: true },
        { symptom: 'Suicide-related outcomes', smd: '0.05', ci: '−0.18 to 0.29', p: null, certainty: 'very low', basis: 'antipsychotic class, pooled (7 trials, 854 pts) — little/no effect', src: [S('COCHRANE_BPD22')], verified: true, derived: true },
        { symptom: 'Anger / affective / cognitive-perceptual', smd: null, ci: null, p: null, certainty: 'very low', basis: 'single RCT (Nickel 2006), high risk of bias — not robust in 2022 pooled update; positive signal only', src: [S('NICKEL2006')], verified: true },
      ],
      src: [S('NICE_BPD'), S('NICKEL2006'), S('COCHRANE_BPD'), S('COCHRANE_BPD22'), S('BJP_BPD24'), S('SMPC')], verified: true },
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
      comparativeEfficacy: { note: 'Anticonvulsant-class signal on anger/impulsivity from small single trials; 2022 Cochrane update finds low-to-very-low-certainty pooled effects. Symptom-targeted adjunct only.', stat: NEEDS },
      strength: { level: 'Weak', certainty: 'low–very low (GRADE)', note: 'Anticonvulsant class shows low-certainty benefit on depressive and very-low-certainty on anxious symptoms; guidelines advise against drug treatment for core BPD.', src: [S('NICE_BPD'), S('COCHRANE_BPD22'), S('BJP_BPD24')], verified: true },
      bestIf: [
        { text: 'Impulsivity / self-harm', src: [S('NICE_BPD'), S('COCHRANE_BPD')], verified: true },
        { text: 'Anger', src: [S('NICE_BPD'), S('COCHRANE_BPD')], verified: true },
        { text: 'Overweight — weight-neutral-to-loss', src: [S('SMPC')], verified: true, derived: true },
      ],
      avoidIf: [
        { text: 'Pregnancy / childbearing potential without contraception — teratogen (cleft palate)', tier: 'absolute', src: [S('SMPC')], verified: true },
        { text: 'Nephrolithiasis history — renal stones', tier: 'relative', src: [S('SMPC')], verified: true },
        { text: 'Cognitively demanding roles — cognitive slowing', tier: 'relative', src: [S('SMPC')], verified: true },
      ],
      benefit: [
        { symptom: 'Depressive symptoms', smd: '−0.44', ci: null, p: '0.02', certainty: 'low', basis: 'anticonvulsant class, pooled', src: [S('BJP_BPD24')], verified: true, derived: true },
        { symptom: 'Anxious symptoms', smd: '−1.11', ci: null, p: '<0.00001', certainty: 'very low', basis: 'anticonvulsant class, pooled — large point estimate but very-low certainty (imprecision/RoB)', src: [S('BJP_BPD24')], verified: true, derived: true },
        { symptom: 'Anger / impulsivity / interpersonal', smd: null, ci: null, p: null, certainty: 'very low', basis: 'small single trials (Nickel/Loew); not robust in 2022 pooled update; positive signal only', src: [S('COCHRANE_BPD22')], verified: true },
      ],
      src: [S('NICE_BPD'), S('COCHRANE_BPD'), S('COCHRANE_BPD22'), S('BJP_BPD24'), S('SMPC')], verified: true },
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
      comparativeEfficacy: { note: 'Weak, single-trial BPD-specific evidence; anticonvulsant-class pooled effects low-to-very-low certainty. Teratogenicity is the dominant limit. Symptom-targeted adjunct only.', stat: NEEDS },
      strength: { level: 'Weak', certainty: 'low–very low (GRADE)', note: 'Grade C, weakest BPD-specific evidence; anticonvulsant-class benefit low-to-very-low certainty; major teratogen — avoid in childbearing potential.', src: [S('NICE_BPD'), S('COCHRANE_BPD22'), S('BJP_BPD24'), S('FDA_VALP')], verified: true },
      bestIf: [
        { text: 'Affective dysregulation / impulsivity (weak BPD evidence — Grade C)', src: [S('COCHRANE_BPD22')], verified: true },
      ],
      avoidIf: [
        { text: 'Pregnancy / any childbearing-potential woman without strict prevention — major teratogen + neurodevelopmental harm', tier: 'absolute', src: [S('FDA_VALP')], verified: true },
        { text: 'Hepatic disease — hepatotoxicity', tier: 'absolute', src: [S('FDA_VALP'), S('SMPC')], verified: true },
        { text: 'Obesity — weight gain', tier: 'relative', src: [S('SMPC')], verified: true },
        { text: 'Bleeding risk / thrombocytopenia', tier: 'relative', src: [S('SMPC')], verified: true },
      ],
      benefit: [
        { symptom: 'Depressive symptoms', smd: '−0.44', ci: null, p: '0.02', certainty: 'low', basis: 'anticonvulsant class, pooled', src: [S('BJP_BPD24')], verified: true, derived: true },
        { symptom: 'Anxious symptoms', smd: '−1.11', ci: null, p: '<0.00001', certainty: 'very low', basis: 'anticonvulsant class, pooled — very-low certainty', src: [S('BJP_BPD24')], verified: true, derived: true },
        { symptom: 'Affective dysregulation / interpersonal', smd: null, ci: null, p: null, certainty: 'very low', basis: 'single trial (Frankenburg & Zanarini 2002, BPD + bipolar II women); not robust in 2022 pooled update', src: [S('COCHRANE_BPD22')], verified: true },
      ],
      src: [S('NICE_BPD'), S('COCHRANE_BPD'), S('COCHRANE_BPD22'), S('BJP_BPD24'), S('FDA_VALP'), S('SMPC')], verified: true },
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
      comparativeEfficacy: { note: 'Meta-analysis (Karaszewska 2021, 4 RCTs) shows a significant overall-severity effect with favourable tolerability; small evidence base. Low-risk adjunct.', stat: NEEDS },
      strength: { level: 'Moderate', certainty: 'low (small evidence base)', note: 'Well-tolerated adjunct with a significant pooled effect on overall BPD severity; small number of trials/participants.', src: [S('KARASZEWSKA21'), S('COCHRANE_BPD')], verified: true },
      bestIf: [
        { text: 'Affective instability / impulsivity, low-risk adjunct wanted', src: [S('KARASZEWSKA21')], verified: true },
        { text: 'Well-tolerated add-on preferred', src: [S('KARASZEWSKA21')], verified: true, derived: true },
      ],
      avoidIf: [
        { text: 'High-dose with anticoagulation — bleeding risk', tier: 'relative', src: [S('SMPC')], verified: true },
      ],
      benefit: [
        { symptom: 'Overall BPD symptom severity', smd: '0.54', ci: '0.17 to 0.91', p: '0.0041', certainty: 'low', basis: 'meta-analysis, 4 RCTs, ~137 pts (positive SMD = benefit)', src: [S('KARASZEWSKA21')], verified: true },
        { symptom: 'Impulsive dyscontrol / affective dysregulation', smd: null, ci: null, p: null, certainty: 'low', basis: 'domain signal strongest here (Karaszewska 2021); no separate pooled SMD reported', src: [S('KARASZEWSKA21')], verified: true },
      ],
      src: [S('NICE_BPD'), S('COCHRANE_BPD'), S('KARASZEWSKA21')], verified: true },
  ],
  excluded: [
    { item: 'Lamotrigine for core BPD', why: 'LABILE RCT (Crawford 2018, n=276) found NO benefit; NICE does not recommend.', src: [S('LABILE2018'), S('NICE_BPD')], verified: true },
    { item: 'Benzodiazepines', why: 'Disinhibition, dependence, overdose risk in self-harm; avoid.', src: [S('NICE_BPD')], verified: true },
    { item: 'Olanzapine', why: 'Metabolic burden; weak/inconsistent BPD evidence.', src: [S('COCHRANE_BPD')], verified: true },
    { item: 'SSRIs as monotherapy for core BPD', why: 'No core-BPD efficacy (use only for a comorbid disorder).', src: [S('NICE_BPD')], verified: true },
    { item: 'Polypharmacy', why: 'Not supported; NICE advises a single time-limited agent.', src: [S('NICE_BPD')], verified: true },
  ],
  labs: {
    required: [
      { test: 'LFTs + CBC/platelets + pregnancy test', why: 'Mandatory before valproate (hepatotoxicity, thrombocytopenia, teratogen).', when: 'before valproate', src: [S('FDA_VALP')], verified: true },
      { test: 'Renal function + pregnancy', why: 'Topiramate stones/acidosis; teratogen.', when: 'before topiramate', src: [S('SMPC')], verified: true },
      { test: 'Metabolic baseline', why: 'Before any antipsychotic adjunct.', when: 'before SGA', src: [S('SMPC')], verified: true },
    ],
    recommended: [
      { test: 'Comorbidity screen (MDD, bipolar, PTSD, substance, ED)', why: 'Drugs target comorbidity/crisis, not core BPD.', when: 'baseline', src: [S('NICE_BPD')], verified: true },
    ],
    optional: [
      { test: 'TSH / ferritin / B12', why: 'Reversible contributors to mood/energy.', when: 'if indicated', src: [S('NICE_BPD')], verified: true },
    ],
  },
  switchingStrategies: { text: 'Use a SINGLE agent at a time, targeted at a defined symptom, with an agreed review date; discontinue if ineffective rather than adding another drug. Avoid polypharmacy and antipsychotic stacking.', src: [S('NICE_BPD')], verified: true },
  withdrawalVsRelapse: { text: 'BPD affective instability is rapid and reactive — distinguish it from antidepressant/medication withdrawal and from a comorbid mood-disorder relapse. Time-limited trials mean planned discontinuation is expected; review effect against the agreed target symptom, not global mood.', src: [S('NICE_BPD'), S('MAUDSLEY_DP')], verified: true },
  hyperbolicTaper: { text: 'For any antidepressant used for a comorbidity, taper hyperbolically as in MDD/GAD. For symptom-targeted adjuncts, taper and STOP if the target symptom has not improved.', src: [S('HOROWITZ19'), S('NICE_BPD')], verified: true },
  treatmentPhases: { text: 'Psychotherapy (DBT etc.) is the long-term core. Medication = short, time-limited, symptom-targeted trials with explicit review and discontinuation. Short-term sedative in crisis only (≤1 week per NICE). Do not use drugs as primary therapy.', src: [S('NICE_BPD')], verified: true },
  specifierTargeting: { text: 'Three symptom domains guide adjunct choice: (1) affective dysregulation / mood lability / anger → aripiprazole, topiramate, omega-3; (2) impulsivity / self-harm → topiramate (and psychotherapy); (3) cognitive-perceptual (transient quasi-psychotic) → low-dose aripiprazole. Always adjunct to psychotherapy, time-limited.', src: [S('NICE_BPD'), S('NICKEL2006'), S('COCHRANE_BPD')], verified: true },
  monitoringTimeline: { text: 'Agree the target symptom, expected timeframe, and review date BEFORE prescribing. Review effect at the agreed point; if no benefit on the target symptom → taper and stop (do not add another drug). Keep psychotherapy central and continuous.', src: [S('NICE_BPD')], verified: true },
  comorbidityModifiers: [
    { ifComorbid: 'pregnancy | childbearing potential', action: 'avoid', target: 'valproate (and topiramate)', rule: 'Valproate major teratogen/neurodevelopmental harm; topiramate teratogen — avoid; ensure contraception.', src: [S('FDA_VALP'), S('SMPC')], verified: true },
    { ifComorbid: 'bipolar', action: 'distinguish/treat', target: 'mood stabiliser', rule: 'Separate bipolar mood episodes from BPD affective instability; treat bipolar protocol with a mood stabiliser.', src: [S('CANMAT_BD')], verified: true },
    { ifComorbid: 'MDD', action: 'treat comorbidity', target: 'SSRI for the depression (not core BPD)', rule: 'Use an antidepressant for the comorbid depression, not to treat BPD itself.', src: [S('NICE_BPD')], verified: true },
    { ifComorbid: 'substance use disorder', action: 'avoid', target: 'benzodiazepines', rule: 'Avoid — disinhibition/dependence/overdose risk.', src: [S('NICE_BPD')], verified: true },
    { ifComorbid: 'PTSD', action: 'prefer', target: 'DBT-PE / trauma-focused therapy', rule: 'Integrate trauma-focused psychotherapy.', src: [S('NICE_BPD')], verified: true },
  ],
  crossCoverage: [
    { comorbid: 'bipolar', agent: 'mood stabiliser / SGA', note: 'Treats bipolar; may also help BPD impulsivity/affect.', src: [S('CANMAT_BD')], verified: true },
    { comorbid: 'MDD', agent: 'SSRI (for the depression)', note: 'Antidepressant for comorbid depression only.', src: [S('NICE_BPD')], verified: true },
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
      src: [S('ACOG_PMDD'), S('FDA_SSRI_BBW'), S('SMPC')], verified: true },
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
      src: [S('ACOG_PMDD'), S('CPIC_SSRI'), S('SMPC')], verified: true },
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
      src: [S('ACOG_PMDD'), S('SMPC')], verified: true },
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
      src: [S('ACOG_PMDD'), S('SMPC')], verified: true },
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
      src: [S('ACOG_PMDD'), S('SMPC')], verified: true },
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
      src: [S('ACOG_PMDD'), S('SMPC')], verified: true },
  ],
  excluded: [
    { item: 'Progesterone monotherapy', why: 'No consistent benefit over placebo for PMDD.', src: [S('ACOG_PMDD')], verified: true },
  ],
  labs: {
    required: [
      { test: 'Prospective daily symptom charting ≥2 cycles', why: 'Required to CONFIRM PMDD (luteal-bound) before treatment.', when: 'before diagnosis/treatment', src: [S('ACOG_PMDD')], verified: true },
      { test: 'BP + VTE/migraine-aura/smoking screen', why: 'Mandatory before drospirenone COC.', when: 'before COC', src: [S('SMPC')], verified: true },
    ],
    recommended: [
      { test: 'TSH', why: 'Exclude thyroid mimicking mood symptoms.', when: 'work-up', src: [S('ACOG_PMDD')], verified: true },
      { test: 'Serum K+ (if on ACEi/ARB/K-sparing)', why: 'Drospirenone hyperkalaemia interaction.', when: 'before/with COC + those agents', src: [S('SMPC')], verified: true },
    ],
    optional: [
      { test: 'Ferritin / vitamin D / calcium-magnesium status', why: 'Premenstrual symptom contributors / supplement planning.', when: 'nutritional review', src: [S('ACOG_PMDD')], verified: true },
      { test: 'Bone density (DXA)', why: 'If prolonged GnRH agonist therapy.', when: 'with GnRH', src: [S('SMPC')], verified: true },
    ],
  },
  switchingStrategies: { text: 'SSRI continuous ↔ luteal-only depending on pattern and comorbidity (continuous if comorbid MDD/GAD). If one SSRI fails, switch to another; then consider hormonal (drospirenone COC) or, if severe/refractory, GnRH agonist + add-back.', src: [S('ACOG_PMDD')], verified: true },
  withdrawalVsRelapse: { text: 'Luteal-only SSRI use means symptoms recur each late-luteal phase by design (NOT relapse) and remit with menses. Distinguish predictable cyclic recurrence from genuine non-response and from discontinuation symptoms (more likely with short-half-life paroxetine; minimal with fluoxetine).', src: [S('ACOG_PMDD'), S('MAUDSLEY_DP')], verified: true },
  hyperbolicTaper: { text: 'Continuous SSRI: taper hyperbolically as in MDD/GAD. Luteal dosing inherently limits exposure; fluoxetine self-tapers via long half-life.', src: [S('HOROWITZ19'), S('MAUDSLEY_DP')], verified: true },
  treatmentPhases: { text: 'Trial across ≥2 cycles to judge response. Continue effective therapy; reassess periodically. Hormonal/GnRH escalation for inadequate SSRI response per severity.', src: [S('ACOG_PMDD')], verified: true },
  specifierTargeting: { text: 'Comorbid MDD/GAD → CONTINUOUS SSRI (covers both); pure luteal symptoms → luteal-only dosing acceptable. Contraception desired or somatic/physical premenstrual symptoms → drospirenone COC. Severe/refractory → GnRH + add-back. Migraine with aura / VTE risk / smoker ≥35 → AVOID oestrogen COC.', src: [S('ACOG_PMDD')], verified: true },
  monitoringTimeline: { text: 'Use the prospective symptom diary as the outcome measure across cycles. Judge SSRI over ≥2 cycles. For luteal dosing, expect symptom control in the treated luteal window; persistent luteal symptoms → continuous dosing or escalate. Monitor BP/VTE on COC.', src: [S('ACOG_PMDD')], verified: true },
  comorbidityModifiers: [
    { ifComorbid: 'MDD | GAD', action: 'prefer', target: 'CONTINUOUS SSRI', rule: 'Continuous (not luteal-only) dosing covers the comorbid mood/anxiety disorder too.', src: [S('ACOG_PMDD')], verified: true },
    { ifComorbid: 'migraine with aura | VTE risk | smoker ≥35', action: 'avoid', target: 'oestrogen-containing COC', rule: 'Stroke/VTE risk — avoid drospirenone/EE; use SSRI ± non-oestrogen options.', src: [S('SMPC')], verified: true },
    { ifComorbid: 'bipolar', action: 'caution', target: 'SSRI', rule: 'Manic-switch caution — mood-stabiliser cover.', src: [S('CANMAT_BD')], verified: true },
    { ifComorbid: 'pregnancy / planning pregnancy', action: 'avoid', target: 'paroxetine; COC; GnRH', rule: 'Avoid paroxetine (cardiac signal) and hormonal agents; reassess need.', src: [S('SMPC')], verified: true },
  ],
  crossCoverage: [
    { comorbid: 'MDD | GAD', agent: 'continuous SSRI (sertraline/escitalopram/fluoxetine)', note: 'One continuous SSRI covers PMDD + comorbid mood/anxiety.', src: [S('ACOG_PMDD')], verified: true },
    { comorbid: 'contraception need', agent: 'drospirenone/EE COC', note: 'Covers PMDD somatic symptoms + contraception (screen VTE).', src: [S('ACOG_PMDD')], verified: true },
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
  PMDD: {
    model:
      'Luteal-focused plan. First-line pharmacotherapy is an SSRI (continuous, luteal-phase-only, or symptom-onset dosing — rapid, low-dose); CBT (PMDD-adapted) is an evidence-supported NON-pharmacological option with modest/inconsistent effect, used by preference, for comorbidity, or as an adjunct. Prospective daily DRSP charting over ≥2 cycles is essential to confirm luteal cyclicity (and to distinguish PMDD from premenstrual EXACERBATION of another disorder). Lifestyle (diet/exercise/sleep/light) supports.',
    coreMeasures: [
      { tool: 'DRSP (Daily Record of Severity of Problems)', kind: 'prospective daily self-rating', cadence: 'daily for ≥2 baseline cycles, then ongoing',
        interpret: 'Diagnostic gold standard AND outcome: luteal symptom elevation that remits after menses (follicular near-normal). Confirms cyclicity; a flat cross-cycle pattern suggests a non-PMDD diagnosis.', src: [S('DRSP')], verified: false },
      { tool: 'PHQ-9 (follicular vs luteal)', kind: 'self-report', cadence: 'both phases',
        interpret: 'If depression persists in the follicular phase, consider MDD or premenstrual exacerbation (PME), not pure PMDD.', src: [S('PHQ9')], verified: false },
    ],
    phases: [
      { phase: 0, name: 'Prospective charting & diagnosis', duration: '≥2 menstrual cycles',
        goals: 'Confirm PMDD with ≥2 cycles of prospective DRSP (luteal elevation, follicular remission); rule out premenstrual exacerbation of another disorder; psychoeducation on the cycle–symptom link; agree first-line options (SSRI vs CBT/lifestyle by severity & preference).',
        techniques: [
          { school: 'CBT (PMDD-adapted)', name: 'psychoeducation + prospective symptom charting', how: 'Teach the luteal→menses pattern; establish daily DRSP; map symptom–cycle timing and functional impact.', src: [S('ACOG_PMDD'), S('DRSP')] },
        ],
        phaseTarget: 'PMDD confirmed by prospective charting (not recall); PME/MDD excluded; treatment path agreed.' },
      { phase: 1, name: 'Skills & luteal-phase coping', duration: '~ several cycles',
        goals: 'Reduce luteal symptom impact through cognitive-behavioural skills, stress regulation and cycle-timed lifestyle changes.',
        techniques: [
          { school: 'CBT (PMDD-adapted)', name: 'cognitive restructuring of premenstrual thoughts', how: 'Identify and test catastrophic/self-critical premenstrual cognitions; reduce symptom-driven conflict.', src: [S('BECK_CBT')] },
          { school: 'CBT (PMDD-adapted)', name: 'luteal-phase behavioural planning', how: 'Anticipate the luteal window; schedule lighter demands, self-care and coping ahead of symptom onset.', src: [S('ACOG_PMDD')] },
          { school: 'Vagal / relaxation', name: 'stress regulation', how: 'Slow-paced breathing / relaxation / mindfulness for premenstrual arousal & irritability (see VAGAL_TONING).', src: [S('HRVB')] },
          { school: 'Lifestyle', name: 'cycle-timed diet, exercise & sleep', how: 'Luteal complex-carb + frequent smaller meals; reduce caffeine/sodium/alcohol premenstrually; regular aerobic exercise; protect sleep; consider light therapy if SAD overlap.', src: [S('ACOG_PMDD')] },
        ],
        phaseTarget: 'DRSP luteal scores falling; usable luteal coping plan; lifestyle changes in place.' },
      { phase: 2, name: 'Interpersonal impact & consolidation', duration: 'variable',
        goals: 'Address the relational/occupational impact of luteal symptoms and consolidate gains across cycles.',
        techniques: [
          { school: 'CBT (PMDD-adapted)', name: 'communication & problem-solving', how: 'Plan communication around the luteal phase; involve partner/family in understanding the pattern; problem-solve recurring luteal conflicts.', src: [S('BECK_CBT'), S('ACOG_PMDD')] },
        ],
        phaseTarget: 'Reduced luteal interpersonal/functional disruption; gains stable across ≥2 cycles.' },
      { phase: 3, name: 'Relapse prevention & maintenance', duration: 'ongoing; boosters',
        goals: 'Sustain skills across cycles; keep charting; plan escalation if inadequate.',
        techniques: [
          { school: 'CBT (PMDD-adapted)', name: 'maintenance blueprint + continued charting', how: 'Keep a brief DRSP; early-warning plan; boosters; agreed threshold to add/escalate an SSRI.', src: [S('ACOG_PMDD'), S('DRSP')] },
        ],
        phaseTarget: 'Skills maintained; charting ongoing; a clear rule for stepping up to pharmacotherapy.' },
    ],
    nonResponse: {
      reviewAt: 'Review after ~2 cycles; if DRSP luteal burden is not improving, escalate — CBT/lifestyle alone is often insufficient for moderate–severe PMDD.',
      checklist: [
        'Is the diagnosis right — prospective luteal cyclicity, or premenstrual EXACERBATION (PME) of MDD/anxiety/bipolar?',
        'Charting adherence (recall bias inflates/obscures the pattern)',
        'Adequate lifestyle/CBT dose across enough cycles',
        'Comorbidity — depression, anxiety, thyroid',
        'Severity — moderate–severe usually needs pharmacotherapy',
      ],
      alternatives: [
        { ifX: 'Moderate–severe PMDD or inadequate response to CBT/lifestyle', switchTo: 'First-line SSRI — continuous, luteal-phase-only, or symptom-onset dosing.', src: [S('PMDD_SSRI'), S('ACOG_PMDD')] },
        { ifX: 'Premenstrual EXACERBATION of an underlying disorder (PME)', switchTo: 'Treat the underlying disorder (MDD/anxiety/bipolar) — not PMDD-only care.', src: [S('DRSP'), S('CANMAT_MDD')] },
        { ifX: 'SSRI declined / contraception also wanted', switchTo: 'Consider drospirenone-containing COC (per guideline) or specialist referral.', src: [S('ACOG_PMDD')] },
        { ifX: 'Severe/refractory', switchTo: 'Specialist referral (e.g. GnRH-analogue strategies under specialist care).', src: [S('ACOG_PMDD')] },
      ],
    },
    crossSchool: [
      'Prospective self-monitoring (DRSP) — the diagnostic backbone across all modalities.',
      'Cognitive restructuring — CBT ↔ stress-management coping.',
      'Relaxation / paced breathing — CBT ↔ vagal down-regulation.',
      'Lifestyle (diet/exercise/sleep/light) — adjunct across drug and psychotherapy paths.',
    ],
  },
  OCD: {
    model:
      'Stepped-care CBT centred on Exposure & Response (Ritual) Prevention (ERP) — the grade-A first-line psychotherapy for OCD (NICE CG31 / APA). Cognitive work targets OCD belief domains; family accommodation is actively reduced. For inadequate response or severe OCD, add a high-dose SSRI (or combine). Y-BOCS-guided; psychotherapy is first-line, not adjunct.',
    coreMeasures: [
      { tool: 'Y-BOCS', kind: 'clinician-rated (10 items, 0–40)', cadence: 'baseline + every 2–4 wk / phase boundary',
        interpret: 'Gold-standard severity (8–15 mild, 16–23 moderate, 24–31 severe, 32–40 extreme); response ≈ ≥35% reduction. Rate obsessions & compulsions separately.', src: [S('YBOCS')], verified: false },
      { tool: 'Family Accommodation (FAS) / accommodation review', kind: 'clinician-rated / interview', cadence: 'baseline + periodic',
        interpret: 'High family accommodation maintains OCD and predicts poorer outcome — track and reduce it.', src: [S('FOA_ERP'), S('APA_OCD')], verified: false },
      { tool: 'PHQ-9', kind: 'self-report', cadence: 'baseline + biweekly',
        interpret: 'Comorbid depression is common and can blunt ERP engagement.', src: [S('PHQ9')], verified: false },
    ],
    phases: [
      { phase: 0, name: 'Assessment, psychoeducation & hierarchy building', duration: '1–3 sessions',
        goals: 'Assess Y-BOCS, symptom subtype (contamination, checking, symmetry/ordering, taboo/harm intrusions), insight and comorbidity; psychoeducation + cognitive-behavioural model + ERP rationale; build a graded fear/trigger hierarchy; map and plan to reduce family accommodation.',
        techniques: [
          { school: 'CBT-ERP', name: 'psychoeducation + ERP rationale', how: 'Explain the obsession→anxiety→compulsion→relief cycle and how rituals/avoidance maintain it; agree goals; give the treatment rationale.', src: [S('FOA_ERP'), S('NICE_OCD')] },
          { school: 'CBT-ERP', name: 'fear/trigger hierarchy construction', how: 'List and rank triggers by distress (SUDS); plan graded exposures from moderate upward.', src: [S('FOA_ERP')] },
          { school: 'Family', name: 'family-accommodation assessment', how: 'Identify accommodation (reassurance, participation in rituals, avoidance) and plan its systematic reduction with the family/carers.', src: [S('APA_OCD'), S('NICE_OCD')] },
        ],
        phaseTarget: 'Shared formulation & ERP rationale; a ranked hierarchy; baseline Y-BOCS; an accommodation-reduction plan.' },
      { phase: 1, name: 'Core ERP — exposure with response/ritual prevention', duration: '~13–20 weekly sessions (intensive if severe)',
        goals: 'Habituate to triggers and break the ritual cycle: graded in-vivo and imaginal exposure while preventing compulsions, reassurance and avoidance.',
        techniques: [
          { school: 'CBT-ERP', name: 'graded in-vivo + imaginal exposure', how: 'Work up the hierarchy; imaginal exposure for feared consequences that cannot be tested in vivo (e.g. harm/taboo intrusions).', src: [S('FOA_ERP')] },
          { school: 'CBT-ERP', name: 'response (ritual) prevention', how: 'Prevent overt AND covert (mental) rituals during and after exposure; eliminate reassurance-seeking and checking.', src: [S('FOA_ERP')] },
          { school: 'Family', name: 'reduce family accommodation', how: 'Coach family to stop providing reassurance/participating in rituals; support the patient tolerating distress.', src: [S('APA_OCD')] },
        ],
        phaseTarget: 'Y-BOCS falling (≥35% reduction as target); rituals & reassurance largely prevented; hierarchy items completed.' },
      { phase: 2, name: 'Cognitive work & generalisation', duration: 'interwoven / following ERP',
        goals: 'Address the beliefs that maintain OCD and generalise gains across contexts and residual mental rituals.',
        techniques: [
          { school: 'Cognitive', name: 'OCD belief-domain restructuring', how: 'Target inflated responsibility, thought-action fusion, over-importance/control of thoughts, threat overestimation and intolerance of uncertainty.', src: [S('VANOPPEN_CT')] },
          { school: 'CBT-ERP', name: 'generalisation & covert-ritual elimination', how: 'Extend exposures to new contexts; catch and drop neutralising/mental rituals.', src: [S('FOA_ERP')] },
        ],
        phaseTarget: 'Maladaptive OCD beliefs weakened; mental rituals reduced; gains generalise beyond the therapy room.' },
      { phase: 3, name: 'Relapse prevention & maintenance', duration: 'final 2–3 sessions + boosters',
        goals: 'Consolidate, prevent relapse and plan for symptom re-emergence.',
        techniques: [
          { school: 'CBT-ERP', name: 'relapse-prevention blueprint', how: 'Self-directed exposure plan, early-warning signs, an if-OCD-returns plan; taper frequency; boosters.', src: [S('FOA_ERP'), S('NICE_OCD')] },
          { school: 'ACT', name: 'acceptance/defusion for residual intrusions (optional)', how: 'Willingness to have intrusions without acting; values-based action — alternative/adjunct where engagement with ERP is limited.', src: [S('TWOHIG_ACT')] },
        ],
        phaseTarget: 'A written self-management plan; residual intrusions handled without rituals; maintenance strategy set.' },
    ],
    nonResponse: {
      reviewAt: 'Review at each phase boundary; if Y-BOCS has not fallen after adequate ERP (~8–10 weeks with genuine ritual prevention), reassess.',
      checklist: [
        'Is response prevention actually happening — including covert/mental rituals?',
        'Residual reassurance-seeking or family accommodation',
        'Insight / overvalued ideation limiting exposure engagement',
        'Comorbidity — depression, tics/Tourette, ASD, hoarding subtype',
        'Adequate ERP dose & hierarchy coverage (avoided items left undone?)',
        'Medication — is a high-dose SSRI needed/optimised?',
      ],
      alternatives: [
        { ifX: 'Poor insight / strong OCD beliefs blocking exposure', switchTo: 'Add cognitive therapy on belief domains before/with ERP.', src: [S('VANOPPEN_CT')] },
        { ifX: 'Experiential avoidance / won\u2019t engage ERP', switchTo: 'ACT for OCD as alternative/adjunct.', src: [S('TWOHIG_ACT')] },
        { ifX: 'High family accommodation', switchTo: 'Family-based intervention to withdraw accommodation.', src: [S('APA_OCD'), S('NICE_OCD')] },
        { ifX: 'Inadequate response to CBT alone or severe OCD', switchTo: 'Add a high-dose SSRI, or intensive/residential ERP (combined treatment).', src: [S('NICE_OCD'), S('APA_OCD')] },
      ],
    },
    crossSchool: [
      'Exposure principle — ERP ↔ imaginal/interoceptive exposure ↔ worry exposure logic.',
      'Cognitive restructuring — OCD belief work ↔ CBT ↔ intolerance-of-uncertainty.',
      'Acceptance / defusion — ACT ↔ MBCT ↔ mindfulness for intrusions.',
      'Dropping reassurance — ERP response prevention ↔ family-accommodation reduction.',
    ],
  },
  MDD: {
    model:
      'Measurement-based CANMAT 2023 course. First-line psychotherapies for MDD are CBT, Behavioural Activation (BA) and Interpersonal Psychotherapy (IPT); for moderate–severe depression combined pharmacotherapy + psychotherapy is preferred, and MBCT is a first-line relapse-prevention option (especially recurrent depression). Acute → continuation → maintenance phases, guided by PHQ-9.',
    coreMeasures: [
      { tool: 'PHQ-9', kind: 'self-report (9 items, 0–27)', cadence: 'baseline + every 2–4 wk (measurement-based care)',
        interpret: '5/10/15/20 = mild/moderate/mod-severe/severe; response = ≥50% drop; remission = <5. Item 9 flags suicidal ideation — assess directly.', src: [S('PHQ9')], verified: false },
      { tool: 'GAD-7', kind: 'self-report', cadence: 'baseline + periodic',
        interpret: 'Track comorbid anxiety, which is common and worsens prognosis.', src: [S('GAD7')], verified: false },
      { tool: 'Mood-disorder / bipolarity screen', kind: 'clinician-rated', cadence: 'at intake + if activation/worsening on antidepressant',
        interpret: 'Do NOT miss bipolar depression before/while treating — changes both drug and psychotherapy plan.', src: [S('CANMAT_MDD')], verified: false },
    ],
    phases: [
      { phase: 0, name: 'Assessment, psychoeducation & measurement-based-care setup', duration: '1–2 sessions',
        goals: 'Diagnosis & severity; risk/suicidality assessment; bipolarity screen; psychoeducation; shared formulation; agree first-line modality (CBT / BA / IPT) by presentation & preference; set PHQ-9 baseline.',
        techniques: [
          { school: 'CBT', name: 'psychoeducation + cognitive-behavioural formulation', how: 'Explain the depression cycle (low activity → low mood → withdrawal); agree goals; set measurement-based care.', src: [S('BECK_CBT'), S('CANMAT_MDD')] },
          { school: 'IPT', name: 'interpersonal inventory (if interpersonal trigger)', how: 'Map key relationships and a focal problem area (grief, role transition, role dispute, sensitivities).', src: [S('KLERMAN_IPT')] },
        ],
        phaseTarget: 'Diagnosis & risk clarified, bipolarity screened, modality agreed, baseline PHQ-9 recorded.' },
      { phase: 1, name: 'Acute phase — reduce symptoms to response/remission', duration: '~8–16 weekly sessions',
        goals: 'Reverse inactivity & anhedonia; restructure depressive cognition; or resolve the focal interpersonal problem — to response then remission.',
        techniques: [
          { school: 'BA', name: 'behavioural activation & activity scheduling', how: 'Monitor activity–mood links; schedule value- and mastery-based activities; reverse avoidance from the outside-in.', src: [S('MARTELL_BA'), S('CANMAT_MDD')] },
          { school: 'CBT', name: 'cognitive restructuring', how: 'Thought records; identify and test depressive automatic thoughts and core beliefs; behavioural experiments.', src: [S('BECK_CBT')] },
          { school: 'IPT', name: 'focal interpersonal work', how: 'Work the chosen focus (role transition/dispute/grief); link mood to interpersonal events; build support & communication.', src: [S('KLERMAN_IPT')] },
        ],
        phaseTarget: 'PHQ-9 falling toward response (≥50% drop); activity & engagement rising; cognitive/interpersonal targets addressed.' },
      { phase: 2, name: 'Continuation — consolidate remission & tackle residuals', duration: 'continue ~4–9 months after response',
        goals: 'Consolidate to full remission; resolve residual symptoms (sleep, anhedonia, rumination); prevent early relapse.',
        techniques: [
          { school: 'CBT', name: 'residual-symptom & rumination work', how: 'Target leftover cognitions, sleep and rumination; strengthen coping and problem-solving.', src: [S('BECK_CBT'), S('CANMAT_MDD')] },
          { school: 'BA', name: 'sustained activation & routine', how: 'Embed the activity routine into daily life; maintain valued activities as mood improves.', src: [S('MARTELL_BA')] },
        ],
        phaseTarget: 'Full remission (PHQ-9 <5) sustained; residual symptoms minimal; routine self-maintained.' },
      { phase: 3, name: 'Maintenance & relapse prevention', duration: 'variable; boosters',
        goals: 'Prevent recurrence (higher priority with each past episode); build a wellness/relapse plan.',
        techniques: [
          { school: 'MBCT', name: 'mindfulness-based cognitive therapy', how: 'First-line relapse prevention for recurrent depression: decentring from ruminative thought; early-warning-sign awareness.', src: [S('SEGAL_MBCT'), S('CANMAT_MDD')] },
          { school: 'CBT', name: 'relapse-prevention blueprint', how: 'Summarise what helped, early-warning signs and an action plan; taper frequency; schedule boosters.', src: [S('BECK_CBT')] },
        ],
        phaseTarget: 'Written relapse-prevention/wellness plan; maintenance strategy matched to recurrence risk.' },
    ],
    nonResponse: {
      reviewAt: 'Measurement-based review every 2–4 wk; if PHQ-9 has not improved by ~4–6 weeks, reassess before continuing.',
      checklist: [
        'Adequate dose & fidelity (session number, homework/activation adherence)',
        'Missed bipolarity — antidepressant/activation without benefit or with activation',
        'Comorbidity — anxiety, substance use, trauma, personality, medical (thyroid, anaemia)',
        'Ongoing psychosocial maintainer (relationship, work, isolation)',
        'Suicidality / safety re-assessment (PHQ-9 item 9)',
        'Correct modality — is it inactivity (BA), cognition (CBT), or interpersonal (IPT)?',
      ],
      alternatives: [
        { ifX: 'Inactivity & avoidance dominate', switchTo: 'Prioritise Behavioural Activation.', src: [S('MARTELL_BA')] },
        { ifX: 'Interpersonal trigger (loss, role change/dispute) dominates', switchTo: 'Interpersonal Psychotherapy (IPT).', src: [S('KLERMAN_IPT')] },
        { ifX: 'Recurrent depression / relapse prevention focus', switchTo: 'MBCT (first-line relapse prevention).', src: [S('SEGAL_MBCT')] },
        { ifX: 'Moderate–severe or psychotherapy-alone inadequate', switchTo: 'Combine with pharmacotherapy (or optimise the antidepressant) per CANMAT.', src: [S('CANMAT_MDD')] },
        { ifX: 'Screen positive for bipolarity', switchTo: 'Re-diagnose & treat as bipolar depression (do not continue unopposed antidepressant).', src: [S('CANMAT_MDD'), S('CANMAT_BD')] },
      ],
    },
    crossSchool: [
      'Activity scheduling — shared by BA and CBT.',
      'Mindfulness / decentring — MBCT ↔ ACT ↔ mindfulness.',
      'Behavioural experiments — CBT ↔ BA.',
      'Measurement-based care (PHQ-9) — across all modalities.',
      'Problem-solving — CBT ↔ IPT interpersonal problem-solving.',
    ],
  },
  GAD: {
    model:
      'Stepped-care CBT course (NICE CG113): assessment & worry formulation → foundational skills (applied relaxation, worry postponement) → high-intensity CBT integrating intolerance-of-uncertainty (Dugas) and metacognitive (Wells) methods with worry/imaginal exposure → relapse prevention. High-intensity psychological therapy and drug treatment are equally effective first-line — choice by patient preference (NICE); benzodiazepines are not maintenance treatment.',
    coreMeasures: [
      { tool: 'GAD-7', kind: 'self-report (7 items, 0–21)', cadence: 'baseline + every session / biweekly',
        interpret: 'Severity & primary tracking (5/10/15 = mild/moderate/severe; ≥10 ≈ probable GAD). Most change-sensitive scale — follow the trend.', src: [S('GAD7')], verified: true },
      { tool: 'PSWQ', kind: 'self-report trait worry (16 items, 16–80)', cadence: 'baseline + every 4–6 wk / at each phase boundary',
        interpret: 'Pathological worry — the core GAD feature (cut-off ≈ 62–65). Changes more slowly than GAD-7; captures the worry construct itself.', src: [S('PSWQ')], verified: true },
      { tool: 'IUS-12', kind: 'self-report mediator (12 items, 12–60)', cadence: 'baseline + Phase-2 boundaries',
        interpret: 'Intolerance of uncertainty — track when using IU-targeted CBT (a mechanism/mediator, not a severity index).', src: [S('IUS12'), S('DUGAS_IU')], verified: true },
      { tool: 'PHQ-9', kind: 'self-report', cadence: 'baseline + biweekly',
        interpret: 'Screens the very common comorbid depression; a dominant depressive picture changes the plan.', src: [S('GAD7')], verified: true },
    ],
    phases: [
      { phase: 0, name: 'Assessment, psychoeducation & worry formulation (NICE Step 1)', duration: '1–2 sessions',
        goals: 'Comprehensive assessment (severity, impairment, comorbidity, substance/caffeine, risk); psychoeducation about GAD & the worry cycle; a shared cognitive formulation (intolerance-of-uncertainty / metacognitive model); orient to stepped care; set outcome measures & active monitoring.',
        techniques: [
          { school: 'CBT', name: 'psychoeducation + worry-cycle formulation', how: 'Explain GAD and how avoidance, checking and reassurance maintain the worry cycle; build a shared IU/metacognitive formulation; agree goals.', src: [S('BECK_CBT'), S('NICE_GAD')] },
          { school: 'CBT', name: 'active monitoring & stepped-care orientation', how: 'Record baseline GAD-7/PSWQ; explain least-intrusive-first stepped care and that high-intensity therapy vs medication are equally effective (choice by preference).', src: [S('NICE_GAD')] },
        ],
        phaseTarget: 'Patient understands the worry model, has a shared formulation & goals, baseline measures recorded, and is oriented to stepped care.' },
      { phase: 1, name: 'Foundational skills — low-intensity (NICE Step 2)', duration: 'typically 4–6 weeks',
        goals: 'Build regulation & worry-management skills; guided self-help for milder presentations; lower physiological arousal and worry frequency before deeper cognitive work.',
        techniques: [
          { school: 'Applied relaxation', name: 'Öst applied-relaxation progression', how: 'Progressive → release-only → cue-controlled → rapid → applied relaxation, rehearsed until it can be deployed in real anxiety-provoking situations.', src: [S('OST_RELAX'), S('NICE_GAD')] },
          { school: 'CBT', name: 'worry postponement / worry period', how: 'Defer worry to a scheduled 15–20 min "worry time"; note the worry and return to task, breaking all-day rumination.', src: [S('BECK_CBT'), S('WELLS_MCT')] },
          { school: 'CBT', name: 'guided self-help + sleep/caffeine hygiene', how: 'CBT-based self-help materials; cut caffeine, protect sleep, reduce reassurance-seeking.', src: [S('NICE_GAD')] },
          { school: 'Vagal', name: 'bottom-up arousal down-regulation', how: 'Slow-paced (~6/min) resonance breathing / HRV biofeedback as an autonomic adjunct (see VAGAL_TONING).', src: [S('HRVB')] },
        ],
        phaseTarget: 'GAD-7 trending down; a usable relaxation/worry-postponement skill in daily use; arousal & caffeine addressed.' },
      { phase: 2, name: 'High-intensity CBT — core (NICE Step 3)', duration: '12–15 weekly 1-hr sessions',
        goals: 'Restructure worry beliefs and reduce the processes that maintain GAD: intolerance of uncertainty, negative metacognitive beliefs, cognitive avoidance and safety/reassurance behaviours.',
        techniques: [
          { school: 'CBT', name: 'cognitive restructuring of worry', how: 'Thought records; test probability/cost of feared outcomes; separate productive problem-solving from unproductive worry.', src: [S('BECK_CBT')] },
          { school: 'IU-CBT', name: 'intolerance-of-uncertainty work (Dugas)', how: 'Target the function of worry; problem-orientation training; behavioural uncertainty exposure (acting without certainty); reduce cognitive avoidance.', src: [S('DUGAS_IU'), S('VDHEIDEN2012')] },
          { school: 'MCT', name: 'metacognitive therapy (Wells)', how: 'Challenge positive & negative metacognitive beliefs (uncontrollability/danger of worry); detached mindfulness; drop worry as a coping strategy.', src: [S('WELLS_MCT'), S('VDHEIDEN2012')] },
          { school: 'CBT', name: 'worry/imaginal exposure + behavioural experiments', how: 'Imaginal exposure to the core feared image to habituation; experiments dropping checking/reassurance/overpreparation.', src: [S('BECK_CBT')] },
        ],
        phaseTarget: 'PSWQ & IUS falling; safety/reassurance behaviours largely dropped; worry experienced as controllable and non-dangerous.' },
      { phase: 3, name: 'Relapse prevention, values & functioning', duration: 'final 2–4 sessions + boosters',
        goals: 'Consolidate gains, prevent relapse, and re-engage valued life activity.',
        techniques: [
          { school: 'CBT', name: 'relapse-prevention blueprint', how: 'Summarise what helped, early-warning signs and an if-worry-returns plan; taper session frequency; schedule boosters.', src: [S('BECK_CBT'), S('NICE_GAD')] },
          { school: 'ACT', name: 'values & committed action', how: 'Clarify values and take committed action toward them, letting worry be present without controlling behaviour (defusion, acceptance).', src: [S('HAYES_ACT'), S('HARRIS_ACT')] },
        ],
        phaseTarget: 'Gains maintained off weekly therapy; a written relapse-prevention plan; return to valued roles/activities.' },
    ],
    nonResponse: {
      reviewAt: 'Review at each phase boundary; if GAD-7 is not improving by ~6–8 weeks of high-intensity CBT, reassess before continuing.',
      checklist: [
        'Homework & exposure adherence — is uncertainty/worry exposure actually happening?',
        'Residual safety / reassurance / checking behaviours maintaining worry',
        'Correct model — IU-driven vs metacognitive (worry-about-worry)?',
        'Caffeine / alcohol / poor sleep sustaining arousal',
        'Missed comorbidity — depression, panic, social anxiety, substance use',
        'Adequate dose & manual fidelity (12–15 sessions)',
        'Diagnostic accuracy — GAD vs primary depression vs health anxiety',
      ],
      alternatives: [
        { ifX: 'Dominant worry-about-worry / metacognitive beliefs', switchTo: 'Metacognitive Therapy (Wells) — numerically strongest in head-to-head RCT.', src: [S('WELLS_MCT'), S('VDHEIDEN2012')] },
        { ifX: 'Uncertainty-driven worry & cognitive avoidance', switchTo: 'Intolerance-of-Uncertainty therapy (Dugas).', src: [S('DUGAS_IU')] },
        { ifX: 'Cannot engage cognitive work / prefers a somatic route', switchTo: 'Applied relaxation as the primary high-intensity option (NICE-equivalent).', src: [S('OST_RELAX'), S('NICE_GAD')] },
        { ifX: 'Partial response to high-intensity CBT', switchTo: 'Add an SSRI/SNRI (combined treatment) or refer to Step 4.', src: [S('NICE_GAD'), S('SLEE2019')] },
        { ifX: 'Dominant comorbid depression', switchTo: 'Treat the depression first (CBT-D / antidepressant), then reassess GAD.', src: [S('NICE_GAD')] },
      ],
    },
    crossSchool: [
      'Worry postponement — shared by CBT and MCT.',
      'Detached mindfulness / defusion — MCT ↔ ACT ↔ mindfulness (MBCT).',
      'Exposure principle — worry/imaginal exposure ↔ interoceptive exposure ↔ ERP logic.',
      'Applied relaxation ↔ vagal/HRV down-regulation ↔ DBT distress-tolerance arousal skills.',
      'Behavioural experiments — CBT ↔ IU-therapy ↔ metacognitive tests.',
    ],
  },
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
    { name: 'Resonance-frequency / slow-paced breathing', grade: 'B', how: '~6 breaths/min (individual resonance ~4.5–7 bpm ≈ 0.1 Hz); inhale ~4 s / exhale ~6 s; exhale longer than inhale; 10–20 min daily.', steps: ['Sit upright, one hand on the belly.', 'Inhale gently through the nose for ~4 seconds, letting the belly rise.', 'Exhale slowly through pursed lips for ~6 seconds (exhale longer than inhale).', 'Aim for about 6 breaths per minute; find the pace that feels smoothest.', 'Continue 10–20 minutes; stop if light-headed.'], src: [S('HRVB')] },
    { name: 'HRV biofeedback', grade: 'B', how: 'Same breathing with an HRV display/app to find and train the personal resonance frequency over weeks.', steps: ['Wear/connect an HRV sensor or app.', 'Breathe slowly and watch the HRV/heart-rate curve.', 'Adjust the rate (between ~4.5–7 bpm) until the curve swings widest — that is your resonance frequency.', 'Train at that rate ~20 min/day over several weeks.'], src: [S('HRVB')] },
    { name: 'Extended-exhale / physiological sigh', grade: 'C', how: 'Double inhale then a long slow exhale; rapid acute down-regulation for arousal spikes.', steps: ['Take a normal inhale through the nose.', 'Add a short second sip of air on top (double inhale).', 'Release a long, slow exhale through the mouth.', 'Repeat 1–3 times for a fast reset during a spike.'], src: [S('HRVB')] },
    { name: 'Humming / chanting / gargling', grade: 'C', how: 'Laryngeal–pharyngeal vagal activation via a prolonged voiced exhale.', src: [S('HRVB')] },
    { name: 'Cold exposure (diving reflex)', grade: 'C', how: 'Cold water on the face / brief cold → parasympathetic surge; overlaps DBT TIPP. Caution with cardiac disease.', steps: ['Fill a bowl with cold water (or use a cold pack wrapped in cloth).', 'Hold your breath and lower the face (forehead + eyes area) into the water for ~15–30 s.', 'Repeat 1–3 times.', 'Avoid if you have cardiac disease or an eating disorder without clinician sign-off.'], src: [S('HRVB')] },
  ],
  integratesWith: 'Slots into DBT distress-tolerance (TIPP), ACT/mindfulness, applied relaxation, and Stage-1 arousal regulation.',
  cautions: 'Avoid over-breathing (can trigger vagal withdrawal); cold-exposure caution with cardiac disease; adjunct only — does not replace evidence-based psychotherapy.',
  bodyBased: [
    { name: 'Vocal humming / toning', grade: 'B', how: 'Long soft hum (or "mmm"/OM) on a slow exhale, 5–10 min.', why: 'The long exhale + throat vibration push the body into the parasympathetic "rest" state and raise HRV.', steps: ['Sit comfortably, lips gently closed.', 'Inhale slowly through the nose.', 'On the exhale, hum one steady low note for the whole out-breath (~7–10 s), feeling the buzz in throat/face.', 'Repeat for 5–10 minutes.'], src: [S('KOMORI2018'), S('GHATI2021')] },
    { name: 'Gargling', grade: 'C', how: 'Gargle water at the back of the throat, making sound, ~30–60 s.', why: 'Engages the throat/pharyngeal muscles that lie along the vagal pathway.', steps: ['Take a mouthful of water.', 'Tilt the head back slightly and gargle vigorously, making sound.', 'Continue for as long as comfortable (aim ~30–60 s total).', 'Spit out; repeat a couple of times.'], src: [S('GHATI2021')] },
    { name: 'Warm facial expression', grade: 'C', how: 'Deliberately soften the face into a calm/gentle expression.', why: 'Adopting a calm expression can nudge the felt emotion in the same direction (facial feedback).', steps: ['Unclench the jaw and soften around the eyes.', 'Let a gentle half-smile form.', 'Hold ~30–60 s while breathing slowly.', 'Notice any shift in how you feel.'], src: [S('LEVENSON1990')] },
    { name: 'Self-soothing touch', grade: 'B', how: 'Hand on heart / gentle self-hug / slow arm stroking with slow breathing.', why: 'Safe self-touch lowers cortisol and cues a sense of safety.', steps: ['Place one hand on the heart, the other on the belly (or give yourself a light arm-hug).', 'Breathe slowly, exhaling longer than you inhale.', 'Optionally add a calming phrase ("I am safe").', 'Stay 1–3 minutes.'], src: [S('DREISOERNER2021')] },
    { name: 'Eye orienting / horizon scan', grade: 'C', how: 'Slowly move the gaze around the room / trace a figure-8, letting vision widen. Do NOT press on the eyes.', why: 'Widening the visual field out of stress "tunnel vision" signals the surroundings are safe.', steps: ['Keeping the head still-ish, slowly let the eyes travel around the room.', 'Trace a slow figure-8 in the air with the gaze.', 'Let peripheral vision widen; name a few things you see.', 'Never press on the eyeballs.'], src: [S('VANDEKAMP2019')] },
    { name: 'Gentle neck & shoulder movement', grade: 'C', how: 'Slow neck turns/stretches and shoulder rolls paced with the breath.', why: 'Releases neck tension and pairs movement with slow breathing to lower arousal.', steps: ['Slowly turn the head to one side on an exhale, return on an inhale; repeat both sides.', 'Roll the shoulders backward a few times.', 'Gently tilt the ear toward the shoulder, holding a soft stretch.', 'Keep every movement slow and within comfort.'], src: [S('VANDEKAMP2019')] },
    { name: 'Paced pushing movements', grade: 'C', how: 'Push the arms outward on a slow exhale, syncing movement to breath, a few rounds.', why: 'Active movement + paced breath helps discharge fight/flight arousal (bottom-up).', steps: ['Bring both hands up near the chest.', 'On a slow exhale, push the palms firmly outward in front of you.', 'On the inhale, draw the hands back in.', 'Sync each push to an exhale for 1–2 minutes.'], src: [S('VANDEKAMP2019'), S('JINDANI2015')] },
    { name: 'Gentle rocking', grade: 'C', how: 'Slow rocking of the pelvis/spine (lying or seated) at your own rhythm.', why: 'Gentle rhythmic movement helps shift the body out of a frozen/shut-down state.', steps: ['Sit or lie comfortably.', 'Begin a small, slow rocking of the pelvis/spine side-to-side or front-to-back.', 'Let the rhythm be self-chosen and soothing.', 'Continue 1–3 minutes, breathing slowly.'], src: [S('VANDEKAMP2019')] },
    { name: 'Diaphragmatic (belly) breathing', grade: 'B', how: 'Slow belly breaths, exhale longer than inhale, optionally with gentle side movement.', why: 'Slow diaphragmatic breathing directly raises vagal tone.', steps: ['Place a hand on the belly.', 'Inhale through the nose so the belly (not the chest) rises.', 'Exhale slowly and fully, longer than the inhale.', 'Continue 5–10 minutes.'], src: [S('KOMORI2018')] },
    { name: 'Grounding / orienting body scan', grade: 'C', how: 'Feel feet/seat support, name what you see–hear–touch, scan the body slowly.', why: 'Anchoring attention in present sensation and surroundings calms hyperarousal.', steps: ['Feel the feet on the floor and the seat supporting you.', 'Name 3 things you can see, 3 you can hear, 3 you can touch.', 'Slowly move attention through the body from feet to head, noticing sensations without judging.', 'Finish with a slow exhale.'], src: [S('VANDEKAMP2019')] },
  ],
  excludedManeuvers: 'EXCLUDED from self-practice (these are medical vagal maneuvers, NOT toning exercises): the Valsalva maneuver (hypotension/syncope risk; avoid in cardiac disease) and eyeball / eye-socket pressure (oculocardiac reflex → bradycardia/syncope).',
};

/* ════════════════════════════════════════════════════════════════════════
   TECHNIQUE_LIBRARY — deterministic, step-by-step protocols for the specific
   psychotherapy techniques used across schools. Each technique carries its
   school, indication (whenToUse), who delivers it, ordered steps, and source
   (canonical manual). DISORDER_TECHNIQUES maps each disorder → the technique
   ids it draws on. Content is manualised (from sources), not model-generated.
   ════════════════════════════════════════════════════════════════════════ */
export const TECHNIQUE_LIBRARY = {
  /* ── CBT ──────────────────────────────────────────────────────────────── */
  cbt_thought_record: { name: 'Cognitive restructuring (thought record)', school: 'CBT', deliveredBy: 'clinician → self',
    whatItIs: 'Identify, test and re-evaluate distorted automatic thoughts on a written record.',
    whenToUse: 'Negative automatic thoughts / cognitive distortions driving low mood, worry or self-criticism.',
    steps: ['Note the situation and the emotion (rate intensity 0–100%).', 'Write the hot automatic thought and how much you believe it (0–100%).', 'List evidence FOR the thought.', 'List evidence AGAINST it.', 'Write a balanced, more accurate alternative thought.', 'Re-rate belief in the original thought and the emotion.'], src: [S('BECK_CBT')] },
  cbt_behavioral_activation: { name: 'Behavioural activation', school: 'CBT', deliveredBy: 'clinician → self',
    whatItIs: 'Re-engage with rewarding/meaningful activity to break the withdrawal–low-mood cycle.',
    whenToUse: 'Depressive withdrawal, anhedonia, avoidance, inactivity.',
    steps: ['Monitor current activities and mood for a few days (activity log).', 'Identify avoided or dropped activities linked to mastery or pleasure.', 'Rank them from easiest to hardest.', 'Schedule small activities into specific time slots — act by plan, not by mood.', 'Do them regardless of motivation; rate mastery/pleasure afterwards.', 'Review and grade up gradually.'], src: [S('BECK_CBT'), S('CANMAT_MDD')] },
  cbt_behavioral_experiment: { name: 'Behavioural experiment', school: 'CBT', deliveredBy: 'clinician → self',
    whatItIs: 'Test a specific fearful prediction against reality in a planned action.',
    whenToUse: 'A concrete catastrophic prediction that can be checked in the real world.',
    steps: ['State the belief/prediction precisely and rate belief (0–100%).', 'Design an experiment that would confirm or disconfirm it.', 'Predict what you fear will happen.', 'Carry it out and record what ACTUALLY happened.', 'Compare outcome vs prediction; draw a conclusion; re-rate belief.'], src: [S('BECK_CBT')] },
  cbt_graded_exposure: { name: 'Graded exposure hierarchy', school: 'CBT', deliveredBy: 'clinician → self',
    whatItIs: 'Systematic, repeated approach to avoided situations from easiest to hardest.',
    whenToUse: 'Avoidance driven by fear (phobic/anxious avoidance).',
    steps: ['List avoided situations; rate each for anxiety (SUDS 0–100).', 'Order them into a ladder from mildest to most feared.', 'Start at a manageable step; stay in the situation until anxiety drops meaningfully.', 'Repeat the step until it is easy, dropping all safety behaviours.', 'Move up the ladder one step at a time.'], src: [S('BECK_CBT'), S('BAP_ANX')] },
  cbt_worry_postponement: { name: 'Worry postponement ("worry time")', school: 'CBT', deliveredBy: 'clinician → self',
    whatItIs: 'Contain worry to a scheduled window instead of all-day rumination.',
    whenToUse: 'Pervasive uncontrollable worry (GAD).',
    steps: ['Set a fixed 15–20 min "worry period" at the same time daily (not near bedtime).', 'When a worry appears during the day, note it and postpone it to the worry period.', 'Return attention to the current task.', 'In the worry period, review the noted worries and problem-solve the controllable ones.', 'Let go of what is not controllable or no longer relevant.'], src: [S('NICE_GAD'), S('BAP_ANX')] },
  cbt_problem_solving: { name: 'Structured problem-solving', school: 'CBT', deliveredBy: 'clinician → self',
    whatItIs: 'A stepwise method to convert worry into action on solvable problems.',
    whenToUse: 'Real, solvable problems fuelling worry or low mood.',
    steps: ['Define the problem concretely.', 'Brainstorm all possible solutions without judging them.', 'Weigh pros/cons of the best few.', 'Choose one and make a specific action plan.', 'Carry it out, then review and adjust.'], src: [S('NICE_GAD')] },
  cbt_interoceptive_exposure: { name: 'Interoceptive / uncertainty exposure', school: 'CBT', deliveredBy: 'clinician → self',
    whatItIs: 'Deliberately evoke feared bodily sensations or sit with uncertainty to reduce their threat value.',
    whenToUse: 'Fear of physical sensations or intolerance of uncertainty.',
    steps: ['Identify the feared sensation (e.g. racing heart) or uncertainty trigger.', 'Induce it safely (e.g. brief exertion) or deliberately leave something uncertain.', 'Stay with the sensation/uncertainty without neutralising or reassurance-seeking.', 'Let it rise and fall; notice it is uncomfortable, not dangerous.', 'Repeat until the charge fades.'], src: [S('BAP_ANX')] },

  /* ── DBT ──────────────────────────────────────────────────────────────── */
  dbt_mindfulness: { name: 'DBT mindfulness (what/how skills, wise mind)', school: 'DBT', deliveredBy: 'clinician → self',
    whatItIs: 'Core skill of present-moment, non-judgemental awareness; access "wise mind".',
    whenToUse: 'Foundation skill for all of Stage 1; emotional overwhelm, impulsivity.',
    steps: ['OBSERVE: just notice the experience without words.', 'DESCRIBE: put words to the facts (not interpretations).', 'PARTICIPATE: throw yourself fully into the activity.', 'Do it ONE-MINDFULLY, NON-JUDGEMENTALLY, and EFFECTIVELY (what works).', 'Locate "wise mind" — the balance of emotion mind and reasonable mind.'], src: [S('LINEHAN_DBT')] },
  dbt_tipp: { name: 'Distress tolerance — TIPP', school: 'DBT', deliveredBy: 'self',
    whatItIs: 'Rapidly lower extreme arousal via body physiology in a crisis.',
    whenToUse: 'Crisis-level distress / urges to self-harm, when skills-thinking is offline.',
    steps: ['TEMPERATURE: put the face in cold water / hold a cold pack ~30 s (diving reflex).', 'INTENSE EXERCISE: brief vigorous movement for a few minutes.', 'PACED BREATHING: slow the breath, exhale longer than inhale.', 'PAIRED MUSCLE RELAXATION: tense on the inhale, release on the exhale.'], src: [S('LINEHAN_DBT')] },
  dbt_radical_acceptance: { name: 'Radical acceptance', school: 'DBT', deliveredBy: 'clinician → self',
    whatItIs: 'Fully accept reality as it is to stop suffering added by fighting it.',
    whenToUse: 'Unchangeable painful facts that are being resisted.',
    steps: ['Notice you are fighting reality ("it shouldn\u2019t be this way").', 'Remind yourself the facts are what they are, whatever their cause.', 'Practise willingness rather than wilfulness.', 'Accept with the whole self (mind, body, "half-smile", willing hands).', 'Turn the mind back to acceptance each time you drift.'], src: [S('LINEHAN_DBT')] },
  dbt_opposite_action: { name: 'Opposite action', school: 'DBT', deliveredBy: 'clinician → self',
    whatItIs: 'Act opposite to an unjustified emotion\u2019s action urge to change the emotion.',
    whenToUse: 'The emotion does not fit the facts, or acting on it is ineffective.',
    steps: ['Name the emotion and its action urge.', 'Check the facts: does the emotion fit, and is acting on it effective?', 'If not, identify the opposite action.', 'Do the opposite ALL THE WAY (posture, words, thoughts included).', 'Repeat until the emotion shifts.'], src: [S('LINEHAN_DBT')] },
  dbt_check_the_facts: { name: 'Check the facts', school: 'DBT', deliveredBy: 'clinician → self',
    whatItIs: 'Test whether an emotion fits the actual facts of a situation.',
    whenToUse: 'Emotion feels overwhelming or possibly out of proportion.',
    steps: ['Name the emotion.', 'Describe the triggering event in facts only.', 'Identify your interpretations/assumptions about it.', 'Check whether those interpretations fit the facts (consider alternatives).', 'Decide whether the emotion (and its intensity) is justified.'], src: [S('LINEHAN_DBT')] },
  dbt_please: { name: 'Emotion regulation — PLEASE (reduce vulnerability)', school: 'DBT', deliveredBy: 'self',
    whatItIs: 'Protect the body to lower baseline emotional vulnerability.',
    whenToUse: 'Chronic emotional vulnerability; ongoing self-care collapse.',
    steps: ['PL — treat PhysicaL illness.', 'E — balanced Eating.', 'A — Avoid mood-altering substances.', 'S — balanced Sleep.', 'E — get Exercise.'], src: [S('LINEHAN_DBT')] },
  dbt_dear_man: { name: 'Interpersonal effectiveness — DEAR MAN', school: 'DBT', deliveredBy: 'clinician → self',
    whatItIs: 'A script to ask for something or say no while keeping self-respect and the relationship.',
    whenToUse: 'Asserting a need, making a request, or refusing.',
    steps: ['DESCRIBE the situation in facts.', 'EXPRESS your feelings/opinion clearly ("I feel\u2026").', 'ASSERT — ask clearly or say no clearly.', 'REINFORCE — note the benefit to the other of agreeing.', '(stay) MINDFUL — keep to the point, ignore attacks.', 'APPEAR confident.', 'NEGOTIATE — be willing to give to get.'], src: [S('LINEHAN_DBT')] },
  dbt_chain_analysis: { name: 'Behavioural chain analysis', school: 'DBT', deliveredBy: 'clinician',
    whatItIs: 'Map the precise chain from vulnerability → prompting event → links → target behaviour → consequences.',
    whenToUse: 'After any target behaviour (self-harm, therapy-interfering, quality-of-life).',
    steps: ['Define the target behaviour precisely.', 'Identify the prompting event and prior vulnerability factors.', 'Walk the chain of thoughts, feelings, sensations and actions link by link.', 'Identify the consequences that reinforce the behaviour.', 'At each link, insert a more skilful alternative and a repair.'], src: [S('LINEHAN_DBT')] },
  dbt_diary_card: { name: 'Diary card', school: 'DBT', deliveredBy: 'self',
    whatItIs: 'Daily self-monitoring of urges, behaviours, emotions and skills used.',
    whenToUse: 'Throughout Stage 1 as the measurement backbone.',
    steps: ['Each day, rate key emotions and urges (0–5).', 'Record any target behaviours (self-harm, substance use, etc.) and whether acted on.', 'Tick which skills you used.', 'Bring the card to each session to drive chain analysis and review.'], src: [S('LINEHAN_DBT')] },

  /* ── ACT ──────────────────────────────────────────────────────────────── */
  act_dropping_anchor: { name: 'Dropping anchor (ACE)', school: 'ACT', deliveredBy: 'clinician → self',
    whatItIs: 'A grounding drill to steady yourself in an emotional storm — this is the ACT "anchoring".',
    whenToUse: 'High arousal, overwhelm, dissociation; to regain footing before other work.',
    steps: ['A — ACKNOWLEDGE your inner experience (name the thoughts/feelings present).', 'C — COME BACK to the body (push feet to floor, straighten spine, slow breath, press palms).', 'E — ENGAGE in the world (notice what you can see, hear, touch, smell around you).', 'Cycle A-C-E a few times; let the feeling be there while you regain control of your actions.'], src: [S('HARRIS_ACT')] },
  act_cognitive_defusion: { name: 'Cognitive defusion', school: 'ACT', deliveredBy: 'clinician → self',
    whatItIs: 'Create distance from thoughts so they lose their grip, without disputing their content.',
    whenToUse: 'Fusion with sticky, self-critical or worry thoughts.',
    steps: ['Notice the sticky thought.', 'Add the prefix: "I\u2019m having the thought that\u2026".', 'Or silently thank the mind, name the story, or say the word repeatedly until it loses meaning.', 'Let the thought come and go without obeying or arguing with it.', 'Return attention to valued action.'], src: [S('HAYES_ACT'), S('HARRIS_ACT')] },
  act_values_clarification: { name: 'Values clarification', school: 'ACT', deliveredBy: 'clinician → self',
    whatItIs: 'Identify what truly matters to guide committed action.',
    whenToUse: 'Loss of direction, avoidance-driven living, depression.',
    steps: ['Across life domains (relationships, work, health, leisure), ask "what do I want to stand for here?".', 'Distinguish values (ongoing directions) from goals (achievable end-points).', 'Pick one or two values that feel alive and neglected.', 'Translate into a small concrete action for this week.'], src: [S('HAYES_ACT')] },
  act_committed_action: { name: 'Committed action', school: 'ACT', deliveredBy: 'clinician → self',
    whatItIs: 'Take values-guided action, and persist, while making room for discomfort.',
    whenToUse: 'Turning values into sustained behaviour change.',
    steps: ['Pick a value and a specific, achievable goal from it.', 'Break it into a small next step with a time and place.', 'Anticipate the barriers (thoughts/feelings) and plan to make room for them.', 'Act; review; set the next step.'], src: [S('HAYES_ACT')] },
  act_acceptance_willingness: { name: 'Acceptance / willingness', school: 'ACT', deliveredBy: 'clinician → self',
    whatItIs: 'Open up to and make room for unwanted feelings instead of struggling with them.',
    whenToUse: 'Experiential avoidance driving anxiety, worry or urges.',
    steps: ['Notice and name the unwanted feeling and where it sits in the body.', 'Drop the struggle — stop trying to push it away.', 'Breathe into it and make space for it; observe it with curiosity.', 'Allow it to be present while you keep doing what matters.'], src: [S('HAYES_ACT')] },
  act_self_as_context: { name: 'Observer self (self-as-context)', school: 'ACT', deliveredBy: 'clinician → self',
    whatItIs: 'Contact the part of you that notices experience but is not defined by it.',
    whenToUse: 'Over-identification with self-stories ("I am worthless").',
    steps: ['Notice you are noticing your thoughts and feelings.', 'Recognise a continuous "observing you" that has been present across your life.', 'Hold self-judgements as passing content, seen by the observer.', 'Rest attention in that noticing perspective.'], src: [S('HAYES_ACT')] },

  /* ── Schema ───────────────────────────────────────────────────────────── */
  schema_mode_dialogue: { name: 'Mode work / mode awareness', school: 'Schema', deliveredBy: 'clinician',
    whatItIs: 'Identify and work with the active "modes" — vulnerable child, angry/impulsive child, punitive/demanding parent, detached protector, healthy adult.',
    whenToUse: 'Identity/relational instability; rapid mode switches (BPD).',
    steps: ['Map the patient\u2019s characteristic modes and their triggers.', 'Name the mode active in the moment.', 'Address each mode differently — soothe the vulnerable child, limit the punitive parent, bypass the detached protector.', 'Strengthen and coach the Healthy Adult to lead.'], src: [S('YOUNG_SCHEMA'), S('ARNTZ_SCHEMA')] },
  schema_chair_work: { name: 'Chair work (mode / empty-chair dialogue)', school: 'Schema', deliveredBy: 'clinician',
    whatItIs: 'Use separate chairs to externalise and dialogue between modes/parts (origin: Gestalt; used in Schema & EFT — NOT DBT).',
    whenToUse: 'To confront the punitive-parent mode, give voice to the vulnerable child, or resolve conflict between parts.',
    steps: ['Assign each mode/part its own chair.', 'Have the patient speak from one chair as that mode.', 'Switch chairs to voice the other mode/part.', 'Coach the Healthy-Adult chair to answer back to the punitive mode and protect the vulnerable child.', 'Debrief what shifted.'], src: [S('ARNTZ_SCHEMA')] },
  schema_imagery_rescripting: { name: 'Imagery rescripting', school: 'Schema', deliveredBy: 'clinician',
    whatItIs: 'Re-enter a distressing memory in imagery and change its outcome to meet the unmet need.',
    whenToUse: 'Early-life memories fuelling current schemas (deliver only when stabilised).',
    steps: ['Bring up the distressing image/memory and the felt emotion.', 'Identify the unmet need of the child in that scene.', 'Re-enter the image; a protective figure (therapist/Healthy Adult) intervenes.', 'Rescript the scene so the need is met and the vulnerable child is protected.', 'Close on safety and debrief.'], src: [S('ARNTZ_SCHEMA')] },
  schema_limited_reparenting: { name: 'Limited reparenting', school: 'Schema', deliveredBy: 'clinician',
    whatItIs: 'Within professional bounds, the therapist partially meets core unmet emotional needs to build the Healthy Adult.',
    whenToUse: 'Throughout schema work for BPD as the relational stance.',
    steps: ['Identify the core unmet needs (safety, validation, limits).', 'Provide attuned validation and consistent, reliable boundaries.', 'Actively counter the punitive-parent messages.', 'Gradually transfer the reparenting function to the patient\u2019s own Healthy Adult.'], src: [S('YOUNG_SCHEMA')] },

  /* ── ERP / OCD cognitive ─────────────────────────────────────────────── */
  erp_hierarchy: { name: 'ERP exposure hierarchy (with SUDS)', school: 'ERP', deliveredBy: 'clinician → self',
    whatItIs: 'Build a ranked ladder of obsessional triggers to work through with response prevention.',
    whenToUse: 'OCD — the planning stage of ERP.',
    steps: ['List obsessional triggers and the rituals each provokes.', 'Rate each trigger for distress (SUDS 0–100).', 'Order them into a hierarchy from least to most distressing.', 'Agree the response-prevention rule for each (which ritual to resist).'], src: [S('FOA_ERP'), S('APA_OCD')] },
  erp_exposure_response_prevention: { name: 'Exposure & response prevention', school: 'ERP', deliveredBy: 'clinician → self',
    whatItIs: 'Face the trigger and deliberately NOT perform the compulsion/neutralising, letting distress habituate.',
    whenToUse: 'OCD — the core, evidence-based treatment technique.',
    steps: ['Choose a hierarchy step and expose yourself to the trigger.', 'Do NOT perform the ritual, avoidance, or covert neutralising.', 'Stay with the distress; rate SUDS periodically as it falls.', 'Remain until distress drops substantially and stays down.', 'Repeat the same step daily until it is easy, then move up.'], src: [S('FOA_ERP'), S('APA_OCD')] },
  erp_eliminate_reassurance: { name: 'Eliminating reassurance & neutralising', school: 'ERP', deliveredBy: 'clinician → self',
    whatItIs: 'Systematically drop reassurance-seeking, checking and mental neutralising that maintain OCD.',
    whenToUse: 'Alongside ERP; reassurance-seeking present.',
    steps: ['List all reassurance/checking/neutralising behaviours (overt and covert).', 'Brief family to stop giving reassurance (respond with an agreed neutral line).', 'When the urge to seek reassurance arises, delay then drop it.', 'Tolerate the uncertainty as part of the exposure.'], src: [S('FOA_ERP')] },
  ocd_cognitive: { name: 'Cognitive therapy for OCD', school: 'CBT', deliveredBy: 'clinician → self',
    whatItIs: 'Address inflated responsibility, thought–action fusion and overestimation of threat.',
    whenToUse: 'OCD — adjunct to ERP, esp. with strong appraisals.',
    steps: ['Identify the appraisal of the intrusion (e.g. "thinking it = doing it").', 'Normalise intrusive thoughts as universal mental events.', 'Examine the responsibility/threat over-estimate with evidence.', 'Design a behavioural experiment to test the appraisal.'], src: [S('APA_OCD')] },

  /* ── GPM ──────────────────────────────────────────────────────────────── */
  gpm_psychoeducation: { name: 'GPM psychoeducation + interpersonal-coherence formulation', school: 'GPM', deliveredBy: 'clinician',
    whatItIs: 'Medicalise the diagnosis and frame symptoms around interpersonal hypersensitivity.',
    whenToUse: 'BPD — getting started; sets the treatment frame.',
    steps: ['Give the diagnosis openly and explain BPD as treatable with a known improvement course.', 'Explain the interpersonal-hypersensitivity model (rejection/closeness sensitivity drives the crises).', 'Link current symptoms to this model so they make sense.', 'Agree realistic expectations and involve family where useful.'], src: [S('GUNDERSON_GPM')] },
  gpm_build_a_life: { name: '"Build a life" / getting-a-life agenda', school: 'GPM', deliveredBy: 'clinician',
    whatItIs: 'Prioritise work, structure and social adaptation over a patient identity.',
    whenToUse: 'BPD — throughout; especially once safety is established.',
    steps: ['Set an expectation of functioning (work/study/structured activity).', 'Identify a concrete vocational or social step.', 'Problem-solve obstacles pragmatically.', 'Keep sessions oriented to life outside therapy; review progress.'], src: [S('GUNDERSON_GPM')] },

  /* ── MBT ──────────────────────────────────────────────────────────────── */
  mbt_mentalizing_stance: { name: 'Mentalizing (not-knowing) stance', school: 'MBT', deliveredBy: 'clinician',
    whatItIs: 'A curious, not-knowing stance that explores mental states behind behaviour.',
    whenToUse: 'BPD — throughout; when mentalizing is intact.',
    steps: ['Adopt genuine curiosity about what is going on in the patient\u2019s (and others\u2019) mind.', 'Avoid assuming you know; ask and explore alternatives.', 'Slow down interactions to examine feelings and intentions.', 'Model reflective thinking about mental states.'], src: [S('BATEMAN_MBT')] },
  mbt_stop_and_stand: { name: 'Stop-and-stand / affect focus', school: 'MBT', deliveredBy: 'clinician',
    whatItIs: 'Pause when arousal collapses mentalizing, and re-focus on the affect in the room.',
    whenToUse: 'BPD — when high arousal produces non-mentalizing modes.',
    steps: ['Notice mentalizing has broken down (arousal high, thinking rigid).', 'STOP the interaction and stand back ("let\u2019s pause here").', 'Name and focus on the affect currently active between you.', 'Rewind to just before the breakdown and explore it slowly.', 'Resume once mentalizing is restored.'], src: [S('BATEMAN_MBT')] },

  /* ── EMDR (only after Stage-1 stabilisation) ─────────────────────────── */
  emdr_calm_place: { name: 'Calm/safe place', school: 'EMDR', deliveredBy: 'clinician → self',
    whatItIs: 'Install an internal calm-place resource for affect regulation.',
    whenToUse: 'EMDR Phase 2 preparation; general stabilisation.',
    steps: ['Bring to mind a real or imagined place that feels calm and safe.', 'Notice the image, sounds, sensations and the calm feeling.', 'Add a cue word for the place.', 'Strengthen with short sets of slow bilateral stimulation (e.g. self-tapping).', 'Practise returning to it with the cue word.'], src: [S('SHAPIRO_EMDR')] },
  emdr_rdi: { name: 'Resource development & installation (RDI)', school: 'EMDR', deliveredBy: 'clinician',
    whatItIs: 'Build and strengthen internal resources (mastery, protector, nurturer) before trauma processing.',
    whenToUse: 'Extended Phase-2 preparation in complex trauma / BPD.',
    steps: ['Identify the resource needed (mastery, protective, or nurturing figure/experience).', 'Access a vivid memory/image of that resource.', 'Amplify its positive felt sense.', 'Strengthen with short bilateral-stimulation sets.', 'Link a cue word for later access.'], src: [S('SHAPIRO_EMDR')] },
  emdr_reprocessing: { name: '8-phase trauma reprocessing', school: 'EMDR', deliveredBy: 'clinician',
    whatItIs: 'The standard EMDR protocol that reprocesses a target memory with bilateral stimulation.',
    whenToUse: 'ONLY after behavioural control + adequate stabilisation and reliable dual attention.',
    steps: ['Phases 1–2: history, treatment plan, and stabilisation/preparation.', 'Phase 3: activate the target — image, negative & positive cognition, emotion, body sensation, SUDS/VOC.', 'Phase 4: desensitise with sets of bilateral stimulation until SUDS ≈ 0.', 'Phase 5: install the positive cognition; Phase 6: body scan clears residual sensation.', 'Phases 7–8: closure and re-evaluation next session. Hold if dissociation/dyscontrol re-emerges.'], src: [S('SHAPIRO_EMDR')] },

  /* ── IPT ──────────────────────────────────────────────────────────────── */
  ipt_interpersonal_inventory: { name: 'Interpersonal inventory', school: 'IPT', deliveredBy: 'clinician',
    whatItIs: 'Review key relationships to locate the interpersonal focus of depression.',
    whenToUse: 'MDD — early IPT; link mood to an interpersonal problem area.',
    steps: ['Review the important current relationships and their quality.', 'Identify the primary problem area: grief, role transition, role dispute, or interpersonal deficits.', 'Agree a focus tied to the onset/maintenance of the depression.', 'Set interpersonal goals for that area.'], src: [S('KLERMAN_IPT'), S('CANMAT_MDD')] },
  ipt_role_transition: { name: 'Role-transition work', school: 'IPT', deliveredBy: 'clinician',
    whatItIs: 'Grieve the old role and build mastery/attachments in the new one.',
    whenToUse: 'MDD triggered by a life-role change.',
    steps: ['Name the old and new roles.', 'Acknowledge and mourn what was lost in the old role.', 'Identify the demands and opportunities of the new role.', 'Build the skills and supports needed for the new role.'], src: [S('KLERMAN_IPT')] },

  /* ── Relaxation / mindfulness ────────────────────────────────────────── */
  relax_applied_relaxation: { name: 'Applied relaxation (Öst)', school: 'Applied Relaxation', deliveredBy: 'clinician → self',
    whatItIs: 'Train progressive → rapid → cue-controlled relaxation for use in anxiety situations.',
    whenToUse: 'GAD / somatic anxiety; PMDD luteal tension.',
    steps: ['Learn progressive muscle relaxation (tense then release muscle groups).', 'Shorten to release-only relaxation.', 'Add cue-controlled relaxation (pair a cue word with the out-breath).', 'Practise rapid relaxation in neutral daily situations.', 'Apply it in real anxiety-provoking situations.'], src: [S('OST_RELAX'), S('KATZMAN2014')] },
  mbct_mindfulness: { name: 'Mindfulness / MBCT practice', school: 'Mindfulness', deliveredBy: 'clinician → self',
    whatItIs: 'Present-moment awareness and decentering from thoughts; relapse-prevention in depression.',
    whenToUse: 'MDD (esp. recurrent, relapse prevention), GAD, PMDD.',
    steps: ['Practise a daily anchor (breath or body-scan) meditation.', 'When the mind wanders, gently note it and return to the anchor.', 'Decentre: see thoughts as passing mental events, not facts.', 'Use a 3-minute breathing space at stress points in the day.'], src: [S('SEGAL_MBCT')] },

  /* ── PMDD-specific ───────────────────────────────────────────────────── */
  pmdd_symptom_charting: { name: 'Prospective symptom charting', school: 'CBT (PMDD-adapted)', deliveredBy: 'self',
    whatItIs: 'Daily prospective rating to confirm the luteal pattern and track treatment.',
    whenToUse: 'PMDD — confirmation & monitoring (aligns with DRSP).',
    steps: ['Rate key symptoms each evening on a daily record (e.g. DRSP).', 'Mark cycle days / menses onset.', 'Continue across ≥2 cycles.', 'Review the luteal-vs-follicular pattern with the clinician to confirm PMDD and gauge response.'], src: [S('ACOG_PMDD')] },
  pmdd_luteal_coping: { name: 'Luteal-phase coping & scheduling', school: 'CBT (PMDD-adapted)', deliveredBy: 'clinician → self',
    whatItIs: 'Front-load coping skills, relaxation and supportive scheduling into the luteal window.',
    whenToUse: 'PMDD — timed to the premenstrual phase.',
    steps: ['Use charting to anticipate the luteal window.', 'Pre-schedule relaxation, exercise and self-care into those days.', 'Apply cognitive restructuring to premenstrual thoughts (label them as phase-linked).', 'Reduce demands/conflict exposure where possible during the window.', 'Review each cycle and adjust.'], src: [S('ACOG_PMDD')] },
};

/* Which techniques each disorder draws on (ordered by typical use). */
export const DISORDER_TECHNIQUES = {
  MDD:  ['cbt_behavioral_activation', 'cbt_thought_record', 'cbt_behavioral_experiment', 'ipt_interpersonal_inventory', 'ipt_role_transition', 'act_values_clarification', 'act_committed_action', 'act_cognitive_defusion', 'act_dropping_anchor', 'mbct_mindfulness'],
  GAD:  ['cbt_thought_record', 'cbt_worry_postponement', 'cbt_problem_solving', 'cbt_behavioral_experiment', 'cbt_interoceptive_exposure', 'relax_applied_relaxation', 'mbct_mindfulness', 'act_dropping_anchor', 'act_cognitive_defusion', 'act_acceptance_willingness'],
  OCD:  ['erp_hierarchy', 'erp_exposure_response_prevention', 'erp_eliminate_reassurance', 'ocd_cognitive', 'act_cognitive_defusion', 'act_acceptance_willingness'],
  BPD:  ['dbt_mindfulness', 'dbt_tipp', 'dbt_radical_acceptance', 'dbt_opposite_action', 'dbt_check_the_facts', 'dbt_please', 'dbt_dear_man', 'dbt_chain_analysis', 'dbt_diary_card', 'mbt_mentalizing_stance', 'mbt_stop_and_stand', 'schema_mode_dialogue', 'schema_chair_work', 'schema_imagery_rescripting', 'schema_limited_reparenting', 'gpm_psychoeducation', 'gpm_build_a_life', 'act_dropping_anchor', 'emdr_calm_place', 'emdr_rdi', 'emdr_reprocessing'],
  PMDD: ['pmdd_symptom_charting', 'cbt_thought_record', 'pmdd_luteal_coping', 'relax_applied_relaxation', 'mbct_mindfulness'],
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
