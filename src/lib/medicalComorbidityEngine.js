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

  /* ── the following are SHAPE-ONLY placeholders (NOT fabricated). ───────── */
  hepatic:      { __pending: true, label: { en: 'Hepatic disease', ar: 'مرض كبدي' } },
  diabetes:     { __pending: true, label: { en: 'Diabetes mellitus', ar: 'داء السكري' } },
  hypertension: { __pending: true, label: { en: 'Hypertension', ar: 'ارتفاع ضغط الدم' } },
  endocrine:    { __pending: true, label: { en: 'Endocrine (thyroid)', ar: 'غدد (درقية)' } },
};

/* ── Detection API ──────────────────────────────────────────────────────── */
export function detectMedicalComorbidities(text = '') {
  const t = String(text || '');
  return Object.keys(MED_COMORBIDITIES).filter((k) => {
    const u = MED_COMORBIDITIES[k];
    return u && !u.__pending && typeof u.detect === 'function' && u.detect(t);
  });
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
