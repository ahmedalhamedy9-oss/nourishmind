/* ════════════════════════════════════════════════════════════════════════
   medicalComorbidityEngine.js — DETERMINISTIC medical-comorbidity layer
   ────────────────────────────────────────────────────────────────────────
   PURPOSE
   Psychiatric-drug SELECTION / DOSE-CEILING / CONTRAINDICATION adjustments +
   chrono note + explicit SPECIALTY REFERRAL, driven by the patient's medical
   (non-psychiatric) comorbidities: cardiac/QT · renal · hepatic · diabetes ·
   hypertension · endocrine.

   SCOPE (what this engine OWNS vs what already exists):
     • OWNS   → psychotropic drug choice, dose ceilings, contraindications,
                chrono caveat, and the joint-team referral line.
     • DEFERS → monitoring labs are ALREADY produced by labEngine.js
                (hepatic/renal/cardiac/diabetes/thyroid) — this engine only
                POINTS to them, it does not duplicate.
     • DEFERS → the renal protein cap (0.8 g/kg + nephrology referral) is
                ALREADY produced by mealPlanEngine.js — pointed to, not redone.

   PHILOSOPHY (non-negotiable, per handoff §1):
     • "From sources, not from brain." Every rule carries `src`. The engine
       does NOT invent internal-medicine protocols — it (a) adjusts the
       PSYCHIATRIC plan and (b) refers to the relevant specialty.
     • verified:true is the DEFAULT (source trusted + transcription assumed
       correct) until Dr. Ahmed flips a specific line false on external review.
     • Same input ⇒ byte-identical output, every run. No API.

   STATUS: v0.1-DRAFT (2026-07-01). cardiac_qt = BUILT (sourced). renal /
   hepatic / diabetes / hypertension / endocrine = __pending (shape only,
   NOT fabricated — to be built disease-by-disease then batch-deployed).
   ════════════════════════════════════════════════════════════════════════ */

export const MEDCOMORBID_VERSION = 'v0.1-DRAFT (2026-07-01)';
export const MEDCOMORBID_ACTIVE = true;

