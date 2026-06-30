/* ============================================================================
 * PsychDecide — Deterministic Drug-Interaction Engine  (Roadmap item #2)
 * ----------------------------------------------------------------------------
 * STATUS: v1.1 — ACTIVE, TABLE-ONLY. Clinical table signed off by Dr. Ahmed.
 * The [INTERACTIONS] section is generated ENTIRELY from this table via
 * renderInteractionsReport() (model output for that section is discarded) —
 * identical every run. 17 rules; lithium_serotonergic remains verified:false.
 *
 * ── ON WHAT BASIS ARE RESULTS PRODUCED? (read this first) ──────────────────
 * 1. NOT model inference. Output is produced ONLY by deterministic matching of
 *    the patient's agents against the curated RULES table below. Same input ⇒
 *    byte-identical output, every run. The model never recalls interactions.
 * 2. Matching basis: each agent → canonical id → TAGS; a rule fires when the
 *    present-agent set contains distinct agents matching its `when` matchers
 *    (and not its `exclude`). First-line alternatives are not cross-reacted.
 * 3. Clinical basis: every rule carries its own provenance —
 *      severity      → Micromedex taxonomy (Contraindicated/Major/Moderate/Minor)
 *      tier          → regulatory > tertiary > primary (see SOURCE_TIER)
 *      source        → foundational ref + a CURRENT (2021→2026) ref where one exists
 *      lastReviewed  → date the citation was last checked
 *      verified      → true only if the citation was confirmed this cycle
 *    The rendered block prints tier + a ⚠ unverified flag, so the physician sees
 *    exactly what each line rests on. Mechanism-level rules (e.g. MAOI+serotonergic)
 *    rest on foundational refs that remain current; a recent ref is added as proof
 *    the guidance has not been superseded, not because the old one expired.
 * 4. Limits: the table is curated, not exhaustive. "No interaction" means none in
 *    THIS table — never an absolute safety claim. The render states this.
 *
 * Design: rules fire on tag/id combinations, not enumerated pairs, so coverage
 * scales without a combinatorial table. Math/lookups live in code.
 * ========================================================================== */

export const INTERACTIONS_VERSION = 'v1.1 (2026-06-30)';

// Master switch. ACTIVE: live since 2026-06-30 (clinical sign-off complete).
export const INTERACTIONS_ACTIVE = true;

/* ── 1. Canonical agents ──────────────────────────────────────────────────
 * id -> { label, tags[], aliases[] }. Aliases are lowercase substrings matched
 * against free-text fields (currentMeds, supplements) and formulary drug names.
 * Order aliases longest-first is NOT required; matching is substring-based.
 */
