/* ════════════════════════════════════════════════════════════════════════
   rxRender.js — DETERMINISTIC report-section renderers
   Build each clinical section VERBATIM from rxFormulary.js (source of truth),
   exactly like the interaction table. The model no longer writes these — it
   only explains. Reproducible every run.
   ════════════════════════════════════════════════════════════════════════ */
import { RX, RX_ACTIVE, THERAPY_TECHNIQUES, PSYCHOTHERAPY_PLAN, PSYCHOTHERAPY_ACTIVE, VAGAL_TONING, TECHNIQUE_LIBRARY, DISORDER_TECHNIQUES } from './rxFormulary';

const ok = (key) => RX_ACTIVE && RX[key] && !RX[key].__pending;
const j = (arr) => (arr || []).join('; ');
const line = (label, val) => (val ? `**${label}:** ${val}` : '');
const cd = (o) => o ? Object.entries(o).map(([k, v]) => `${k}: ${v}`).join('; ') : '';

/* ── 💊 MEDICATIONS — selection logic + full monographs + switching ─────── */
export function renderRxMedications({ key, lang = 'en' } = {}) {
  if (!ok(key)) return '';
  const d = RX[key];
  const isAr = lang === 'ar';
  const out = [];

  // selection guidance first (the "choose what, on what basis")
  if (d.specifierTargeting?.text)
    out.push(`**${isAr ? 'منطق الاختيار' : 'SELECTION GUIDANCE'}:** ${d.specifierTargeting.text}`);

  const mono = (m, role) => {
    const b = [];
    b.push(`\n${m.drug}${m.class ? ` (${m.class})` : ''}${m.grade ? ` — ${isAr ? 'مستوى' : 'Level'} ${m.grade}` : ''}${role ? ` [${role}]` : ''}`);
    b.push(line('Mechanism', m.mechanism));
    if (m.dosing) b.push(line('Dose', `start ${m.dosing.start}; titrate ${m.dosing.titration}; target ${m.dosing.target}; max ${m.dosing.max}; forms ${m.dosing.forms}`));
    b.push(line('Onset/trial', m.onset));
    b.push(line('Half-life', m.halfLife));
    if (m.withdrawal) b.push(line('Withdrawal', `${m.withdrawal.risk} — ${m.withdrawal.note}`));
    if (m.ae) b.push(line('Adverse effects', `common: ${m.ae.common} | distinctive: ${m.ae.distinctive}`));
    if (m.monitoring) b.push(line('Monitoring', `baseline: ${m.monitoring.baseline} | ongoing: ${m.monitoring.ongoing}`));
    if (m.contraindications) b.push(line('Contraindications', `absolute: ${m.contraindications.absolute} | relative: ${m.contraindications.relative}${m.contraindications.boxed && m.contraindications.boxed !== '—' ? ` | BOXED: ${m.contraindications.boxed}` : ''}`));
    b.push(line('Pregnancy/lactation', m.pregnancyLactation));
    b.push(line('Chronic disease', cd(m.chronicDisease)));
    b.push(line('Overdose', m.overdose));
    if (m.specialPops) b.push(line('Special populations', cd(m.specialPops)));
    b.push(line('Switching', m.switching));
    b.push(line('Counseling', m.counseling));
    if (m.trade) b.push(line('Trade (Egypt)', m.trade.egypt));
    b.push(`_src: ${j(m.src)}_`);
    return b.filter(Boolean).join('\n');
  };

  if ((d.firstLine || []).length) {
    out.push(`\n**${isAr ? 'الخط الأول' : 'FIRST-LINE'}**`);
    d.firstLine.forEach((m) => out.push(mono(m, isAr ? 'خط أول' : 'first-line')));
  } else {
    out.push(`\n**${isAr ? 'الخط الأول' : 'FIRST-LINE'}:** ${d.dxNote || (isAr ? 'لا يوجد دواء خط أول معتمد — العلاج النفسي هو الأساس.' : 'No approved first-line medication — psychotherapy is the cornerstone.')}`);
  }
  if ((d.adjunct || []).length) {
    out.push(`\n**${isAr ? 'المساعد / الخط الثاني' : 'ADJUNCT / SECOND-LINE'}**`);
    d.adjunct.forEach((m) => out.push(mono(m, isAr ? 'مساعد' : 'adjunct')));
  }
  if (d.switchingStrategies?.text)
    out.push(`\n**${isAr ? 'استراتيجيات التبديل' : 'SWITCHING'}:** ${d.switchingStrategies.text} _src: ${j(d.switchingStrategies.src)}_`);

  return out.filter(Boolean).join('\n');
}

