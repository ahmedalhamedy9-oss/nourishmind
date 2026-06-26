import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Header from '@/components/Header';

/* ════════════════════════════════════════════════
   ACCESS GUARD
════════════════════════════════════════════════ */
const TOOL_ID = 'clinical'; // ID of this tool in Firestore 'tools' collection path

const useClinicalAccess = () => {
  const { currentUser, isAdmin } = useAuth();
  const [status, setStatus] = useState('loading');
  useEffect(() => {
    if (!currentUser) { setStatus('no_account'); return; }
    if (isAdmin)      { setStatus('granted');    return; }
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', currentUser.uid));
        if (!snap.exists()) { if (!cancelled) setStatus('no_access'); return; }
        const userData = snap.data();
        // Check if user has this tool in their clinicalTools array
        const userTools = userData.clinicalTools || [];
        // Get tool IDs from Firestore tools collection and match by path
        const toolsSnap = await getDocs(collection(db, 'tools'));
        const clinicalToolIds = toolsSnap.docs
          .filter(d => d.data().path === '/tools/clinical')
          .map(d => d.id);
        if (userTools.some(tid => clinicalToolIds.includes(tid))) {
          if (!cancelled) setStatus('granted'); return;
        }
        if (!cancelled) setStatus('no_access');
      } catch { if (!cancelled) setStatus('no_access'); }
    })();
    return () => { cancelled = true; };
  }, [currentUser, isAdmin]);
  return status;
};

/* ════════════════════════════════════════════════
   CLAUDE API
════════════════════════════════════════════════ */
const SYSTEM_PROMPT = `أنت مساعد سريري متخصص حصراً في خمسة اضطرابات نفسية: الاكتئاب الاكلينيكي (MDD)، اضطراب القلق العام (GAD)، الوسواس القهري (OCD)، اضطراب الشخصية الحدية (BPD)، والاضطراب المزعج ما قبل الطمث (PMDD).
أنت تساعد الأطباء وأخصائيي الصحة النفسية وأخصائيي التغذية فقط.
قواعد صارمة:
- لا تجيب على أي سؤال خارج نطاق هذه الاضطرابات الخمسة
- كل توصياتك مبنية على أحدث الإرشادات: APA، NICE، CANMAT، BAP
- دائماً أضف تنبيهاً بأن القرار النهائي للطبيب المعالج
- استخدم الأسماء العلمية للأدوية مع الاسم التجاري بين قوسين
- اذكر مستوى الدليل العلمي (Level A/B/C) عند التوصية
- الردود باللغة العربية مع الاصطلاحات الطبية الدقيقة
- لا تقدم تشخيصاً نهائياً`;

const ALL_TAGS = "MEDICATIONS|LABS|BODYCOMP|DIET|CHRONO|NUTRIGENOMICS|SUPPLEMENTS|INTERACTIONS|THERAPY|EXCLUDED";

async function callClaude(prompt) {
  const apiKey = import.meta.env.VITE_CLAUDE_API_KEY;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      thinking: { type: 'disabled' },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!r.ok) { const e = await r.json(); throw new Error(e.error?.message || 'خطأ في الاتصال'); }
  const d = await r.json();
  return d.content[0].text;
}

/* ════════════════════════════════════════════════
   CONSTANTS
════════════════════════════════════════════════ */
const DISORDERS = [
  'الاكتئاب الاكلينيكي (MDD)',
  'اضطراب القلق العام (GAD)',
  'الوسواس القهري (OCD)',
  'اضطراب الشخصية الحدية (BPD)',
  'الاضطراب المزعج ما قبل الطمث (PMDD)',
];