export const AGENTS = {
  // — SSRIs —
  escitalopram: { label: 'Escitalopram', tags: ['ssri', 'serotonergic', 'qt_prolonging'], aliases: ['escitalopram', 'lexapro', 'cipralex'] },
  citalopram:   { label: 'Citalopram',   tags: ['ssri', 'serotonergic', 'qt_prolonging'], aliases: ['citalopram', 'celexa'] },
  sertraline:   { label: 'Sertraline',   tags: ['ssri', 'serotonergic'], aliases: ['sertraline', 'zoloft', 'lustral'] },
  fluoxetine:   { label: 'Fluoxetine',   tags: ['ssri', 'serotonergic', 'cyp2d6_inhibitor', 'cyp2c19_inhibitor', 'long_half_life'], aliases: ['fluoxetine', 'prozac'] },
  paroxetine:   { label: 'Paroxetine',   tags: ['ssri', 'serotonergic', 'cyp2d6_inhibitor', 'anticholinergic'], aliases: ['paroxetine', 'paxil', 'seroxat'] },
  fluvoxamine:  { label: 'Fluvoxamine',  tags: ['ssri', 'serotonergic', 'cyp1a2_inhibitor', 'cyp2c19_inhibitor'], aliases: ['fluvoxamine', 'faverin', 'luvox'] },

  // — SNRIs —
  venlafaxine:  { label: 'Venlafaxine',  tags: ['snri', 'serotonergic', 'qt_prolonging', 'raises_bp'], aliases: ['venlafaxine', 'effexor'] },
  duloxetine:   { label: 'Duloxetine',   tags: ['snri', 'serotonergic', 'cyp1a2_substrate'], aliases: ['duloxetine', 'cymbalta'] },

  // — Other antidepressants —
  mirtazapine:  { label: 'Mirtazapine',  tags: ['serotonergic', 'cns_depressant', 'qt_prolonging'], aliases: ['mirtazapine', 'remeron'] },
  bupropion:    { label: 'Bupropion',    tags: ['cyp2d6_inhibitor', 'seizure_lowering'], aliases: ['bupropion', 'wellbutrin', 'zyban'] },
  clomipramine: { label: 'Clomipramine', tags: ['tca', 'serotonergic', 'qt_prolonging', 'seizure_lowering', 'anticholinergic'], aliases: ['clomipramine', 'anafranil'] },

  // — Antipsychotics / mood —
  aripiprazole: { label: 'Aripiprazole', tags: ['cyp3a4_substrate', 'cyp2d6_substrate'], aliases: ['aripiprazole', 'abilify'] },
  risperidone:  { label: 'Risperidone',  tags: ['cyp2d6_substrate', 'qt_prolonging', 'prolactin'], aliases: ['risperidone', 'risperdal'] },
  olanzapine:   { label: 'Olanzapine',   tags: ['cyp1a2_substrate', 'metabolic'], aliases: ['olanzapine', 'zyprexa'] },
  quetiapine:   { label: 'Quetiapine',   tags: ['cyp3a4_substrate', 'qt_prolonging', 'cns_depressant'], aliases: ['quetiapine', 'seroquel'] },

  // — Anticonvulsants / mood stabilizers —
  topiramate:   { label: 'Topiramate',   tags: ['cyp3a4_inducer_weak', 'reduces_ocp', 'renal_cleared'], aliases: ['topiramate', 'topamax'] },
  valproate:    { label: 'Valproate / Divalproex', tags: ['hepatotoxic', 'enzyme_inhibitor', 'teratogen', 'raises_lamotrigine'], aliases: ['valproate', 'valproic', 'divalproex', 'depakote', 'depakine', 'sodium valproate'] },
  lamotrigine:  { label: 'Lamotrigine',  tags: ['sjs_risk', 'ugt_substrate'], aliases: ['lamotrigine', 'lamictal'] },
  carbamazepine:{ label: 'Carbamazepine', tags: ['cyp3a4_inducer', 'hyponatremia', 'autoinducer'], aliases: ['carbamazepine', 'tegretol'] },
  lithium:      { label: 'Lithium',      tags: ['lithium', 'narrow_ti', 'serotonergic_weak'], aliases: ['lithium', 'lithobid', 'priadel'] },
  pregabalin:   { label: 'Pregabalin',   tags: ['cns_depressant', 'renal_cleared'], aliases: ['pregabalin', 'lyrica'] },
  gabapentin:   { label: 'Gabapentin',   tags: ['cns_depressant', 'renal_cleared'], aliases: ['gabapentin', 'neurontin'] },

  // — MAOIs (hard contraindication hub) —
  phenelzine:    { label: 'Phenelzine (MAOI)',    tags: ['maoi', 'serotonergic'], aliases: ['phenelzine', 'nardil'] },
  tranylcypromine:{ label: 'Tranylcypromine (MAOI)', tags: ['maoi', 'serotonergic'], aliases: ['tranylcypromine', 'parnate'] },
  isocarboxazid: { label: 'Isocarboxazid (MAOI)', tags: ['maoi', 'serotonergic'], aliases: ['isocarboxazid', 'marplan'] },
  selegiline:    { label: 'Selegiline (MAOI-B)',  tags: ['maoi', 'serotonergic'], aliases: ['selegiline', 'emsam'] },
  moclobemide:   { label: 'Moclobemide (RIMA)',   tags: ['maoi', 'serotonergic'], aliases: ['moclobemide', 'manerix', 'aurorix'] },
  linezolid:     { label: 'Linezolid',            tags: ['maoi', 'serotonergic'], aliases: ['linezolid', 'zyvox'] },
  methylene_blue:{ label: 'Methylene blue',       tags: ['maoi', 'serotonergic'], aliases: ['methylene blue', 'methylthioninium'] },

  // — Common serotonergic / interacting co-meds —
  tramadol:     { label: 'Tramadol',     tags: ['serotonergic', 'seizure_lowering', 'cns_depressant', 'opioid'], aliases: ['tramadol', 'tramal', 'ultram'] },
  triptan:      { label: 'Triptan',      tags: ['serotonergic'], aliases: ['sumatriptan', 'rizatriptan', 'zolmitriptan', 'eletriptan', 'naratriptan', 'almotriptan', 'frovatriptan', 'triptan', 'imigran', 'zomig'] },
  dextromethorphan:{ label: 'Dextromethorphan', tags: ['serotonergic'], aliases: ['dextromethorphan'] },
  ondansetron:  { label: 'Ondansetron',  tags: ['serotonergic', 'qt_prolonging'], aliases: ['ondansetron', 'zofran'] },
  warfarin:     { label: 'Warfarin',     tags: ['anticoagulant', 'cyp2c9_substrate'], aliases: ['warfarin', 'coumadin', 'marevan'] },
  doac:         { label: 'DOAC (apixaban/rivaroxaban)', tags: ['anticoagulant'], aliases: ['apixaban', 'rivaroxaban', 'dabigatran', 'edoxaban', 'eliquis', 'xarelto', 'doac', 'noac'] },
  aspirin:      { label: 'Aspirin / antiplatelet', tags: ['antiplatelet', 'nsaid'], aliases: ['aspirin', 'asa', 'clopidogrel', 'plavix', 'acetylsalicylic'] },
  nsaid:        { label: 'NSAID', tags: ['nsaid', 'raises_lithium'], aliases: ['ibuprofen', 'naproxen', 'diclofenac', 'nsaid', 'celecoxib', 'ketorolac'] },
  benzodiazepine:{ label: 'Benzodiazepine', tags: ['cns_depressant'], aliases: ['clonazepam', 'alprazolam', 'lorazepam', 'diazepam', 'xanax', 'rivotril'] },
  opioid:       { label: 'Opioid', tags: ['cns_depressant', 'opioid'], aliases: ['morphine', 'oxycodone', 'codeine', 'fentanyl', 'tapentadol'] },
  oral_contraceptive:{ label: 'Combined oral contraceptive', tags: ['oral_contraceptive', 'cyp3a4_substrate'], aliases: ['oral contraceptive', 'ethinyl', 'drospirenone', 'yasmin', 'yaz', 'combined pill', 'coc', 'ocp', 'birth control'] },
  thiazide:     { label: 'Thiazide / ACE-inhibitor', tags: ['raises_lithium'], aliases: ['hydrochlorothiazide', 'thiazide', 'lisinopril', 'enalapril', 'ramipril', 'ace inhibitor'] },
  clozapine:    { label: 'Clozapine', tags: ['cyp1a2_substrate', 'qt_prolonging', 'narrow_ti'], aliases: ['clozapine', 'clozaril', 'leponex'] },

  // — Supplements —
  st_johns_wort:{ label: "St. John's Wort", tags: ['serotonergic', 'cyp3a4_inducer', 'pgp_inducer'], aliases: ["st john", "st johns", "st. john", "st. johns", "saint john", "saint johns", "hypericum", "عشبة سانت جون"] },
  five_htp:     { label: '5-HTP', tags: ['serotonergic'], aliases: ['5-htp', '5 htp', '5htp', 'five htp', 'hydroxytryptophan'] },
  tryptophan:   { label: 'L-Tryptophan', tags: ['serotonergic'], aliases: ['tryptophan'] },
  sam_e:        { label: 'SAM-e', tags: ['serotonergic'], aliases: ['sam-e', 'same', 'ademetionine', 'adenosylmethionine'] },
  omega3:       { label: 'Omega-3 (high dose)', tags: ['mild_antiplatelet'], aliases: ['omega-3', 'omega 3', 'omega3', 'fish oil', 'epa', 'dha'] },
  ginkgo:       { label: 'Ginkgo biloba', tags: ['mild_antiplatelet'], aliases: ['ginkgo'] },
  melatonin:    { label: 'Melatonin', tags: ['cns_depressant_mild'], aliases: ['melatonin'] },

  // — Dietary / lifestyle —
  alcohol:  { label: 'Alcohol', tags: ['cns_depressant', 'seizure_lowering', 'alcohol'], aliases: ['alcohol', 'ethanol', 'كحول'] },
  caffeine: { label: 'Caffeine (high intake)', tags: ['caffeine', 'cyp1a2_substrate'], aliases: ['caffeine', 'كافيين'] },
};

