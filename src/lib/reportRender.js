/* ════════════════════════════════════════════════════════════════════════
   reportRender.js — DECISION-FIRST HTML renderers for the non-medication tabs
   ────────────────────────────────────────────────────────────────────────
   Same philosophy as rxRender's medications HTML: build each section VERBATIM
   from the locked engines (rxFormulary / labEngine / nutritionFormulary /
   chronoEngine / mealPlanEngine), inject raw (bypassing the markdown escaper),
   reproducible every run. Nothing invented — every row is source-backed.

   Shared, self-contained scoped style (.rc- namespace) + small primitives so
   every tab reads as one system and matches the reference design tokens
   (teal #5fbfb0, dark #070f0d→#0d1a17, evidence/priority colour language).
   pdf:true renders collapsibles OPEN (the doctor record must be complete).
   ════════════════════════════════════════════════════════════════════════ */
import { RX, RX_ACTIVE, PSYCHOTHERAPY_PLAN, PSYCHOTHERAPY_ACTIVE } from './rxFormulary';
import { computeDynamicLabs } from './labEngine';
import { NUTRITION, NUTRITION_ACTIVE } from './nutritionFormulary';
import { computeMetrics } from './clinicalFormulary';
import { interactionSplitStructured, INTERACTIONS_ACTIVE, INTERACTIONS_VERSION } from './interactions';
import { renderChrono } from './chronoEngine';

const jsrc = (a) => (a && a.length ? a.join('; ') : '');

const ok = (key) => RX_ACTIVE && RX[key] && !RX[key].__pending;
export const RC_E = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const rcSrc = (a) => (a && a.length ? `<div class="rc-src">src: ${RC_E(a.join(' · '))}</div>` : '');