/* ── Source registry (add to rxFormulary.RX_SOURCES at wire-up) ──────────── */
export const MED_SRC = {
  FDA_CIT_QT:  'FDA Drug Safety Communication — citalopram (Celexa) & QT/Torsades, 24 Aug 2011; revised 28 Mar 2012 (max 40 mg/day; 20 mg/day if >60 y, hepatic impairment, CYP2C19 poor metaboliser, or CYP2C19 inhibitor; avoid in congenital long-QT, bradycardia, hypokalaemia/hypomagnesaemia, recent MI, uncompensated HF, other QT drugs).',
  MHRA_CIT_ESC:'MHRA / EMA & Health Canada (2011–2014) — escitalopram QT dose limits: max 20 mg/day adults, 10 mg/day in the elderly (≥65 y).',
  AHA_QT:      'Tisdale JE et al. AHA Scientific Statement — drug-induced arrhythmias / QT (Circulation 2020). QTc >500 ms or Δ>60 ms from baseline = risk; risk factors: age ≥65, female, electrolyte derangement (K⁺/Mg²⁺/Ca²⁺), structural heart disease, HFrEF.',
  CREDIBLEMEDS:'CredibleMeds / QTdrugs.org — Known-Risk-of-TdP list (citalopram, escitalopram; among antipsychotics haloperidol, ziprasidone; consult live list per agent).',
  SADHART:     'Glassman AH et al. Sertraline treatment of major depression after acute MI or unstable angina (SADHART). JAMA 2002;288:701-9 — sertraline cardiac safety in CAD.',
  TCA_CARDIAC: 'Manufacturer SmPC / FDA labels for TCAs — cardiotoxicity (quinidine-like conduction slowing); avoid post-MI / in significant conduction disease.',
  SMPC_VENLA:  'Venlafaxine SmPC / FDA label — dose-dependent rise in BP & heart rate; use caution in cardiac disease / uncontrolled hypertension.',
  LICORICE_QT: 'Licorice / glycyrrhizin inhibits renal 11β-HSD2 → pseudohyperaldosteronism (apparent mineralocorticoid excess) → potassium wasting & hypokalaemia → QT prolongation / Torsades. Case series incl. TdP & cardiac arrest (Edwards EDM Case Rep 2019; PMC case reports 2020–2025).',
  O3_AF:       'Marine omega-3 (EPA/DHA) & atrial fibrillation — dose-dependent RCT signal: pharmacologic doses ~1.5–4 g/day raise AF risk (meta-analyses OR ~1.37–1.48; REDUCE-IT, STRENGTH, OMEMI), while dietary doses ≤1 g/day and higher blood levels are neutral/protective. Relevant when the psychiatric supplement layer recommends high-dose EPA.',
  STIM_SUPP:   'CANDIDATE — pending source sign-off: stimulant/"fat-burner" & energy-drink cautions in cardiac/arrhythmia patients (ephedra [FDA-banned], bitter orange/synephrine, high-dose caffeine). Flagged for Dr. Ahmed to source before verified:true.',
  SJW_CYP:     'St John\'s Wort (Hypericum perforatum) — potent CYP3A4 + P-glycoprotein inducer (CredibleMeds interaction advisory; Zhou et al. J Psychopharmacol 2004; Nicolussi et al. Br J Pharmacol 2020). Lowers steady-state levels of digoxin (~25% ↓ AUC), warfarin, ciclosporin, amitriptyline & other CYP3A4/P-gp substrates → therapeutic failure of cardiac drugs; also serotonergic → serotonin-syndrome risk with SSRIs.',

  /* ── renal-unit sources ── */
  KDIGO_2024:  'KDIGO 2024 Clinical Practice Guideline for the Evaluation & Management of CKD — dose drugs by eGFR/CrCl; protein ~0.8 g/kg/day for CKD G3–G5 not on dialysis; monitor eGFR/electrolytes/drug levels; avoid nephrotoxin stacking.',
  FDA_PGB_REN: 'Pregabalin (Lyrica) FDA label Table 2 & StatPearls — dose by CrCl: ≥60 no change; 30–60 reduce ~50%; 15–30 reduce ~75%; <15 reduce ~87.5%; supplemental dose after each haemodialysis session (95% renally excreted; t½ up to 10× longer in impairment).',
  GABA_REN:    'Gabapentin renal dosing (manufacturer labels; renal-impairment dose tables) — max daily ~1500 mg (CKD G3), ~700 mg (CKD G4), ~300 mg (CKD G5), 100–300 mg post-dialysis (≈95% renally excreted).',
  FDA_TOP_REN: 'Topiramate FDA label & PK studies (Bialer; PMID 24725807) — CrCl <70 mL/min → 50% of all standard doses; supplemental dose during haemodialysis. Carbonic-anhydrase inhibitor → type-2 RTA / hyperchloraemic metabolic acidosis (worse in CKD), nephrolithiasis (~1.5%, 2–4× baseline; higher chronic), hypokalaemia.',
  LI_NEPHRO:   'Lithium nephrotoxicity — dose-dependent nephrogenic diabetes insipidus + chronic tubulointerstitial nephropathy; concentration-dependent CKD risk (rising HR with serum level). Keep to lowest effective range 0.6–0.8 mmol/L, avoid >1.0; dose by eGFR, ensure hydration, avoid nephrotoxic co-meds (NSAIDs/diuretics/ACEi raise levels); annual eGFR + albuminuria (Medscape Polypharmacy-in-CKD 2026; Aiff; KDIGO).',
  DULOX_REN:   'Duloxetine — avoid when CrCl/eGFR <30 mL/min (≈2× AUC in ESRD); no adjustment for mild–moderate impairment (≥30) but monitor; if essential in CKD G4–G5 start low 30–40 mg (ERBP; AJKD Core Curriculum 2021).',
  VENLA_REN:   'Venlafaxine/desvenlafaxine — renally cleared parent+active metabolite with prolonged half-life in impairment; reduce dose ~50% in ESRD and ~25–50% in significant impairment (PCNOW; ERBP).',
  SSRI_HYPONA: 'SSRIs (all) — risk of hyponatraemia / SIADH, greater in elderly, on diuretics, or volume-depleted; monitor serum Na⁺ (+BUN/creatinine). Sertraline is a reasonable, well-tolerated SSRI choice in CKD (FDA/SmPC class labelling; ERBP).',

  /* ── hepatic-unit sources ── */
  DILI_AD:     'Antidepressant-induced liver injury (Voican et al. Am J Psychiatry 2014; LiverTox/NIH). Highest hepatotoxicity: nefazodone, MAOIs, TCAs (imipramine/amitriptyline), duloxetine, bupropion, trazodone, tianeptine, agomelatine. Lowest: citalopram, escitalopram, paroxetine, fluvoxamine. Aminotransferase surveillance essential.',
  DULOX_HEP:   'Duloxetine FDA label — contraindicated in patients with substantial alcohol use or chronic liver disease / any hepatic insufficiency (≈3× AUC in cirrhosis; DILI incl. fulminant failure). Do NOT use.',
  VALP_HEP:    'Valproate/divalproex — FDA boxed warning for hepatotoxicity; >100 fatal hepatic-failure cases (microvesicular steatosis); monitor AST/ALT, avoid in hepatic disease (LiverTox/NIH).',
  AGOMEL_HEP:  'Agomelatine SmPC (EU) — hepatotoxicity risk; LFTs at baseline and periodically; contraindicated if transaminases >3× ULN or in hepatic impairment/cirrhosis.',
  BZD_HEP:     'Benzodiazepines in liver disease (Peppers 1996; LiverTox; Psychotropics-in-liver-disease review 2017) — PREFER lorazepam/oxazepam/temazepam (glucuronidation/phase-II, preserved); AVOID diazepam/chlordiazepoxide (phase-I oxidation → accumulation, sedation, respiratory depression). Reduce dose ~50% in moderate impairment. In hepatic ENCEPHALOPATHY avoid ALL benzodiazepines (can precipitate/worsen it); buspirone is a non-benzo anxiolytic alternative.',
  ESPEN_EASL_LIV:'EASL & ESPEN clinical-nutrition-in-liver-disease guidelines (2019) — cirrhosis is NOT protein-restricted: target 1.2–1.5 g/kg/day; late-evening snack (~50 g carbohydrate ± BCAA) to shorten nocturnal fasting, reduce catabolism, preserve muscle; sodium restriction only when ascites; BCAA supplementation improves nitrogen balance/survival.',
  HDS_HEP:     'Herbal & dietary supplement hepatotoxicity (LiverTox/NIH; DILIN — Navarro; Chalasani Gastroenterology 2008) — HDS cause ~20% of US DILI. Culprits: anabolic/bodybuilding steroids, high-dose green tea extract (EGCG), multi-ingredient weight-loss products (Hydroxycut/Herbalife), kava (>100 reports), usnic acid, chaparral, germander, high-dose niacin.',

  /* ── diabetes-unit sources ── */
  AP_METAB:    'Pillinger T et al. Comparative effects of 18 antipsychotics on metabolic function — systematic review & network meta-analysis. Lancet Psychiatry 2020;7:64-77. Worst: olanzapine, clozapine; medium: quetiapine, risperidone, paliperidone; most benign: aripiprazole, brexpiprazole, cariprazine, lurasidone, ziprasidone.',
  ADA_APA_DM:  'ADA/APA/AACE/NAASO 2004 Consensus on Antipsychotic Drugs & Obesity/Diabetes (Diabetes Care 2004;27:596) + FDA SGA class warning for hyperglycaemia/DKA; HbA1c added 2010. Baseline: personal/family history, weight/BMI, waist, BP, fasting glucose, fasting lipids; weight at 4 & 8 wk; full re-check at 12 wk; then glucose+BP yearly (more if higher risk), lipids yearly; switch to a lower-risk SGA if glycaemia/lipids worsen.',
  AD_WEIGHT:   'Antidepressant weight/metabolic effects (Maudsley Prescribing Guidelines; Serretti & Mandelli 2010) — weight GAIN: mirtazapine, paroxetine, TCAs, (long-term most ADs to a degree); weight-NEUTRAL/LOSS: bupropion; broadly neutral short-term: most SSRIs (sertraline/escitalopram/fluoxetine). Mood stabilisers valproate/lithium and gabapentinoids also cause weight gain.',
  DM_SUPP:     'Glucose-lowering dietary supplements (NCCIH; meta-analyses) — berberine, cinnamon, chromium, alpha-lipoic acid, fenugreek, magnesium can lower glucose; stacked on antidiabetics (esp. sulfonylureas) → HYPOGLYCAEMIA. Berberine additionally inhibits CYP enzymes (drug interactions); cassia cinnamon contains coumarin (hepatotoxic at high chronic dose); high-dose chromium carries renal risk.',

  /* ── hypertension-unit sources ── */
  AD_BP:       'Calvi A et al. Antidepressant drugs effects on blood pressure. Front Cardiovasc Med 2021;8:704281. SSRIs = smallest BP effect (safest class in HTN); SNRIs (esp. venlafaxine) = dose-dependent hypertension via noradrenergic drive; bupropion = BP rise at high dose (also 2D6-inhibits metoprolol/carvedilol).',
  VENLA_BP:    'Venlafaxine dose-dependent hypertension — >225 mg/day acts mainly as an NE-reuptake inhibitor; immediate-release causes sustained diastolic hypertension in ~10–15% (XR ~6%); accelerated HTN reported even at ~150 mg. Monitor BP at baseline and on-treatment; prefer an SSRI / control BP first in pre-existing HTN.',
  MAOI_TYRAMINE:'MAOIs (esp. non-selective/irreversible: tranylcypromine, phenelzine, isocarboxazid) + dietary tyramine or sympathomimetics → hypertensive crisis ("cheese reaction"): inhibited gut/hepatic MAO raises tyramine bioavailability → NE surge. Requires a tyramine-restricted diet and avoidance of decongestants/stimulants; moclobemide (reversible MAO-A) is lower-risk.',
  LI_HTN_RX:   'Lithium × antihypertensive interactions — thiazides ↑ lithium 25–40% (halve dose, monitor first week); ACE inhibitors & ARBs ↑ lithium levels → toxicity (monitor, reduce dose, esp. CKD/elderly/volume-depleted); NSAIDs ↓ renal lithium clearance → toxicity AND blunt antihypertensives; calcium-channel blockers → neurotoxicity signal (tremor/ataxia/tinnitus) even without level change. (Handler 2009; PMC lithium-interactions reviews.)',
  ANTIHTN_MOOD:'CANDIDATE — pending source sign-off: centrally-acting antihypertensives (reserpine, methyldopa, clonidine) historically linked to depression; beta-blocker–depression link now considered weak. Flag to ask the HTN team; not yet verified:true.',

  /* ── endocrine-unit sources ── */
  LI_THYROID:  'Lithium & thyroid (Kibirige 2013 review; Psychiatric Times; PMC real-world cohorts) — lithium inhibits thyroid-hormone synthesis/release → hypothyroidism & goitre (goitre 3–60%; ~38% develop TSH/FT4 abnormalities); higher risk in women, age >50, thyroid autoantibodies, family history. Baseline TSH (± T3/T4/antibodies & thyroid size) then annually (every 3–4 mo if high-risk). If hypothyroid develops, add levothyroxine rather than stop lithium if it is working (FDA label); ~50% of early subclinical cases normalise within 3 months.',
  ENZ_THYROID: 'Enzyme-inducers & thyroid (Pharmaceutical Journal; Isojärvi) — carbamazepine, phenytoin, phenobarbital (and rifampicin) induce hepatic metabolism of thyroid hormones → lower serum T4; usually adaptive in euthyroid patients but can precipitate subclinical/overt hypothyroidism in levothyroxine-treated patients → increase levothyroxine dose & monitor TFTs (and watch for hyperthyroidism if the inducer is later stopped).',
  LEVO_INTERACT:'Levothyroxine interactions (FDA label; JAMA calcium studies; NEJM 1997 sertraline) — SSRIs (sertraline explicitly) may INCREASE levothyroxine requirements → recheck TSH ~6–8 wk after starting; absorption is reduced by calcium, iron, PPIs/antacids, soy and coffee → take on an empty stomach and separate these by ≥4 h; TCAs + levothyroxine mutually potentiate (arrhythmia/CNS-stimulation caution).',
  AP_PROLACTIN:'Antipsychotic hyperprolactinaemia (BJPsych Advances 2018; narrative reviews) — HIGHEST: risperidone, paliperidone, amisulpride (+ FGAs haloperidol/sulpiride); PROLACTIN-SPARING: quetiapine, olanzapine, clozapine, asenapine, ziprasidone; ARIPIPRAZOLE lowers prolactin (partial D2 agonist) and is used to treat antipsychotic-induced hyperprolactinaemia. Young women highest risk; sequelae: galactorrhoea, amenorrhoea, sexual dysfunction, bone loss.',
  VALP_PCOS:   'Valproate & PCOS (Psychiatric Times; Joffe/Isojärvi) — valproate is linked to new-onset polycystic ovary syndrome / hyperandrogenism (~10% in bipolar cohorts, often within 6–12 months) — avoid/limit in women of reproductive age; screen for menstrual/androgenic symptoms and weight gain.',
  BIOTIN_LAB:  'CANDIDATE — pending source sign-off: high-dose biotin (in hair/nail/"beauty" supplements) interferes with biotin-based thyroid immunoassays → spurious TSH/T4 results (FDA safety communication 2019). Flag to source before verified:true.',
};
const MS = (k) => MED_SRC[k] || k;

/* ── Concept detection (EN + AR free text) ──────────────────────────────────
 * Substring matching (NOT \b-regex): JS \b is ASCII-only and silently breaks on
 * Arabic; substring also absorbs the Arabic definite article (قلب ⊂ القلب).
 * Short/ambiguous English tokens are space-guarded, matching labEngine's style. */