/* Agent classes used to label interaction TYPE in the report. */
export const FOOD_IDS = new Set(['alcohol', 'caffeine']);
export const SUPPLEMENT_IDS = new Set(['st_johns_wort', 'five_htp', 'tryptophan', 'sam_e', 'omega3', 'ginkgo', 'melatonin']);

/* ── 2. Rules ─────────────────────────────────────────────────────────────
 * Each rule: { id, when:[A,B], severity, mechanism, management, source, tier,
 *              lastReviewed, verified }
 * A/B are matchers: 'tag:xxx' (any agent with that tag) or 'id:xxx' (that agent).
 * A rule fires if the present-agent set contains DISTINCT agents matching A and B.
 *
 * severity     — aligned with the Micromedex severity taxonomy.
 * tier         — provenance of the source (see SOURCE_TIER).
 * lastReviewed — date the rule's content/citation was last reviewed.
 * verified     — true only if the citation was confirmed against the primary/
 *                regulatory source this cycle; false ⇒ Dr. Ahmed to verify.
 */
export const SEVERITY_ORDER = ['CONTRAINDICATED', 'MAJOR', 'MODERATE', 'MINOR'];

// Severity follows Micromedex categories (Contraindicated > Major > Moderate > Minor).
export const SEVERITY_TAXONOMY = 'Micromedex';