/* Shared scoped style — one accent per tab is set inline via --rc-accent. */
export const RC_STYLE = `<style>
.rc{font-family:Inter,system-ui,sans-serif;color:#cbd5e1;background:linear-gradient(135deg,#070f0d,#0d1a17);padding:16px;border-radius:14px;font-size:13.5px;line-height:1.5;direction:ltr}
.rc .rc-hd{color:var(--rc-accent,#5fbfb0);font-weight:800;font-size:15px}
.rc .rc-sub{color:#64748b;font-size:11.5px;margin-bottom:10px}
.rc .rc-gd{color:var(--rc-accent,#5fbfb0);font-weight:800;font-size:11px;letter-spacing:.05em;text-transform:uppercase;margin:16px 0 6px;border-top:1px solid rgba(255,255,255,.08);padding-top:12px}
.rc .rc-note{color:#8b98a5;font-size:12px;margin:2px 0 8px}
.rc .rc-src{font-size:10px;color:#61707b;margin-top:2px}
/* graded rows (labs / excluded / generic) */
.rc .rc-row{display:flex;gap:9px;align-items:flex-start;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.07);border-left:3px solid #48555d;border-radius:9px;padding:8px 11px;margin:6px 0}
.rc .rc-row.req{border-left-color:#a32d2d}.rc .rc-row.rec{border-left-color:#ba7517}.rc .rc-row.opt{border-left-color:#3b6d11}
.rc .rc-tag{flex:none;font-size:9.5px;font-weight:800;letter-spacing:.03em;border-radius:5px;padding:2px 7px;white-space:nowrap;margin-top:1px}
.rc .rc-tag.req{color:#f09595;background:rgba(163,45,45,.16)}
.rc .rc-tag.rec{color:#e0b872;background:rgba(186,117,23,.14)}
.rc .rc-tag.opt{color:#97c459;background:rgba(59,109,17,.16)}
.rc .rc-tag.avoid{color:#f09595;background:rgba(163,45,45,.18)}
.rc .rc-b{flex:1;min-width:0}
.rc .rc-t{color:#e2e8f0;font-weight:600;font-size:12.5px}
.rc .rc-why{color:#93a3af;font-size:11.5px;margin-top:2px;line-height:1.45}
.rc .rc-meta{color:#61707b;font-size:10.5px;margin-top:2px}
.rc .rc-trig{color:#7fb8ad;font-style:italic}
/* evidence pill */
.rc .rc-ev{font-size:9.5px;font-weight:700;border-radius:4px;padding:1px 6px;white-space:nowrap}
.rc .rc-ev-strong{color:#97c459;background:rgba(59,109,17,.16)}
.rc .rc-ev-mod{color:#7fe0d0;background:rgba(95,191,176,.14)}
.rc .rc-ev-weak{color:#e0b872;background:rgba(186,117,23,.14)}
.rc .rc-ev-prelim{color:#9aa8b5;background:rgba(255,255,255,.05)}
/* bucket cards (supplements / diet) */
.rc .rc-card{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.08);border-left:3px solid var(--rc-accent,#5fbfb0);border-radius:11px;padding:11px 12px;margin:8px 0}
.rc .rc-name{color:#fff;font-weight:700;font-size:13px;display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.rc .rc-kv{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;margin-top:5px;font-size:11.5px}
.rc .rc-kv .k{color:#61707b}.rc .rc-kv .v{color:#c2cdd6}
/* timeline (followup / therapy phases) */
.rc .rc-tl{position:relative;margin:6px 0 6px 6px;padding-left:16px;border-left:2px solid rgba(95,191,176,.25)}
.rc .rc-tl-node{position:relative;margin:0 0 10px}
.rc .rc-tl-node::before{content:"";position:absolute;left:-21px;top:3px;width:9px;height:9px;border-radius:50%;background:var(--rc-accent,#5fbfb0)}
.rc .rc-tl-w{color:var(--rc-accent,#5fbfb0);font-weight:700;font-size:12px}
.rc .rc-tl-a{color:#b6c2cc;font-size:12px;margin-top:1px}
/* collapsibles */
.rc details.rc-exp{margin:6px 0 0;padding-top:6px;border-top:1px dashed rgba(255,255,255,.1)}
.rc details.rc-exp>summary{cursor:pointer;color:#6b7d8a;font-size:11.5px;font-weight:700;list-style:none}
.rc details.rc-exp>summary::-webkit-details-marker{display:none}
.rc details.rc-exp>summary::before{content:"▸ ";color:var(--rc-accent,#5fbfb0)}
.rc details.rc-exp[open]>summary::before{content:"▾ "}
.rc .rc-exp-b{margin-top:6px;padding:8px 10px;background:rgba(0,0,0,.28);border-radius:8px;font-size:11.5px;color:#93a3af}
.rc .rc-foot{font-size:10.5px;color:#61707b;margin-top:12px;border-top:1px solid rgba(255,255,255,.06);padding-top:8px}
/* interaction severity cards */
.rc .rc-ix{border-radius:10px;padding:9px 11px;margin:7px 0;border:1px solid rgba(255,255,255,.08);border-left:4px solid #61707b;background:rgba(255,255,255,.02)}
.rc .rc-ix.s-contraindicated{border-left-color:#a32d2d;background:rgba(163,45,45,.09)}
.rc .rc-ix.s-major{border-left-color:#e0663d;background:rgba(224,102,61,.08)}
.rc .rc-ix.s-moderate{border-left-color:#ba7517;background:rgba(186,117,23,.07)}
.rc .rc-ix.s-minor{border-left-color:#61707b}
.rc .rc-ix-h{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:3px}
.rc .rc-ix-p{color:#fff;font-weight:700;font-size:12.5px}
.rc .rc-ix-sev{font-size:9.5px;font-weight:800;letter-spacing:.03em;border-radius:5px;padding:2px 7px;white-space:nowrap}
.rc .rc-ix-sev.s-contraindicated{color:#f09595;background:rgba(163,45,45,.22)}
.rc .rc-ix-sev.s-major{color:#f0a878;background:rgba(224,102,61,.2)}
.rc .rc-ix-sev.s-moderate{color:#e0b872;background:rgba(186,117,23,.16)}
.rc .rc-ix-sev.s-minor{color:#9aa8b5;background:rgba(255,255,255,.06)}
.rc .rc-ix-type{font-size:9.5px;color:#7a8891;border:1px solid rgba(255,255,255,.12);border-radius:4px;padding:0 5px}
.rc .rc-ix-b{font-size:11.5px;color:#c2cdd6;line-height:1.45;margin:2px 0}
.rc .rc-ix-b .k{color:#9fe3d8;font-weight:600}
.rc .rc-ix-src{font-size:10px;color:#61707b;margin-top:2px}
/* metric tiles (bodycomp) */
.rc .rc-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin:8px 0}
.rc .rc-stat{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:9px 11px}
.rc .rc-stat .k{display:block;font-size:10px;color:#61707b;text-transform:uppercase;letter-spacing:.04em}
.rc .rc-stat .v{display:block;color:#e2e8f0;font-weight:700;font-size:16px;margin-top:2px}
.rc .rc-stat .u{color:#7a8891;font-size:10.5px;font-weight:400}
.rc .rc-stat .sub{color:#93a3af;font-size:10.5px;margin-top:2px}
/* generic wrapped-markdown body (chrono / interactions / nutrigenomics) */
.rc .rc-md{color:#c2cdd6;font-size:12.5px;line-height:1.6;white-space:pre-wrap}
.rc .rc-md strong{color:#e2e8f0}
</style>`;