const SECTIONS = [
  { id:'medications',    icon:'💊', title:'التوصيات الدوائية',     color:'#4a9b8e' },
  { id:'labs',           icon:'🧪', title:'التحاليل المطلوبة',     color:'#5bb8c4' },
  { id:'bodycomp',       icon:'📊', title:'DEXA / InBody',         color:'#8b5cf6' },
  { id:'diet',           icon:'🥗', title:'النظام الغذائي',        color:'#4a9b8e' },
  { id:'chrono',         icon:'🕐', title:'Chrononutrition',       color:'#f59e0b' },
  { id:'nutrigenomics',  icon:'🧬', title:'التغذية الجينية',       color:'#ec4899' },
  { id:'supplements',    icon:'🧴', title:'المكملات الغذائية',     color:'#5bb8c4' },
  { id:'interactions',   icon:'⚠️', title:'التعارضات',             color:'#ef4444' },
  { id:'therapy',        icon:'🧠', title:'المدارس العلاجية',      color:'#8b5cf6' },
  { id:'excluded',       icon:'🚫', title:'المستبعدات',            color:'#64748b' },
];

const EMPTY_FORM = {
  patientName:'', age:'', gender:'', weight:'', height:'',
  disorder:'', severity:'', comorbidities:'',
  currentMeds:'', allergies:'', history:'', stopMed:'',
  hasDexa:false, dexaFat:'', dexaMuscle:'', dexaBone:'',
  hasInbody:false, inbodyFat:'', inbodyMuscle:'', inbodyWater:'',
  knownGeneticVariants:'',
};

/* ════════════════════════════════════════════════
   VALIDATION
════════════════════════════════════════════════ */
function validateClinical(form) {
  if (form.disorder.includes('PMDD') && form.gender === 'ذكر')
    return '⚠️ PMDD يحدث فقط في الإناث. يرجى مراجعة الاضطراب أو الجنس المدخل.';
  return null;
}