// Provenance tiers, strongest first.
export const SOURCE_TIER = {
  regulatory: 'FDA/EMA labeling or Drug Safety Communication',
  tertiary: 'Specialist compendium (CredibleMeds, Flockhart CYP table, ACOG CPG)',
  primary: 'Primary literature / meta-analysis',
};

export const RULES = [
  {
    id: 'maoi_serotonergic',
    when: ['tag:maoi', 'tag:serotonergic'],
    severity: 'CONTRAINDICATED',
    mechanism: 'Dual serotonergic activity → serotonin syndrome (potentially fatal).',
    management: 'Do NOT co-prescribe. Require washout: ≥14 days off MAOI before/after a serotonergic agent; 5 weeks for fluoxetine before an MAOI.',
    source: 'MAOI/SSRI product labeling; Boyer & Shannon, N Engl J Med 2005;352(11):1112-20 (foundational); Chiew & Isbister, Br J Clin Pharmacol 2025;91(3):654-61 (current).',
    tier: 'regulatory',
    lastReviewed: '2026-06-29',
    verified: true,
  },
  {
    id: 'maoi_tyramine',
    when: ['tag:maoi', 'food:tyramine'],
    severity: 'CONTRAINDICATED',
    mechanism: 'Irreversible MAO inhibition + dietary tyramine → hypertensive crisis.',
    management: 'Strict low-tyramine diet (avoid aged cheese, cured meats, fermented foods, draft beer). Drug-food rule.',
    source: 'MAOI labeling (box warning); StatPearls MAOI 2025; "Dietary Restrictions & Drug Interactions with MAOIs: An Update", J Clin Psychiatry 2021.',
    tier: 'regulatory',
    lastReviewed: '2026-06-29',
    verified: true,
    foodOnly: true,
  },
  {
    id: 'serotonergic_stack',
    when: ['tag:serotonergic', 'tag:serotonergic'],
    exclude: ['tag:maoi'], // MAOI combos are covered (higher) by maoi_serotonergic
    severity: 'MAJOR',
    mechanism: 'Additive serotonergic load (e.g., SSRI + tramadol/triptan/St John\'s Wort/5-HTP) → serotonin syndrome risk.',
    management: 'Avoid where possible; if combined, use lowest doses, counsel on serotonin-syndrome signs (clonus, hyperthermia, agitation), monitor closely.',
    source: 'Mikkelsen et al., Basic Clin Pharmacol Toxicol 2023;133(2):124-9; Chiew & Isbister, Br J Clin Pharmacol 2025;91(3):654-61 (current); Boyer & Shannon, NEJM 2005 (foundational).',
    tier: 'primary',
    lastReviewed: '2026-06-29',
    verified: true,
    distinct: true,
  },
  {
    id: 'ssri_bleeding',
    when: ['tag:serotonergic_ad', 'tag:bleed'],
    severity: 'MAJOR',
    mechanism: 'SSRI/SNRI deplete platelet serotonin; additive with NSAID/antiplatelet/anticoagulant → upper-GI / bleeding risk.',
    management: 'Avoid if possible; if needed add gastroprotection (PPI), monitor for bleeding; check INR with warfarin.',
    source: 'Gomez-Lumbreras et al., Br J Clin Pharmacol 2026;92(3):793-808; Haghbin et al., Dig Dis Sci 2023;68(5):1975-82 (current); Anglin et al., Am J Gastroenterol 2014;109(6):811-19 (foundational meta).',
    tier: 'primary',
    lastReviewed: '2026-06-29',
    verified: true,
  },
  {
    id: 'qt_stack',
    when: ['tag:qt_prolonging', 'tag:qt_prolonging'],
    severity: 'MAJOR',
    mechanism: 'Additive QTc prolongation → torsades de pointes risk.',
    management: 'Baseline + on-treatment ECG; avoid stacking; correct K⁺/Mg²⁺; citalopram ≤40 mg (≤20 mg if ≥60 y/hepatic/CYP2C19-PM) & escitalopram ≤20 mg ceilings.',
    source: 'FDA Drug Safety Communication, citalopram, 24 Aug 2011 (rev. 28 Mar 2012); CredibleMeds/AZCERT QT list (continuously updated; accessed 2026).',
    tier: 'regulatory',
    lastReviewed: '2026-06-29',
    verified: true,
    distinct: true,
  },
  {
    id: 'cyp2d6_inhib_substrate',
    when: ['tag:cyp2d6_inhibitor', 'tag:cyp2d6_substrate'],
    severity: 'MODERATE',
    mechanism: 'Strong 2D6 inhibitor (fluoxetine/paroxetine/bupropion) raises substrate levels (risperidone, aripiprazole, TCAs, metoprolol).',
    management: 'Anticipate higher substrate exposure; reduce substrate dose / monitor for toxicity.',
    source: 'FDA labeling — bupropion ↑ desipramine AUC ~5× (CYP2D6); fluoxetine/paroxetine are strong 2D6 inhibitors; Flockhart CYP table.',
    tier: 'regulatory',
    lastReviewed: '2026-06-29',
    verified: true,
  },
  {
    id: 'fluvoxamine_1a2',
    when: ['id:fluvoxamine', 'tag:cyp1a2_substrate'],
    severity: 'MAJOR',
    mechanism: 'Fluvoxamine potently inhibits CYP1A2 → markedly raised clozapine/olanzapine/duloxetine/theophylline levels.',
    management: 'Avoid with clozapine where possible; if combined, reduce dose and monitor levels (clozapine plasma).',
    source: 'FDA fluvoxamine labeling; clozapine levels ↑5–10× via CYP1A2 inhibition (multiple TDM studies).',
    tier: 'regulatory',
    lastReviewed: '2026-06-29',
    verified: true,
  },
  {
    id: 'valproate_lamotrigine',
    when: ['id:valproate', 'id:lamotrigine'],
    severity: 'MAJOR',
    mechanism: 'Valproate inhibits lamotrigine glucuronidation → ~2× lamotrigine level → Stevens-Johnson/TEN risk.',
    management: 'If combined, use the reduced lamotrigine titration (≈half normal) per labeling; counsel on rash.',
    source: 'FDA LAMICTAL labeling — valproate inhibits lamotrigine glucuronidation; mandated reduced-titration regimen; SJS/TEN risk.',
    tier: 'regulatory',
    lastReviewed: '2026-06-29',
    verified: true,
  },
  {
    id: 'lithium_raised',
    when: ['id:lithium', 'tag:raises_lithium'],
    severity: 'MAJOR',
    mechanism: 'NSAIDs, thiazides and ACE-inhibitors reduce renal lithium clearance → toxicity.',
    management: 'Avoid NSAIDs; if thiazide/ACE needed, monitor lithium level closely and adjust dose.',
    source: 'Lithium labeling; NSAIDs ↓ clearance ~20%, thiazides ↑ level 25–40%, ACE-I variable; Br J Clin Pharmacol review 2020 (PMC7358048).',
    tier: 'regulatory',
    lastReviewed: '2026-06-29',
    verified: true,
  },
  {
    id: 'lithium_serotonergic',
    when: ['id:lithium', 'tag:serotonergic'],
    severity: 'MODERATE',
    mechanism: 'Lithium augments serotonergic transmission → reported serotonin syndrome with SSRIs.',
    management: 'Common augmentation combination — acceptable with monitoring; watch for tremor/myoclonus/confusion.',
    source: 'CANMAT augmentation guidance; case literature.',
    tier: 'tertiary',
    lastReviewed: '2026-06-29',
    verified: false,
  },
  {
    id: 'cns_depressant_stack',
    when: ['tag:cns_depressant', 'tag:cns_depressant'],
    severity: 'MAJOR',
    mechanism: 'Additive CNS/respiratory depression (pregabalin/gabapentin + opioids/benzodiazepines/alcohol).',
    management: 'Avoid combination; if unavoidable, lowest doses, counsel on sedation/respiratory risk.',
    source: 'FDA Drug Safety Communication, gabapentinoids, 19 Dec 2019 (latest FDA regulatory action; still current).',
    tier: 'regulatory',
    lastReviewed: '2026-06-29',
    verified: true,
    distinct: true,
  },
  {
    id: 'bupropion_seizure',
    when: ['id:bupropion', 'tag:seizure_lowering'],
    severity: 'MODERATE',
    mechanism: 'Additive lowering of seizure threshold (bupropion + tramadol/clomipramine/alcohol).',
    management: 'Avoid in seizure-prone patients; bupropion is contraindicated with abrupt alcohol/benzodiazepine withdrawal. Respect dose ceiling (≤450 mg/day, ≤150 mg single XL dose).',
    source: 'FDA WELLBUTRIN labeling — dose-related seizures, ≤450 mg/day ceiling; contraindicated with MAOIs and abrupt sedative withdrawal.',
    tier: 'regulatory',
    lastReviewed: '2026-06-29',
    verified: true,
  },
  {
    id: 'cyp3a4_inducer_substrate',
    when: ['tag:cyp3a4_inducer', 'tag:cyp3a4_substrate'],
    severity: 'MODERATE',
    mechanism: 'Inducer (carbamazepine / St John\'s Wort) lowers substrate exposure (aripiprazole, quetiapine, oral contraceptive) → loss of efficacy.',
    management: 'Anticipate sub-therapeutic levels; consider dose increase or alternative; backup contraception.',
    source: 'FDA CYP3A4-inducer table — carbamazepine & St John\'s Wort are strong inducers (SJW also induces P-gp); reduce substrate/OCP levels.',
    tier: 'regulatory',
    lastReviewed: '2026-06-29',
    verified: true,
  },
  {
    id: 'topiramate_ocp',
    when: ['id:topiramate', 'id:oral_contraceptive'],
    severity: 'MODERATE',
    mechanism: 'Topiramate is a moderate CYP3A4 inducer; >200 mg/day significantly raises ethinylestradiol clearance → contraceptive failure. At ≤200 mg/day the effect is clinically insignificant (PK + real-world data).',
    management: 'Act only at >200 mg/day: advise additional/barrier contraception or higher-EE formulation. At ≤200 mg/day no contraceptive action needed per current evidence. (Engine cannot read the dose — verify before acting.)',
    source: 'Topiramate FDA labeling; Sarayani et al. Contraception 2023;120:109953; ACOG.',
    tier: 'regulatory',
    lastReviewed: '2026-06-29',
    verified: true,
  },
  {
    id: 'omega3_bleed',
    when: ['tag:mild_antiplatelet', 'tag:bleed'],
    severity: 'MINOR',
    mechanism: 'Theoretical additive antiplatelet effect of high-dose omega-3 / ginkgo. Current RCT/meta-analysis evidence does NOT show a significant increase in clinical bleeding, even at 4 g/day.',
    management: 'No routine action; brief perioperative caution only. Reassure rather than withhold.',
    source: 'Omega-3 bleeding meta-analysis, J Am Heart Assoc 2024 (PMC11179820); REDUCE-IT; MESA 2021.',
    tier: 'primary',
    lastReviewed: '2026-06-29',
    verified: true,
  },
  {
    id: 'alcohol_ad',
    when: ['id:alcohol', 'tag:serotonergic_ad'],
    severity: 'MINOR',
    mechanism: 'Alcohol adds CNS depression, worsens mood and sleep architecture, and impairs glycaemic control alongside SSRIs/SNRIs.',
    management: 'Advise abstinence or strict limitation during antidepressant therapy.',
    source: 'Standard prescribing guidance (patient counseling point).',
    tier: 'tertiary',
    lastReviewed: '2026-06-30',
    verified: true,
  },
  {
    id: 'caffeine_ad',
    when: ['id:caffeine', 'tag:serotonergic_ad'],
    severity: 'MINOR',
    mechanism: 'High caffeine intake can exacerbate anxiety, insomnia and agitation — common early SSRI/SNRI effects.',
    management: 'Limit to ≤200 mg/day (~2 cups) during initiation; reassess.',
    source: 'Standard prescribing guidance (patient counseling point).',
    tier: 'tertiary',
    lastReviewed: '2026-06-30',
    verified: true,
  },
];

