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
};
const CS = (k) => CHRONO_SOURCES[k] || k;

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
    L.push('- 🔴 ' + H('Metabolic comorbidity / high BMI: peripheral-clock alignment matters MOST here — irregular/late eating worsens insulin resistance and desynchronises liver/pancreas clocks. Ties directly to the metabolic labs & to weight-active agents (quetiapine/olanzapine/mirtazapine).',
      'اعتلال أيضي / BMI مرتفع: مواءمة الساعات المحيطية هنا الأهم — الأكل غير المنتظم/المتأخر بيسوّئ مقاومة الأنسولين ويفكّ تزامن ساعات الكبد/البنكرياس. مرتبط مباشرة بتحاليل الأيض وبالأدوية المؤثرة على الوزن (quetiapine/olanzapine/mirtazapine).'));
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

  // CHRONOTYPE personalisation
  const ct = norm(form?.chronotype);
  if (ct) {
    L.push('\n**' + H('⑤ Chronotype', '⑤ النمط الزمني') + `**`);
    if (/eve|night|delay|مساء|ليل|متأخر/.test(ct))
      L.push(H('- Evening/late type (phase-delayed): emphasise MORNING light + EARLIER meals to phase-advance the clock; avoid late heavy meals.',
        '- نمط مسائي/متأخر (طور مؤجّل): ركّز على ضوء الصبح + أكل أبكر لتقديم الساعة؛ تجنّب الوجبات الثقيلة المتأخرة.'));
    else if (/morn|early|صباح|مبكر/.test(ct))
      L.push(H('- Morning type: maintain the aligned schedule; watch for over-early waking with depression.',
        '- نمط صباحي: حافظ على الجدول المتوائم؛ انتبه للاستيقاظ المبكر الزائد مع الاكتئاب.'));
    else
      L.push(H(`- Chronotype noted (${form.chronotype}): align light and meal timing to the active phase.`,
        `- النمط الزمني (${form.chronotype}): وائم الضوء وتوقيت الأكل مع الطور النشط.`));
  }

  const srcs = [...new Set([...(dis?.src || []), CS('PERIPH_FOOD'), CS('PERIPH_META'), CS('CHRONO_PHARM'), CS('TRE_WEAK')])];
  L.push('\n_' + H('Sources', 'المصادر') + ': ' + srcs.join(' | ') + '_');

  return L.join('\n');
}