function shell(accent, inner) {
  return `${RC_STYLE}<div class="rc" style="--rc-accent:${accent}">${inner}</div>`;
}

/* ── 🧪 LABS — graded priority rows (Required / Recommended / Optional) ──── */
export function renderLabsHTML({ key, form, lang = 'en', pdf = false } = {}) {
  if (!ok(key)) return '';
  const t = computeDynamicLabs({ key, form });
  const rowHTML = (r, cls, tag) => {
    const when = r.when ? `${lang === 'ar' ? 'متى' : 'when'}: ${RC_E(r.when)}` : '';
    const trig = r.trigger ? `<span class="rc-trig">⟵ for this case: ${RC_E(r.trigger)}</span>` : '';
    const meta = [when, trig].filter(Boolean).join(' · ');
    return `<div class="rc-row ${cls}"><span class="rc-tag ${cls}">${tag}</span><div class="rc-b">`
      + `<div class="rc-t">${RC_E(r.test)}</div><div class="rc-why">${RC_E(r.why)}</div>`
      + (meta ? `<div class="rc-meta">${meta}</div>` : '') + rcSrc(r.src) + `</div></div>`;
  };
  const grp = (rows, cls, tag, title) =>
    rows && rows.length ? `<div class="rc-gd">${title}</div>` + rows.map((r) => rowHTML(r, cls, tag)).join('') : '';
  const inner = `<div class="rc-hd">🧪 Required Lab Tests — ${RC_E(key)}</div>`
    + `<div class="rc-sub">graded by priority · auto-escalated from comorbidities, current meds & age/BMI · sourced</div>`
    + grp(t.required, 'req', 'REQUIRED', 'Required before treatment')
    + grp(t.recommended, 'rec', 'RECOMMENDED', 'Recommended')
    + grp(t.optional, 'opt', 'OPTIONAL', 'Optional')
    + `<div class="rc-foot">Rows tagged "for this case" were auto-added / escalated from the entered comorbidities, current medications, and age/BMI.</div>`;
  return shell('#5bb8c4', inner);
}

/* ── 🚫 EXCLUDED — compact "what NOT to do" cards ───────────────────────── */
export function renderExcludedHTML({ key, lang = 'en', pdf = false } = {}) {
  if (!ok(key)) return '';
  const items = RX[key].excluded || [];
  if (!items.length) return '';
  const cards = items.map((e) =>
    `<div class="rc-row"><span class="rc-tag avoid">🚫 AVOID</span><div class="rc-b">`
    + `<div class="rc-t">${RC_E(e.item)}</div><div class="rc-why">${RC_E(e.why)}</div>${rcSrc(e.src)}</div></div>`
  ).join('');
  const inner = `<div class="rc-hd">🚫 Excluded Options — ${RC_E(key)}</div>`
    + `<div class="rc-sub">what NOT to do, and why · sourced</div>` + cards;
  return shell('#64748b', inner);
}

/* ── evidence → {label, css} pill (honest: "weak–moderate" grades DOWN) ──── */
function evPill(e) {
  const s = String(e || '').toLowerCase();
  if (!s) return '';
  const cls = /strong/.test(s) ? 'rc-ev-strong'
    : (/moderate/.test(s) && !/weak|prelim/.test(s)) ? 'rc-ev-mod'
    : /weak/.test(s) ? 'rc-ev-weak' : 'rc-ev-prelim';
  return `<span class="rc-ev ${cls}">${RC_E(e)}</span>`;
}
/* Supported bucket = strong OR clean-moderate; everything else = weak/preliminary. */
function evBucket(e) {
  const s = String(e || '').toLowerCase();
  return (/strong/.test(s) || (/moderate/.test(s) && !/weak|prelim/.test(s))) ? 'supported' : 'weak';
}