/* Composite tag expansions: some rules reference convenience tags that map to a
 * set of base tags above. Resolve them when checking agent membership. */
const TAG_EXPANSION = {
  bleed: ['anticoagulant', 'antiplatelet', 'nsaid'],
  serotonergic_ad: ['ssri', 'snri'], // antidepressant serotonergics for the bleeding rule
};

function agentHasMatcher(agentId, matcher) {
  const a = AGENTS[agentId];
  if (!a) return false;
  if (matcher.startsWith('id:')) return agentId === matcher.slice(3);
  if (matcher.startsWith('tag:')) {
    const tag = matcher.slice(4);
    if (a.tags.includes(tag)) return true;
    const expanded = TAG_EXPANSION[tag];
    if (expanded) return expanded.some((t) => a.tags.includes(t));
    return false;
  }
  return false;
}

/* ── 3. Resolve free text + formulary into a present-agent set ───────────── */
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
// Word-boundary match so 'citalopram' does NOT match inside 'escitalopram'.
const aliasMatches = (text, alias) =>
  new RegExp('(^|[^a-z0-9])' + escapeRe(alias) + '([^a-z0-9]|$)', 'i').test(text);

export function resolveAgents(text = '') {
  const t = String(text || '').toLowerCase();
  const found = new Set();
  for (const [id, a] of Object.entries(AGENTS)) {
    if (a.aliases.some((al) => aliasMatches(t, al))) found.add(id);
  }
  return found;
}

