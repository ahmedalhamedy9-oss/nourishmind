/* ════════════════════════════════════════════════════════════════════════
   rxRender.js — DETERMINISTIC report-section renderers
   Build each clinical section VERBATIM from rxFormulary.js (source of truth),
   exactly like the interaction table. The model no longer writes these — it
   only explains. Reproducible every run.
   ════════════════════════════════════════════════════════════════════════ */
import { RX, RX_ACTIVE, THERAPY_TECHNIQUES, PSYCHOTHERAPY_PLAN, PSYCHOTHERAPY_ACTIVE, VAGAL_TONING, TECHNIQUE_LIBRARY, DISORDER_TECHNIQUES } from './rxFormulary';
import { medicationAdvisories } from './medicationSafety';

const ok = (key) => RX_ACTIVE && RX[key] && !RX[key].__pending;
const j = (arr) => (arr || []).join('; ');
const line = (label, val) => (val ? `**${label}:** ${val}` : '');
const cd = (o) => o ? Object.entries(o).map(([k, v]) => `${k}: ${v}`).join('; ') : '';

/* ── 💊 MEDICATIONS — selection logic + full monographs + switching ─────── */
export function renderRxMedications({ key, lang = 'en', form = {} } = {}) {
  if (!ok(key)) return '';
  const d = RX[key];
  const isAr = lang === 'ar';
  const out = [];

  // Patient-aware overlay: duplicate / allergy / interaction / comorbidity flags.
  const adv = medicationAdvisories({ key, form, lang });
  const advLine = (m) => {
    const a = adv.get(String(m.drug).toLowerCase());
    if (!a) return '';
    const head = a.level === 'danger'
      ? (isAr ? '⛔ تنبيه خاص بالمريض' : '⛔ PATIENT-SPECIFIC ALERT')
      : (isAr ? '⚠️ ملاحظة خاصة بالمريض' : '⚠️ PATIENT-SPECIFIC NOTE');
    return `\n**${head}:** ${a.notes.join(' | ')}`;
  };

  // selection guidance first (the "choose what, on what basis")
  if (d.specifierTargeting?.text)
    out.push(`**${isAr ? 'منطق الاختيار' : 'SELECTION GUIDANCE'}:** ${d.specifierTargeting.text}`);

  const mono = (m, role) => {
    const b = [];
    b.push(`\n${m.drug}${m.class ? ` (${m.class})` : ''}${m.grade ? ` — ${isAr ? 'مستوى' : 'Level'} ${m.grade}` : ''}${role ? ` [${role}]` : ''}${m.verified === false ? (isAr ? ' ⚠ مسودة — غير مُتحقَّق منه' : ' ⚠ DRAFT — unverified') : ''}`);
    const al = advLine(m); if (al) b.push(al);
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

/* ════════════════════════════════════════════════════════════════════════
   💊 MEDICATIONS — DECISION-FIRST HTML renderer (reference-design faithful).
   Returns raw HTML (namespaced .pd- classes + scoped <style>) built VERBATIM
   from rxFormulary decision fields (strength/bestIf/avoidIf/benefit/…).
   Injected raw (bypasses the markdown escaper) — same idea as the interaction
   table. Benefit rows show SMD + CI + P + GRADE certainty (honest), NOT forced
   stars. pdf:true renders collapsibles OPEN (doctor record must be complete).
   ════════════════════════════════════════════════════════════════════════ */
const E = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const STR_COLOR = { High: '#3b6d11', Moderate: '#ba7517', Weak: '#a32d2d' };
const TIER_CLASS = { absolute: 'pd-t-abs', relative: 'pd-t-rel', boxed: 'pd-t-box' };
const VLOW = (c) => /very\s*low/i.test(c || '');
// stars from |SMD| (Cohen 1988) — suppressed when certainty is 'very low'
function pdStars(smd, certainty) {
  if (smd == null || VLOW(certainty)) return '';
  const d = Math.abs(parseFloat(String(smd).replace(/[−–]/g, '-')));
  if (isNaN(d)) return '';
  const n = d >= 0.8 ? 5 : d >= 0.5 ? 4 : d >= 0.2 ? 3 : 2;
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}
const PD_STYLE = `<style>
.pd-meds{font-family:Inter,system-ui,sans-serif;color:#cbd5e1;background:linear-gradient(135deg,#070f0d,#0d1a17);padding:16px;border-radius:14px;font-size:13.5px;line-height:1.5;direction:ltr}
.pd-meds .pd-hd{color:#5fbfb0;font-weight:800;font-size:15px}
.pd-meds .pd-sub{color:#64748b;font-size:11.5px;margin-bottom:8px}
.pd-meds .pd-gd{color:#5fbfb0;font-weight:800;font-size:11px;letter-spacing:.05em;text-transform:uppercase;margin:14px 0 4px}
.pd-meds details.pd-cmp{background:rgba(95,191,176,.06);border:1px solid rgba(95,191,176,.3);border-radius:11px;margin:8px 0 12px}
.pd-meds details.pd-cmp>summary{cursor:pointer;list-style:none;padding:11px 14px;font-weight:700;color:#7fe0d0;font-size:13.5px}
.pd-meds details.pd-cmp>summary::-webkit-details-marker{display:none}
.pd-meds table.pd-cmp-t{width:100%;border-collapse:collapse;table-layout:fixed;font-size:11.5px;padding:0 10px}
.pd-meds table.pd-cmp-t th,.pd-meds table.pd-cmp-t td{padding:6px 5px;text-align:center;border-bottom:1px solid rgba(255,255,255,.06)}
.pd-meds table.pd-cmp-t th{color:#fff;font-weight:700;font-size:11px}
.pd-meds table.pd-cmp-t td.pd-feat,.pd-meds table.pd-cmp-t th.pd-feat{text-align:left;color:#9fe3d8;font-weight:600;width:26%;font-size:11px}
.pd-meds .pd-card{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.08);border-left:3px solid #5fbfb0;border-radius:11px;padding:12px 13px;margin:10px 0}
.pd-meds .pd-drug{font-size:15px;margin-bottom:3px;display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.pd-meds .pd-drug strong{color:#fff;font-weight:700}
.pd-meds .pd-bdg{font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:6px;border:1px solid rgba(255,255,255,.14);color:#9aa8b5}
.pd-meds .pd-bdg.role{color:#5fbfb0;background:rgba(95,191,176,.12);border-color:rgba(95,191,176,.3)}
.pd-meds .pd-bdg.cls{color:#b39ddb;background:rgba(139,92,246,.12);border-color:rgba(139,92,246,.3)}
.pd-meds .pd-bdg.lvl{color:#85b7eb;background:rgba(55,138,221,.12);border-color:rgba(55,138,221,.3)}
.pd-meds .pd-mech{color:#8b98a5;font-size:12px;margin-bottom:9px}
.pd-meds .pd-grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:9px}
.pd-meds .pd-bx{border-radius:9px;padding:8px 10px;font-size:12px}
.pd-meds .pd-good{background:rgba(59,109,17,.12);border:1px solid rgba(59,109,17,.35)}
.pd-meds .pd-bad{background:rgba(163,45,45,.1);border:1px solid rgba(163,45,45,.35)}
.pd-meds .pd-bxh{font-weight:700;margin-bottom:4px;font-size:12px}
.pd-meds .pd-good .pd-bxh{color:#97c459}.pd-meds .pd-bad .pd-bxh{color:#f09595}
.pd-meds .pd-r{margin:3px 0;color:#c2cdd6;line-height:1.4}
.pd-meds .pd-der{font-size:9.5px;color:#7a8891;border:1px solid rgba(255,255,255,.15);border-radius:4px;padding:0 4px}
.pd-meds .pd-tier{font-size:9.5px;border-radius:4px;padding:0 4px}
.pd-meds .pd-t-abs{color:#f09595;background:rgba(163,45,45,.2)}.pd-meds .pd-t-box{color:#fac775;background:rgba(133,79,11,.25)}.pd-meds .pd-t-rel{color:#e0b872;background:rgba(186,117,23,.15)}
.pd-meds .pd-mini{font-size:10.5px;font-weight:700;color:#5fbfb0;text-transform:uppercase;letter-spacing:.04em;margin:8px 0 4px}
.pd-meds .pd-benr{display:flex;align-items:center;gap:8px;margin:2px 0;flex-wrap:wrap}
.pd-meds .pd-bens{flex:1;min-width:150px;color:#c2cdd6}
.pd-meds .pd-stars{color:#fac775;letter-spacing:2px;font-size:13px}
.pd-meds .pd-benv{color:#7a8891;font-size:11px}
.pd-meds .pd-cert{font-size:10px;font-weight:700;border-radius:4px;padding:1px 6px}
.pd-meds .pd-c-vl{color:#f0a0a0;background:rgba(163,45,45,.14)}.pd-meds .pd-c-lo{color:#e0b872;background:rgba(186,117,23,.12)}.pd-meds .pd-c-ok{color:#97c459;background:rgba(59,109,17,.14)}
.pd-meds .pd-sig{color:#85b7eb;font-size:11.5px;font-style:italic}
.pd-meds .pd-src{font-size:10.5px;color:#61707b;margin-top:3px}
.pd-meds .pd-row3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:9px 0;background:rgba(0,0,0,.2);border-radius:8px;padding:8px 10px}
.pd-meds .pd-row3 .k{display:block;font-size:10px;color:#61707b;text-transform:uppercase;letter-spacing:.04em}
.pd-meds .pd-row3 .v{display:block;color:#e2e8f0;font-weight:600;font-size:12.5px;margin-top:1px}
.pd-meds .pd-contra{margin:8px 0;font-size:12px;display:flex;flex-wrap:wrap;gap:6px;align-items:baseline}
.pd-meds .pd-ck{color:#9fe3d8;font-weight:600}
.pd-meds .pd-cx{border-radius:6px;padding:2px 7px;font-size:11.5px}
.pd-meds .pd-c-abs{color:#f09595;background:rgba(163,45,45,.15)}.pd-meds .pd-c-rel{color:#e0b872;background:rgba(186,117,23,.12)}.pd-meds .pd-c-boxx{color:#fac775;background:rgba(133,79,11,.2)}
.pd-meds .pd-pearl{margin:8px 0;font-size:12px;color:#c2cdd6}.pd-meds .pd-pearl .k{color:#9fe3d8;font-weight:600}
.pd-meds .pd-mon-r{display:flex;gap:10px;font-size:12px;padding:3px 0}
.pd-meds .pd-mon-w{min-width:92px;color:#5fbfb0;font-weight:600}.pd-meds .pd-mon-a{color:#b6c2cc}
.pd-meds details.pd-exp{margin:8px 0 0;padding-top:6px;border-top:1px dashed rgba(255,255,255,.1)}
.pd-meds details.pd-exp>summary{cursor:pointer;color:#6b7d8a;font-size:12px;font-weight:700;list-style:none}
.pd-meds details.pd-exp>summary::-webkit-details-marker{display:none}
.pd-meds .pd-exp-b{margin-top:6px;padding:8px 10px;background:rgba(0,0,0,.28);border-radius:8px}
.pd-meds .pd-exp-b .row{margin:2px 0;font-size:12px;color:#93a3af}.pd-meds .pd-exp-b .row strong{color:#7fb8ad;font-weight:600}
</style>`;

function pdCertBadge(c) {
  if (!c) return '';
  const cls = VLOW(c) ? 'pd-c-vl' : /low/i.test(c) ? 'pd-c-lo' : 'pd-c-ok';
  return `<span class="pd-cert ${cls}">${E(c)}</span>`;
}
function pdBenefitRow(b) {
  let val;
  if (b.smd != null) {
    // Continuous effect size → Cohen stars apply (suppressed at very-low certainty).
    const stars = pdStars(b.smd, b.certainty);
    const bits = [`SMD ${E(b.smd)}`];
    if (b.ci) bits.push(`(95% CI ${E(b.ci)})`);
    if (b.p) bits.push(`P=${E(b.p)}`);
    val = `${stars ? `<span class="pd-stars">${stars}</span> ` : ''}<span class="pd-benv">${bits.join(' · ')}</span> ${pdCertBadge(b.certainty)}`;
  } else if (b.metricValue) {
    // Non-SMD effect (e.g. OR for response) — shown as-is, NO Cohen stars
    // (the |d| thresholds are SMD-specific; starring an OR would be dishonest).
    const bits = [`${E(b.metricLabel || 'effect')} ${E(b.metricValue)}`];
    if (b.ci) bits.push(`(95% CI ${E(b.ci)})`);
    if (b.p) bits.push(`P=${E(b.p)}`);
    val = `<span class="pd-benv">${bits.join(' · ')}</span> ${pdCertBadge(b.certainty)}`;
  } else {
    val = `<span class="pd-sig">signal — no pooled SMD</span> ${pdCertBadge(b.certainty)}`;
  }
  const basis = b.basis ? `<div class="pd-src">${E(b.basis)}</div>` : '';
  return `<div class="pd-benr"><span class="pd-bens">${E(b.symptom)}</span><span>${val}</span></div>${basis}`;
}
function pdCard(m, role, advItem) {
  const band = advItem
    ? `<div style="margin:0 0 9px;padding:8px 10px;border-radius:9px;font-size:12px;`
      + (advItem.level === 'danger'
        ? 'background:rgba(163,45,45,.16);border:1px solid rgba(163,45,45,.5);color:#f0a0a0">'
        : 'background:rgba(186,117,23,.13);border:1px solid rgba(186,117,23,.45);color:#e0b872">')
      + `<strong>${advItem.level === 'danger' ? '⛔ Patient-specific alert' : '⚠️ Patient-specific note'}:</strong> `
      + advItem.notes.map(E).join(' &nbsp;|&nbsp; ') + `</div>`
    : '';
  const strengthBadge = m.strength
    ? `<span class="pd-bdg" style="color:${STR_COLOR[m.strength.level] || '#9aa8b5'};background:${(STR_COLOR[m.strength.level] || '#555')}2e;border-color:${(STR_COLOR[m.strength.level] || '#555')}66" title="${E(m.strength.certainty || '')}">${E(m.strength.level)}${m.strength.certainty ? ` · ${E(m.strength.certainty)}` : ''}</span>`
    : '';
  const best = (m.bestIf || []).map((r) => `<div class="pd-r">${E(r.text)}${r.derived ? ' <span class="pd-der">derived</span>' : ''}</div>`).join('');
  const avoid = (m.avoidIf || []).map((r) => `<div class="pd-r">${E(r.text)}${r.tier ? ` <span class="pd-tier ${TIER_CLASS[r.tier] || ''}">${E(r.tier)}</span>` : ''}</div>`).join('');
  const benefit = (m.benefit || []).map(pdBenefitRow).join('');
  const benSrc = [...new Set((m.benefit || []).flatMap((b) => b.src || []))].join(' · ');
  const c = m.contraindications || {};
  const chips = [];
  if (c.absolute && c.absolute !== '—') chips.push(`<span class="pd-cx pd-c-abs">🚫 ${E(c.absolute)}</span>`);
  if (c.relative && c.relative !== '—') chips.push(`<span class="pd-cx pd-c-rel">⚠ ${E(c.relative)}</span>`);
  if (c.boxed && c.boxed !== '—') chips.push(`<span class="pd-cx pd-c-boxx">BOXED ${E(c.boxed)}</span>`);
  const mon = m.monitoring
    ? `<div class="pd-mini">Monitoring</div>`
      + (m.monitoring.baseline ? `<div class="pd-mon-r"><span class="pd-mon-w">Baseline</span><span class="pd-mon-a">${E(m.monitoring.baseline)}</span></div>` : '')
      + (m.monitoring.ongoing ? `<div class="pd-mon-r"><span class="pd-mon-w">Ongoing</span><span class="pd-mon-a">${E(m.monitoring.ongoing)}</span></div>` : '')
    : '';
  const openAttr = m.__pdfOpen ? ' open' : '';
  const monograph = `<details class="pd-exp"${openAttr}><summary>Full monograph</summary><div class="pd-exp-b">`
    + [['Common AEs', m.ae && m.ae.common], ['Onset', m.onset], ['Half-life', m.halfLife],
       ['Withdrawal', m.withdrawal && `${m.withdrawal.risk} — ${m.withdrawal.note}`],
       ['Pregnancy / lactation', m.pregnancyLactation], ['Overdose', m.overdose],
       ['Switching', m.switching], ['Counseling', m.counseling]]
      .filter(([, v]) => v).map(([k, v]) => `<div class="row"><strong>${k}:</strong> ${E(v)}</div>`).join('')
    + `</div></details>`;
  const evidence = `<details class="pd-exp"${openAttr}><summary>Evidence</summary><div class="pd-exp-b"><div class="row">${(m.src || []).map(E).join('; ')}</div></div></details>`;
  return `<div class="pd-card">`
    + band
    + `<div class="pd-drug"><strong>${E(m.drug)}</strong>`
      + `<span class="pd-bdg role">${E(role)}</span>`
      + (m.class ? `<span class="pd-bdg cls">${E(m.class)}</span>` : '')
      + strengthBadge
      + (m.grade ? `<span class="pd-bdg lvl">Level ${E(m.grade)}</span>` : '')
      + (m.verified === false ? `<span class="pd-bdg" style="color:#e0b872;background:rgba(186,117,23,.14);border-color:rgba(186,117,23,.4)" title="Drafted from the cited source; pending physician sign-off">⚠ DRAFT · unverified</span>` : '')
    + `</div>`
    + (m.mechanism ? `<div class="pd-mech">${E(m.mechanism)}</div>` : '')
    + `<div class="pd-grid2"><div class="pd-bx pd-good"><div class="pd-bxh">✅ Best if</div>${best}</div>`
      + `<div class="pd-bx pd-bad"><div class="pd-bxh">❌ Avoid if</div>${avoid}</div></div>`
    + (benefit ? `<div class="pd-mini">Estimated benefit</div>${benefit}${benSrc ? `<div class="pd-src">src: ${E(benSrc)}</div>` : ''}` : '')
    + (m.dosing ? `<div class="pd-row3"><div><span class="k">Starting</span><span class="v">${E(m.dosing.start)}</span></div><div><span class="k">Target</span><span class="v">${E(m.dosing.target)}</span></div><div><span class="k">Maximum</span><span class="v">${E(m.dosing.max)}</span></div></div>` : '')
    + (chips.length ? `<div class="pd-contra"><span class="pd-ck">Contraindications</span>${chips.join('')}</div>` : '')
    + (m.ae && m.ae.distinctive ? `<div class="pd-pearl"><span class="k">Clinical pearls</span> ${E(m.ae.distinctive)}</div>` : '')
    + mon + monograph + evidence
  + `</div>`;
}
function pdCompareMatrix(list) {
  if (!list.length) return '';
  const head = `<tr><th class="pd-feat">Feature</th>${list.map((m) => `<th>${E(m.drug.split(' ')[0])}</th>`).join('')}</tr>`;
  const rowStrength = `<tr><td class="pd-feat">Strength · certainty</td>${list.map((m) => `<td>${m.strength ? `${E(m.strength.level)}<br><span style="font-size:10px;color:#7a8891">${E(m.strength.certainty || '')}</span>` : '—'}</td>`).join('')}</tr>`;
  const rowTop = `<tr><td class="pd-feat">Top pooled benefit</td>${list.map((m) => { const b = (m.benefit || []).find((x) => x.smd != null) || (m.benefit || []).find((x) => x.metricValue); const v = b ? (b.smd != null ? `SMD ${E(b.smd)}` : `${E(b.metricLabel || '')} ${E(b.metricValue)}`) : null; return `<td>${b ? `${v}<br><span style="font-size:10px;color:#7a8891">${E(b.symptom)}</span>` : '<span style="color:#48555d">signal only</span>'}</td>`; }).join('')}</tr>`;
  const rowPreg = `<tr><td class="pd-feat">Pregnancy</td>${list.map((m) => { const a = (m.avoidIf || []).find((x) => /pregnan|childbearing/i.test(x.text)); return `<td>${a ? (a.tier === 'absolute' ? '<span style="color:#f09595">❌</span>' : '<span style="color:#e0b872">⚠</span>') : '<span style="color:#61707b">—</span>'}</td>`; }).join('')}</tr>`;
  return `<details class="pd-cmp" open><summary>⚖ Compare all ${list.length} — pick in one glance</summary>`
    + `<div style="padding:2px 10px 12px"><table class="pd-cmp-t"><thead>${head}</thead><tbody>${rowStrength}${rowTop}${rowPreg}</tbody></table>`
    + `<div class="pd-src" style="padding:0 4px">Benefit = GRADE-rated pooled SMD where available; "signal only" = single-trial, no robust pooled estimate. Sources on each card.</div></div></details>`;
}
export function renderRxMedicationsHTML({ key, lang = 'en', pdf = false, form = {} } = {}) {
  if (!ok(key)) return '';
  const d = RX[key];
  const adv = medicationAdvisories({ key, form, lang });
  const advOf = (m) => adv.get(String(m.drug).toLowerCase());
  const first = d.firstLine || [];
  const adj = (d.adjunct || []).map((m) => ({ ...m, __pdfOpen: pdf }));
  const firstMarked = first.map((m) => ({ ...m, __pdfOpen: pdf }));
  const out = [PD_STYLE, `<div class="pd-meds">`];
  out.push(`<div class="pd-hd">💊 Medication Recommendations — ${E(key)}</div>`);
  out.push(`<div class="pd-sub">decision-first · Best/Avoid up top · benefit graded by effect size + GRADE certainty · sourced</div>`);
  if (d.dxNote) out.push(`<div class="pd-mech" style="margin-bottom:10px">${E(d.dxNote)}</div>`);
  if (d.specifierTargeting?.text) out.push(`<div class="pd-gd">Selection guidance</div><div class="pd-mech" style="margin-bottom:8px">${E(d.specifierTargeting.text)}</div>`);
  out.push(pdCompareMatrix(adj.length ? adj : firstMarked));
  if (firstMarked.length) {
    out.push(`<div class="pd-gd">First-line</div>`);
    firstMarked.forEach((m) => out.push(pdCard(m, 'first-line', advOf(m))));
  } else {
    out.push(`<div class="pd-gd">First-line — psychotherapy is first-line (no approved first-line drug)</div>`);
  }
  if (adj.length) {
    out.push(`<div class="pd-gd">Adjunct / second-line</div>`);
    adj.forEach((m) => out.push(pdCard(m, 'adjunct', advOf(m))));
  }
  out.push(`</div>`);
  return out.join('');
}
