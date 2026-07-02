/* ============================================================================
 * medicationSafety.js — PATIENT-AWARE overlay for the medication section
 * ----------------------------------------------------------------------------
 * The locked formulary lists first-line/adjunct drugs per DISORDER only. On its
 * own it is blind to the individual patient: it will re-list a drug the patient
 * already takes, keep recommending an SSRI for someone on an MAOI, and ignore
 * the medical comorbidity that argues against a given agent.
 *
 * This module computes a per-drug advisory from the patient form WITHOUT
 * mutating the formulary — every option is still shown, but each risky one now
 * carries an explicit, sourced warning (duplicate therapy, allergy, a
 * CONTRAINDICATED/MAJOR interaction with a current med, MAOI serotonergic
 * contraindication, or a comorbidity "avoid" rule). Additive by design: we flag,
 * we never silently drop a drug.
 * ========================================================================== */
import { computeInteractions, resolveAgents, AGENTS } from './interactions';
import { computeSafetyFlags } from './clinicalFormulary';
import { getMedicalComorbidityUnits } from './medicalComorbidityEngine';
import { RX, RX_ACTIVE } from './rxFormulary';

/* Does a comorbidity "avoid" rule's agent string refer to this drug? Matches on
 * a distinctive name token (venlafaxine…) or a drug-class keyword (SNRI…). */
function agentRefersToDrug(m, agentStr) {
  const a = String(agentStr || '').toLowerCase();
  const name = String(m.drug || '').toLowerCase();
  const cls = String(m.class || '').toLowerCase();
  const nameToks = name.split(/[^a-z]+/).filter((w) => w.length > 4);
  if (nameToks.some((t) => a.includes(t))) return true;
  for (const c of ['ssri', 'snri', 'tca', 'maoi', 'antipsychotic', 'benzodiazepine',
    'gabapentinoid', 'mood stabil', 'lithium', 'stimulant']) {
    if (a.includes(c) && cls.includes(c)) return true;
  }
  return false;
}

/* Map<lowercased drug name, { level:'danger'|'warn', notes:[str] }>. */
export function medicationAdvisories({ key, form = {}, lang = 'en' } = {}) {
  const isAr = lang === 'ar';
  const out = new Map();
  if (!(RX_ACTIVE && RX[key] && !RX[key].__pending)) return out;

  const recs = [...(RX[key].firstLine || []), ...(RX[key].adjunct || [])].filter((m) => m && m.drug);
  const currentMeds = String(form.currentMeds || '');
  // Screen the recommendation against BOTH current meds and current supplements
  // (e.g. a recommended SSRI vs the patient's St John's Wort / 5-HTP / SAMe).
  const patientRegimen = `${currentMeds} | ${String(form.supplements || '')}`;
  const currentAgents = resolveAgents(patientRegimen);
  const flags = computeSafetyFlags(form, key) || [];
  const medUnits = getMedicalComorbidityUnits({ comorbidities: form.comorbidities, history: form.history }) || [];
  const maoiContra = flags.some((f) => f.level === 'CONTRAINDICATION' && /ssri\/snri/i.test(String(f.drug)));

  const add = (drug, level, note) => {
    const k = String(drug).toLowerCase();
    if (!out.has(k)) out.set(k, { level: 'warn', notes: [] });
    const e = out.get(k);
    if (level === 'danger') e.level = 'danger';
    if (!e.notes.includes(note)) e.notes.push(note);
  };

  for (const m of recs) {
    const drug = m.drug;
    const dl = drug.toLowerCase();
    const drugAgents = resolveAgents(drug);

    // 1) Allergy (safety-gate ALLERGY flag naming this drug)
    if (flags.some((f) => f.level === 'ALLERGY' && dl.includes(String(f.drug).toLowerCase())))
      add(drug, 'danger', isAr
        ? '⚠️ حساسية مسجّلة تجاه هذا الدواء — لا تصفه، اختر بديلاً من نفس الجدول.'
        : '⚠️ Documented allergy to this drug — do not prescribe; pick a formulary alternative.');

    // 2) Duplicate therapy — patient already on this exact agent
    const duplicate = [...drugAgents].some((id) => currentAgents.has(id))
      || (dl.length > 4 && currentMeds.toLowerCase().includes(dl));
    if (duplicate)
      add(drug, 'warn', isAr
        ? 'المريض يتناول هذا الدواء بالفعل — راجِع الجرعة وحسّنها، لا تبدأه من جديد ولا تُضِف جرعة فوق جرعة.'
        : 'Patient already takes this — review/optimise the existing dose; do not restart it as new.');

    // 3) CONTRAINDICATED / MAJOR interaction with a current med or supplement
    computeInteractions({ firstLineNames: [drug], currentMeds: patientRegimen })
      .filter((ix) => (ix.severity === 'CONTRAINDICATED' || ix.severity === 'MAJOR')
        && ix.agents.some((a) => drugAgents.has(a.id))
        && ix.agents.some((a) => currentAgents.has(a.id)))
      .forEach((ix) => {
        const other = ix.agents.filter((a) => !drugAgents.has(a.id)).map((a) => a.label).join(', ');
        add(drug, 'danger', `[${ix.severity}] ${isAr ? 'مع ما يتناوله المريض حالياً' : 'with current med/supplement'} ${other} — ${ix.mechanism}`);
      });

    // 4) MAOI serotonergic contraindication (applies to every serotonergic rec)
    if (maoiContra && [...drugAgents].some((id) => AGENTS[id]?.tags.includes('serotonergic')))
      add(drug, 'danger', isAr
        ? '⛔ المريض على مثبط MAO — هذا الدواء سيروتونيني: خطر متلازمة سيروتونين قاتلة؛ يلزم فترة غسل، لا تصفه معاً.'
        : '⛔ Patient on an MAOI — this is a serotonergic agent: risk of fatal serotonin syndrome; washout required, do not co-prescribe.');

    // 5) Medical-comorbidity "avoid" rules
    for (const u of medUnits) {
      (u.drugAdjust || []).filter((da) => /avoid/i.test(da.action || '')).forEach((da) => {
        if (agentRefersToDrug(m, da.agent)) {
          const lbl = isAr ? (u.label?.ar || '') : (u.label?.en || '');
          add(drug, 'warn', `${isAr ? 'بسبب' : 'due to'} ${lbl}: ${da.rule}`);
        }
      });
    }
  }
  return out;
}