/* ── 🧴 SUPPLEMENTS — Supported / Weak / ⛔ Avoid buckets + synergy ──────── */
export function renderSupplementsHTML({ key, lang = 'en', pdf = false, extra = '', extraTitle = 'Psychobiotics & gut–brain adjuncts' } = {}) {
  if (!ok(key) || !NUTRITION_ACTIVE || !NUTRITION[key] || NUTRITION[key].__pending) return '';
  const n = NUTRITION[key];
  const cat = (arr, label) => (arr || []).map((s) => ({ ...s, __cat: label }));
  const all = [
    ...cat(n.supplements, 'vitamin / mineral / amino'),
    ...cat(n.herbs, 'herb'),
    ...cat(n.adaptogens, 'adaptogen'),
    ...cat(n.mushrooms, 'functional mushroom'),
  ];
  if (!all.length && !(n.avoidWithProtocol || []).length) return '';
  const supp = all.filter((s) => evBucket(s.evidence) === 'supported');
  const weak = all.filter((s) => evBucket(s.evidence) !== 'supported');

  const card = (s) => `<div class="rc-card"><div class="rc-name">${RC_E(s.name)} ${evPill(s.evidence)}`
    + `<span class="rc-ev rc-ev-prelim">${RC_E(s.__cat)}</span></div>`
    + `<div class="rc-kv">`
    + (s.forms ? `<span class="k">Forms</span><span class="v">${RC_E(s.forms)}</span>` : '')
    + (s.dose ? `<span class="k">Dose</span><span class="v">${RC_E(s.dose)}</span>` : '')
    + (s.timing ? `<span class="k">Timing</span><span class="v">${RC_E(s.timing)}</span>` : '')
    + `</div>`
    + (s.synergy ? `<div class="rc-why">✅ <b style="color:#97c459">Synergy:</b> ${RC_E(s.synergy)}</div>` : '')
    + (s.interaction ? `<div class="rc-why">⚠️ <b style="color:#e0b872">Interaction:</b> ${RC_E(s.interaction)}</div>` : '')
    + rcSrc(s.src) + `</div>`;

  const avoidCards = (n.avoidWithProtocol || []).map((s) =>
    `<div class="rc-row"><span class="rc-tag avoid">⛔ ${RC_E(s.severity || 'AVOID')}</span><div class="rc-b">`
    + `<div class="rc-t">${RC_E(s.item)}</div><div class="rc-why">${RC_E(s.why)}</div>${rcSrc(s.src)}</div></div>`).join('');
  const synergyNote = (n.synergyWithProtocol || []).length
    ? `<div class="rc-gd">✅ Safe synergy with the locked protocol</div>`
      + n.synergyWithProtocol.map((s) => `<div class="rc-row opt"><span class="rc-tag opt">SYNERGY</span><div class="rc-b"><div class="rc-t">${RC_E(s.item)}</div><div class="rc-why">${RC_E(s.note)}</div>${rcSrc(s.src)}</div></div>`).join('')
    : '';

  const inner = `<div class="rc-hd">🧴 Supplements — ${RC_E(key)}</div>`
    + `<div class="rc-sub">bucketed by evidence · doses & timing · drug–supplement safety · sourced</div>`
    + (supp.length ? `<div class="rc-gd">✅ Supported (strong / moderate evidence)</div>` + supp.map(card).join('') : '')
    + (weak.length ? `<div class="rc-gd">🟡 Weak / preliminary — optional, by preference</div>` + weak.map(card).join('') : '')
    + synergyNote
    + (avoidCards ? `<div class="rc-gd">⛔ Avoid with the locked protocol (safety)</div>` + avoidCards : '')
    + (extra ? `<div class="rc-gd">${RC_E(extraTitle)}</div><div class="rc-exp-b">${extra}</div>` : '')
    + `<div class="rc-foot">Grades are honest: a "weak–moderate" item is shown under Weak, not Supported. Avoid-list items are unsafe alongside the first-line drugs.</div>`;
  return shell('#5bb8c4', inner);
}

