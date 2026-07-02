/* ============================================================================
 * mealPlanEngine.js — Deterministic MACROS + MEAL ARCHITECTURE
 * ----------------------------------------------------------------------------
 * STATUS: v0.1-DRAFT (2026-07-01) — GAD template first; pending physician sign-off.
 *
 * Turns computeMetrics() output (calories + protein, already ED-gate-aware) into
 * a full plan: fat/carb grams & %, fibre/SFA/added-sugar targets, and a timed
 * meal architecture. Per-disorder strategy comes from NUTRITION[key].macroTemplate
 * + .mealArchitecture (nutritionFormulary). Meal TIMING is stated as a principle
 * (front-loaded / ≥3 h before bed) — a specific clock window is NOT invented,
 * consistent with the chrono layer.
 *
 * "From sources, not from brain": every target is anchored (WHO / National
 * Academies 2024 / RCTs) via the template's `src`; all rows carry verified:false
 * until Dr. Ahmed signs off. Same input ⇒ byte-identical output, every run.
 * ========================================================================== */
import { NUTRITION, NUTRITION_ACTIVE } from './nutritionFormulary';
import { RX_ACTIVE } from './rxFormulary';
import { edTextPresent, patientHasEatingDisorder } from './clinicalFormulary';

export const MEALPLAN_VERSION = 'v0.1-DRAFT (2026-07-01)';
export const MEALPLAN_ACTIVE = true;

const okM = (key) =>
  RX_ACTIVE && NUTRITION_ACTIVE && MEALPLAN_ACTIVE &&
  NUTRITION[key] && NUTRITION[key].macroTemplate;

const r0 = (x) => Math.round(x);
const sj = (a) => (a || []).join('; ');

/* ── Renal gate detection ──────────────────────────────────────────────────
 * The ONLY hard cap on protein is renal impairment (KDIGO 2024 → RDA 0.8 g/kg
 * for CKD 3–5 not on dialysis; KDOQI → LPD 0.55–0.6). Liver disease is NOT a
 * cap — ESPEN/EASL recommend 1.2–1.5 g/kg in cirrhosis; restriction abandoned.
 * Detected from the comorbidity free-text; dialysis is excluded (different,
 * higher needs → specialist call, so we do not auto-cap there).
 */
// ASCII terms carry a leading \b (no TRAILING \b — it would break prefix matches
// like "renal impair·ment" / "insufficien·cy"). Arabic terms carry NO \b at all,
// because JS \b is ASCII-only and never matches beside Arabic letters (that bug
// silently disabled every Arabic renal/dialysis term).
const RENAL_RE = /\b(?:ckd|chronic kidney|renal\s+(?:impair|insufficien|failure)|kidney\s+(?:disease|failure|impair)|nephropath|egfr)|قصور كلوي|قصور الكلى|فشل كلوي|مرض كلوي|اعتلال كلوي|كلى/i;
const DIALYSIS_RE = /\b(?:dialysis|haemodialysis|hemodialysis)\b|غسيل كلوي|ديال/i;

export function hasRenalImpairment(comorbidities = '') {
  const t = String(comorbidities || '');
  if (!RENAL_RE.test(t)) return false;
  if (DIALYSIS_RE.test(t)) return false; // dialysis needs higher protein — do not auto-cap
  return true;
}

/* Eating-disorder SAFETY gate — anorexia/bulimia/BED/purging/disordered eating.
 * Highly comorbid with BPD (and present across disorders). When detected, the
 * macro/meal layer WITHHOLDS caloric deficits and numeric macro/meal targets and
 * instead shows a safety+referral block: numeric restriction can trigger or
 * worsen disordered eating, so targets must be set by an ED-informed team. */
// Delegates to the SINGLE shared detector in clinicalFormulary (whole-word
// keywords, Arabic-normalised, no bare "ED"/"BED"). Kept for API compatibility;
// the form-level gate below (patientHasEatingDisorder) additionally honours the
// explicit checkbox and the stopMed field.
export function hasEatingDisorder(comorbidities = '', history = '') {
  return edTextPresent(`${comorbidities || ''} ${history || ''}`);
}