/* present -> Map<agentId, Set<role>>  where role ∈
 *   'firstLine' | 'adjunct' | 'current' | 'supplement'
 * firstLine options are mutually-exclusive alternatives (physician picks one);
 * adjunct options are genuinely co-prescribed (augmentation). */
export function buildPresentSet({ firstLineNames = [], adjunctNames = [], currentMeds = '', supplements = '' } = {}) {
  const all = new Map();
  const tag = (set, role) => set.forEach((id) => {
    if (!all.has(id)) all.set(id, new Set());
    all.get(id).add(role);
  });
  tag(resolveAgents(firstLineNames.join(' | ')), 'firstLine');
  tag(resolveAgents(adjunctNames.join(' | ')), 'adjunct');
  tag(resolveAgents(currentMeds), 'current');
  tag(resolveAgents(supplements), 'supplement');
  return all; // Map<agentId, Set<role>>
}

/* A pair is suppressed only when BOTH agents are *exclusively* first-line
 * recommendations — i.e. mutually-exclusive alternatives that would never be
 * co-prescribed. Any other role (adjunct / current / supplement) makes the
 * pair clinically real and therefore eligible. */
function exclusiveFirstLine(roles) {
  return roles.size === 1 && roles.has('firstLine');
}
function pairEligible(rolesA, rolesB) {
  return !(exclusiveFirstLine(rolesA) && exclusiveFirstLine(rolesB));
}