/* ── 🧪 LABS — 🟥 required / 🟨 recommended / 🟩 optional ────────────────── */
export function renderRxLabs({ key, lang = 'en' } = {}) {
  if (!ok(key) || !RX[key].labs) return '';
  const d = RX[key].labs;
  const isAr = lang === 'ar';
  const tier = (icon, title, rows) =>
    rows && rows.length
      ? `\n${icon} **${title}**\n` + rows.map((r) => `- **${r.test}** — ${r.why} _(${isAr ? 'متى' : 'when'}: ${r.when})_ _src: ${j(r.src)}_`).join('\n')
      : '';
  return [
    tier('🟥', isAr ? 'مطلوب قبل العلاج' : 'Required Before Treatment', d.required),
    tier('🟨', isAr ? 'موصى به' : 'Recommended', d.recommended),
    tier('🟩', isAr ? 'اختياري' : 'Optional', d.optional),
  ].filter(Boolean).join('\n');
}

/* ── 🚫 EXCLUDED ────────────────────────────────────────────────────────── */
export function renderRxExcluded({ key, lang = 'en' } = {}) {
  if (!ok(key)) return '';
  const d = RX[key];
  return (d.excluded || []).map((e) => `- **${e.item}**: ${e.why} _src: ${j(e.src)}_`).join('\n');
}

/* ── 🧠 THERAPY — staged INTEGRATIVE plan (preferred) or flat techniques (#7) ─ */
export function renderRxTherapy({ key, lang = 'en' } = {}) {
  if (!RX_ACTIVE) return '';
  const isAr = lang === 'ar';
  const plan = PSYCHOTHERAPY_ACTIVE ? PSYCHOTHERAPY_PLAN[key] : null;

  // Preferred: full staged integrative plan (reviewed template).
  if (plan) {
    const L = [`_${plan.model}_`];

    L.push(`\n**${isAr ? '📏 مقاييس المتابعة' : '📏 Outcome measures'}:**`);
    plan.coreMeasures.forEach((m) =>
      L.push(`• **${m.tool}** (${m.kind}) — ${isAr ? 'التكرار' : 'cadence'}: ${m.cadence}. ${m.interpret} _src: ${j(m.src)}_`));

    L.push(`\n**${isAr ? '🪜 المراحل' : '🪜 Phases'}:**`);
    plan.phases.forEach((p) => {
      L.push(`\n**${isAr ? 'المرحلة' : 'Phase'} ${p.phase} — ${p.name}** _(${p.duration})_`);
      L.push(`${isAr ? 'الأهداف' : 'Goals'}: ${p.goals}`);
      p.techniques.forEach((t) => L.push(`   – [${t.school}] **${t.name}** — ${t.how} _src: ${j(t.src)}_`));
      L.push(`✅ ${isAr ? 'محك إنجاز المرحلة' : 'Phase target'}: ${p.phaseTarget}`);
    });

    const nr = plan.nonResponse;
    L.push(`\n**${isAr ? '🔁 عند عدم الاستجابة' : '🔁 If no progress'}** (${nr.reviewAt})`);
    L.push(`${isAr ? 'راجع' : 'Review'}: ${nr.checklist.join(' · ')}`);
    L.push(`${isAr ? 'بدائل' : 'Alternatives'}:`);
    nr.alternatives.forEach((a) => L.push(`   – ${isAr ? 'لو' : 'if'} ${a.ifX} → ${a.switchTo} _src: ${j(a.src)}_`));

    L.push(`\n**${isAr ? '🔗 تقنيات مشتركة بين المدارس' : '🔗 Cross-school techniques'}:** ${plan.crossSchool.join(' · ')}`);
    return L.join('\n') + renderTechniqueLibrary({ key, lang }) + renderVagalToning({ lang });
  }

  // Fallback: flat per-school techniques (disorders not yet upgraded to a staged plan).
  const techs = THERAPY_TECHNIQUES[key];
  if (!techs) return '';
  const flat = techs.map((t) =>
    `\n**${t.school}** (${isAr ? 'أولوية' : 'priority'} ${t.priority}${t.grade ? `, ${isAr ? 'مستوى' : 'Level'} ${t.grade}` : ''})\n` +
    `**${isAr ? 'التقنيات' : 'Techniques'}:** ${t.techniques}\n` +
    `**${isAr ? 'المسار' : 'Course'}:** ${t.course} _src: ${j(t.src)}_`
  ).join('\n');
  return flat + renderTechniqueLibrary({ key, lang }) + renderVagalToning({ lang });
}