/* Poor muscle: agreed threshold = low FFMI (ERS: <15 ♀ / <17 ♂) OR a high
 * fat-to-skeletal-muscle ratio. Uses metrics already computed by computeMetrics. */
export function hasPoorMuscle({ ffmi, fmr, male } = {}) {
  const ffmiLow = male ? 17 : 15;
  const lowFfmi = ffmi != null && ffmi < ffmiLow;
  const highFmr = fmr != null && fmr >= 1.4; // fat ≥ 1.4× skeletal muscle
  return !!(lowFfmi || highFmr);
}

/* ── 1. MACROS ─────────────────────────────────────────────────────────────
 * Baseline: protein anchored to lean mass (fixed grams from computeMetrics),
 * fat = %-of-energy from the template, carbohydrate = remainder.
 *
 * DEFICIT adjustment (data-driven, only when a deficit is being run):
 *   • proteinSafe (no renal impairment) → allow raising protein toward the top
 *     of its range (lean-preserving; most valuable when muscle is poor).
 *   • renal impairment → CAP protein at RDA (0.8 g/kg body weight) and REFER;
 *     shift the freed energy into healthy fat instead (satiety, less catabolism).
 *   • poor muscle WITH protein capped → raise fat (as agreed).
 * Non-deficit contexts keep the baseline split.
 */
export function computeMacros({
  calLow, calHigh, calDirection = 'maintenance',
  proteinLow, proteinHigh, template = {},
  weightKg = null, ffmi = null, fmr = null, male = false, comorbidities = '',
} = {}) {
  const fatPct = template.fatPctEnergy ?? 30;             // WHO: total fat ≤30%E
  const sfaCapPct = template.sfaCapPctEnergy ?? 10;       // WHO: SFA <10%E
  const sugarCapPct = template.addedSugarCapPctEnergy ?? 10; // WHO: free sugars <10%E

  const kcal = r0((Number(calLow) + Number(calHigh)) / 2);

  const renalCap = hasRenalImpairment(comorbidities);
  const poorMuscle = hasPoorMuscle({ ffmi, fmr, male });
  const isDeficit = calDirection === 'deficit';

  // Protein target (grams)
  const pMid = (Number(proteinLow) + Number(proteinHigh)) / 2;
  const pHigh = Number(proteinHigh);
  let proteinG;
  let effFatPct = fatPct;
  const decisions = [];

  if (renalCap) {
    // Hard cap: RDA 0.8 g/kg body weight (KDIGO 2024). Never above baseline mid.
    const rdaCap = weightKg ? r0(weightKg * 0.8) : r0(pMid);
    proteinG = Math.min(r0(pMid), rdaCap);
    decisions.push(`Renal impairment detected → protein CAPPED at RDA 0.8 g/kg (${proteinG} g); refer to nephrology.`);
    if (isDeficit) { effFatPct = fatPct + 5; decisions.push('Freed energy shifted into healthy fat (MUFA/n-3), not protein.'); }
  } else if (isDeficit) {
    // Protein-safe deficit: lean-preserving → top of the range, esp. if muscle poor.
    proteinG = r0(pHigh);
    decisions.push(poorMuscle
      ? 'Protein-safe + poor muscle → protein raised to the top of range (lean-preserving in the deficit).'
      : 'Protein-safe deficit → protein raised to the top of range (lean-preserving).');
  } else {
    proteinG = r0(pMid);
  }

  // If muscle poor but protein is capped (renal), the fat-shift above already applies.
  if (poorMuscle && renalCap && isDeficit && !decisions.some((d) => d.includes('fat')))
    { effFatPct = fatPct + 5; decisions.push('Poor muscle + protein capped → raise healthy fat.'); }

  const proteinKcal = proteinG * 4;
  const fatKcal = r0(kcal * effFatPct / 100);
  const fatG = r0(fatKcal / 9);

  let carbKcal = kcal - proteinKcal - fatG * 9;
  const proteinFatExceedsEnergy = carbKcal < 0;
  if (carbKcal < 0) carbKcal = 0;
  const carbG = r0(carbKcal / 4);

  const pct = (k) => (kcal > 0 ? r0(k / kcal * 100) : 0);
  return {
    kcal,
    direction: calDirection,
    protein: { g: proteinG, pct: pct(proteinKcal) },
    fat: { g: fatG, pct: pct(fatG * 9), sfaCapG: r0(kcal * sfaCapPct / 100 / 9) },
    carb: {
      g: carbG, pct: pct(carbKcal),
      fibreG: Math.max(25, r0(14 * kcal / 1000)),          // WHO ≥25 g; DGA ~14 g/1000 kcal
      addedSugarCapG: r0(kcal * sugarCapPct / 100 / 4),
    },
    gates: { renalCap, poorMuscle, decisions },
    flags: { proteinFatExceedsEnergy },
  };
}