const norm = (s) => String(s || '').toLowerCase();
const sj = (a) => (a || []).join('; ');

const CONCEPT_TERMS = {
  cardiac_qt: [
    // English
    'cardiac', 'heart disease', 'coronary', 'ischaem', 'ischem', 'arrhythm',
    'long qt', ' qt', 'qtc', 'torsad', 'post-mi', 'post mi', 'myocardial infarct',
    'heart failure', 'hfref', 'bradycard',
    // Arabic (substring absorbs ال-)
    'قلب', 'قلبية', 'قلبي', 'نظم القلب', 'اضطراب النظم', 'كيو تي', 'إطالة كيو تي',
    'ذبحة', 'شريان تاجي', 'احتشاء', 'قصور القلب', 'فشل القلب', 'بطء القلب',
  ],
  renal: [
    // English
    'ckd', 'chronic kidney', 'renal impair', 'renal insufficien', 'renal failure',
    'renal disease', 'kidney disease', 'kidney failure', 'kidney impair',
    'nephropathy', 'nephritis', 'egfr', 'creatinine clearance', 'crcl',
    'dialysis', 'haemodialysis', 'hemodialysis', 'esrd', 'end-stage renal',
    // Arabic (substring absorbs ال-)
    'كلى', 'كلوي', 'قصور كلوي', 'قصور الكلى', 'فشل كلوي', 'فشل الكلى',
    'مرض كلوي', 'اعتلال كلوي', 'الكلية', 'غسيل كلوي', 'ديال', 'كرياتينين',
  ],
  hepatic: [
    // English
    'hepat', 'liver', 'cirrhos', 'cirrhotic', 'fibrosis of the liver',
    'fatty liver', 'nafld', 'mafld', 'nash', 'steatohepat', 'encephalopath',
    'ascites', 'jaundice', 'portal hypertension', 'varice', 'child-pugh',
    // Arabic (substring absorbs ال-)
    'كبد', 'كبدي', 'الكبد', 'تليف الكبد', 'تليّف', 'تشمع', 'تشمّع',
    'التهاب الكبد', 'دهون الكبد', 'الكبد الدهني', 'اعتلال دماغي كبدي',
    'استسقاء', 'يرقان', 'صفرا', 'دوالي المريء',
  ],
  diabetes: [
    // English
    'diabet', 't2dm', 't1dm', 'dm2', 'dm1', 'hba1c', 'hyperglyc',
    'insulin resist', 'prediabet', 'pre-diabet', 'metabolic syndrome',
    // Arabic (substring absorbs ال-)
    'سكري', 'السكري', 'سكر', 'مرض السكر', 'مقاومة الانسولين', 'مقاومة الإنسولين',
    'ارتفاع السكر', 'متلازمة أيضية', 'متلازمة استقلابية',
  ],
  hypertension: [
    // English
    'hypertens', 'high blood pressure', 'elevated blood pressure',
    'raised blood pressure', 'high bp', 'raised bp', 'htn',
    // Arabic (substring absorbs ال-)
    'ارتفاع ضغط', 'ارتفاع الضغط', 'ضغط الدم', 'فرط ضغط', 'فرط الضغط',
    'الضغط العالي', 'ضغط عالي', 'مرتفع الضغط',
  ],
  endocrine: [
    // English
    'thyroid', 'hypothyroid', 'hyperthyroid', 'goit', 'graves', 'hashimoto',
    'tsh', 'prolactin', 'hyperprolactin', 'prolactinoma', 'pcos',
    'polycystic ovar', 'adrenal', 'cushing', 'addison', 'endocrin',
    // Arabic (substring absorbs ال-)
    'درقية', 'الدرقية', 'الغدة الدرقية', 'قصور الغدة', 'نشاط الغدة', 'غدة درقية',
    'غدد', 'برولاكتين', 'فرط برولاكتين', 'تكيس المبايض', 'تكيّس المبايض',
    'المبايض المتعددة', 'كظرية', 'كوشينغ', 'غدد صماء',
  ],
};
const hasTerm = (text, concept) =>
  (CONCEPT_TERMS[concept] || []).some((term) => norm(text).includes(norm(term)));

/* ════════════════════════════════════════════════════════════════════════
   DATA MODEL — MED_COMORBIDITIES
   Each disease unit:
     detect(text)      → boolean
     drugAdjust[]      → { agent, action, rule, src, verified }   (SELECTION)
     doseCeilings[]    → { agent, ceiling, condition, src, verified }
     contraindic[]     → { rule, src, verified }
     labsRef           → short pointer to labEngine (no duplication)
     nutritionRef?     → short pointer to mealPlanEngine (if any)
     chrono            → caveat string | null   (null = no source-based rule)
     referral          → joint-team referral line
   ════════════════════════════════════════════════════════════════════════ */
