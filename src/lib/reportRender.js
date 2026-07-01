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
import { RX, RX_ACTIVE } from './rxFormulary';
import { computeDynamicLabs } from './labEngine';
import { NUTRITION, NUTRITION_ACTIVE } from './nutritionFormulary';

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