/* ── 2. MEAL ARCHITECTURE ──────────────────────────────────────────────────
 * Distribute the day's energy & macros across meals per the template's
 * distribution (front-loaded), with an optional protein/fibre snack taking any
 * remainder. Timing is expressed as a principle, not a fixed clock time.
 */
const MEAL_LABELS = ['Breakfast', 'Lunch', 'Dinner', 'Meal 4', 'Meal 5'];
const MEAL_EMPHASIS = [
  'Protein-forward for morning alertness; include fibre.',
  'Balanced; typically the largest share.',
  'Complex-carbohydrate acceptable (tryptophan→serotonin/melatonin); finish ≥3 h before bed.',
  'Balanced.',
  'Balanced.',
];

export function buildMealPlan({ macros, mealArchitecture = {} }) {
  const nMeals = mealArchitecture.meals || 3;
  const dist = (mealArchitecture.distribution || [0.30, 0.35, 0.25]).slice(0, nMeals);
  const distSum = dist.reduce((a, b) => a + b, 0);
  const snackFrac = mealArchitecture.snacks ? Math.max(0, +(1 - distSum).toFixed(2)) : 0;

  const share = (frac) => ({
    kcal: r0(macros.kcal * frac),
    protein: r0(macros.protein.g * frac),
    fat: r0(macros.fat.g * frac),
    carb: r0(macros.carb.g * frac),
  });

  const meals = dist.map((frac, i) => ({
    label: MEAL_LABELS[i] || `Meal ${i + 1}`,
    frac, ...share(frac), note: MEAL_EMPHASIS[i] || 'Balanced.',
  }));
  if (snackFrac > 0.001) {
    meals.push({
      label: 'Snack (optional)', frac: snackFrac, ...share(snackFrac),
      note: 'Protein + fibre to blunt inter-meal glucose swings; skip if not hungry.',
    });
  }
  return meals;
}

/* ── 3. RENDERERS (markdown, matching the rest of the report) ──────────────── */
export function renderMacros({ macros, template = {}, lang = 'en' } = {}) {
  const isAr = lang === 'ar';
  const m = macros;
  const dirLabel = { deficit: isAr ? 'عجز' : 'deficit', surplus: isAr ? 'فائض' : 'surplus', maintenance: isAr ? 'صيانة' : 'maintenance' }[m.direction] || m.direction;
  const L = [];
  L.push(`\n**${isAr ? '🍽️ توزيع الماكروز (محسوب من السعرات)' : '🍽️ Macronutrient split (computed from the caloric target)'}**`);
  L.push(`- ${isAr ? 'الطاقة التخطيطية' : 'Planning energy'}: **${m.kcal} kcal/day** _(${dirLabel})_`);
  L.push(`- ${isAr ? 'بروتين' : 'Protein'}: **${m.protein.g} g** (${m.protein.pct}% ${isAr ? 'طاقة' : 'energy'}) — ${isAr ? 'مثبّت على الكتلة الخالية من الدهون' : 'anchored to lean mass'}`);
  L.push(`- ${isAr ? 'دهون' : 'Fat'}: **${m.fat.g} g** (${m.fat.pct}% ${isAr ? 'طاقة' : 'energy'}) — ${isAr ? 'مشبعة' : 'saturated'} ≤ ${m.fat.sfaCapG} g (<10%E)`);
  L.push(`- ${isAr ? 'كارب' : 'Carbohydrate'}: **${m.carb.g} g** (${m.carb.pct}% ${isAr ? 'طاقة' : 'energy'}) — ${isAr ? 'ألياف' : 'fibre'} ≥ ${m.carb.fibreG} g; ${isAr ? 'سكر مضاف' : 'added sugar'} ≤ ${m.carb.addedSugarCapG} g (<10%E)`);
  if (m.flags?.proteinFatExceedsEnergy)
    L.push(`- ⚠️ ${isAr ? 'البروتين+الدهون تجاوزا الطاقة المستهدفة عند هذا العجز — راجع هدف البروتين أو مدى العجز.' : 'Protein+fat exceed the target energy at this deficit — review protein target or deficit depth.'}`);
  if (m.gates?.decisions?.length) {
    L.push(`\n_${isAr ? 'منطق البروتين/الدهون المشروط' : 'Conditional protein/fat logic'}:_`);
    m.gates.decisions.forEach((d) => L.push(`  - ${d}`));
  }
  if (template.strategy) L.push(`\n_${isAr ? 'الاستراتيجية' : 'Strategy'}: ${template.strategy}_`);
  if (template.src) L.push(`_src: ${sj(template.src)}_`);
  return L.join('\n');
}

