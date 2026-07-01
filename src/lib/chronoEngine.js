/* ════════════════════════════════════════════════════════════════════════
   chronoEngine.js — CIRCADIAN & CHRONOTHERAPY (deterministic, no API)
   ────────────────────────────────────────────────────────────────────────
   Two coupled clocks:
     • CENTRAL (SCN)      → entrained by LIGHT + sleep-wake + social rhythm;
                            drug chronotiming acts here (CNS effect).
     • PERIPHERAL (liver, → entrained by FOOD; meal timing/regularity; hepatic
       pancreas, gut)       drug metabolism follows the liver clock.
   Harm = MISALIGNMENT between them (eating/acting out of phase with light/sleep).

   Evidence is graded HONESTLY: chronotherapy (light/sleep/social rhythm/drug
   timing) has clinical RCT support; peripheral-clock/meal-timing has strong
   METABOLIC/mechanistic evidence but only INDIRECT mood evidence — labelled so.
   ════════════════════════════════════════════════════════════════════════ */
import { RX, RX_ACTIVE } from './rxFormulary';

export const CHRONO_SOURCES = {
  CIRC_MOOD:  'Circadian rhythm disruption & mental health — chronotherapies (light, wake, social-rhythm) directly affect circadian rhythms; bipolar light-timing caution. Transl Psychiatry 2020;10:28.',
  BLT_MDD:    'Menegaz de Almeida A et al. Bright light therapy for NONSEASONAL depression — systematic review & meta-analysis (11 RCTs). JAMA Psychiatry 2024 (≈41% vs 23% remission; 10,000 lux, ≥30 min, morning).',
  BLT_AJP:    'Golden RN et al. Efficacy of light therapy in mood disorders — review & meta-analysis. Am J Psychiatry 2005;162:656-62.',
  CHRONO_PHARM:'Antidepressants & circadian rhythm — bidirectional interaction / dosing-time. (chronopharmacology review).',
  PERIPH_FOOD:'Feeding rhythms & circadian regulation of metabolism — food is the dominant zeitgeber of peripheral clocks (liver/pancreas/gut/muscle) (Damiola classic). PMC7182033; Front Endocrinol 2024.',
  PERIPH_META:'Peripheral clock misalignment & metabolic disease — shift-work desync (pancreas/liver/gut) → insulin resistance/T2DM; active- vs inactive-phase eating & glucose tolerance.',
  TRE_WEAK:   'Chrononutrition/TRE & mood — mechanistically plausible but mainly perspectives/cross-sectional; TRE RCT showed NO significant mood effect; night-eating raised depressive/anxious mood in a simulated-shift study (causal mood role UNPROVEN).',
  INSULIN:    'Circadian clock & glucose — insulin sensitivity/glucose tolerance peak at waking, decline through the day; dawn phenomenon in T2D. PMC9117496.',
  CYP_MET:    'Circadian clock-controlled drug metabolism — clinical implications for chronotherapeutics (hepatic CYP/metabolic gene rhythms). ScienceDirect 2025.',
  KIDNEY:     'Circadian clock in the kidney — GFR, renal blood flow & Na⁺/K⁺ excretion peak in the active (day) phase, decline at night; RAAS rises at night; renal rhythms dampen with age. PMC5797999; Front Physiol 2025.',
  CORTISOL:   'Cortisol awakening response (peak after waking, nadir at night); glucocorticoid dysregulation linked to depression/anxiety; light entrains the cortisol rhythm. PMC10146651.',
  DIGEST:     'Circadian control of gastric emptying/GI motility & digestion (slower in the evening/night); disrupted-feeding GI/metabolic/immune alterations. PMC4199674.',
  GLP1:       'Circadian GLP-1 secretion — peaks at the onset of the feeding period, Bmal1-regulated; supports earlier eating window. Front Endocrinol 2022; PMC6920326.',
  GHRELIN:    'Ghrelin (hunger) is higher in the biological EVENING (peak hunger); circadian misalignment raises appetite for energy-dense foods. Brigham human protocol, PMC6424662.',
  BODYTEMP:   'Core body temperature — nadir ~2–3 h before habitual wake; a circadian phase marker. Light AFTER the temperature minimum phase-ADVANCES the clock; before it, delays.',
  MICROBIOME: 'Gut microbiome has a diurnal rhythm (Clostridiales/Lactobacillales/Bacteroidales ~60% oscillate) entrained by feeding & host clock; dysbiosis linked to HPA/mood. PMC6290721; Front Psychiatry 2025.',
  MELATONIN:  'Melatonin nocturnal rhythm & light suppression (chronobiology).',
  PSYCHOBIOTIC:'Psychobiotics for mood — strain-specific meta-analysis (12 RCTs, n=707): significant on BDI, NON-significant on HAMD/MADRS/DASS → MODEST, scale-dependent, ADJUNCT not a treatment. Gut Pathogens 2024; Syst Rev PMC11085935.',
};
const CS = (k) => CHRONO_SOURCES[k] || k;