export const MED_COMORBIDITIES = {

  /* ── CARDIAC / QT ─────────────────────────────────────────── BUILT ──── */
  cardiac_qt: {
    label: { en: 'Cardiac disease / QT prolongation', ar: 'مرض قلبي / إطالة QT' },
    detect: (t) => hasTerm(t, 'cardiac_qt'),

    drugAdjust: [
      { agent: 'citalopram, escitalopram',
        action: 'avoid/cap',
        rule: 'Both are dose-dependent QTc prolongers on the CredibleMeds Known-Risk list. Avoid as first choice in significant cardiac disease / documented QT prolongation; if used, apply the dose ceilings below and obtain a baseline ECG.',
        src: [MS('FDA_CIT_QT'), MS('MHRA_CIT_ESC'), MS('CREDIBLEMEDS')], verified: true },
      { agent: 'sertraline',
        action: 'prefer',
        rule: 'Preferred SSRI when an antidepressant is needed in cardiac disease — best cardiac-safety evidence (SADHART: safe post-MI / unstable angina). Lower QT signal than citalopram/escitalopram (conditional-risk, not known-risk).',
        src: [MS('SADHART'), MS('CREDIBLEMEDS')], verified: true },
      { agent: 'venlafaxine / SNRIs',
        action: 'caution',
        rule: 'Dose-dependent rise in blood pressure and heart rate; use caution in cardiac disease and avoid in uncontrolled hypertension. Not a primary QT driver, but monitor BP/HR.',
        src: [MS('SMPC_VENLA')], verified: true },
      { agent: 'tricyclic antidepressants (TCAs)',
        action: 'avoid',
        rule: 'Quinidine-like conduction slowing — avoid in significant cardiac / conduction disease and post-MI. Prefer an SSRI (sertraline).',
        src: [MS('TCA_CARDIAC')], verified: true },
      { agent: 'ziprasidone, haloperidol, and other QT-prolonging antipsychotics',
        action: 'caution/avoid',
        rule: 'Notable QT signal (CredibleMeds). If an antipsychotic is required, weigh a lower-QT-risk agent and verify the per-agent CredibleMeds category; ECG + electrolytes first.',
        src: [MS('CREDIBLEMEDS'), MS('AHA_QT')], verified: true },
    ],

    doseCeilings: [
      { agent: 'citalopram', ceiling: '40 mg/day',
        condition: 'general adult ceiling (dose-dependent QT; no added efficacy above 40 mg)',
        src: [MS('FDA_CIT_QT')], verified: true },
      { agent: 'citalopram', ceiling: '20 mg/day',
        condition: 'age >60 y · hepatic impairment · CYP2C19 poor metaboliser · concomitant CYP2C19 inhibitor (e.g. cimetidine, omeprazole)',
        src: [MS('FDA_CIT_QT')], verified: true },
      { agent: 'escitalopram', ceiling: '20 mg/day',
        condition: 'general adult ceiling',
        src: [MS('MHRA_CIT_ESC')], verified: true },
      { agent: 'escitalopram', ceiling: '10 mg/day',
        condition: 'elderly (≥65 y)',
        src: [MS('MHRA_CIT_ESC')], verified: true },
    ],

    contraindic: [
      { rule: 'Avoid citalopram (and use QT-active agents with great caution) in: congenital long-QT syndrome, bradycardia, uncorrected hypokalaemia or hypomagnesaemia, recent acute MI, or uncompensated heart failure.',
        src: [MS('FDA_CIT_QT')], verified: true },
      { rule: 'Avoid combining two or more QT-prolonging drugs; each addition is additive on QTc. Correct K⁺/Mg²⁺/Ca²⁺ before and during treatment.',
        src: [MS('AHA_QT')], verified: true },
    ],

    labsRef: 'Baseline & on-treatment ECG (QTc) + electrolytes (K⁺/Mg²⁺/Ca²⁺) — already surfaced by the dynamic-labs engine for cardiac cases. QTc >500 ms or Δ>60 ms from baseline = stop/rethink the QT-active agent.',
    nutritionRef: null,

    /* Nutrition touchpoints — ONLY where a cardiac comorbidity intersects the
       PSYCHIATRIC nutrition layer. A full cardiac diet (sodium/DASH) is NOT
       invented here — that is the dietitian/cardiology referral's job. */
    nutrition: [
      { item: 'Electrolyte adequacy (K⁺ / Mg²⁺ / Ca²⁺)', action: 'ensure',
        rule: 'Maintain adequate dietary potassium & magnesium (and calcium); hypokalaemia/hypomagnesaemia directly prolong QT. Correct any deficiency before/along QT-active psychotropics — this is the nutrition side of the same electrolyte requirement flagged in labs.',
        src: [MS('AHA_QT')], verified: true },
      { item: 'Licorice / glycyrrhizin (sweets, teas, "erk sous", herbal & GI remedies — incl. licorice-root supplements)', action: 'avoid',
        rule: 'Glycyrrhizin causes potassium wasting → hypokalaemia → QT prolongation/Torsades. Explicitly ask about licorice intake in a QT patient and advise avoidance. Note: DGL (deglycyrrhizinated licorice) has glycyrrhizin removed and does NOT carry this risk.',
        src: [MS('LICORICE_QT')], verified: true },
      { item: 'Grapefruit juice', action: 'caution',
        rule: 'CYP3A4 inhibition can raise levels of CYP3A4-metabolised QT-active psychotropics (citalopram is partly 3A4). Advise avoiding large/regular grapefruit intake with such agents.',
        src: [MS('FDA_CIT_QT')], verified: false },
      { item: 'High-dose caffeine / energy drinks', action: 'caution',
        rule: 'Energy drinks (high caffeine ± other stimulants) carry palpitation/arrhythmia case reports and worsen the anxiety picture; moderate caffeine is generally tolerated. Advise limiting energy drinks in cardiac/QT patients.',
        src: [MS('STIM_SUPP')], verified: false },
    ],

    /* Supplement touchpoints — comorbidity modifiers to the psychiatric
       supplement layer (nutritionFormulary), not a new supplement protocol. */
    supplements: [
      { item: 'Omega-3 (EPA/DHA) — high dose', action: 'caution/cap',
        rule: 'If the psychiatric plan recommends EPA, keep to the mood dose (~1 g/day). Pharmacologic doses ~1.5–4 g/day raise atrial-fibrillation risk (dose-dependent RCT signal) — in cardiac/AF-risk patients, avoid high-dose EPA and coordinate with cardiology. Low/dietary doses are neutral-to-protective.',
        src: [MS('O3_AF')], verified: true },
      { item: 'St John\'s Wort (self-taken OTC antidepressant)', action: 'avoid',
        rule: 'Potent CYP3A4/P-gp inducer → lowers levels of cardiac drugs (digoxin ~25% ↓, warfarin, antiarrhythmics, ciclosporin) → therapeutic failure. Also serotonergic → serotonin-syndrome risk with the prescribed SSRI. Screen for it explicitly; also belongs in the drug-interaction screen.',
        src: [MS('SJW_CYP')], verified: true },
      { item: 'Potassium / magnesium repletion', action: 'ensure',
        rule: 'Positive direction: if K⁺/Mg²⁺ are low, correcting them SHORTENS QT and lowers Torsades risk. Supplement to correct documented deficiency (with renal function in mind); not blanket high-dose in normokalaemia.',
        src: [MS('AHA_QT')], verified: true },
      { item: 'Stimulant "fat-burner" / pre-workout supplements', action: 'avoid',
        rule: 'Ephedra (FDA-banned), bitter orange/synephrine, and high-caffeine pre-workouts carry cardiac/arrhythmia risk — screen current-meds/supplements and advise avoidance in cardiac/QT patients.',
        src: [MS('STIM_SUPP')], verified: false },
    ],
    chrono: null, // no source-based QT-specific timing rule — not invented
    referral: 'Refer to CARDIOLOGY and co-manage as a joint team (psychiatry + cardiology): baseline ECG before starting a QT-active psychotropic, correct electrolytes, and agree an on-treatment ECG plan. Psychiatry leads the mood/anxiety protocol; cardiology governs QT-risk sign-off.',

    labsSrc: [MS('AHA_QT')],
    referralSrc: [MS('AHA_QT'), MS('FDA_CIT_QT')],
  },

  /* ── RENAL / CKD ──────────────────────────────────────────── BUILT ──── */
  renal: {
    label: { en: 'Renal impairment (CKD)', ar: 'قصور كلوي (CKD)' },
    detect: (t) => hasTerm(t, 'renal'),

    drugAdjust: [
      { agent: 'lithium',
        action: 'avoid/caution',
        rule: 'Renally cleared AND nephrotoxic — causes nephrogenic diabetes insipidus and chronic tubulointerstitial nephropathy; CKD risk rises with serum level. Avoid where an alternative mood-stabiliser is adequate. If essential: lowest effective level (0.6–0.8 mmol/L, never >1.0), dose by eGFR, ensure hydration, AVOID nephrotoxic co-meds (NSAIDs, diuretics, ACEi/ARB raise levels), and monitor level + eGFR + albuminuria closely. Co-manage with nephrology.',
        src: [MS('LI_NEPHRO'), MS('KDIGO_2024')], verified: true },
      { agent: 'duloxetine',
        action: 'avoid',
        rule: 'Avoid when CrCl/eGFR <30 mL/min (≈2× AUC in ESRD). Mild–moderate impairment (≥30): no dose change but monitor. If essential in G4–G5, start low (30–40 mg).',
        src: [MS('DULOX_REN')], verified: true },
      { agent: 'venlafaxine / desvenlafaxine (SNRIs)',
        action: 'adjust',
        rule: 'Renally cleared parent + active metabolite with prolonged half-life in impairment → reduce dose (~25–50%; ~50% in ESRD) and monitor.',
        src: [MS('VENLA_REN')], verified: true },
      { agent: 'gabapentin, pregabalin, topiramate',
        action: 'adjust',
        rule: 'All predominantly renally excreted → dose-reduce by CrCl (see ceilings) to avoid accumulation (pregabalin/gabapentin t½ up to 10× longer). Topiramate additionally causes metabolic acidosis / stones (see cautions).',
        src: [MS('FDA_PGB_REN'), MS('GABA_REN'), MS('FDA_TOP_REN')], verified: true },
      { agent: 'SSRIs (sertraline, etc.)',
        action: 'caution/prefer',
        rule: 'Usable in CKD but all SSRIs carry hyponatraemia/SIADH risk → monitor serum Na⁺. Sertraline is a reasonable, well-tolerated choice. (If cardiac comorbidity also present, apply the QT ceilings from the cardiac unit.)',
        src: [MS('SSRI_HYPONA')], verified: true },
    ],

    doseCeilings: [
      { agent: 'pregabalin', ceiling: 'reduce ~50% (CrCl 30–60) · ~75% (15–30) · ~87.5% (<15) + post-HD supplement',
        condition: 'by creatinine clearance (Lyrica label Table 2)',
        src: [MS('FDA_PGB_REN')], verified: true },
      { agent: 'gabapentin', ceiling: '≤1500 mg/day (CKD G3) · ≤700 (G4) · ≤300 (G5) · 100–300 post-dialysis',
        condition: 'by CKD stage / CrCl',
        src: [MS('GABA_REN')], verified: true },
      { agent: 'topiramate', ceiling: '50% of the standard dose',
        condition: 'CrCl <70 mL/min; supplemental dose during haemodialysis',
        src: [MS('FDA_TOP_REN')], verified: true },
      { agent: 'venlafaxine', ceiling: 'reduce ~25–50% (≈50% in ESRD)',
        condition: 'significant renal impairment / ESRD',
        src: [MS('VENLA_REN')], verified: true },
      { agent: 'duloxetine', ceiling: 'avoid <30; if used in G4–G5 start 30–40 mg',
        condition: 'CrCl/eGFR <30 mL/min',
        src: [MS('DULOX_REN')], verified: true },
      { agent: 'lithium', ceiling: 'no fixed ceiling — titrate to level 0.6–0.8 mmol/L by eGFR',
        condition: 'narrow therapeutic index; avoid >1.0',
        src: [MS('LI_NEPHRO')], verified: true },
    ],

    contraindic: [
      { rule: 'Duloxetine: avoid at CrCl/eGFR <30 mL/min.',
        src: [MS('DULOX_REN')], verified: true },
      { rule: 'Lithium: relative contraindication in significant/unstable renal impairment; never stack with NSAIDs/diuretics/ACEi that raise levels or add nephrotoxicity.',
        src: [MS('LI_NEPHRO')], verified: true },
      { rule: 'Topiramate: carbonic-anhydrase inhibitor → metabolic acidosis (worse in CKD) + nephrolithiasis; avoid co-use with other acidosis-inducing drugs, ensure hydration, monitor serum bicarbonate.',
        src: [MS('FDA_TOP_REN')], verified: true },
      { rule: 'All SSRIs: hyponatraemia/SIADH caution — monitor Na⁺, especially elderly / on diuretics.',
        src: [MS('SSRI_HYPONA')], verified: true },
    ],

    labsRef: 'eGFR/creatinine + electrolytes (esp. K⁺) — already surfaced by the dynamic-labs engine for renal cases. Add serum lithium level if on lithium, and serum bicarbonate if on topiramate.',

    /* Nutrition — the renal comorbidity DOES touch the psychiatric nutrition
       layer, but the full renal diet (K/PO₄/Na/fluid targets) is individualised
       by the renal dietitian, NOT invented here. */
    nutrition: [
      { item: 'Protein', action: 'adjust',
        rule: 'Protein is capped at ~0.8 g/kg/day for CKD G3–G5 NOT on dialysis (KDIGO) — this cap is already applied by the meal-plan engine\'s renal gate. Dialysis needs HIGHER protein → set by the renal team (the auto-cap is intentionally skipped for dialysis).',
        src: [MS('KDIGO_2024')], verified: true },
      { item: 'Dietary potassium / phosphorus / sodium / fluid', action: 'caution',
        rule: 'In advanced CKD these are individualised to labs and stage (hyperkalaemia risk in particular). Do NOT set numeric targets here — flag for the renal dietitian; the psychiatric plan must not push high-potassium "healthy eating" advice without checking K⁺.',
        src: [MS('KDIGO_2024')], verified: true },
    ],

    /* Supplements — MIRROR-IMAGE of the cardiac unit: here K⁺/Mg²⁺ are a HAZARD
       (accumulation), not protective. */
    supplements: [
      { item: 'Potassium / magnesium supplements', action: 'avoid/caution',
        rule: 'OPPOSITE of the cardiac case: impaired excretion → risk of hyperkalaemia / hypermagnesaemia. Do not supplement K⁺/Mg²⁺ in CKD without checking levels and renal function.',
        src: [MS('KDIGO_2024')], verified: true },
      { item: 'CKD mineral & bone supplements (vitamin D analogues, phosphate binders, etc.)', action: 'refer',
        rule: 'CKD-MBD management is nephrology-directed — not initiated from the psychiatric plan. Flag and defer.',
        src: [MS('KDIGO_2024')], verified: true },
      { item: 'St John\'s Wort (self-taken)', action: 'avoid',
        rule: 'CYP3A4/P-gp inducer — can lower levels of co-prescribed drugs and cause serotonin syndrome with the SSRI; screen for it.',
        src: [MS('SJW_CYP')], verified: true },
    ],

    nutritionRef: null,
    chrono: null, // no source-based renal-specific timing rule — not invented
    referral: 'Refer to NEPHROLOGY and co-manage as a joint team (psychiatry + nephrology + renal dietitian): dose psychotropics by eGFR, monitor lithium level / bicarbonate / Na⁺ / K⁺ as applicable, and let the renal team own protein/K/PO₄/fluid targets. Psychiatry leads the mood/anxiety protocol; nephrology governs renal-safety sign-off.',

    labsSrc: [MS('KDIGO_2024')],
    referralSrc: [MS('KDIGO_2024')],
  },

  /* ── HEPATIC / LIVER DISEASE ──────────────────────────────── BUILT ──── */
  hepatic: {
    label: { en: 'Hepatic disease', ar: 'مرض كبدي' },
    detect: (t) => hasTerm(t, 'hepatic'),

    drugAdjust: [
      { agent: 'duloxetine',
        action: 'avoid',
        rule: 'Contraindicated in any hepatic insufficiency / chronic liver disease / substantial alcohol use (≈3× AUC in cirrhosis; DILI incl. fulminant failure). Do NOT use.',
        src: [MS('DULOX_HEP')], verified: true },
      { agent: 'nefazodone',
        action: 'avoid',
        rule: 'Black-box liver failure (transplant/death); do not use in active liver disease.',
        src: [MS('DILI_AD')], verified: true },
      { agent: 'valproate / divalproex',
        action: 'avoid',
        rule: 'Hepatotoxicity boxed warning; >100 fatal hepatic-failure cases (microvesicular steatosis). Avoid in hepatic disease; if unavoidable elsewhere, monitor AST/ALT.',
        src: [MS('VALP_HEP')], verified: true },
      { agent: 'agomelatine',
        action: 'avoid/caution',
        rule: 'Hepatotoxicity risk — contraindicated if transaminases >3× ULN or hepatic impairment/cirrhosis; requires baseline + periodic LFTs.',
        src: [MS('AGOMEL_HEP')], verified: true },
      { agent: 'TCAs, bupropion, trazodone, tianeptine, MAOIs',
        action: 'caution',
        rule: 'Higher hepatotoxicity signal — avoid/limit in significant liver disease; if used, monitor aminotransferases and stop on abnormal LFTs.',
        src: [MS('DILI_AD')], verified: true },
      { agent: 'benzodiazepines',
        action: 'prefer/avoid',
        rule: 'PREFER lorazepam / oxazepam / temazepam (glucuronidation, preserved in liver disease). AVOID diazepam / chlordiazepoxide (phase-I oxidation → accumulation → sedation/respiratory depression). Reduce dose ~50% in moderate impairment. In hepatic ENCEPHALOPATHY avoid ALL benzodiazepines (precipitant); buspirone is a non-benzo alternative.',
        src: [MS('BZD_HEP')], verified: true },
      { agent: 'SSRIs',
        action: 'prefer/caution',
        rule: 'Citalopram / escitalopram / paroxetine / fluvoxamine carry the LOWEST hepatotoxicity signal — but note the cross-comorbidity tension: citalopram/escitalopram are the QT-risk agents in the cardiac unit, so if BOTH cardiac and hepatic coexist, weigh carefully. Start low and reduce dose (hepatic metabolism); monitor LFTs.',
        src: [MS('DILI_AD')], verified: true },
      { agent: 'lithium',
        action: 'note',
        rule: 'Not hepatically metabolised (relatively liver-safe) BUT levels are hard to keep stable with the fluid shifts of liver disease (ascites, diuretics) → monitor levels closely.',
        src: [MS('DILI_AD')], verified: true },
    ],

    doseCeilings: [
      { agent: 'benzodiazepines (lorazepam/oxazepam/temazepam)', ceiling: 'reduce ~50%',
        condition: 'moderate hepatic impairment',
        src: [MS('BZD_HEP')], verified: true },
      { agent: 'citalopram', ceiling: '≤20 mg/day',
        condition: 'hepatic impairment (also the cardiac-unit ceiling — same limit)',
        src: [MS('FDA_CIT_QT')], verified: true },
      { agent: 'most hepatically-cleared psychotropics', ceiling: 'start low / reduce dose',
        condition: 'reduced first-pass & clearance in significant liver disease',
        src: [MS('DILI_AD')], verified: true },
    ],

    contraindic: [
      { rule: 'Duloxetine: contraindicated in hepatic insufficiency / chronic liver disease / substantial alcohol use.',
        src: [MS('DULOX_HEP')], verified: true },
      { rule: 'Nefazodone: do not use in active liver disease.',
        src: [MS('DILI_AD')], verified: true },
      { rule: 'Agomelatine: contraindicated if transaminases >3× ULN or hepatic impairment.',
        src: [MS('AGOMEL_HEP')], verified: true },
      { rule: 'Hepatic encephalopathy: avoid ALL benzodiazepines and minimise other sedating agents — they can precipitate/deepen encephalopathy.',
        src: [MS('BZD_HEP')], verified: true },
    ],

    labsRef: 'LFTs (AST/ALT/bilirubin) — already surfaced by the dynamic-labs engine for hepatic cases. Add INR + albumin (synthetic function), aminotransferase surveillance on agomelatine/valproate/duloxetine, and ammonia if encephalopathy is suspected.',

    /* Nutrition — the BIG conceptual correction: liver disease is NOT a protein
       cap. This is the mirror of the renal unit. */
    nutrition: [
      { item: 'Protein — NOT restricted', action: 'ensure',
        rule: 'Cirrhosis is NOT protein-restricted (the old HE protein-restriction is abandoned): target 1.2–1.5 g/kg/day. The meal-plan engine\'s renal 0.8 g/kg cap must NOT be applied to a liver-only patient — confirm the renal gate does not misfire here.',
        src: [MS('ESPEN_EASL_LIV')], verified: true },
      { item: 'Late-evening snack (LES)', action: 'ensure',
        rule: '~50 g carbohydrate (± BCAA) before bed shortens the long overnight fast, reduces catabolism, and preserves muscle in cirrhosis (also stated in chrono).',
        src: [MS('ESPEN_EASL_LIV')], verified: true },
      { item: 'Sodium (if ascites) & alcohol', action: 'caution',
        rule: 'Sodium restriction ONLY when ascites is present (hepatology-directed). Alcohol: absolute avoidance in any liver disease.',
        src: [MS('ESPEN_EASL_LIV')], verified: true },
    ],

    supplements: [
      { item: 'Hepatotoxic herbal/dietary supplements', action: 'avoid',
        rule: 'Screen for and STOP: anabolic/bodybuilding supplements, high-dose green-tea extract (EGCG), multi-ingredient weight-loss products (Hydroxycut/Herbalife), kava, usnic acid, chaparral, germander, high-dose niacin — HDS cause ~20% of DILI. "Natural" ≠ liver-safe.',
        src: [MS('HDS_HEP')], verified: true },
      { item: 'BCAA (branched-chain amino acids)', action: 'consider',
        rule: 'Positive direction: BCAA supplementation improves nitrogen balance and may improve survival in cirrhosis (esp. as/with the late-evening snack).',
        src: [MS('ESPEN_EASL_LIV')], verified: true },
      { item: 'St John\'s Wort (self-taken)', action: 'avoid',
        rule: 'CYP3A4/P-gp inducer — alters co-med levels and serotonin-syndrome risk with the SSRI; screen for it.',
        src: [MS('SJW_CYP')], verified: true },
    ],

    nutritionRef: null,
    chrono: 'Late-evening snack (~50 g carbohydrate ± BCAA) to shorten the overnight fast and curb nocturnal catabolism in cirrhosis — a source-based TIMING rule (unlike cardiac/renal, hepatic has a real chrono touchpoint).',
    referral: 'Refer to HEPATOLOGY and co-manage as a joint team (psychiatry + hepatology + dietitian): choose glucuronidated/low-hepatotoxicity agents, dose by hepatic function, monitor LFTs, and let hepatology own encephalopathy/ascites management + protein/LES targets. Psychiatry leads the mood/anxiety protocol; hepatology governs liver-safety sign-off.',

    labsSrc: [MS('DILI_AD')],
    referralSrc: [MS('DILI_AD'), MS('ESPEN_EASL_LIV')],
  },

  /* ── DIABETES MELLITUS ────────────────────────────────────── BUILT ──── */
  diabetes: {
    label: { en: 'Diabetes mellitus', ar: 'داء السكري' },
    detect: (t) => hasTerm(t, 'diabetes'),

    drugAdjust: [
      { agent: 'olanzapine, clozapine',
        action: 'avoid',
        rule: 'HIGHEST metabolic risk — weight gain, hyperglycaemia, new-onset diabetes and DKA, dyslipidaemia (FDA SGA class warning). Avoid in diabetes where possible; if unavoidable (e.g. clozapine for resistant illness) monitor intensively and co-manage.',
        src: [MS('AP_METAB'), MS('ADA_APA_DM')], verified: true },
      { agent: 'quetiapine, risperidone, paliperidone',
        action: 'caution',
        rule: 'MEDIUM metabolic risk — usable with monitoring; watch weight/glucose/lipids.',
        src: [MS('AP_METAB')], verified: true },
      { agent: 'aripiprazole, brexpiprazole, cariprazine, lurasidone, ziprasidone',
        action: 'prefer',
        rule: 'Most metabolically benign antipsychotics — prefer when an antipsychotic is needed in diabetes. CROSS-TENSION: ziprasidone is metabolically friendly but a QT-risk agent in the cardiac unit — if cardiac+diabetes coexist, lurasidone/aripiprazole balance both better.',
        src: [MS('AP_METAB')], verified: true },
      { agent: 'mirtazapine, paroxetine, TCAs',
        action: 'caution',
        rule: 'Weight-gain antidepressants — worsen glycaemic control; avoid/limit in diabetes.',
        src: [MS('AD_WEIGHT')], verified: true },
      { agent: 'bupropion / SSRIs (sertraline, escitalopram, fluoxetine)',
        action: 'prefer',
        rule: 'Bupropion is weight-neutral/favourable; the listed SSRIs are broadly weight-neutral — reasonable antidepressant choices in diabetes.',
        src: [MS('AD_WEIGHT')], verified: true },
      { agent: 'valproate, lithium, gabapentin/pregabalin',
        action: 'caution',
        rule: 'All cause weight gain (caution in diabetes). Dual-edge: gabapentinoids also treat diabetic neuropathic pain — a potential single-agent benefit if that comorbidity is present.',
        src: [MS('AD_WEIGHT')], verified: true },
      { agent: 'any SGA — worsening glycaemia',
        action: 'adjust',
        rule: 'If glucose/lipids worsen on an antipsychotic, switch to a lower-metabolic-risk SGA rather than pushing dose (ADA/APA).',
        src: [MS('ADA_APA_DM')], verified: true },
    ],

    contraindic: [
      { rule: 'No absolute contraindication, but olanzapine/clozapine carry an FDA class warning for hyperglycaemia/DKA — relative avoidance in poorly-controlled diabetes; monitor intensively if used.',
        src: [MS('ADA_APA_DM')], verified: true },
    ],

    labsRef: 'Metabolic panel — fasting glucose / HbA1c + lipids (+ weight/BMI/waist/BP) already surfaced by the dynamic-labs engine for diabetes/obesity. Follow the ADA/APA schedule: baseline; weight at 4 & 8 wk; full re-check at 12 wk; then glucose+BP yearly (more if higher risk) and lipids yearly.',

    nutrition: [
      { item: 'Carbohydrate quality / added sugar / fibre', action: 'ensure',
        rule: 'The psychiatric nutrition layer\'s carb-quality targets (low added sugar, higher fibre, lower-GI) reinforce glycaemic goals — keep them aligned. Specific carb-counting / individualised targets are set by the diabetes dietitian, not invented here.',
        src: [MS('ADA_APA_DM')], verified: true },
      { item: 'Weight-aware planning', action: 'ensure',
        rule: 'Account for the metabolic effect of any weight-gain psychotropic in the plan; coordinate calorie/weight targets with the diabetes team.',
        src: [MS('ADA_APA_DM')], verified: true },
    ],

    supplements: [
      { item: 'Glucose-lowering supplements (berberine, cinnamon, chromium, ALA, fenugreek, magnesium)', action: 'caution',
        rule: 'Stacked on antidiabetic drugs (especially sulfonylureas) → HYPOGLYCAEMIA risk. Berberine also inhibits CYP enzymes (drug interactions); cassia cinnamon carries coumarin hepatotoxicity at high chronic dose. Screen for these and coordinate with the diabetes team — do not add blindly.',
        src: [MS('DM_SUPP')], verified: true },
      { item: 'St John\'s Wort (self-taken)', action: 'avoid',
        rule: 'CYP3A4/P-gp inducer — alters co-med levels and serotonin-syndrome risk with the SSRI; screen for it.',
        src: [MS('SJW_CYP')], verified: true },
    ],

    nutritionRef: null,
    chrono: null, // glucose meal-timing is diabetes-team-managed; no psych-specific source-based rule
    referral: 'Refer to ENDOCRINOLOGY / diabetes team and co-manage jointly (psychiatry + endocrinology + dietitian): prefer metabolically-benign psychotropics, run the ADA/APA metabolic monitoring, and let the diabetes team own glycaemic targets & antidiabetic therapy. Psychiatry leads the mood/psychosis protocol; endocrinology governs metabolic sign-off.',

    labsSrc: [MS('ADA_APA_DM')],
    referralSrc: [MS('ADA_APA_DM')],
  },

  /* ── HYPERTENSION ─────────────────────────────────────────── BUILT ──── */
  hypertension: {
    label: { en: 'Hypertension', ar: 'ارتفاع ضغط الدم' },
    detect: (t) => hasTerm(t, 'hypertension'),

    drugAdjust: [
      { agent: 'venlafaxine / desvenlafaxine / SNRIs',
        action: 'avoid/caution',
        rule: 'Dose-dependent BP rise via noradrenergic drive — venlafaxine >225 mg acts mainly as an NE reuptake inhibitor; immediate-release causes sustained diastolic hypertension in ~10–15%. Control BP first / prefer an SSRI in pre-existing HTN; if used, monitor BP at baseline and on-treatment.',
        src: [MS('AD_BP'), MS('VENLA_BP')], verified: true },
      { agent: 'SSRIs (sertraline, escitalopram, etc.)',
        action: 'prefer',
        rule: 'Smallest BP effect — the safest antidepressant class in hypertension; prefer when an antidepressant is needed.',
        src: [MS('AD_BP')], verified: true },
      { agent: 'bupropion',
        action: 'caution',
        rule: 'Can raise BP (esp. high dose, or with a nicotine patch) — obtain baseline + ongoing BP. Also 2D6-inhibits metoprolol/carvedilol (raises beta-blocker levels).',
        src: [MS('AD_BP')], verified: true },
      { agent: 'MAOIs (tranylcypromine, phenelzine, isocarboxazid)',
        action: 'avoid/caution',
        rule: 'Tyramine "cheese reaction" → hypertensive CRISIS; also interact with sympathomimetics/decongestants. Need a tyramine-restricted diet (see nutrition). Moclobemide (reversible MAO-A) is lower-risk.',
        src: [MS('MAOI_TYRAMINE')], verified: true },
      { agent: 'stimulants (methylphenidate, amphetamines, atomoxetine)',
        action: 'caution',
        rule: 'If ADHD is comorbid — these raise BP/HR; avoid/careful in uncontrolled HTN, monitor BP.',
        src: [MS('AD_BP')], verified: true },
      { agent: 'lithium',
        action: 'caution',
        rule: 'HTN treatment drugs interact: thiazides ↑ lithium 25–40% (halve dose + monitor), ACEi/ARB ↑ lithium → toxicity, NSAIDs ↑ lithium AND blunt antihypertensives, CCBs → neurotoxicity signal. Monitor lithium level whenever antihypertensive therapy changes.',
        src: [MS('LI_HTN_RX')], verified: true },
      { agent: 'TCAs / antipsychotics',
        action: 'note',
        rule: 'Direction reversed: these tend to cause orthostatic HYPOtension (α1-blockade), notably on titration — a BP-management caution rather than a hypertension driver.',
        src: [MS('AD_BP')], verified: true },
      { agent: 'centrally-acting antihypertensives (reserpine, methyldopa, clonidine)',
        action: 'note',
        rule: 'Reverse direction (the HTN drug affecting mood): historically linked to depression — worth asking the HTN team if mood worsened after one was started. (Beta-blocker–depression link now considered weak.)',
        src: [MS('ANTIHTN_MOOD')], verified: false },
    ],

    doseCeilings: [
      { agent: 'venlafaxine', ceiling: 'keep dose as low as effective; BP risk climbs >150–225 mg',
        condition: 'dose-dependent hypertension (NE effect dominates at higher doses)',
        src: [MS('VENLA_BP')], verified: true },
      { agent: 'lithium', ceiling: 'reduce ~25–40% (≈halve) when a thiazide is added; re-titrate to level',
        condition: 'thiazide/ACEi/ARB/NSAID co-therapy raises lithium',
        src: [MS('LI_HTN_RX')], verified: true },
    ],

    contraindic: [
      { rule: 'MAOI + tyramine-rich food OR sympathomimetics/decongestants → hypertensive crisis. Enforce tyramine diet + drug avoidance.',
        src: [MS('MAOI_TYRAMINE')], verified: true },
      { rule: 'Venlafaxine/SNRIs in UNCONTROLLED hypertension — control BP before starting; monitor thereafter.',
        src: [MS('VENLA_BP')], verified: true },
      { rule: 'Stimulants in severe/uncontrolled hypertension — avoid.',
        src: [MS('AD_BP')], verified: true },
    ],

    labsRef: 'Blood-pressure monitoring (baseline + on-treatment) — surfaced by the dynamic-labs engine; intensify on venlafaxine/SNRI, bupropion, or a stimulant. Add lithium level + renal function whenever lithium coexists with a thiazide/ACEi/ARB/NSAID.',

    nutrition: [
      { item: 'Tyramine-restricted diet — ONLY if on an MAOI', action: 'ensure',
        rule: 'Avoid aged/mature cheeses, cured/fermented/aged meats, fermented soy (soy sauce, miso, tofu that is fermented), tap/unpasteurised beer, over-ripe/spoiled foods, and Marmite/yeast extract. This is the psych-nutrition intersection the engine owns; hand the full list to a dietitian.',
        src: [MS('MAOI_TYRAMINE')], verified: true },
      { item: 'Licorice / glycyrrhizin ("erk sous")', action: 'avoid',
        rule: 'Same mechanism as in the cardiac unit — glycyrrhizin → pseudohyperaldosteronism → sodium retention & HYPERTENSION (plus hypokalaemia). Explicitly ask about licorice and advise avoidance (DGL is glycyrrhizin-free and safe).',
        src: [MS('LICORICE_QT')], verified: true },
      { item: 'Sodium / caffeine / alcohol', action: 'caution',
        rule: 'Keep the psychiatric plan from pushing high-sodium foods; energy drinks/high caffeine and alcohol acutely raise BP. The full DASH/sodium target is set by the HTN team/dietitian, not invented here.',
        src: [MS('AD_BP')], verified: true },
    ],

    supplements: [
      { item: 'Stimulant "fat-burner" / pre-workout supplements', action: 'avoid',
        rule: 'Ephedra, bitter orange/synephrine, yohimbine, high-dose caffeine — raise BP; avoid in hypertension (consistent with the cardiac unit).',
        src: [MS('STIM_SUPP')], verified: false },
      { item: 'St John\'s Wort (self-taken)', action: 'avoid',
        rule: 'CYP3A4/P-gp inducer — can LOWER levels of CYP3A4-metabolised antihypertensives (e.g. some calcium-channel blockers) → loss of BP control; plus serotonin-syndrome risk with the SSRI. Screen for it.',
        src: [MS('SJW_CYP')], verified: true },
      { item: 'Omega-3 (dietary dose)', action: 'consider',
        rule: 'Positive direction: modestly lowers BP at dietary doses. (High pharmacologic EPA still carries the AF caution from the cardiac unit — keep to ~1 g if cardiac risk.)',
        src: [MS('O3_AF')], verified: true },
    ],

    nutritionRef: null,
    chrono: null, // antihypertensive chronotherapy is contested & non-psychiatric — no source-based psych timing rule
    referral: 'Refer to the HYPERTENSION team (primary care / cardiology) and co-manage jointly (psychiatry + HTN team ± dietitian): prefer BP-neutral psychotropics (SSRI), monitor BP on any noradrenergic agent, watch the lithium × antihypertensive interaction, and use a dietitian for the tyramine diet if an MAOI is chosen. Psychiatry leads the mood/anxiety protocol; the HTN team governs BP-control sign-off.',

    labsSrc: [MS('AD_BP')],
    referralSrc: [MS('AD_BP'), MS('MAOI_TYRAMINE')],
  },

  /* ── ENDOCRINE (thyroid · prolactin · gonadal) ────────────── BUILT ──── */
  endocrine: {
    label: { en: 'Endocrine (thyroid / prolactin / gonadal)', ar: 'غدد (درقية / برولاكتين / تناسلية)' },
    detect: (t) => hasTerm(t, 'endocrine'),

    drugAdjust: [
      { agent: 'lithium',
        action: 'caution',
        rule: 'Inhibits thyroid-hormone synthesis/release → hypothyroidism & goitre (higher risk: women, >50 y, thyroid autoantibodies, family history). Baseline TSH then annually. If hypothyroidism develops and lithium is working, ADD levothyroxine rather than stop lithium; ~50% of early subclinical cases normalise within 3 months.',
        src: [MS('LI_THYROID')], verified: true },
      { agent: 'carbamazepine (and other enzyme-inducers)',
        action: 'caution',
        rule: 'Induce hepatic metabolism of thyroid hormones → lower T4; can unmask hypothyroidism in a levothyroxine-treated patient → raise levothyroxine dose and monitor TFTs (watch for hyperthyroidism if the inducer is later stopped).',
        src: [MS('ENZ_THYROID')], verified: true },
      { agent: 'risperidone, paliperidone, amisulpride (+ typical antipsychotics)',
        action: 'avoid',
        rule: 'Strongly raise prolactin — AVOID in prolactinoma / hyperprolactinaemia (galactorrhoea, amenorrhoea, sexual dysfunction, bone loss); young women highest risk.',
        src: [MS('AP_PROLACTIN')], verified: true },
      { agent: 'aripiprazole (also quetiapine, olanzapine, clozapine)',
        action: 'prefer',
        rule: 'Prolactin-sparing; aripiprazole actually LOWERS prolactin (partial D2 agonist) and is used to treat antipsychotic-induced hyperprolactinaemia. Prefer when prolactin is a concern. (Aripiprazole is also the metabolically-benign, prolactin-sparing pick — friendly across diabetes + endocrine.)',
        src: [MS('AP_PROLACTIN')], verified: true },
      { agent: 'valproate',
        action: 'avoid/caution',
        rule: 'Linked to new-onset PCOS / hyperandrogenism (~10%, often within 6–12 months) in women of reproductive age — avoid/limit and screen for menstrual/androgenic symptoms.',
        src: [MS('VALP_PCOS')], verified: true },
      { agent: 'SSRIs (sertraline) — if on levothyroxine',
        action: 'caution',
        rule: 'May INCREASE levothyroxine requirements (FDA label, sertraline) → recheck TSH ~6–8 weeks after starting an SSRI in a thyroxine-treated patient and adjust the levothyroxine dose.',
        src: [MS('LEVO_INTERACT')], verified: true },
    ],

    contraindic: [
      { rule: 'Prolactin-raising antipsychotics (risperidone/paliperidone/amisulpride/FGAs) in known prolactinoma or symptomatic hyperprolactinaemia — avoid; switch to / add aripiprazole.',
        src: [MS('AP_PROLACTIN')], verified: true },
      { rule: 'Valproate in women of reproductive age with (or at risk of) PCOS — avoid where possible.',
        src: [MS('VALP_PCOS')], verified: true },
    ],

    labsRef: 'Thyroid function (TSH ± free T4, and antibodies/thyroid size on lithium) — surfaced by the dynamic-labs engine for thyroid cases. Add baseline + annual TSH on lithium; prolactin if a prolactin-raising antipsychotic is used and the patient is symptomatic; recheck TSH ~6–8 wk after starting an SSRI in a thyroxine-treated patient.',

    nutrition: [
      { item: 'Levothyroxine timing vs food/minerals — if on thyroxine', action: 'ensure',
        rule: 'Levothyroxine on an empty stomach, and separated by ≥4 h from calcium, iron, soy, and coffee (all reduce its absorption). This is the psych-nutrition/timing intersection the engine owns; also stated in chrono.',
        src: [MS('LEVO_INTERACT')], verified: true },
    ],

    supplements: [
      { item: 'Calcium / iron / multivitamins — if on levothyroxine', action: 'caution',
        rule: 'Bind levothyroxine and cut its absorption (up to ~50% with calcium) — separate by ≥4 h and monitor TSH.',
        src: [MS('LEVO_INTERACT')], verified: true },
      { item: 'Iodine / kelp supplements', action: 'caution',
        rule: 'Excess iodine can worsen thyroid dysfunction (both hypo- and hyper-) — avoid unsupervised high-iodine supplements in thyroid disease.',
        src: [MS('LI_THYROID')], verified: true },
      { item: 'High-dose biotin ("beauty"/hair-nail supplements)', action: 'caution',
        rule: 'Interferes with biotin-based thyroid immunoassays → spurious TSH/T4 results that can mislead dosing; hold before thyroid labs. (FDA safety communication.)',
        src: [MS('BIOTIN_LAB')], verified: false },
      { item: 'St John\'s Wort (self-taken)', action: 'avoid',
        rule: 'CYP3A4/P-gp inducer — alters co-med levels and serotonin-syndrome risk with the SSRI; screen for it.',
        src: [MS('SJW_CYP')], verified: true },
    ],

    nutritionRef: null,
    chrono: 'If on levothyroxine: take it in the morning on an empty stomach, ≥30–60 min before food/coffee and ≥4 h apart from calcium/iron — a source-based administration-timing rule (like hepatic, endocrine has a real chrono touchpoint).',
    referral: 'Refer to ENDOCRINOLOGY and co-manage jointly (psychiatry + endocrinology ± gynaecology): monitor lithium-related thyroid function, choose prolactin-sparing antipsychotics where prolactin matters, avoid valproate-related PCOS risk, and coordinate levothyroxine dosing/timing. Psychiatry leads the mood/psychosis protocol; endocrinology governs endocrine sign-off.',

    labsSrc: [MS('LI_THYROID')],
    referralSrc: [MS('LI_THYROID'), MS('AP_PROLACTIN')],
  },

  /* ── all six medical-comorbidity units are now BUILT. ──────────────────── */
};