export function renderMealPlan({ meals, mealArchitecture = {}, lang = 'en' } = {}) {
  const isAr = lang === 'ar';
  const L = [];
  L.push(`\n**${isAr ? '🕐 بنية الوجبات (متزامنة مع الكرونو)' : '🕐 Meal architecture (chrono-aligned)'}**`);
  meals.forEach((x) => {
    L.push(`- **${x.label}** — ~${x.kcal} kcal · P ${x.protein} g / F ${x.fat} g / C ${x.carb} g. ${x.note}`);
  });
  if (mealArchitecture.noSkip) L.push(`- ⚠️ ${isAr ? 'لا تُفوّت وجبة — التفويت يسبب تأرجح سكر يحاكي القلق.' : 'Do NOT skip meals — skipping drives glucose swings that mimic anxiety.'}`);
  if (mealArchitecture.timing) L.push(`\n_${isAr ? 'التوقيت' : 'Timing'}: ${mealArchitecture.timing}_`);
  if (mealArchitecture.src) L.push(`_src: ${sj(mealArchitecture.src)}_`);
  return L.join('\n');
}

export function renderCarbFatQuality({ carbQuality, fatQuality, lang = 'en' } = {}) {
  const isAr = lang === 'ar';
  const L = [];
  if (carbQuality) {
    L.push(`\n**${isAr ? '🌾 جودة الكارب' : '🌾 Carbohydrate quality'}**`);
    (carbQuality.prefer || []).forEach((c) => L.push(`- ✅ **${c.type}** — ${c.examples}. ${c.why}`));
    if (carbQuality.fibreTarget) L.push(`- 🎯 ${isAr ? 'هدف الألياف' : 'Fibre target'}: ${carbQuality.fibreTarget}`);
    (carbQuality.avoid || []).forEach((c) => L.push(`- ⛔ **${c.type}** — ${c.examples}. ${c.why}`));
    if (carbQuality.src) L.push(`_src: ${sj(carbQuality.src)}_`);
  }
  if (fatQuality) {
    L.push(`\n**${isAr ? '🫒 جودة الدهون + مصادرها' : '🫒 Fat quality + sources'}**`);
    (fatQuality.prefer || []).forEach((f) => L.push(`- ✅ **${f.type}** — ${f.examples}. ${f.why}`));
    (fatQuality.limit || []).forEach((f) => L.push(`- ⚠️ **${f.type}** (${f.cap}) — ${f.examples ? f.examples + '. ' : ''}${f.why}`));
    if (fatQuality.src) L.push(`_src: ${sj(fatQuality.src)}_`);
  }
  return L.join('\n');
}

