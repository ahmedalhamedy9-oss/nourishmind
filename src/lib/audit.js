/* ============================================================================
 * PsychDecide — Generation Audit Log  (Roadmap item #4)
 * ----------------------------------------------------------------------------
 * Logs every clinical-report generation to Firestore (collection `auditLogs`)
 * so every report is reproducible and traceable, and the admin can inspect
 * past generations.
 *
 * PRIVACY / SAFETY:
 *  - GATED: AUDIT_ENABLED stays false until the Firestore security rules for
 *    `auditLogs` are deployed and tested. Nothing is written while false.
 *  - Patient name is masked before storage: first name kept in full; every
 *    subsequent name → first two characters + a short hash of the remainder.
 *  - Logging is best-effort and wrapped in try/catch: a logging failure must
 *    NEVER break or delay report generation.
 *  - Access is enforced by Firestore rules (each physician reads only their own
 *    logs; the admin reads all). This module does not enforce access itself.
 * ========================================================================== */

import { db } from '@/lib/firebase';
import {
  collection, addDoc, query, where, orderBy, limit, getDocs, serverTimestamp,
} from 'firebase/firestore';

// Keep false until auditLogs security rules are deployed + tested, then flip.
export const AUDIT_ENABLED = false;

// Small, fast, non-cryptographic hash → 4 hex chars. Enough to disambiguate
// names in the log without storing them in clear; not meant to be reversible-proof.
function shortHash(s = '') {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return ('00000000' + h.toString(16)).slice(-4);
}

/* First name kept full; subsequent names → first 2 chars + "·" + hash(rest).
 * e.g. "Ahmed Mohamed Ali" → "Ahmed Mo·1f3a Al·9c20" */
export function maskPatientName(full = '') {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  return parts.map((p, i) => {
    if (i === 0) return p;
    const head = p.slice(0, 2);
    const rest = p.slice(2);
    return rest ? `${head}·${shortHash(rest)}` : head;
  }).join(' ');
}

/* Write one generation record. Returns the doc id, or null on failure / when gated. */
export async function logGeneration(entry = {}) {
  if (!AUDIT_ENABLED) return null;
  try {
    const inputs = { ...(entry.inputs || {}) };
    if (inputs.patientName != null) inputs.patientName = maskPatientName(inputs.patientName);
    const record = {
      ...entry,
      inputs,
      patientName: maskPatientName(entry.patientName || (entry.inputs && entry.inputs.patientName) || ''),
      createdAt: serverTimestamp(),
    };
    const ref = await addDoc(collection(db, 'auditLogs'), record);
    return ref.id;
  } catch (e) {
    console.warn('audit log write failed (non-blocking):', e);
    return null;
  }
}

/* Inspect past generations. Pass uid to scope to one physician; omit for the
 * admin-wide view. Firestore rules still enforce who may read what. */
export async function fetchAuditLogs({ uid = null, max = 50 } = {}) {
  const base = collection(db, 'auditLogs');
  const q = uid
    ? query(base, where('userId', '==', uid), orderBy('createdAt', 'desc'), limit(max))
    : query(base, orderBy('createdAt', 'desc'), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