/* ── 🥗 DIET — Summary (patterns + top foods) + Advanced expand ─────────── */
export function renderDietHTML({ key, lang = 'en', pdf = false, extra = '', extraTitle = 'Meal architecture & macros' } = {}) {
  if (!ok(key) || !NUTRITION_ACTIVE || !NUTRITION[key] || NUTRITION[key].__pending) return '';
  const d = NUTRITION[key].diet;
  if (!d) return '';
  const open = pdf ? ' open' : '';
  const patterns = (d.patterns || []).map((p) =>
    `<div class="rc-row opt"><span class="rc-tag opt">PATTERN</span><div class="rc-b"><div class="rc-t">${RC_E(p.name)} ${evPill(p.evidence)}</div><div class="rc-why">${RC_E(p.note)}</div>${rcSrc(p.src)}</div></div>`).join('');
  const foodRow = (f, cls, tag) =>
    `<div class="rc-row ${cls}"><span class="rc-tag ${cls}">${tag}</span><div class="rc-b"><div class="rc-t">${RC_E(f.item)}</div><div class="rc-why">${RC_E(f.why)}${f.interaction ? ` ⚠️ (${RC_E(f.interaction)})` : ''}</div>${rcSrc(f.src)}</div></div>`;
  const goodTop = (d.beneficialFoods || []).slice(0, 4).map((f) => foodRow(f, 'opt', '✅ EAT')).join('');
  const avoidTop = (d.avoidFoods || []).slice(0, 4).map((f) => foodRow(f, 'req', '🚫 LIMIT')).join('');

  const advBlock = (title, rows, cls, tag, fmt) => rows && rows.length
    ? `<div class="rc-gd2" style="color:#9fe3d8;font-size:11px;text-transform:uppercase;margin:8px 0 4px">${title}</div>` + rows.map(fmt).join('')
    : '';
  const advanced = `<details class="rc-exp"${open}><summary>Advanced — full food, drink & oil lists</summary><div class="rc-exp-b" style="background:transparent;padding:0">`
    + advBlock('All beneficial foods', d.beneficialFoods, 'opt', '✅', (f) => foodRow(f, 'opt', '✅ EAT'))
    + advBlock('All foods to limit / avoid', d.avoidFoods, 'req', '🚫', (f) => foodRow(f, 'req', '🚫 LIMIT'))
    + advBlock('Drinks', d.drinks, 'rec', '🥤', (f) => `<div class="rc-row rec"><span class="rc-tag rec">🥤 DRINK</span><div class="rc-b"><div class="rc-t">${RC_E(f.item)} ${evPill(f.evidence)}</div><div class="rc-why">${RC_E(f.why)}</div>${rcSrc(f.src)}</div></div>`)
    + advBlock('Oils', d.oils, 'rec', '🫒', (f) => `<div class="rc-row rec"><span class="rc-tag rec">🫒 OIL</span><div class="rc-b"><div class="rc-t">${RC_E(f.item)} ${evPill(f.evidence)}</div><div class="rc-why">${RC_E(f.why)}</div>${rcSrc(f.src)}</div></div>`)
    + `</div></details>`;

  const inner = `<div class="rc-hd">🥗 Dietary Plan — ${RC_E(key)}</div>`
    + `<div class="rc-sub">decision summary up top · full lists on expand · sourced</div>`
    + (patterns ? `<div class="rc-gd">Evidence-based patterns</div>${patterns}` : '')
    + (goodTop ? `<div class="rc-gd">Top beneficial foods</div>${goodTop}` : '')
    + (avoidTop ? `<div class="rc-gd">Top foods to limit / avoid</div>${avoidTop}` : '')
    + advanced
    + (extra ? `<div class="rc-gd">${RC_E(extraTitle)}</div><div class="rc-exp-b">${extra}</div>` : '');
  return shell('#4a9b8e', inner);
}