/* ── 4. Compute interactions (deterministic) ─────────────────────────────── */
export function computeInteractions(input) {
  const present = buildPresentSet(input);
  const ids = [...present.keys()];
  const out = [];
  const seen = new Set();

  for (const rule of RULES) {
    if (rule.foodOnly) {
      // food rules fire on a single qualifying agent (e.g., any MAOI present)
      const hit = ids.find((id) => agentHasMatcher(id, rule.when[0]));
      if (hit) pushMatch(out, seen, rule, [hit], present);
      continue;
    }
    const [mA, mB] = rule.when;
    for (const a of ids) {
      if (!agentHasMatcher(a, mA)) continue;
      for (const b of ids) {
        if (a === b) continue;
        if (!agentHasMatcher(b, mB)) continue;
        // Skip pairs of mutually-exclusive first-line alternatives.
        if (!pairEligible(present.get(a), present.get(b))) continue;
        // Skip if either agent matches an exclude matcher (handled by another rule).
        if (rule.exclude && rule.exclude.some((m) => agentHasMatcher(a, m) || agentHasMatcher(b, m))) continue;
        // For symmetric/distinct rules avoid double-counting (a,b)=(b,a)
        if (rule.distinct && a > b) continue;
        pushMatch(out, seen, rule, [a, b], present);
      }
    }
  }
  out.sort((x, y) => SEVERITY_ORDER.indexOf(x.severity) - SEVERITY_ORDER.indexOf(y.severity));
  return out;
}

function pushMatch(out, seen, rule, agentIds, present) {
  const key = rule.id + ':' + [...agentIds].sort().join('+');
  if (seen.has(key)) return;
  seen.add(key);
  const agents = agentIds.map((id) => ({
    id,
    label: AGENTS[id]?.label || id,
    roles: [...(present.get(id) || [])],
  }));
  out.push({
    ruleId: rule.id,
    severity: rule.severity,
    agents,
    mechanism: rule.mechanism,
    management: rule.management,
    source: rule.source,
    tier: rule.tier,
    verified: rule.verified,
    foodOnly: rule.foodOnly || false,
  });
}

/* Order a pair so the patient's EXISTING agent (current med / supplement) is
 * the visible anchor, then the recommended drug. This makes "trigger ↔ each
 * alternative" read as distinct, accurate pairs instead of one lumped list. */
const ROLE_RANK = { current: 0, supplement: 1, adjunct: 2, firstLine: 3 };
function agentRank(roles) {
  let r = 9;
  for (const role of roles || []) if (ROLE_RANK[role] < r) r = ROLE_RANK[role];
  return r;
}
function orderedPairLabels(agents) {
  return [...agents]
    .sort((a, b) => agentRank(a.roles) - agentRank(b.roles) || a.label.localeCompare(b.label))
    .map((a) => a.label);
}