/* ── ⑥ CIRCADIAN MECHANISMS (physiology layer) ─────────────────────────
   Each: rhythm (peak/trough) + clinical translation + evidence grade + src.
   `gate`: 'metabolic' | 'lithiumOrElderly' | null (always shown).
   ──────────────────────────────────────────────────────────────────── */
const MECHANISMS = [
  { id: 'insulin', gate: 'metabolic', grade: 'strong',
    en: ['Insulin / glucose', 'Insulin sensitivity & glucose tolerance PEAK at waking and decline through the day (dawn phenomenon in T2D).', 'Eat earlier/larger by day; avoid late-night carbohydrate. Most impactful with metabolic comorbidity or weight-active agents.'],
    ar: ['الأنسولين / الجلوكوز', 'حساسية الأنسولين وتحمّل الجلوكوز ذروتهم عند الاستيقاظ وبيقلّوا خلال اليوم (ظاهرة الفجر في السكري).', 'كُل أبكر/أكبر بالنهار؛ تجنّب النشويات المتأخرة. الأثر الأكبر مع مرض أيضي أو دواء مؤثر على الوزن.'], src: [CS('INSULIN')] },
  { id: 'cyp', gate: null, grade: 'mechanism strong / clinical emerging',
    en: ['Hepatic metabolism (CYP)', 'Hepatic drug-metabolising enzymes are clock-controlled (diurnal CYP/metabolic-gene rhythms).', 'Mechanistic basis for drug chronotiming (§③); hepatic clearance varies by time of day.'],
    ar: ['أيض الكبد (CYP)', 'إنزيمات أيض الدواء في الكبد بتتحكم فيها الساعة (إيقاع يومي لـ CYP).', 'الأساس العلمي لتوقيت الدواء (§③)؛ تصفية الكبد بتتغيّر حسب وقت اليوم.'], src: [CS('CYP_MET')] },
  { id: 'kidney', gate: 'lithiumOrElderly', grade: 'strong (physiology)',
    en: ['Kidney (GFR / Na⁺)', 'GFR, renal blood flow & Na⁺/K⁺ excretion peak in the daytime/active phase; RAAS rises at night; rhythms dampen with age.', 'Renally-cleared drugs (esp. LITHIUM): night-time single dosing lowers renal exposure/toxicity; watch Na⁺/hydration; escalate monitoring in the elderly.'],
    ar: ['الكلى (GFR / الصوديوم)', 'GFR وإفراز الصوديوم/البوتاسيوم ذروتهم بالنهار؛ ونظام RAAS بيرتفع بالليل؛ والإيقاع بيضعف مع السن.', 'الأدوية كلوية الإخراج (خاصة الليثيوم): الجرعة الليلية الواحدة بتقلل التعرّض الكلوي؛ راقب الصوديوم/الترطيب؛ صعّد المتابعة في كبار السن.'], src: [CS('KIDNEY')] },
  { id: 'cortisol', gate: null, grade: 'strong',
    en: ['Cortisol', 'Peaks shortly after waking (cortisol awakening response), nadir at night; dysregulated (flattened) in depression/anxiety.', 'Morning light + a FIXED wake time anchor and normalise the cortisol rhythm.'],
    ar: ['الكورتيزول', 'ذروته بعد الاستيقاظ بشوية (استجابة إيقاظ الكورتيزول)، وقاعه بالليل؛ ومختل (مسطّح) في الاكتئاب/القلق.', 'ضوء الصبح + ميعاد صحيان ثابت بيثبّتوا إيقاع الكورتيزول.'], src: [CS('CORTISOL')] },
  { id: 'melatonin', gate: null, grade: 'strong',
    en: ['Melatonin', 'Rises in the evening, peaks at night; SUPPRESSED by light at night (esp. blue).', 'Evening light hygiene; basis of agomelatine/melatonin timing; dim screens 1–2 h pre-sleep.'],
    ar: ['الميلاتونين', 'بيرتفع بالمسا ويوصل ذروته بالليل؛ والضوء الليلي (خاصة الأزرق) بيثبّطه.', 'نظافة ضوء المسا؛ أساس توقيت أجوميلاتين/الميلاتونين؛ خفّض الشاشات قبل النوم بساعة–ساعتين.'], src: [CS('MELATONIN')] },
  { id: 'digestion', gate: 'metabolic', grade: 'moderate',
    en: ['Digestion / gastric emptying', 'Gastric emptying & GI motility slow in the evening/night.', 'Avoid heavy late meals (poorer digestion, reflux); finish eating well before sleep.'],
    ar: ['الهضم / إفراغ المعدة', 'إفراغ المعدة وحركة الأمعاء بيبطآ بالمسا/الليل.', 'تجنّب الوجبات الثقيلة المتأخرة (هضم أسوأ/ارتجاع)؛ خلّص الأكل قبل النوم بوقت كافٍ.'], src: [CS('DIGEST')] },
  { id: 'glp1', gate: null, grade: 'mechanism strong / human emerging',
    en: ['GLP-1 (incretin)', 'Circadian GLP-1 secretion peaks at the ONSET of the feeding period (Bmal1-regulated).', 'Supports an earlier, daytime eating window for better incretin/satiety response.'],
    ar: ['GLP-1 (إنكريتين)', 'إفراز GLP-1 ذروته عند بداية فترة الأكل (بتنظيم Bmal1).', 'يدعم نافذة أكل أبكر نهارية لاستجابة إنكريتين/شبع أفضل.'], src: [CS('GLP1')] },
  { id: 'ghrelin', gate: null, grade: 'moderate–strong (human)',
    en: ['Ghrelin / leptin (appetite)', 'Ghrelin (hunger) is higher in the biological EVENING; misalignment raises cravings for energy-dense food. Leptin timing tracks meals.', 'Evening hunger/late cravings are partly physiological — plan protein/fibre earlier; keep regular meal times.'],
    ar: ['الغريلين / اللبتين (الشهية)', 'الغريلين (الجوع) أعلى بالمسا؛ والخلل الإيقاعي بيزوّد اشتهاء الأكل عالي السعرات. وتوقيت اللبتين بيتبع الوجبات.', 'جوع المسا/اشتهاء الليل جزء منه فسيولوجي — رتّب البروتين/الألياف بدري؛ حافظ على انتظام الوجبات.'], src: [CS('GHRELIN')] },
  { id: 'bodytemp', gate: null, grade: 'strong (phase marker)',
    en: ['Core body temperature', 'Nadir ~2–3 h before habitual wake, peak in the evening — a circadian phase marker.', 'Light AFTER the temperature minimum (i.e. after waking) phase-ADVANCES the clock — the basis for morning-light timing.'],
    ar: ['حرارة الجسم المركزية', 'قاعها ~٢–٣ ساعات قبل الاستيقاظ المعتاد، وذروتها بالمسا — علامة طور إيقاعي.', 'الضوء بعد قاع الحرارة (يعني بعد الصحيان) بيقدّم الساعة — وده أساس توقيت ضوء الصبح.'], src: [CS('BODYTEMP')] },
  { id: 'microbiome', gate: null, grade: 'rhythm strong / psychobiotics MODEST',
    en: ['Microbiome / psychobiotics', 'The gut microbiome has a diurnal rhythm entrained by feeding; dysbiosis links to HPA/mood. Psychobiotics show a MODEST, scale-dependent signal (significant on BDI, not HAMD/MADRS) — an ADJUNCT, not a treatment.', 'Regular meal timing + fibre/fermented foods support rhythmic diversity. If trialling a psychobiotic: strains with signal include L. rhamnosus, L. helveticus, B. longum, B. breve (e.g. CCFM1025), L. plantarum (e.g. JYLP-326), L. acidophilus, L. casei/paracasei, L. salivarius, B. bifidum/lactis; multispecies blends (Vivomixx, OMNi-BiOTiC Stress Repair). NOT a substitute for medication/therapy.'],
    ar: ['الميكروبيوم / السيكوبيوتيك', 'الميكروبيوم له إيقاع يومي بتضبطه الوجبات؛ والاختلال مرتبط بمحور HPA/المزاج. السيكوبيوتيك تأثيره متواضع ومتفاوت حسب المقياس (معنوي على BDI مش على HAMD/MADRS) — مساعد مش علاج.', 'انتظام الوجبات + الألياف/المخمّرات بيدعموا التنوّع الإيقاعي. لو هتجرّب سيكوبيوتيك: سلالات عليها إشارة تشمل L. rhamnosus وL. helveticus وB. longum وB. breve (مثل CCFM1025) وL. plantarum (مثل JYLP-326) وL. acidophilus وL. casei/paracasei وL. salivarius وB. bifidum/lactis؛ وخلطات متعددة (Vivomixx، OMNi-BiOTiC Stress Repair). مش بديل للدواء/العلاج.'], src: [CS('MICROBIOME'), CS('PSYCHOBIOTIC')] },
];