/* ── 🧠 THERAPY — staged plan as a timeline + measures + non-response ────── */
export function renderTherapyHTML({ key, lang = 'en', pdf = false, extra = '', extraTitle = 'Technique library & vagal toning' } = {}) {
  if (!RX_ACTIVE || !PSYCHOTHERAPY_ACTIVE) return '';
  const plan = PSYCHOTHERAPY_PLAN[key];
  if (!plan) return '';
  const open = pdf ? ' open' : '';

  const measures = (plan.coreMeasures || []).map((m) =>
    `<div class="rc-row"><span class="rc-tag rec">📏 ${RC_E(m.tool)}</span><div class="rc-b">`
    + `<div class="rc-t">${RC_E(m.kind)} · <span style="color:#7fb8ad">${RC_E(m.cadence)}</span></div>`
    + `<div class="rc-why">${RC_E(m.interpret)}</div>${rcSrc(m.src)}</div></div>`).join('');

  const phases = (plan.phases || []).map((p) => {
    const techs = (p.techniques || []).map((t) =>
      `<div class="rc-why" style="margin:3px 0"><span class="rc-ev rc-ev-mod">${RC_E(t.school)}</span> <b style="color:#cbd5e1">${RC_E(t.name)}</b> — ${RC_E(t.how)}${t.src ? `<div class="rc-src">src: ${RC_E(jsrc(t.src))}</div>` : ''}</div>`).join('');
    return `<div class="rc-tl-node"><div class="rc-tl-w">Phase ${RC_E(p.phase)} — ${RC_E(p.name)} <span style="color:#61707b;font-weight:400">(${RC_E(p.duration)})</span></div>`
      + `<div class="rc-tl-a"><b style="color:#9fe3d8">Goals:</b> ${RC_E(p.goals)}</div>`
      + techs
      + `<div class="rc-tl-a" style="color:#97c459">✅ Phase target: ${RC_E(p.phaseTarget)}</div></div>`;
  }).join('');

  const nr = plan.nonResponse;
  const nrBlock = nr ? `<div class="rc-gd">🔁 If no progress</div>`
    + `<div class="rc-note">${RC_E(nr.reviewAt)}</div>`
    + `<details class="rc-exp"${open}><summary>Review checklist &amp; alternatives</summary><div class="rc-exp-b">`
    + `<b>Review:</b><br>${(nr.checklist || []).map((c) => `• ${RC_E(c)}`).join('<br>')}`
    + `<br><br><b>Alternatives:</b><br>${(nr.alternatives || []).map((a) => `• if ${RC_E(a.ifX)} → ${RC_E(a.switchTo)}`).join('<br>')}`
    + `</div></details>` : '';

  const cross = (plan.crossSchool || []).length
    ? `<div class="rc-gd">🔗 Cross-school techniques</div><div class="rc-note">${plan.crossSchool.map(RC_E).join(' · ')}</div>` : '';

  const inner = `<div class="rc-hd">🧠 Therapeutic Approaches — ${RC_E(key)}</div>`
    + `<div class="rc-sub">staged integrative plan · psychotherapy is first-line · sourced</div>`
    + `<div class="rc-note"><b style="color:#8b5cf6">Model:</b> ${RC_E(plan.model)}</div>`
    + (measures ? `<div class="rc-gd">📏 Outcome measures</div>${measures}` : '')
    + (phases ? `<div class="rc-gd">🪜 Phases</div><div class="rc-tl">${phases}</div>` : '')
    + nrBlock + cross
    + (extra ? `<div class="rc-gd">${RC_E(extraTitle)}</div><div class="rc-exp-b">${extra}</div>` : '');
  return shell('#8b5cf6', inner);
}

/* ── 📋 FOLLOW-UP & SAFETY — treatment phases / monitoring / taper timeline ─ */
export function renderFollowupHTML({ key, lang = 'en', pdf = false } = {}) {
  if (!ok(key)) return '';
  const d = RX[key];
  const nodes = [
    ['🗓️ Treatment phases & duration', d.treatmentPhases],
    ['📈 Monitoring timeline — what to expect & when', d.monitoringTimeline],
    ['↩️ Withdrawal vs relapse (informed-consent basis)', d.withdrawalVsRelapse],
    ['📉 Hyperbolic tapering', d.hyperbolicTaper],
  ].filter(([, n]) => n && n.text);
  if (!nodes.length) return '';
  const tl = nodes.map(([title, n]) =>
    `<div class="rc-tl-node"><div class="rc-tl-w">${RC_E(title)}</div><div class="rc-tl-a">${RC_E(n.text)}</div>${rcSrc(n.src)}</div>`).join('');
  const inner = `<div class="rc-hd">📋 Follow-up &amp; Safety — ${RC_E(key)}</div>`
    + `<div class="rc-sub">phases · monitoring · taper — as a timeline · sourced</div>`
    + `<div class="rc-tl">${tl}</div>`;
  return shell('#10b981', inner);
}