/* ── Detection API ──────────────────────────────────────────────────────── */
export function detectMedicalComorbidities(text = '') {
  const t = String(text || '');
  return Object.keys(MED_COMORBIDITIES).filter((k) => {
    const u = MED_COMORBIDITIES[k];
    return u && !u.__pending && typeof u.detect === 'function' && u.detect(t);
  });
}

/* ── Structured accessor (for the decision-first HTML overlay renderer) ─────
   Returns the matched, built units VERBATIM from MED_COMORBIDITIES so a caller
   can render decision cards without re-parsing the markdown. Same detection as
   renderMedicalComorbidityReport (comorbidities + history). */
export function getMedicalComorbidityUnits({ comorbidities = '', history = '' } = {}) {
  if (!MEDCOMORBID_ACTIVE) return [];
  const text = `${comorbidities || ''} ${history || ''}`.trim();
  if (!text) return [];
  return detectMedicalComorbidities(text).map((k) => MED_COMORBIDITIES[k]).filter(Boolean);
}

/* ── Renderer (markdown, matches the rest of the report) ─────────────────── */
const TAG = (action, isAr) => {
  const a = norm(action);
  if (a.includes('avoid') && a.includes('cap')) return isAr ? '⛔🔧 تجنّب/حدّد' : '⛔🔧 AVOID/CAP';
  if (a.includes('avoid')) return isAr ? '⛔ تجنّب' : '⛔ AVOID';
  if (a.includes('prefer')) return isAr ? '✅ فضّل' : '✅ PREFER';
  if (a.includes('caution')) return isAr ? '⚠️ احذر' : '⚠️ CAUTION';
  if (a.includes('adjust')) return isAr ? '🔧 عدّل' : '🔧 ADJUST';
  return isAr ? 'ℹ️ ملاحظة' : 'ℹ️ NOTE';
};