/* ── 5. Render a deterministic INTERACTIONS block for the locked context ─── */
export function renderInteractions(matches, { lang = 'en' } = {}) {
  const ar = lang === 'ar';
  if (!matches || !matches.length) {
    return ar
      ? `لا توجد تعارضات دوائية معروفة من جدول PsychDecide بين العوامل المُدخلة (الإصدار ${INTERACTIONS_VERSION}). هذا لا ينفي تعارضات خارج الجدول — راجع مصدراً متخصصاً عند الشك.`
      : `No known interactions from the PsychDecide table among the entered agents (${INTERACTIONS_VERSION}). Absence here does not rule out interactions outside the table — consult a specialist reference when in doubt.`;
  }
  // One line per interacting PAIR (matches are already deduped & severity-sorted
  // in computeInteractions). The trigger agent is anchored first so a current med
  // vs several alternatives reads as distinct pairs, never one lumped list.
  const head = ar
    ? `DETERMINISTIC INTERACTION TABLE (${INTERACTIONS_VERSION}) — انسخ هذه التعارضات حرفياً في قسم [INTERACTIONS]؛ لا تضف ولا تحذف ولا تغيّر الشدة:`
    : `DETERMINISTIC INTERACTION TABLE (${INTERACTIONS_VERSION}) — copy these verbatim into [INTERACTIONS]; do NOT add, omit, or change severity:`;
  const lines = matches.map((m) => {
    const agents = orderedPairLabels(m.agents).join(' + ');
    const flag = m.verified ? '' : ' ⚠ unverified';
    return `  [${m.severity}] ${agents}\n     • Mechanism: ${m.mechanism}\n     • Management: ${m.management}\n     • Source (${m.tier}${flag}): ${m.source}`;
  });
  return [head, ...lines].join('\n');
}

/* Convenience: pull recommended drug display names from a FORMULARY disorder block,
 * separated by role. Pass FORMULARY[key] to avoid an import cycle. */
export function recommendedDrugNames(formularyBlock) {
  const meds = (formularyBlock && formularyBlock.medications) || {};
  const collect = (arr) => {
    const names = [];
    (arr || []).forEach((d) => { if (d.drug) names.push(d.drug); if (d.trade) names.push(d.trade); });
    return names;
  };
  return { firstLine: collect(meds.firstLine), adjunct: collect(meds.adjunct) };
}

/* One-call helper for clinicalLock(): returns the rendered block (or '' if inactive). */
export function renderInteractionGate({ formularyBlock, currentMeds, supplements, lang } = {}) {
  if (!INTERACTIONS_ACTIVE) return '';
  const { firstLine, adjunct } = recommendedDrugNames(formularyBlock);
  const matches = computeInteractions({ firstLineNames: firstLine, adjunctNames: adjunct, currentMeds, supplements });
  return renderInteractions(matches, { lang });
}

/* ── 6. TABLE-ONLY report output ──────────────────────────────────────────
 * interactionItems() returns the [INTERACTIONS] section as structured items
 * { type, items, severity, note } — same shape the report expects — so the
 * whole section is generated from the deterministic table, never the model. */
function classifyType(ids, foodOnly) {
  if (foodOnly || ids.some((id) => FOOD_IDS.has(id))) return 'drug-food';
  if (ids.some((id) => SUPPLEMENT_IDS.has(id))) return 'supplement-drug';
  return 'drug-drug';
}

export function interactionItems(input) {
  const matches = computeInteractions(input);
  // One structured item per interacting PAIR (already deduped & severity-sorted).
  // The trigger agent is anchored first; no lumping of distinct pairs.
  return matches.map((m) => {
    const ids = m.agents.map((a) => a.id);
    const labels = orderedPairLabels(m.agents).join(' + ');
    const flag = m.verified ? '' : ' — unverified';
    return {
      type: classifyType(ids, m.foodOnly),
      items: labels,
      severity: m.severity.toLowerCase(),
      note: `Mechanism: ${m.mechanism} Management: ${m.management} Source (${m.tier}${flag}): ${m.source}`,
    };
  });
}

/* Final [INTERACTIONS] section string, formatted like the rest of the report:
 *   - [type] items: note (Severity: x)
 * Used to OVERRIDE the model's interactions section (table-only). */
export function renderInteractionsReport({ firstLineNames = [], adjunctNames = [], currentMeds = '', supplements = '', lang = 'en' } = {}) {
  const ar = lang === 'ar';
  const sevLabel = ar ? 'الشدة' : 'Severity';
  const items = interactionItems({ firstLineNames, adjunctNames, currentMeds, supplements });
  if (!items.length) {
    return ar
      ? `- لا توجد تعارضات في جدول PsychDecide (${INTERACTIONS_VERSION}) بين العوامل المُدخلة. الغياب هنا لا ينفي تعارضات خارج الجدول؛ راجع مصدراً متخصصاً عند الشك.`
      : `- No interactions in the PsychDecide table (${INTERACTIONS_VERSION}) among the entered agents. Absence here does not rule out interactions outside the table; consult a specialist reference when in doubt.`;
  }
  return items.map((i) => `- [${i.type}] ${i.items}: ${i.note} (${sevLabel}: ${i.severity})`).join('\n');
}