/* ── 📚 TECHNIQUE LIBRARY — step-by-step protocols for the disorder's techniques ── */
export function renderTechniqueLibrary({ key, lang = 'en' } = {}) {
  if (!PSYCHOTHERAPY_ACTIVE || !TECHNIQUE_LIBRARY || !DISORDER_TECHNIQUES) return '';
  const ids = DISORDER_TECHNIQUES[key];
  if (!ids || !ids.length) return '';
  const isAr = lang === 'ar';
  const L = [`\n\n**${isAr ? '📚 مكتبة التقنيات — بروتوكولات خطوة بخطوة' : '📚 Technique library — step-by-step protocols'}**`];
  let lastSchool = null;
  ids.forEach((id) => {
    const t = TECHNIQUE_LIBRARY[id];
    if (!t) return;
    if (t.school !== lastSchool) { L.push(`\n— *${t.school}* —`); lastSchool = t.school; }
    L.push(`**${t.name}**${t.deliveredBy ? ` _(${t.deliveredBy})_` : ''}`);
    if (t.whatItIs) L.push(`${isAr ? 'ما هي' : 'What'}: ${t.whatItIs}`);
    if (t.whenToUse) L.push(`${isAr ? 'متى تُستخدم' : 'When to use'}: ${t.whenToUse}`);
    if (t.steps && t.steps.length) {
      L.push(`${isAr ? 'الخطوات' : 'Steps'}:`);
      t.steps.forEach((s, i) => L.push(`   ${i + 1}. ${s}`));
    }
    L.push(`_src: ${j(t.src)}_`);
  });
  return '\n' + L.join('\n');
}

/* ── 🌀 VAGAL TONING — global adjunct module appended to the therapy section ── */
export function renderVagalToning({ lang = 'en' } = {}) {
  if (!PSYCHOTHERAPY_ACTIVE || !VAGAL_TONING) return '';
  const isAr = lang === 'ar';
  const v = VAGAL_TONING;
  const L = [`\n\n**${isAr ? '🌀 تنغيم العصب المبهم (Vagal toning) — مساعد' : '🌀 Vagal nerve toning — adjunct'}**`];
  L.push(`${isAr ? 'الأساس' : 'Rationale'}: ${v.rationale}`);
  L.push(`${isAr ? 'الدليل' : 'Evidence'}: ${v.evidence}`);
  v.techniques.forEach((t) => {
    L.push(`   – **${t.name}** _(Level ${t.grade})_ — ${t.how} _src: ${j(t.src)}_`);
    if (t.steps && t.steps.length) t.steps.forEach((s, i) => L.push(`       ${i + 1}. ${s}`));
  });
  if (v.bodyBased && v.bodyBased.length) {
    L.push(`\n${isAr ? '🧎 تمارين جسدية للعصب المبهم' : '🧎 Body-based vagal exercises'}:`);
    v.bodyBased.forEach((t) => {
      L.push(`   – **${t.name}** _(Level ${t.grade})_ — ${t.how} ${isAr ? '(الفايدة: ' : '(why: '}${t.why}) _src: ${j(t.src)}_`);
      if (t.steps && t.steps.length) t.steps.forEach((s, i) => L.push(`       ${i + 1}. ${s}`));
    });
  }
  L.push(`${isAr ? 'الدمج' : 'Integrates with'}: ${v.integratesWith}`);
  L.push(`⚠ ${isAr ? 'تحذيرات' : 'Cautions'}: ${v.cautions}`);
  if (v.excludedManeuvers) L.push(`⛔ ${v.excludedManeuvers}`);
  return '\n' + L.join('\n');
}

/* ── 📋 FOLLOW-UP & SAFETY — phases + monitoring + withdrawal-vs-relapse + taper (#8) ─ */
export function renderRxFollowup({ key, lang = 'en' } = {}) {
  if (!ok(key)) return '';
  const d = RX[key];
  const isAr = lang === 'ar';
  const blk = (title, node) => node?.text ? `\n**${title}**\n${node.text} _src: ${j(node.src)}_` : '';
  return [
    blk(isAr ? 'مراحل ومدة العلاج' : 'Treatment phases & duration', d.treatmentPhases),
    blk(isAr ? 'المتابعة الزمنية — المتوقّع ومتى نحكم' : 'Monitoring timeline — what to expect & when', d.monitoringTimeline),
    blk(isAr ? 'التفريق بين الانسحاب والانتكاس (أساس الموافقة المستنيرة)' : 'Withdrawal vs Relapse (basis of informed consent)', d.withdrawalVsRelapse),
    blk(isAr ? 'التيبر الهيبربولي' : 'Hyperbolic tapering', d.hyperbolicTaper),
  ].filter(Boolean).join('\n');
}