function renderUnit(unit, isAr) {
  const L = [];
  const src = (a) => (a && a.length ? ` _src: ${sj(a)}_` : '');

  L.push(`\n**${isAr ? '🫀 المرض الجسدي المصاحب' : '🫀 Medical comorbidity'}: ${isAr ? unit.label.ar : unit.label.en}**`);

  if (unit.drugAdjust?.length) {
    L.push(isAr ? '\n_اختيار الدواء النفسي:_' : '\n_Psychotropic selection:_');
    unit.drugAdjust.forEach((d) =>
      L.push(`- ${TAG(d.action, isAr)} **${d.agent}** — ${d.rule}${src(d.src)}`));
  }
  if (unit.doseCeilings?.length) {
    L.push(isAr ? '\n_سقوف الجرعات:_' : '\n_Dose ceilings:_');
    unit.doseCeilings.forEach((c) =>
      L.push(`- **${c.agent} ≤ ${c.ceiling}** — ${isAr ? 'الشرط' : 'condition'}: ${c.condition}${src(c.src)}`));
  }
  if (unit.contraindic?.length) {
    L.push(isAr ? '\n_موانع/تحذيرات:_' : '\n_Contraindications / cautions:_');
    unit.contraindic.forEach((c) => L.push(`- ⛔ ${c.rule}${src(c.src)}`));
  }
  if (unit.labsRef) {
    L.push(isAr ? '\n_التحاليل (من محرك التحاليل الديناميكي):_' : '\n_Labs (from the dynamic-labs engine):_');
    L.push(`- 🩸 ${unit.labsRef}${src(unit.labsSrc)}`);
  }
  if (unit.nutrition?.length) {
    L.push(isAr ? '\n_التغذية (تقاطع نفسي-جسدي):_' : '\n_Nutrition (psych–medical intersection):_');
    unit.nutrition.forEach((x) =>
      L.push(`- ${TAG(x.action, isAr)} **${x.item}** — ${x.rule}${src(x.src)}`));
  }
  if (unit.supplements?.length) {
    L.push(isAr ? '\n_المكملات:_' : '\n_Supplements:_');
    unit.supplements.forEach((x) =>
      L.push(`- ${TAG(x.action, isAr)} **${x.item}** — ${x.rule}${src(x.src)}`));
  }
  if (unit.nutritionRef) {
    L.push(isAr ? '\n_التغذية:_' : '\n_Nutrition:_');
    L.push(`- 🥗 ${unit.nutritionRef}`);
  }
  if (unit.chrono) {
    L.push(isAr ? '\n_الكرونو:_' : '\n_Chrono:_');
    L.push(`- ⏱️ ${unit.chrono}`);
  }
  if (unit.referral) {
    L.push(isAr ? '\n_الإحالة وعمل الفريق:_' : '\n_Referral & team:_');
    L.push(`- ↗️ ${unit.referral}${src(unit.referralSrc)}`);
  }
  return L.join('\n');
}