/* ── 📊 BODYCOMP — deterministic metric tiles from computeMetrics ────────── */
export function renderBodycompHTML({ form, lang = 'en', pdf = false } = {}) {
  const m = computeMetrics(form);
  if (!m) return ''; // needs weight + height; fall back to model text
  const tile = (k, v, u, sub) => `<div class="rc-stat"><span class="k">${RC_E(k)}</span>`
    + `<span class="v">${RC_E(v)}${u ? ` <span class="u">${RC_E(u)}</span>` : ''}</span>${sub ? `<span class="sub">${RC_E(sub)}</span>` : ''}</div>`;
  const tiles = [
    tile('BMI', m.bmi, 'kg/m²'),
    tile('BMR', m.bmr, 'kcal/d', 'Mifflin–St Jeor'),
    tile('TDEE', `${m.tdee.sedentary}–${m.tdee.light}`, 'kcal/d', 'sedentary → light'),
    tile('Caloric target', `${m.calLow}–${m.calHigh}`, 'kcal/d', `${m.calDirection} · floored at BMR`),
    tile('Protein', `${m.proteinLow}–${m.proteinHigh}`, 'g/d', m.proteinBasis),
    m.fatPct != null ? tile('Body fat', m.fatPct, '%') : '',
    m.fatMass != null ? tile('Fat mass', m.fatMass, 'kg') : '',
    m.ffm != null ? tile('Fat-free mass', m.ffm, 'kg', m.ffmi != null ? `FFMI ${m.ffmi}` : '') : '',
    m.smm != null ? tile('Skeletal muscle', m.smm, 'kg', m.fmr != null ? `FMR ${m.fmr}` : '') : '',
  ].filter(Boolean).join('');
  const rationale = m.calRationale
    ? `<div class="rc-gd">Caloric direction — ${RC_E(String(m.calDirection).toUpperCase())}</div><div class="rc-note">${RC_E(m.calRationale)}</div>` : '';
  const safety = m.calNote ? `<div class="rc-row req"><span class="rc-tag req">⚠ SAFETY</span><div class="rc-b"><div class="rc-why">${RC_E(m.calNote)}</div></div></div>` : '';
  const inner = `<div class="rc-hd">📊 Body Composition &amp; Metabolic Targets</div>`
    + `<div class="rc-sub">deterministic — computed from age/sex/weight/height + DEXA/InBody · weight is not a treatment goal</div>`
    + `<div class="rc-stats">${tiles}</div>` + rationale + safety
    + `<div class="rc-foot">Numbers are computed, not model-generated — identical every run. Enter DEXA/InBody for body-composition tiles (fat mass, FFMI, muscle).</div>`;
  return shell('#8b5cf6', inner);
}

/* ── ⚠️ INTERACTIONS — severity-triaged cards (most dangerous first) ─────── */
export function renderInteractionsHTML({
  primaryFirstLine = [], primaryAdjunct = [],
  comorbidFirstLine = [], comorbidAdjunct = [],
  currentMeds = '', supplements = '', comorbidLabels = [], lang = 'en', pdf = false,
} = {}) {
  if (!INTERACTIONS_ACTIVE) return '';
  const split = interactionSplitStructured({ primaryFirstLine, primaryAdjunct, comorbidFirstLine, comorbidAdjunct, currentMeds, supplements, comorbidLabels });
  const sevCls = (s) => 's-' + String(s || 'minor').toLowerCase();
  const card = (it) => `<div class="rc-ix ${sevCls(it.severity)}">`
    + `<div class="rc-ix-h"><span class="rc-ix-sev ${sevCls(it.severity)}">${RC_E(it.severity)}</span>`
    + `<span class="rc-ix-p">${RC_E(it.labels)}</span><span class="rc-ix-type">${RC_E(it.type)}</span>`
    + (it.verified ? '' : `<span class="rc-ix-type" style="color:#e0b872">unverified</span>`) + `</div>`
    + `<div class="rc-ix-b"><span class="k">Mechanism:</span> ${RC_E(it.mechanism)}</div>`
    + `<div class="rc-ix-b"><span class="k">Management:</span> ${RC_E(it.management)}</div>`
    + `<div class="rc-ix-src">source (${RC_E(it.tier)}): ${RC_E(it.source)}</div></div>`;

  const noneMsg = `<div class="rc-note">No interactions in the PsychDecide table (${RC_E(INTERACTIONS_VERSION)}) within the current prescription. Absence here does not rule out interactions outside the table — consult a specialist reference when in doubt.</div>`;
  const cmLabel = split.crossLabels.join(' / ');
  const inner = `<div class="rc-hd">⚠️ Interactions — screened</div>`
    + `<div class="rc-sub">deterministic · Micromedex severity · most dangerous first · ${RC_E(INTERACTIONS_VERSION)}</div>`
    + `<div class="rc-gd">Prescription interactions — current meds + this plan + supplements</div>`
    + (split.active.length ? split.active.map(card).join('') : noneMsg)
    + (split.cross.length
        ? `<div class="rc-gd">Cross-protocol cautions${cmLabel ? ` — only if a drug is ADDED for ${RC_E(cmLabel)}` : ''}</div>`
          + `<div class="rc-note">Not active in the current prescription — shown so an added comorbidity drug is screened against the current regimen.</div>`
          + split.cross.map(card).join('')
        : '');
  return shell('#ef4444', inner);
}