export function renderPsychobiotics({ psychobiotics, lang = 'en' } = {}) {
  if (!psychobiotics) return '';
  const isAr = lang === 'ar';
  const L = [];
  L.push(`\n**${isAr ? '🦠 السايكوبيوتيك (مساعد)' : '🦠 Psychobiotics (adjunct)'}**`);
  if (psychobiotics.note) L.push(`_${psychobiotics.note}_`);
  (psychobiotics.strains || []).forEach((s) =>
    L.push(`- **${s.name}** — ${isAr ? 'الجرعة' : 'Dose'}: ${s.dose}${s.evidence ? ` _(${s.evidence})_` : ''}`));
  if (psychobiotics.duration) L.push(`- ⏱️ ${isAr ? 'المدة' : 'Duration'}: ${psychobiotics.duration}`);
  if (psychobiotics.foodSources) L.push(`- 🥛 ${isAr ? 'مصادر غذائية' : 'Food sources'}: ${psychobiotics.foodSources}`);
  if (psychobiotics.caution) L.push(`- ⚠️ ${psychobiotics.caution}`);
  if (psychobiotics.src) L.push(`_src: ${sj(psychobiotics.src)}_`);
  return L.join('\n');
}

/* ── 4. One-call composer for ClinicalToolPage ─────────────────────────────
 * metrics = the object computeMetrics() returns. Produces the full macro+meal
 * block; '' when the disorder has no macroTemplate yet (other 4 disorders until
 * they are rolled out). */
export function renderMacrosAndMeals({ key, metrics, form = {}, lang = 'en' } = {}) {
  if (!okM(key) || !metrics) return '';
  const isAr = lang === 'ar';
  // SAFETY GATE: eating-disorder history/comorbidity → withhold deficit & numeric
  // targets; show structured-eating + referral guidance instead.
  if (patientHasEatingDisorder(form)) {
    return isAr
      ? ['\n**🍽️ التغذية — تنبيه أمان**',
         '⚠️ فيه إشارة لاضطراب أكل/تاريخ اضطراب أكل — لذلك **حُجبت أهداف السعرات/الماكروز الرقمية وأي عجز حراري** (الأرقام التقييدية ممكن تُحفّز أو تفاقم اضطراب الأكل).',
         '- ركّز على **أكل منتظم ومنظّم وغير تقييدي**، من غير عدّ سعرات أو أهداف رقمية.',
         '- ضع خطة التغذية **بالتعاون مع فريق مختص في اضطرابات الأكل**، وتُحدَّد الأهداف من خلالهم.',
         '- للدعم: National Alliance for Eating Disorders helpline.',
         '_(الأوميغا-3 EPA كإضافة لأعراض BPD موجودة في قسم المكملات، بلا أي توصية تقييدية.)_'].join('\n')
      : ['\n**🍽️ Nutrition — safety notice**',
         '⚠️ An eating-disorder history/comorbidity is indicated, so **numeric calorie/macro targets and any caloric deficit are withheld** (numeric restriction can trigger or worsen disordered eating).',
         '- Prioritise **regular, structured, non-restrictive eating** — no calorie counting or numeric targets.',
         '- Set the nutrition plan **with an eating-disorder-informed team**; targets should come from them.',
         '- Support: National Alliance for Eating Disorders helpline.',
         '_(EPA-omega-3 as a BPD-symptom adjunct is in the supplements section, with no restrictive advice.)_'].join('\n');
  }
  const n = NUTRITION[key];
  const male = /^m|male|ذكر/i.test(String(form.gender || ''));
  const weightKg = parseFloat(form.weight) || null;
  const macros = computeMacros({
    calLow: metrics.calLow, calHigh: metrics.calHigh, calDirection: metrics.calDirection,
    proteinLow: metrics.proteinLow, proteinHigh: metrics.proteinHigh, template: n.macroTemplate,
    weightKg, ffmi: metrics.ffmi, fmr: metrics.fmr, male, comorbidities: form.comorbidities || '',
  });
  const meals = buildMealPlan({ macros, mealArchitecture: n.mealArchitecture || {} });
  return [
    renderMacros({ macros, template: n.macroTemplate, lang }),
    renderCarbFatQuality({ carbQuality: n.carbQuality, fatQuality: n.fatQuality, lang }),
    renderMealPlan({ meals, mealArchitecture: n.mealArchitecture || {}, lang }),
  ].filter(Boolean).join('\n');
}

/* Convenience: psychobiotics block for a disorder (→ supplements section). */
export function renderPsychobioticsFor({ key, lang = 'en' } = {}) {
  if (!okM(key)) return '';
  return renderPsychobiotics({ psychobiotics: NUTRITION[key].psychobiotics, lang });
}