/* ── Public composer for ClinicalToolPage ───────────────────────────────── */
export function renderMedicalComorbidityReport({ comorbidities = '', history = '', lang = 'en' } = {}) {
  if (!MEDCOMORBID_ACTIVE) return '';
  const isAr = lang === 'ar';
  const text = `${comorbidities || ''} ${history || ''}`.trim();
  if (!text) return '';
  const hits = detectMedicalComorbidities(text);
  if (!hits.length) return '';

  const L = [];
  L.push(isAr
    ? `طبقة الأمراض الجسدية المصاحبة (deterministic) — المُدخَل: "${String(comorbidities || '').trim()}"`
    : `MEDICAL-COMORBIDITY LAYER (deterministic) — input: "${String(comorbidities || '').trim()}"`);
  L.push(isAr
    ? 'التعديلات التالية على البروتوكول النفسي مصدرية؛ الطب الباطني يُدار بإحالة للتخصص لا باختراع بروتوكول:'
    : 'The following psychiatric-protocol adjustments are source-based; internal-medicine care is handled by specialty referral, not by inventing a protocol:');

  hits.forEach((k) => L.push(renderUnit(MED_COMORBIDITIES[k], isAr)));

  L.push(isAr
    ? `\n_مرجع المصدر: ${MEDCOMORBID_VERSION}. البنود verified:true افتراضياً حتى مراجعة خارجية._`
    : `\n_Source stamp: ${MEDCOMORBID_VERSION}. Lines are verified:true by default pending external review._`);
  return L.join('\n');
}