/* ════════════════════════════════════════════════
   PDF GENERATOR
════════════════════════════════════════════════ */
function generatePDF(form, results, type) {
  const isDoc = type === 'doctor';
  const date = new Date().toLocaleDateString('ar-EG');
  const sec = (icon, title, content, color) => `
    <div class="sec">
      <div class="sec-title" style="border-right-color:${color};background:${color}18">${icon} ${title}</div>
      <div class="sec-body">${content || '—'}</div>
    </div>`;

  const docContent = SECTIONS.map(s => sec(s.icon, s.title, results[s.id], s.color)).join('');
  const patContent = `
    <div class="note">عزيزي المريض، هذه خطتك العلاجية بإشراف طبيبك. لا تعدل أي دواء بدون استشارته.</div>
    ${sec('💊','أدويتك وكيفية أخذها',results.medications,'#4a9b8e')}
    ${sec('🧪','التحاليل المطلوبة',results.labs,'#5bb8c4')}
    ${sec('🥗','نظامك الغذائي',results.diet,'#4a9b8e')}
    ${sec('🕐','أفضل أوقات الأكل',results.chrono,'#f59e0b')}
    ${sec('🧴','المكملات الموصى بها',results.supplements,'#5bb8c4')}
    ${sec('⚠️','تنبيهات مهمة',results.interactions,'#ef4444')}`;

  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Cairo',sans-serif;background:#fff;color:#1a1a2e;padding:36px;direction:rtl;font-size:13px}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:18px;border-bottom:3px solid ${isDoc?'#4a9b8e':'#5bb8c4'}}
.logo{font-size:20px;font-weight:900;color:${isDoc?'#4a9b8e':'#5bb8c4'}}
.logo span{font-size:11px;font-weight:400;color:#666;display:block;margin-top:2px}
.bdg{background:${isDoc?'#f0fdf4':'#eff6ff'};border:1px solid ${isDoc?'#86efac':'#bfdbfe'};color:${isDoc?'#166534':'#1d4ed8'};padding:5px 12px;border-radius:20px;font-size:12px;font-weight:600}
.info{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px;margin-bottom:20px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
.il{font-size:11px;color:#64748b;margin-bottom:2px}.iv{font-weight:700;color:#1e293b;font-size:12px}
.sec{margin-bottom:18px;page-break-inside:avoid}
.sec-title{font-size:13px;font-weight:700;margin-bottom:8px;padding:7px 12px;border-radius:7px;border-right:4px solid}
.sec-body{font-size:12px;line-height:2;color:#374151;padding:0 12px;white-space:pre-wrap}
.note{background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px 16px;margin-bottom:18px;font-size:12px;line-height:1.8;color:#166534}
.disc{background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 14px;margin-top:18px;font-size:11px;color:#9a3412;line-height:1.7}
.ftr{margin-top:24px;padding-top:14px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:11px;color:#94a3b8}
@media print{body{padding:18px}}
</style></head><body>
<div class="hdr">
  <div class="logo">🧠 NourishMind Clinical<span>${isDoc?'تقرير سريري شامل — للطبيب فقط':'خطة العلاج — نسخة المريض'}</span></div>
  <div class="bdg">${isDoc?'🔒 سري طبي':'👤 نسخة المريض'}</div>
</div>
<div class="info">
  ${form.patientName?`<div><div class="il">اسم المريض</div><div class="iv">${form.patientName}</div></div>`:''}
  <div><div class="il">الاضطراب</div><div class="iv">${form.disorder}</div></div>
  <div><div class="il">العمر / الجنس</div><div class="iv">${form.age} سنة / ${form.gender}</div></div>
  <div><div class="il">الوزن / الطول</div><div class="iv">${form.weight||'—'} كجم / ${form.height||'—'} سم</div></div>
  <div><div class="il">الشدة</div><div class="iv">${form.severity||'غير محددة'}</div></div>
  <div><div class="il">تاريخ التقرير</div><div class="iv">${date}</div></div>
</div>
${isDoc?docContent:patContent}
<div class="disc">⚠️ ${isDoc?'هذا التقرير أداة دعم للقرار السريري فقط. القرار النهائي للطبيب المعالج. التوصيات مبنية على APA، NICE، CANMAT، BAP.':'هذه الخطة وضعها طبيبك المعالج. لا تعدل أي دواء بدون استشارته.'}</div>
<div class="ftr"><span>NourishMind Clinical Tool</span><span>تم الإنشاء: ${date}</span></div>
<script>window.onload=()=>window.print();</script>
</body></html>`;
  const w = window.open('','_blank');
  if (w) { w.document.write(html); w.document.close(); }
}

/* ════════════════════════════════════════════════
   SHARED UI COMPONENTS (matches site design)
════════════════════════════════════════════════ */
const Card = ({ children, className = '' }) => (
  <div className={`bg-[#0d1a17] border border-white/8 rounded-2xl p-5 ${className}`}>{children}</div>
);

const SectionLabel = ({ children }) => (
  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">{children}</p>
);

const FormInput = ({ label, children }) => (
  <div className="mb-3">
    <label className="block text-xs font-semibold text-gray-400 mb-1.5">{label}</label>
    {children}
  </div>
);

const inputCls = "w-full bg-[#0a1510] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-teal-500/50 transition-colors";

/* ════════════════════════════════════════════════
   GATE SCREENS
════════════════════════════════════════════════ */
const GateScreen = ({ icon, title, subtitle, children }) => (
  <div className="min-h-screen flex flex-col items-center justify-center px-4"
    style={{ background: 'linear-gradient(135deg,#070f0d 0%,#0d1a17 60%,#071210 100%)' }}>
    <div className="text-6xl mb-6">{icon}</div>
    <h1 className="text-white font-bold text-2xl mb-2 text-center">{title}</h1>
    <p className="text-gray-400 text-sm text-center mb-8 max-w-sm">{subtitle}</p>
    {children}
  </div>
);

/* ════════════════════════════════════════════════
   MAIN TOOL
════════════════════════════════════════════════ */
const ClinicalTool = () => {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(null);
  const chatEndRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const buildContext = () => `
بيانات المريض:
- الاسم: ${form.patientName || 'غير مذكور'}
- العمر: ${form.age} سنة | الجنس: ${form.gender} | الوزن: ${form.weight||'غير محدد'} كجم | الطول: ${form.height||'غير محدد'} سم
- الاضطراب: ${form.disorder} | الشدة: ${form.severity||'غير محددة'}
- الأمراض المصاحبة: ${form.comorbidities||'لا يوجد'}
- الأدوية الحالية: ${form.currentMeds||'لا يوجد'}
- الحساسية والموانع: ${form.allergies||'لا يوجد'}
- التاريخ النفسي: ${form.history||'لا يوجد'}
- طلب وقف دواء: ${form.stopMed||'لا يوجد'}
${form.hasDexa?`- DEXA: دهون ${form.dexaFat||'—'}% | عضلات ${form.dexaMuscle||'—'}kg | كثافة عظام ${form.dexaBone||'—'}`:'- DEXA: غير متوفر'}
${form.hasInbody?`- InBody: دهون ${form.inbodyFat||'—'}% | عضلات ${form.inbodyMuscle||'—'}kg | ماء ${form.inbodyWater||'—'}L`:'- InBody: غير متوفر'}
- تغيرات جينية: ${form.knownGeneticVariants||'غير معروفة'}`;

  async function analyze() {
    if (!form.disorder || !form.age || !form.gender) { setError('يرجى إدخال العمر والجنس والاضطراب على الأقل'); return; }
    const ce = validateClinical(form); if (ce) { setError(ce); return; }
    setError(''); setLoading(true); setResults(null); setActiveTab(null);
    setLoadingMsg('جاري تحليل الحالة...');

    const prompt = `${buildContext()}

أنت طبيب نفسي وأخصائي تغذية علاجية وأخصائي nutrigenomics خبير. حلل الحالة تحليلاً شاملاً ومتسقاً — أي دواء أو مكمل تذكره في التوصيات لا يجب أن يظهر في المستبعدات.

أجب بهذا التنسيق بالضبط:

[MEDICATIONS]
التوصيات الدوائية المثلى: الدواء الأول والبدائل مع الجرعات بناءً على الوزن. خطوات التحول إن طُلب. مستوى الدليل (A/B/C).

[LABS]
التحاليل المطلوبة مقسمة: أ) أساسية ب) Micronutrients ج) هرمونية د) متخصصة — مع سبب كل تحليل وأهميته في الكشف عن أسباب الأعراض من نقص Macro/Micro.

[BODYCOMP]
تحليل DEXA/InBody إن توفرت، وإلا: المؤشرات المطلوبة وأهميتها، تأثير التركيب الجسدي على الأعراض والاستجابة للعلاج.

[DIET]
النظام الغذائي الأمثل: الأطعمة المفيدة والممنوعة، التوقيتات، تأثير الغذاء على الأدوية.

[CHRONO]
Chrononutrition: أفضل توقيت للوجبات، تأثير Circadian Rhythm، Time-Restricted Eating، توقيت الأدوية والمكملات بيولوجياً.

[NUTRIGENOMICS]
التغذية الجينية: أهم SNPs المرتبطة (MTHFR, COMT, SLC6A4, BDNF, VDR)، تأثير كل variant، الفحوصات الجينية الموصى بها.

[SUPPLEMENTS]
المكملات الموصى بها: الجرعات والأوقات والصيغ (glycinate, methylfolate)، مستوى الدليل.

[INTERACTIONS]
التعارضات: بين الأدوية، بين الأدوية والغذاء، بين المكملات والأدوية.

[THERAPY]
المدارس العلاجية الأنسب من CBT/DBT/ACT/Schema/GPM/ERP: التقنيات المناسبة وأولوية التطبيق.

[EXCLUDED]
المستبعدات فقط (ما لم يُذكر سابقاً) مع سبب كل استبعاد.`;

    try {
      const raw = await callClaude(prompt);
      const parse = (tag) => {
        const m = raw.match(new RegExp('\\[' + tag + '\\]([\\s\\S]*?)(?=\\[(?:' + ALL_TAGS + ')\\]|$)', 'i'));
        return (m && m[1].trim()) ? m[1].trim() : 'لم يتم تحميل هذا القسم — يرجى إعادة التحليل.';
      };
      const parsed = {};
      ['medications','labs','bodycomp','diet','chrono','nutrigenomics','supplements','interactions','therapy','excluded'].forEach(k => {
        parsed[k] = parse(k.toUpperCase());
      });
      setResults(parsed);
      setActiveTab('medications');
      setChatMessages([{ role:'ai', text:'تم تحليل الحالة بنجاح ✅\nيمكنك الآن سؤالي عن أي تفاصيل.' }]);
    } catch(e) { setError(e.message); }
    setLoading(false); setLoadingMsg('');
  }

  async function sendChat() {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim(); setChatInput('');
    const msgs = [...chatMessages, { role:'user', text:msg }];
    setChatMessages(msgs); setChatLoading(true);
    try {
      const hist = msgs.map(m => `${m.role==='user'?'الطبيب':'المساعد'}: ${m.text}`).join('\n\n');
      const reply = await callClaude(`${buildContext()}\n\nتاريخ المحادثة:\n${hist}\n\nسؤال الطبيب: ${msg}`);
      setChatMessages(p => [...p, { role:'ai', text:reply }]);
    } catch { setChatMessages(p => [...p, { role:'ai', text:'حدث خطأ، يرجى المحاولة مجدداً.' }]); }
    setChatLoading(false);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior:'smooth' }), 100);
  }

  return (
    <div className="min-h-screen" style={{ background:'linear-gradient(135deg,#070f0d 0%,#0d1a17 60%,#071210 100%)' }} dir="rtl">

      {/* Disclaimer */}
      <div className="mx-4 mt-4 px-4 py-3 rounded-xl text-xs leading-relaxed"
        style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', color:'#fbbf24', display:'block', zIndex:10, position:'relative' }}>
        ⚠️ للأطباء والمتخصصين فقط. هذه الأداة دعم للقرار السريري وليست بديلاً عن التقييم الطبي. القرار النهائي دائماً للطبيب المعالج.
      </div>

      <div className="flex flex-col md:flex-row gap-0">

        {/* ── Form Panel ── */}
        <div className="w-full md:w-96 flex-shrink-0 border-b md:border-b-0 md:border-l border-white/8 p-5 md:sticky md:top-16"
          style={{ maxHeight:'100vh', background:'rgba(13,26,23,0.95)' }}>

          <SectionLabel>بيانات المريض</SectionLabel>

          <FormInput label="اسم المريض (اختياري)">
            <input className={inputCls} placeholder="أحمد محمد" value={form.patientName} onChange={e=>set('patientName',e.target.value)} />
          </FormInput>

          <div className="grid grid-cols-2 gap-2">
            <FormInput label="العمر"><input className={inputCls} type="number" placeholder="35" value={form.age} onChange={e=>set('age',e.target.value)} /></FormInput>
            <FormInput label="الجنس">
              <select className={inputCls} value={form.gender} onChange={e=>set('gender',e.target.value)}>
                <option value="">اختر</option><option>ذكر</option><option>أنثى</option>
              </select>
            </FormInput>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <FormInput label="الوزن (كجم)"><input className={inputCls} type="number" placeholder="75" value={form.weight} onChange={e=>set('weight',e.target.value)} /></FormInput>
            <FormInput label="الطول (سم)"><input className={inputCls} type="number" placeholder="170" value={form.height} onChange={e=>set('height',e.target.value)} /></FormInput>
          </div>
          <FormInput label="الاضطراب الرئيسي">
            <select className={inputCls} value={form.disorder} onChange={e=>set('disorder',e.target.value)}>
              <option value="">اختر الاضطراب</option>
              {DISORDERS.map(d=><option key={d}>{d}</option>)}
            </select>
          </FormInput>
          <FormInput label="شدة الأعراض">
            <select className={inputCls} value={form.severity} onChange={e=>set('severity',e.target.value)}>
              <option value="">اختر</option><option>خفيفة</option><option>متوسطة</option><option>شديدة</option>
            </select>
          </FormInput>

          <div className="my-4 flex items-center gap-2">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-xs font-bold text-teal-500/60 uppercase tracking-widest">التاريخ الطبي</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          {[
            { id:'comorbidities', label:'الأمراض المصاحبة', ph:'سكري، ضغط الدم، قصور الغدة...' },
            { id:'currentMeds',   label:'الأدوية الحالية',  ph:'ميتفورمين 500mg، أتينولول 50mg...' },
            { id:'allergies',     label:'الحساسية والموانع', ph:'حساسية من البنسلين...' },
            { id:'history',       label:'التاريخ النفسي والعلاجي', ph:'fluoxetine سابقاً بدون استجابة...' },
            { id:'stopMed',       label:'دواء مراد إيقافه', ph:'إيقاف paroxetine بسبب زيادة الوزن...' },
          ].map(f=>(
            <FormInput key={f.id} label={f.label}>
              <textarea className={`${inputCls} resize-y min-h-14 leading-relaxed`} placeholder={f.ph}
                value={form[f.id]} onChange={e=>set(f.id,e.target.value)} />
            </FormInput>
          ))}

          <div className="my-4 flex items-center gap-2">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-xs font-bold text-teal-500/60 uppercase tracking-widest">📊 DEXA / InBody</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          <label className="flex items-center gap-2 mb-2 text-sm cursor-pointer text-gray-300">
            <input type="checkbox" className="accent-teal-500" checked={form.hasDexa} onChange={e=>set('hasDexa',e.target.checked)} />
            عندي نتائج DEXA
          </label>
          {form.hasDexa && <div className="grid grid-cols-3 gap-2 mb-3">
            <FormInput label="دهون %"><input className={inputCls} placeholder="25" value={form.dexaFat} onChange={e=>set('dexaFat',e.target.value)} /></FormInput>
            <FormInput label="عضلات kg"><input className={inputCls} placeholder="35" value={form.dexaMuscle} onChange={e=>set('dexaMuscle',e.target.value)} /></FormInput>
            <FormInput label="العظام"><input className={inputCls} placeholder="1.2" value={form.dexaBone} onChange={e=>set('dexaBone',e.target.value)} /></FormInput>
          </div>}

          <label className="flex items-center gap-2 mb-2 text-sm cursor-pointer text-gray-300">
            <input type="checkbox" className="accent-teal-500" checked={form.hasInbody} onChange={e=>set('hasInbody',e.target.checked)} />
            عندي نتائج InBody
          </label>
          {form.hasInbody && <div className="grid grid-cols-3 gap-2 mb-3">
            <FormInput label="دهون %"><input className={inputCls} placeholder="25" value={form.inbodyFat} onChange={e=>set('inbodyFat',e.target.value)} /></FormInput>
            <FormInput label="عضلات kg"><input className={inputCls} placeholder="35" value={form.inbodyMuscle} onChange={e=>set('inbodyMuscle',e.target.value)} /></FormInput>
            <FormInput label="ماء L"><input className={inputCls} placeholder="30" value={form.inbodyWater} onChange={e=>set('inbodyWater',e.target.value)} /></FormInput>
          </div>}

          <div className="my-4 flex items-center gap-2">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-xs font-bold text-teal-500/60 uppercase tracking-widest">🧬 الجينات</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          <FormInput label="تغيرات جينية معروفة (SNPs)">
            <textarea className={`${inputCls} resize-y min-h-14 leading-relaxed`}
              placeholder="مثال: MTHFR C677T heterozygous، COMT Val158Met..."
              value={form.knownGeneticVariants} onChange={e=>set('knownGeneticVariants',e.target.value)} />
          </FormInput>

          {error && (
            <div className="mb-3 px-3 py-2.5 rounded-xl text-sm leading-relaxed"
              style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#f87171' }}>
              {error}
            </div>
          )}

          <button
            onClick={analyze} disabled={loading}
            className="w-full py-3.5 rounded-xl text-white font-bold text-sm mt-1 transition-all"
            style={{ background: loading ? 'rgba(74,155,142,0.4)' : 'linear-gradient(135deg,#4a9b8e,#5bb8c4)', cursor: loading?'not-allowed':'pointer' }}>
            {loading ? `⏳ ${loadingMsg}` : '🔍 تحليل الحالة وإنشاء التقرير'}
          </button>
        </div>

        {/* ── Results Panel ── */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">

          {!loading && !results && (
            <div className="flex flex-col items-center justify-center h-full min-h-96 text-center gap-4">
              <div className="text-6xl opacity-20">🩺</div>
              <h3 className="text-gray-300 font-bold text-lg">أدخل بيانات المريض</h3>
              <p className="text-gray-500 text-sm max-w-xs leading-relaxed">أدخل المعلومات السريرية واضغط تحليل للحصول على التقرير الشامل</p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center h-full min-h-96 gap-5">
              <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-teal-400 animate-spin" />
              <div className="text-gray-300 font-semibold">جاري تحليل الحالة</div>
              <div className="text-teal-400 text-sm animate-pulse">{loadingMsg}</div>
              <div className="text-gray-600 text-xs">يتم مراجعة أحدث الإرشادات الطبية المعتمدة</div>
            </div>
          )}

          {results && (<>
            {/* Report header */}
            <div className="flex justify-between items-center mb-5 p-4 rounded-2xl" style={{ background:'rgba(13,26,23,0.8)', border:'1px solid rgba(255,255,255,0.08)' }}>
              <div>
                <div className="font-bold text-white text-base">{form.patientName?`${form.patientName} — `:''}تقرير: {form.disorder}</div>
                <div className="text-xs text-gray-500 mt-1">{form.gender} | {form.age} سنة {form.weight?`| ${form.weight} كجم`:''} | شدة: {form.severity||'غير محددة'}</div>
              </div>
              <div className="text-center px-4 py-2 rounded-xl text-xs font-semibold"
                style={{ background:'rgba(74,155,142,0.12)', border:'1px solid rgba(74,155,142,0.3)', color:'#5fbfb0' }}>
                ✓ تم التحليل<br /><span className="opacity-60 text-[10px]">القرار للطبيب</span>
              </div>
            </div>

            {/* PDF buttons */}
            <div className="flex flex-col sm:flex-row gap-2 mb-5">
              <button onClick={()=>generatePDF(form,results,'doctor')}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{ border:'1px solid rgba(74,155,142,0.4)', color:'#5fbfb0', background:'transparent' }}>
                🖨️ تقرير الطبيب PDF
              </button>
              <button onClick={()=>generatePDF(form,results,'patient')}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{ border:'1px solid rgba(91,184,196,0.4)', color:'#5bb8c4', background:'transparent' }}>
                📄 نسخة المريض PDF
              </button>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {SECTIONS.map(sec=>(
                <button key={sec.id}
                  onClick={()=>setActiveTab(activeTab===sec.id?null:sec.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    border:`1px solid ${activeTab===sec.id?sec.color:'rgba(255,255,255,0.08)'}`,
                    background: activeTab===sec.id?sec.color+'22':'transparent',
                    color: activeTab===sec.id?sec.color:'#64748b',
                    fontFamily:'Cairo,sans-serif'
                  }}>
                  {sec.icon} {sec.title}
                </button>
              ))}
            </div>

            {/* Active section */}
            {activeTab && (
              <Card className="mb-4">
                <div className="flex items-center gap-3 mb-4 pb-3" style={{ borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
                  <span className="text-2xl">{SECTIONS.find(s=>s.id===activeTab)?.icon}</span>
                  <span className="font-bold text-white">{SECTIONS.find(s=>s.id===activeTab)?.title}</span>
                </div>
                <div className="text-sm leading-loose text-gray-400 whitespace-pre-wrap">{results[activeTab]}</div>
              </Card>
            )}

            {/* Chat */}
            <Card>
              <div className="flex items-center gap-2 mb-4 pb-3 font-bold text-sm" style={{ borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
                <span>💬</span> اسأل عن الحالة
              </div>
              <div className="flex flex-col gap-3 max-h-72 overflow-y-auto mb-3">
                {chatMessages.map((m,i)=>(
                  <div key={i} className={`px-3.5 py-2.5 rounded-xl text-sm leading-relaxed max-w-[85%] whitespace-pre-wrap ${
                    m.role==='user'
                      ? 'self-start' : 'self-end text-gray-400'
                  }`}
                  style={m.role==='user'
                    ? { background:'rgba(74,155,142,0.15)', border:'1px solid rgba(74,155,142,0.2)', color:'#e2e8f0' }
                    : { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
                    {m.text}
                  </div>
                ))}
                {chatLoading && <div className="self-end px-3.5 py-2.5 rounded-xl text-sm text-gray-500 animate-pulse"
                  style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>جاري التفكير...</div>}
                <div ref={chatEndRef} />
              </div>
              <div className="flex gap-2">
                <input
                  className={`${inputCls} flex-1`}
                  placeholder="اسأل عن الجرعات، البدائل، التوقيتات..."
                  value={chatInput} onChange={e=>setChatInput(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&sendChat()} />
                <button onClick={sendChat} disabled={chatLoading}
                  className="px-4 rounded-xl text-white font-bold text-lg transition-opacity"
                  style={{ background:'#4a9b8e', opacity:chatLoading?0.5:1 }}>↩</button>
              </div>
            </Card>
          </>)}
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════
   PAGE WRAPPER WITH ACCESS GUARD
════════════════════════════════════════════════ */
const ClinicalToolPage = () => {
  const navigate = useNavigate();
  const access = useClinicalAccess();

  if (access === 'loading') return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background:'linear-gradient(135deg,#070f0d 0%,#0d1a17 60%,#071210 100%)' }}>
      <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-teal-400 animate-spin" />
    </div>
  );

  if (access === 'no_account') return (
    <GateScreen icon="🔐" title="هذه الأداة للمشتركين فقط"
      subtitle="سجل دخولك أو اشترك للوصول إلى الأداة السريرية">
      <button onClick={()=>navigate('/login')}
        className="px-8 py-3 rounded-xl text-white font-bold"
        style={{ background:'linear-gradient(135deg,#4a9b8e,#5bb8c4)' }}>
        تسجيل الدخول
      </button>
    </GateScreen>
  );

  if (access === 'no_access') return (
    <GateScreen icon="💼" title="اشترك في الأداة السريرية"
      subtitle="احصل على وصول كامل للأداة السريرية المتكاملة">
      <button onClick={()=>navigate('/pricing')}
        className="px-8 py-3 rounded-xl text-white font-bold"
        style={{ background:'linear-gradient(135deg,#4a9b8e,#5bb8c4)' }}>
        اشترك الآن
      </button>
    </GateScreen>
  );

  if (access === 'expired') return (
    <GateScreen icon="⏰" title="انتهى اشتراكك"
      subtitle="جدد اشتراكك للاستمرار في استخدام الأداة السريرية">
      <button onClick={()=>navigate('/pricing')}
        className="px-8 py-3 rounded-xl text-white font-bold"
        style={{ background:'linear-gradient(135deg,#4a9b8e,#5bb8c4)' }}>
        تجديد الاشتراك
      </button>
    </GateScreen>
  );

  return (
    <>
      <Header />
      <ClinicalTool />
    </>
  );
};

export default ClinicalToolPage;