/* ── 🕐 CHRONO — action-first cards; mechanisms/evidence collapse ─────────
   The chronoEngine output is deterministic markdown with regular section
   markers (**TWO-CLOCK…**, **① CENTRAL…**, **② …**). We re-lay-it-out into
   cards WITHOUT re-deriving the (form-dependent) clinical logic, so the exact
   validated content is preserved; long mechanism/evidence prose folds away. ── */
const rcInline = (s) => RC_E(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/_([^_]+)_/g, '<span style="color:#7a8891">$1</span>');
export function renderChronoHTML({ key, form = {}, lang = 'en', pdf = false } = {}) {
  const md = renderChrono({ key, form, lang });
  if (!md || !md.trim()) return '';
  const open = pdf ? ' open' : '';
  const lines = md.split('\n');
  // Split into blocks on bold-only header lines (**…**).
  const blocks = [];
  let cur = null;
  const isHeader = (l) => /^\*\*.+\*\*$/.test(l.trim());
  lines.forEach((raw) => {
    const l = raw.replace(/\r$/, '');
    if (isHeader(l)) { cur = { title: l.trim().replace(/^\*\*|\*\*$/g, ''), body: [] }; blocks.push(cur); }
    else if (l.trim()) { if (!cur) { cur = { title: '', body: [] }; blocks.push(cur); } cur.body.push(l); }
  });
  const renderBody = (body) => {
    const bullets = [], notes = [];
    body.forEach((l) => {
      const t = l.trim();
      if (/^-\s+/.test(t)) {
        const txt = t.replace(/^-\s+/, '');
        const warn = /^⚠️|^🔴/.test(txt);
        bullets.push(`<div class="rc-why" style="margin:3px 0${warn ? ';color:#e0b872' : ''}">• ${rcInline(txt)}</div>`);
      } else if (/^_.*_$/.test(t)) {                       // pure evidence/mechanism note → collapse
        notes.push(rcInline(t));
      } else {
        notes.push(rcInline(t));                            // intro prose → collapse
      }
    });
    const noteBlock = notes.length
      ? `<details class="rc-exp"${open}><summary>Why / evidence</summary><div class="rc-exp-b">${notes.join('<br>')}</div></details>` : '';
    return bullets.join('') + noteBlock;
  };
  const cards = blocks.filter((b) => b.title).map((b) =>
    `<div class="rc-card"><div class="rc-name" style="color:#f59e0b">${rcInline(b.title)}</div>${renderBody(b.body)}</div>`).join('');
  // any leading, title-less prose (the two-clock intro) → a collapsible up top
  const intro = blocks.filter((b) => !b.title).flatMap((b) => b.body);
  const introBlock = intro.length
    ? `<details class="rc-exp"${open}><summary>The two-clock principle</summary><div class="rc-exp-b">${intro.map(rcInline).join('<br>')}</div></details>` : '';
  const inner = `<div class="rc-hd">🕐 Circadian &amp; Chronotherapy — ${RC_E(key)}</div>`
    + `<div class="rc-sub">action-first · central (light/sleep) + peripheral (meals) + drug timing · mechanisms on expand · sourced</div>`
    + introBlock + cards;
  return shell('#f59e0b', inner);
}

/* ── Shared wrapper: present pre-formatted markdown-HTML inside the .rc shell
   so text/model tabs (chrono / interactions / nutrigenomics) match the system.
   `bodyHTML` must already be escaped/formatted (e.g. via formatReportHTML). ── */
export function wrapReportHTML({ title, accent = '#5fbfb0', sub = '', bodyHTML = '' } = {}) {
  if (!bodyHTML || !String(bodyHTML).trim()) return '';
  const inner = `<div class="rc-hd">${RC_E(title)}</div>`
    + (sub ? `<div class="rc-sub">${RC_E(sub)}</div>` : '')
    + `<div class="rc-md">${bodyHTML}</div>`;
  return shell(accent, inner);
}