/* ── sleep-hours engine: mid-sleep, duration, social jet lag, timed recs ── */
function parseHM(s) {
  if (!s) return null;
  const m = String(s).trim().match(/^(\d{1,2})[:.٬،]?(\d{2})?/);
  if (!m) return null;
  let h = parseInt(m[1], 10); const min = m[2] ? parseInt(m[2], 10) : 0;
  if (isNaN(h) || h > 23 || min > 59) return null;
  return h + min / 60;
}
const fmtHM = (t) => { t = ((t % 24) + 24) % 24; const h = Math.floor(t); const m = Math.round((t - h) * 60); return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
function computeSleep(form) {
  const bt = parseHM(form?.sleepTime), wt = parseHM(form?.wakeTime);
  if (bt == null || wt == null) return null;
  const dur = ((wt - bt + 24) % 24) || 24;
  const midWork = ((bt + dur / 2) % 24 + 24) % 24;
  const out = { dur: +dur.toFixed(1), midWork, wake: wt, bed: bt };
  const btF = parseHM(form?.sleepTimeFree), wtF = parseHM(form?.wakeTimeFree);
  if (btF != null && wtF != null) {
    const durF = ((wtF - btF + 24) % 24) || 24;
    const midFree = ((btF + durF / 2) % 24 + 24) % 24;
    let sjl = Math.abs(midFree - midWork); if (sjl > 12) sjl = 24 - sjl;
    out.sjl = +sjl.toFixed(1); out.midFree = midFree;
  }
  return out;
}



/* ── case detection (bipolar / metabolic / chronotype) ────────────────── */
const norm = (s) => String(s || '').toLowerCase();
const anyOf = (text, terms) => terms.some((t) => norm(text).includes(norm(t)));
const isBipolar = (f) => anyOf(`${f?.comorbidities} ${f?.history}`, ['bipolar', 'mania', 'manic', 'ثنائي القطب', 'هوس']);
const isMetabolic = (f) => {
  const w = parseFloat(f?.weight), h = parseFloat(f?.height);
  const bmi = (w && h) ? w / Math.pow(h / 100, 2) : null;
  return anyOf(`${f?.comorbidities} ${f?.history}`, ['diabet', 'obes', 'masld', 'nafld', 'fatty liver', 'metabolic', 'سكري', 'سمنة', 'كبد دهني', 'دهون الكبد']) || (bmi != null && bmi >= 30);
};

/* ── drug chronotiming map (keyword → guidance) ───────────────────────── */
const TIMING = [
  { keys: ['fluoxetine', 'bupropion', 'venlafaxine', 'vortioxetine', 'duloxetine', 'reboxetine'], when: 'morning', why: 'activating — dose in the morning to avoid insomnia' },
  { keys: ['mirtazapine', 'quetiapine', 'trazodone', 'agomelatine', 'amitriptyline', 'clomipramine', 'doxepin', 'hydroxyzine', 'topiramate'], when: 'evening/bedtime', why: 'sedating — dose at night (agomelatine is bedtime by design, resynchronises rhythm)' },
  { keys: ['pregabalin', 'valproate', 'divalproex', 'gabapentin', 'lithium', 'fluvoxamine'], when: 'evening or divided', why: 'sedation/tolerability — larger share at night or split dosing' },
  { keys: ['escitalopram', 'sertraline', 'citalopram', 'paroxetine', 'aripiprazole', 'risperidone', 'buspirone', 'drospirenone', 'gnrh'], when: 'morning (flexible)', why: 'neutral profile — usually morning; shift to night if it disturbs sleep' },
];
function drugTiming(name) {
  const n = norm(name);
  for (const t of TIMING) if (t.keys.some((k) => n.includes(k))) return t;
  return null;
}

/* ── per-disorder chronotherapy content (evidence-graded) ─────────────── */
const DIS = {
  MDD: {
    light: { grade: 'strong (adjunct/monotherapy)', text: 'Morning bright light therapy: 10,000 lux, ≥30 min soon after waking (JAMA Psychiatry 2024 meta-analysis, non-seasonal MDD ≈41% vs 23% remission).' },
    extra: ['Diurnal mood variation is a hallmark — track it.', 'Wake therapy (controlled sleep deprivation) is a rapid but transient, SPECIALIST-only adjunct.', 'Maximise daytime daylight; keep a fixed wake time even on weekends.'],
    src: [CS('BLT_MDD'), CS('BLT_AJP'), CS('CIRC_MOOD')],
  },
  GAD: {
    light: { grade: 'modest', text: 'Morning daylight/bright light may help; evidence weaker than in depression. Prioritise sleep-wake regularity.' },
    extra: ['Evening caffeine restriction + reduced evening screen/blue light (arousal & sleep-onset).', 'Regular wind-down routine to lower pre-sleep arousal.'],
    src: [CS('CIRC_MOOD')],
  },
  OCD: {
    light: { grade: 'limited', text: 'No strong OCD-specific light-therapy evidence; delayed sleep phase is over-represented — regularise sleep-wake.' },
    extra: ['Address delayed sleep phase (common in OCD) with fixed wake time + morning light.', 'Avoid night-time rumination loops eroding sleep.'],
    src: [CS('CIRC_MOOD')],
  },
  BPD: {
    light: { grade: 'via social-rhythm regularity', text: 'Social-rhythm/sleep-wake REGULARITY is the priority (affective instability tracks sleep disruption).' },
    extra: ['Fixed daily rhythm (sleep, meals, activity) stabilises mood — a core, low-risk lever alongside DBT.', '⚠️ AVOID sleep deprivation / all-nighters — they DESTABILISE mood and raise impulsivity.', 'Consistent wind-down; limit late-night stimulation.'],
    src: [CS('CIRC_MOOD')],
  },
  PMDD: {
    light: { grade: 'limited (luteal focus)', text: 'Light/sleep regularity, emphasised in the LUTEAL phase; light-therapy evidence for PMDD is limited.' },
    extra: ['Prospective daily symptom + sleep charting across ≥2 cycles.', 'Protect sleep regularity in the luteal phase (disruption amplifies symptoms).', 'Luteal SSRI dosing (if used) is handled in the medication section.'],
    src: [CS('CIRC_MOOD')],
  },
};

export function renderChrono({ key, form = {}, lang = 'en' } = {}) {
  if (!(RX_ACTIVE && RX[key] && !RX[key].__pending)) return '';
  const isAr = lang === 'ar';
  const d = RX[key];
  const dis = DIS[key];
  const H = (en, ar) => (isAr ? ar : en);
  const L = [];

  L.push('**' + H('TWO-CLOCK PRINCIPLE', 'مبدأ الساعتين') + '**');
  L.push(H(
    'Align the CENTRAL clock (light + sleep-wake) with the PERIPHERAL clocks (liver/pancreas/gut, entrained by food). Misalignment = eating/acting out of phase with your light-dark & sleep cycle.',
    'وائم بين الساعة المركزية (الضوء + النوم-الاستيقاظ) والساعات المحيطية (الكبد/البنكرياس/الأمعاء، اللي بتضبطها مواعيد الأكل). الخلل = إنك تاكل/تتحرك بعكس دورة الضوء والنوم بتاعتك.'));

  // CENTRAL
  L.push('\n**' + H('① CENTRAL CLOCK — light & sleep-wake', '① الساعة المركزية — الضوء والنوم-الاستيقاظ') + '**');
  L.push(H('- Fixed wake time daily (strongest single anchor / social zeitgeber).', '- ميعاد صحيان ثابت يومياً (أقوى مرساة منفردة / zeitgeber اجتماعي).'));
  if (dis?.light) L.push(`- **${H('Light', 'الضوء')}** _(${dis.light.grade})_: ${dis.light.text}`);
  L.push(H('- Evening light hygiene: dim lights, reduce screens/blue light 1–2 h pre-sleep.', '- نظافة ضوء المسا: خفّض الإضاءة والشاشات/الضوء الأزرق قبل النوم بساعة–ساعتين.'));
  if (isBipolar(form)) {
    L.push('- ⚠️ ' + H('BIPOLAR comorbidity: use MIDDAY (not morning) bright light — morning light can trigger a manic/mixed SWITCH. Dark therapy / blue-blocking evenings help mania. Regularity is paramount; avoid wake therapy unless specialist-supervised.',
      'اعتلال ثنائي القطب المصاحب: استخدم ضوء منتصف النهار (مش الصبح) — الضوء الصبح ممكن يحرّض تحوّل هوسي/مختلط. الإظلام/حجب الأزرق بالمسا يفيد الهوس. الانتظام أساسي؛ تجنّب العلاج بالاستيقاظ إلا بإشراف متخصص.'));
  }

  // PERIPHERAL
  L.push('\n**' + H('② PERIPHERAL CLOCKS — meal timing (food = zeitgeber)', '② الساعات المحيطية — توقيت الأكل (الأكل = zeitgeber)') + '**');
  L.push(H('- Regular meal times; keep the eating window in the DAYTIME/active phase.', '- مواعيد أكل منتظمة؛ خلّي نافذة الأكل في النهار/الطور النشط.'));
  L.push(H('- Avoid late-night eating; front-load calories earlier; don\u2019t skip breakfast.', '- تجنّب الأكل المتأخر بالليل؛ بكّر السعرات؛ متفوّتش الفطار.'));
  L.push('- _' + H('Evidence: peripheral-clock/metabolic basis is well established (food entrains liver/pancreas/gut clocks); the mood-specific benefit is INDIRECT/emerging — treat meal timing as circadian + metabolic HYGIENE, not a stand-alone mood treatment.',
    'الأدلة: الأساس المحيطي/الأيضي مثبت جيداً (الأكل بيضبط ساعات الكبد/البنكرياس/الأمعاء)؛ لكن الفايدة المزاجية المباشرة غير مباشرة/ناشئة — اعتبر توقيت الأكل نظافة إيقاعية وأيضية، مش علاج مزاج مستقل.') + '_');
  if (isMetabolic(form)) {
    // Name weight-active agents ONLY if they are in THIS patient's regimen
    // (protocol first-line/adjunct + current meds). Prevents off-protocol drug
    // names (e.g. quetiapine/olanzapine) leaking into an unrelated protocol's
    // metabolic note. Falls back to the class term when none are present.
    const WEIGHT_ACTIVE = ['olanzapine', 'clozapine', 'quetiapine', 'risperidone', 'paliperidone', 'mirtazapine', 'valproate', 'divalproex', 'gabapentin', 'pregabalin', 'lithium', 'amitriptyline', 'paroxetine'];
    const CANON = { divalproex: 'valproate' };
    const regimenText = norm([
      ...(d.firstLine || []).map((x) => x.drug),
      ...(d.adjunct || []).map((x) => x.drug),
      form?.currentMeds || '',
    ].join(' '));
    const waHit = [...new Set(WEIGHT_ACTIVE.filter((w) => regimenText.includes(w)).map((w) => CANON[w] || w))];
    const wa = waHit.length ? ` (${waHit.join('/')})` : '';
    L.push('- 🔴 ' + H(`Metabolic comorbidity / high BMI: peripheral-clock alignment matters MOST here — irregular/late eating worsens insulin resistance and desynchronises liver/pancreas clocks. Ties directly to the metabolic labs & to weight-active agents${wa}.`,
      `اعتلال أيضي / BMI مرتفع: مواءمة الساعات المحيطية هنا الأهم — الأكل غير المنتظم/المتأخر بيسوّئ مقاومة الأنسولين ويفكّ تزامن ساعات الكبد/البنكرياس. مرتبط مباشرة بتحاليل الأيض وبالأدوية المؤثرة على الوزن${wa}.`));
  }

  // DRUG CHRONOTIMING
  const names = [...(d.firstLine || []), ...(d.adjunct || [])].map((x) => x.drug);
  const seen = new Set();
  const rows = [];
  names.forEach((nm) => {
    const t = drugTiming(nm);
    if (t && !seen.has(t.when + nm)) { seen.add(t.when + nm); rows.push(`- **${nm}** → ${t.when} _(${t.why})_`); }
  });
  // include recognisable current meds
  norm(form?.currentMeds).split(/[,\n;+]/).map((s) => s.trim()).filter(Boolean).forEach((cm) => {
    const t = drugTiming(cm);
    if (t) rows.push(`- ${H('current med', 'دواء حالي')}: **${cm}** → ${t.when} _(${t.why})_`);
  });
  if (rows.length) {
    L.push('\n**' + H('③ DRUG CHRONOTIMING (chronopharmacology)', '③ توقيت الدواء (كرونوفارماكولوجي)') + '**');
    L.push(H('Hepatic drug metabolism follows the liver clock; CNS effect follows the central clock. Guideline timings for this protocol:',
      'أيض الدواء في الكبد بيتبع ساعة الكبد؛ وتأثيره على الجهاز العصبي بيتبع الساعة المركزية. توقيتات إرشادية لهذا البروتوكول:'));
    rows.forEach((r) => L.push(r));
    L.push('_' + H('src: chronopharmacology — timing guidance from each agent\u2019s activating/sedating profile.', 'المصدر: كرونوفارماكولوجي — التوقيت من بروفايل كل دواء المنشّط/المهدّئ.') + '_');
  }

  // DISORDER-SPECIFIC
  if (dis?.extra?.length) {
    L.push('\n**' + H('④ Disorder-specific', '④ خاص بالاضطراب') + ` (${d.label})**`);
    dis.extra.forEach((e) => L.push(`- ${e}`));
  }

  // ⑤ CHRONOTYPE — sleep-hours engine (mid-sleep / duration / social jet lag / timed recs)
  const slp = computeSleep(form);
  const ct = norm(form?.chronotype);
  if (slp || ct) {
    L.push('\n**' + H('⑤ Chronotype & sleep timing', '⑤ النمط الزمني وتوقيت النوم') + '**');
    if (slp) {
      L.push(H(`- Sleep window: ${fmtHM(slp.bed)}→${fmtHM(slp.wake)} (${slp.dur} h) | mid-sleep ${fmtHM(slp.midWork)} — a better phase index than the label.`,
        `- نافذة النوم: ${fmtHM(slp.bed)}→${fmtHM(slp.wake)} (${slp.dur} ساعة) | منتصف النوم ${fmtHM(slp.midWork)} — مؤشر طور أدق من اللابل.`));
      if (slp.dur < 7)
        L.push('- ⚠️ ' + H(`Short sleep (${slp.dur} h) — sleep restriction is itself a mood/anxiety driver; target 7–9 h.`, `نوم قصير (${slp.dur} ساعة) — الحرمان من النوم بنفسه محرّك للمزاج/القلق؛ استهدف ٧–٩ ساعات.`));
      if (slp.sjl != null && slp.sjl >= 1)
        L.push('- ⚠️ ' + H(`Social jet lag ≈ ${slp.sjl} h (work vs free-day mid-sleep) — an independent risk factor for mood & metabolic problems; narrow the gap.`, `اختلاف التوقيت الاجتماعي ≈ ${slp.sjl} ساعة (منتصف نوم الشغل مقابل الأجازة) — عامل خطر مستقل للمزاج والأيض؛ ضيّق الفجوة.`));
      // timed, actionable recommendations from actual wake/sleep
      L.push(H(`- Morning bright light: ~${fmtHM(slp.wake)}–${fmtHM(slp.wake + 0.5)} (after the core-temp minimum → phase-advances the clock).`,
        `- ضوء صبح ساطع: حوالي ${fmtHM(slp.wake)}–${fmtHM(slp.wake + 0.5)} (بعد قاع الحرارة → بيقدّم الساعة).`));
      L.push(H(`- Finish the last meal by ~${fmtHM(slp.bed - 3)} (≥3 h before ${fmtHM(slp.bed)} bedtime); dim light/screens from ~${fmtHM(slp.bed - 1.5)}.`,
        `- خلّص آخر وجبة بحد أقصى ~${fmtHM(slp.bed - 3)} (≥٣ ساعات قبل النوم ${fmtHM(slp.bed)})؛ خفّض الضوء/الشاشات من ~${fmtHM(slp.bed - 1.5)}.`));
      const lateMid = slp.midWork >= 4.5 && slp.midWork <= 12; // mid-sleep after ~04:30 ⇒ delayed
      if (lateMid || /eve|night|delay|مساء|ليل|متأخر/.test(ct))
        L.push(H('- Phase-delayed pattern: advance gradually — shift wake (and light) ~15 min earlier each week; bring meals earlier; strict evening light hygiene.',
          '- نمط مؤجّل الطور: قدّم الساعة تدريجياً — بكّر الصحيان (والضوء) ~١٥ دقيقة كل أسبوع؛ بكّر الوجبات؛ نظافة ضوء مسائية صارمة.'));
    } else if (ct) {
      if (/eve|night|delay|مساء|ليل|متأخر/.test(ct))
        L.push(H('- Evening/late type (label only — enter sleep/wake times for exact timing): emphasise morning light + earlier meals to phase-advance.',
          '- نمط مسائي/متأخر (لابل فقط — أدخل ساعات النوم للتوقيت الدقيق): ركّز على ضوء الصبح + أكل أبكر للتقديم.'));
      else if (/morn|early|صباح|مبكر/.test(ct))
        L.push(H('- Morning type: maintain the aligned schedule; watch for early-morning waking in depression.',
          '- نمط صباحي: حافظ على الجدول المتوائم؛ انتبه للاستيقاظ المبكر في الاكتئاب.'));
      else
        L.push(H(`- Chronotype noted (${form.chronotype}); enter usual sleep/wake times for timed recommendations.`,
          `- النمط الزمني (${form.chronotype})؛ أدخل ساعات النوم/الصحيان المعتادة للحصول على توصيات موقوتة.`));
    }
  }

  // ⑥ CIRCADIAN MECHANISMS (physiology layer)
  const onLithium = anyOf(form?.currentMeds, ['lithium', 'ليثيوم']) || (RX[key]?.adjunct || []).some((m) => /lithium/i.test(m.drug));
  const isElderly = !isNaN(parseFloat(form?.age)) && parseFloat(form?.age) >= 60;
  const metab = isMetabolic(form);
  const showMech = (g) => g == null || (g === 'metabolic' && metab) || (g === 'lithiumOrElderly' && (onLithium || isElderly)) || g === 'always';
  L.push('\n**' + H('⑥ Circadian mechanisms (physiology → action)', '⑥ الآليات الإيقاعية (فسيولوجيا ← فعل)') + '**');
  MECHANISMS.forEach((m) => {
    const t = isAr ? m.ar : m.en;
    const flag = m.gate === 'metabolic' && metab ? (isAr ? ' 🔴' : ' 🔴') : (m.gate === 'lithiumOrElderly' && (onLithium || isElderly) ? ' 🔴' : '');
    if (showMech(m.gate) || m.gate) {
      const emphasised = (m.gate === 'metabolic' && metab) || (m.gate === 'lithiumOrElderly' && (onLithium || isElderly));
      L.push(`- **${t[0]}**${emphasised ? flag : ''} _(${m.grade})_: ${t[1]} → ${t[2]}`);
    }
  });

  const srcs = [...new Set([...(dis?.src || []), CS('PERIPH_FOOD'), CS('PERIPH_META'), CS('CHRONO_PHARM'), CS('TRE_WEAK'),
    ...MECHANISMS.flatMap((m) => m.src)])];
  L.push('\n_' + H('Sources', 'المصادر') + ': ' + srcs.join(' | ') + '_');

  return L.join('\n');
}
