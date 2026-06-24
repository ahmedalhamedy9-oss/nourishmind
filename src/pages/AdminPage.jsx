import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Pencil, Trash2, X, Check, BookOpen, Tag, Upload,
  Award, Star, MessageSquare, DollarSign, Users, Search,
  ChevronDown, ChevronUp, Image, Info, FileText, Home,
  Phone, Bell,
} from 'lucide-react';
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  serverTimestamp, onSnapshot, query, orderBy, setDoc, getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { PLACEHOLDER_COURSES, CATEGORIES as DEFAULT_CATS } from '@/lib/data';
import { uploadToCloudinary } from '@/lib/cloudinary';
import LessonEditor from '@/components/LessonEditor';

const TABS = [
  { id: 'courses',     label: 'Courses',      icon: BookOpen },
  { id: 'lessons',     label: 'Lessons',       icon: BookOpen },
  { id: 'categories',  label: 'Categories',    icon: Tag },
  { id: 'certificates',label: 'Certificates',  icon: Award },
  { id: 'cert_requests',label:'Cert Requests', icon: Bell },
  { id: 'reviews',     label: 'Reviews',       icon: MessageSquare },
  { id: 'pricing',     label: 'Pricing',       icon: DollarSign },
  { id: 'users',       label: 'Users',         icon: Users },
  { id: 'stats',       label: '📊 Stats Strip',   icon: Home },
  { id: 'carousel',    label: '🎬 Hero Carousel', icon: Home },
  { id: 'hero',        label: 'Hero Section',  icon: Home },
  { id: 'about',       label: 'About Page',    icon: Info },
  { id: 'coursepage',  label: 'Course Page',   icon: FileText },
  { id: 'contact',     label: 'Contact / WA',  icon: Phone },
];

const Field = ({ label, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</label>
    {children}
  </div>
);
const Input = ({ className='', ...props }) => (
  <input {...props} className={`w-full bg-[#0a1412] border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder-gray-600 ${className}`}/>
);
const Textarea = ({ className='', ...props }) => (
  <textarea {...props} className={`w-full bg-[#0a1412] border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder-gray-600 resize-none ${className}`}/>
);
const Btn = ({ children, onClick, disabled, variant='primary', className='' }) => {
  const base='flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40';
  const styles={primary:'bg-primary text-white hover:bg-primary/80',ghost:'border border-white/10 text-gray-300 hover:text-white hover:border-white/30',danger:'border border-red-500/30 text-red-400 hover:bg-red-500/10'};
  return <button onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]} ${className}`}>{children}</button>;
};
const ImgUpload = ({ label, folder, currentUrl, onUpload }) => {
  const [busy,setBusy]=useState(false);
  const handle=async(e)=>{const file=e.target.files?.[0];if(!file)return;setBusy(true);try{onUpload(await uploadToCloudinary(file,folder));}catch(err){alert('Upload failed: '+err.message);}finally{setBusy(false);}};


  return(
    <div className="flex flex-col gap-2">
      {currentUrl&&<img src={currentUrl} alt="" className="h-20 w-auto rounded-lg object-cover border border-white/10" onError={e=>e.target.style.display='none'}/>}
      <label className={`flex items-center gap-2 cursor-pointer border border-dashed border-white/15 text-gray-400 hover:text-primary hover:border-primary rounded-lg px-3 py-2 text-sm transition-colors ${busy?'opacity-50 pointer-events-none':''}`}>
        <Upload className="w-4 h-4"/>{busy?'Uploading…':label}
        <input type="file" accept="image/*" className="hidden" onChange={handle}/>
      </label>
    </div>
  );
};

const EMPTY={title:'',description:'',category:'',level:'Beginner',duration_hours:'',students_count:'',rating:'4.5',price:'',featured:false,new:true,top10:false,top10_rank:'',image:'',previewVideo:'',sampleVideo:'',instructor:'',instructor_image:'',tags:'',outcomes:'',instructor_bio:'',what_you_get:'',skill_items:'',accredited:false};
const safe=(course)=>{if(!course)return{...EMPTY};return{...EMPTY,id:course.id??null,title:String(course.title??''),description:String(course.description??''),category:String(course.category??''),level:String(course.level??'Beginner'),duration_hours:course.duration_hours!=null?String(course.duration_hours):'',students_count:course.students_count!=null?String(course.students_count):'',rating:course.rating!=null?String(course.rating):'4.5',price:course.price!=null?String(course.price):'',image:String(course.image??''),previewVideo:String(course.previewVideo??''),instructor:String(course.instructor??''),instructor_image:String(course.instructor_image??''),instructor_bio:String(course.instructor_bio??''),tags:Array.isArray(course.tags)?course.tags.join(', '):String(course.tags??''),top10_rank:course.top10_rank!=null?String(course.top10_rank):'',featured:Boolean(course.featured),new:course.new!=null?Boolean(course.new):true,top10:Boolean(course.top10),outcomes:Array.isArray(course.outcomes)?course.outcomes.join('\n'):String(course.outcomes??''),what_you_get:Array.isArray(course.what_you_get)?course.what_you_get.join('\n'):String(course.what_you_get??''),skill_items:Array.isArray(course.skill_items)?course.skill_items.map(s=>s.title||s).join('\n'):String(course.skill_items??''),sampleVideo:String(course.sampleVideo??''),accredited:Boolean(course.accredited)}};

class ModalErrorBoundary extends React.Component{constructor(props){super(props);this.state={hasError:false,error:null};}static getDerivedStateFromError(error){return{hasError:true,error};}render(){if(this.state.hasError)return(<div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"><div className="bg-[#0d1a17] border border-red-500/30 rounded-2xl p-8 max-w-md w-full text-center"><p className="text-red-400 font-bold text-lg mb-2">Modal Error</p><p className="text-gray-400 text-sm mb-4">{this.state.error?.message}</p><button onClick={this.props.onClose} className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-semibold">Close</button></div></div>);return this.props.children;}}

const CourseModal=({course,categories,onSave,onClose})=>{const[form,setForm]=useState(()=>safe(course));const[saving,setSaving]=useState(false);const[tab,setTab]=useState('basic');const set=(k,v)=>setForm(f=>({...f,[k]:v}));const handleSave=async()=>{if(!form.title.trim()){alert('Title is required');return;}setSaving(true);try{await onSave({id:course?.id??null,...form,duration_hours:parseFloat(form.duration_hours)||0,price:parseFloat(form.price)||0,rating:parseFloat(form.rating)||4.5,students_count:parseInt(form.students_count)||0,top10_rank:parseInt(form.top10_rank)||'',tags:typeof form.tags==='string'?form.tags.split(',').map(t=>t.trim()).filter(Boolean):(form.tags||[]),outcomes:typeof form.outcomes==='string'?form.outcomes.split('\n').map(t=>t.trim()).filter(Boolean):(form.outcomes||[]),what_you_get:typeof form.what_you_get==='string'?form.what_you_get.split('\n').map(t=>t.trim()).filter(Boolean):(form.what_you_get||[]),skill_items:typeof form.skill_items==='string'?form.skill_items.split('\n').map(t=>t.trim()).filter(Boolean).map(t=>({title:t,image:form.image||''})):[],sampleVideo:form.sampleVideo||'',accredited:Boolean(form.accredited)});onClose();}catch(e){alert('Error: '+e.message);}finally{setSaving(false);}};const MODAL_TABS=[{id:'basic',label:'Basic Info'},{id:'media',label:'Media'},{id:'content',label:'Course Content'},{id:'instructor',label:'Instructor'}];return(<div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}><div className="bg-[#0d1a17] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between p-6 border-b border-white/10"><h2 className="text-white font-bold text-lg">{course?'Edit Course':'Add New Course'}</h2><button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button></div><div className="flex gap-1 px-6 pt-4 border-b border-white/10">{MODAL_TABS.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors ${tab===t.id?'text-primary border-b-2 border-primary bg-primary/5':'text-gray-500 hover:text-white'}`}>{t.label}</button>))}</div><div className="p-6 flex flex-col gap-4">{tab==='basic'&&<><Field label="Title *"><Input value={form.title} onChange={e=>set('title',e.target.value)} placeholder="Course title"/></Field><Field label="Description"><Textarea value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Course description" rows={3}/></Field><div className="grid grid-cols-2 gap-4"><Field label="Category"><select value={form.category} onChange={e=>set('category',e.target.value)} className="w-full bg-[#0a1412] border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"><option value="">Select category</option>{(categories||[]).map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></Field><Field label="Level"><select value={form.level} onChange={e=>set('level',e.target.value)} className="w-full bg-[#0a1412] border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">{['Beginner','Intermediate','Advanced'].map(l=><option key={l}>{l}</option>)}</select></Field><Field label="Duration (hours)"><Input type="number" value={form.duration_hours} onChange={e=>set('duration_hours',e.target.value)} placeholder="3.5" min="0" step="0.5"/></Field><Field label="Price ($) — 0 = Free"><Input type="number" value={form.price} onChange={e=>set('price',e.target.value)} placeholder="49" min="0"/></Field><Field label="Rating (0–5)"><Input type="number" value={form.rating} onChange={e=>set('rating',e.target.value)} placeholder="4.8" min="0" max="5" step="0.1"/></Field><Field label="Students count"><Input type="number" value={form.students_count} onChange={e=>set('students_count',e.target.value)} placeholder="1200" min="0"/></Field></div><Field label="Tags (comma separated)"><Input value={form.tags} onChange={e=>set('tags',e.target.value)} placeholder="Nutrition, Science, Beginner"/></Field><div className="flex flex-wrap gap-5 pt-2">{[{key:'featured',label:'Featured'},{key:'new',label:'Mark as New'},{key:'top10',label:'🏆 Top 10'}].map(({key,label})=>(<label key={key} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={!!form[key]} onChange={e=>set(key,e.target.checked)} className="accent-primary w-4 h-4"/><span className="text-sm text-gray-300">{label}</span></label>))}{form.top10&&(<div className="flex items-center gap-2"><span className="text-sm text-gray-400">Rank:</span><Input type="number" min="1" max="10" value={form.top10_rank} onChange={e=>set('top10_rank',e.target.value)} placeholder="1–10" className="w-20"/></div>)}</div></>}{tab==='media'&&<><Field label="Course Thumbnail"><ImgUpload label="Upload Thumbnail" folder="nourishmind/thumbnails" currentUrl={form.image} onUpload={url=>set('image',url)}/><Input value={form.image} onChange={e=>set('image',e.target.value)} placeholder="https://res.cloudinary.com/…" className="mt-1"/></Field><Field label="Trailer Video URL (Bunny Stream)"><Input value={form.previewVideo} onChange={e=>set('previewVideo',e.target.value)} placeholder="https://iframe.mediadelivery.net/embed/LIBRARY_ID/VIDEO_ID"/></Field><Field label="Sample / Free Lesson Video URL (Bunny Stream)"><Input value={form.sampleVideo||''} onChange={e=>set('sampleVideo',e.target.value)} placeholder="https://iframe.mediadelivery.net/embed/LIBRARY_ID/VIDEO_ID"/></Field></>}{tab==='content'&&<><Field label="What Students Will Learn (one per line)"><p className="text-xs text-gray-500 mb-1">كل سطر = outcome واحد</p><Textarea value={form.outcomes} onChange={e=>set('outcomes',e.target.value)} placeholder={"Understand the gut-brain axis\nApply nutritional interventions"} rows={6}/></Field><Field label='"What You Get" (one per line)'><Textarea value={form.what_you_get} onChange={e=>set('what_you_get',e.target.value)} placeholder={"Expert-led video lessons\nCertificate of completion"} rows={4}/></Field><Field label="Skills Cards (one title per line — shown as sticky cards on course page)"><p className="text-xs text-gray-500 mb-1">كل سطر = skill card واحد (بتاخد صورة الكورس تلقائياً)</p><Textarea value={form.skill_items||''} onChange={e=>set('skill_items',e.target.value)} placeholder={"Spot Your Metabolic Traps\nReset the Gut-Brain Axis\nBuild a 30-Day Plan"} rows={4}/></Field><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={!!form.accredited} onChange={e=>set('accredited',e.target.checked)} className="accent-primary w-4 h-4"/><span className="text-sm text-gray-300">CME Accredited</span></label></>}{tab==='instructor'&&<><Field label="Instructor Name"><Input value={form.instructor} onChange={e=>set('instructor',e.target.value)} placeholder="Dr. Ahmed Al-Hamedy"/></Field><Field label="Instructor Title / Bio"><Input value={form.instructor_bio} onChange={e=>set('instructor_bio',e.target.value)} placeholder="Psychiatrist & Nutritional Psychiatry Expert"/></Field><Field label="Instructor Photo"><ImgUpload label="Upload Photo" folder="nourishmind/instructors" currentUrl={form.instructor_image} onUpload={url=>set('instructor_image',url)}/><Input value={form.instructor_image} onChange={e=>set('instructor_image',e.target.value)} placeholder="https://res.cloudinary.com/…" className="mt-1"/></Field></>}</div><div className="flex justify-end gap-3 p-6 border-t border-white/10"><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={handleSave} disabled={saving}><Check className="w-4 h-4"/>{saving?'Saving…':'Save Course'}</Btn></div></div></div>);};

const AdminPage = () => {
  const navigate=useNavigate();
  const{currentUser}=useAuth();
  const[activeTab,setActiveTab]=useState('courses');
  const[courses,setCourses]=useState(PLACEHOLDER_COURSES);
  const[users,setUsers]=useState([]);
  const[categories,setCategories]=useState(DEFAULT_CATS);
  const[reviews,setReviews]=useState([]);
  const[certificates,setCertificates]=useState([]);
  const[certRequests,setCertRequests]=useState([]);
  const[pricingPlans,setPricingPlans]=useState([]);
  const[modal,setModal]=useState(null);
  const[lessonEditor,setLessonEditor]=useState(null);
  const[newCat,setNewCat]=useState({id:'',label:''});
  const[userSearch,setUserSearch]=useState('');
  const[savingPricing,setSavingPricing]=useState(false);

  // Hero state
  const[hero,setHero]=useState({backgroundType:'image',backgroundImage:'',backgroundVideoId:'',tagline:'NOURISHMIND · Wellness Learning Platform',title1:'Nourish Your Mind,',title2:'Elevate Your Life',subtitle:'Expert-led courses in mental health, psychology & nutrition.',stat1_value:'50,000+',stat1_label:'Students',stat2_value:'AR / EN',stat2_label:'Languages',stat3_value:'4.8',stat3_label:'Rating',cta1:'Start Learning',cta2:'Browse Courses'});
  const[savingHero,setSavingHero]=useState(false);

  // Hero Carousel state (new MasterClass carousel)
  const EMPTY_SLIDE = {id:'',badge:'',title:'',description:'',backgroundImage:'',backgroundVideoId:'',type:'image',cta1Label:'Start Learning',cta1Link:'/courses',cta2Label:'Browse Courses',cta2Link:'/courses'};
  const[heroSlides,setHeroSlides]=useState([]);
  const[savingSlides,setSavingSlides]=useState(false);
  const[editingSlide,setEditingSlide]=useState(null); // null | index
  const[slideForm,setSlideForm]=useState({...EMPTY_SLIDE});

  // About state
  const[about,setAbout]=useState({badge:'Our Story',headline1:'We Believe Food is',headline2:'Medicine for the Mind',intro:"NourishMind was born from a simple but powerful idea...",stat1_value:'50,000+',stat1_label:'Students',stat2_value:'AR / EN',stat2_label:'Languages',stat3_value:'4.8 ★',stat3_label:'Average Rating',stat4_value:'30+',stat4_label:'Expert Courses',val1_title:'Science-First',val1_desc:'Every course is grounded in peer-reviewed research.',val2_title:'Human-Centered',val2_desc:'We design for real people navigating real struggles.',val3_title:'Holistic Approach',val3_desc:'Mind, body, and nutrition are inseparable.',team:[
    {name:'Dr. Ahmed Al-Hamedy',role:'Founder & Lead Psychiatrist',bio:'Psychiatrist and founder of Dawn for Mental Health. Pioneer of nutritional psychiatry in the Arabic-speaking world.',avatar:''},
    {name:'Dr. Sarah Ahmed',role:'Head of Nutrition',bio:'Clinical nutritionist with 15 years of experience integrating diet and mental wellness.',avatar:''},
    {name:'Dr. Layla Mansour',role:'Psychotherapy Lead',bio:'Specialist in CBT and mindfulness-based interventions for anxiety and depression.',avatar:''},
  ]});
  const[savingAbout,setSavingAbout]=useState(false);

  // Reviews
  const[newReview,setNewReview]=useState({name:'',rating:5,text:'',location:'',avatar:''});
  const[savingReview,setSavingReview]=useState(false);

  // Course page
  const[coursePage,setCoursePage]=useState({default_what_you_get:'Expert-led video lessons\nCertificate of completion\nLifetime access\nMobile & desktop access'});
  const[stats,setStats]=useState({enrolledBase:'2400',completionRate:'96%'});
  const[savingStats,setSavingStats]=useState(false);
  const[savingCoursePage,setSavingCoursePage]=useState(false);

  // Certificate upload form
  const[certForm,setCertForm]=useState({name:'',price:'',delivery:'',description:'',url:''});
  const[certUploading,setCertUploading]=useState(false);
  const[savingCert,setSavingCert]=useState(false);

  // Contact / WhatsApp
  const[contact,setContact]=useState({whatsapp:''});
  const[savingContact,setSavingContact]=useState(false);

  useEffect(()=>{if(currentUser===null)navigate('/');},[currentUser]);

  useEffect(()=>{
    getDoc(doc(db,'settings','hero')).then(snap=>{if(snap.exists())setHero(h=>({...h,...snap.data()}));}).catch(()=>{});
    getDoc(doc(db,'settings','heroCarousel')).then(snap=>{if(snap.exists()&&Array.isArray(snap.data().slides))setHeroSlides(snap.data().slides);}).catch(()=>{});
    getDoc(doc(db,'settings','stats')).then(snap=>{if(snap.exists())setStats(s=>({...s,...snap.data()}));}).catch(()=>{});
    getDoc(doc(db,'settings','about')).then(snap=>{if(snap.exists())setAbout(a=>({...a,...snap.data()}));}).catch(()=>{});
    getDoc(doc(db,'settings','coursepage')).then(snap=>{if(snap.exists())setCoursePage(cp=>({...cp,...snap.data()}));}).catch(()=>{});
    getDoc(doc(db,'settings','contact')).then(snap=>{if(snap.exists())setContact(c=>({...c,...snap.data()}));}).catch(()=>{});

    const unsubCats=onSnapshot(doc(db,'settings','categories'),snap=>{if(snap.exists()&&snap.data().list?.length)setCategories(snap.data().list);else{setDoc(doc(db,'settings','categories'),{list:DEFAULT_CATS});setCategories(DEFAULT_CATS);}},()=>setCategories(DEFAULT_CATS));
    const qCourses=query(collection(db,'courses'),orderBy('createdAt','desc'));
    const unsubCourses=onSnapshot(qCourses,snap=>setCourses(snap.empty?PLACEHOLDER_COURSES:snap.docs.map(d=>({id:d.id,...d.data()}))),()=>{const u2=onSnapshot(collection(db,'courses'),snap=>setCourses(snap.empty?PLACEHOLDER_COURSES:snap.docs.map(d=>({id:d.id,...d.data()}))),()=>setCourses(PLACEHOLDER_COURSES));return u2;});
    const unsubUsers=onSnapshot(query(collection(db,'users'),orderBy('createdAt','desc')),snap=>setUsers(snap.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    const unsubReviews=onSnapshot(collection(db,'reviews'),snap=>setReviews(snap.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    const unsubCerts=onSnapshot(collection(db,'certificates'),snap=>setCertificates(snap.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    const unsubReqs=onSnapshot(query(collection(db,'certificate_requests'),orderBy('createdAt','desc')),snap=>setCertRequests(snap.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    const unsubPricing=onSnapshot(doc(db,'settings','pricing'),snap=>{if(snap.exists()&&snap.data().plans?.length)setPricingPlans(snap.data().plans);else{const D=[{id:'single',name:'Single Course',price_usd:49,period:'one-time',highlighted:false,badge:'',features:['1 course','Certificate','Lifetime access','Mobile & desktop']},{id:'quarterly',name:'Quarterly Plan',price_usd:89,period:'3 months',highlighted:true,badge:'Most Popular',features:['ALL courses','New monthly','All certificates','Priority support']},{id:'annual',name:'Annual Plan',price_usd:249,period:'per year',highlighted:false,badge:'Best Value',features:['Everything in Quarterly','Save 30%','Early access','Live Q&A']}];setDoc(doc(db,'settings','pricing'),{plans:D});setPricingPlans(D);}},()=>{});
    return()=>{unsubCats();unsubCourses();unsubUsers();unsubReviews();unsubCerts();unsubReqs();unsubPricing();};
  },[]);

  const saveCourse=async(data)=>{const{id,...rest}=data;const PH=['1','2','3','4','5','6','7','8','9','10'];const isFS=id&&!PH.includes(String(id));if(isFS)await updateDoc(doc(db,'courses',id),{...rest,updatedAt:serverTimestamp()});else await addDoc(collection(db,'courses'),{...rest,createdAt:serverTimestamp()});};
  const deleteCourse=async(id)=>{if(!confirm('Delete?'))return;const PH=['1','2','3','4','5','6','7','8','9','10'];if(id&&!PH.includes(String(id)))await deleteDoc(doc(db,'courses',id));else setCourses(prev=>prev.filter(c=>c.id!==id));};
  const addCategory=async()=>{if(!newCat.id.trim()||!newCat.label.trim())return;const updated=[...categories,newCat];setCategories(updated);setNewCat({id:'',label:''});await setDoc(doc(db,'settings','categories'),{list:updated});};
  const deleteCategory=async(idx)=>{const updated=categories.filter((_,i)=>i!==idx);setCategories(updated);await setDoc(doc(db,'settings','categories'),{list:updated});};
  const deleteReview=async(id)=>{if(!confirm('Delete?'))return;await deleteDoc(doc(db,'reviews',id));};
  const deleteCert=async(id)=>{if(!confirm('Delete?'))return;await deleteDoc(doc(db,'certificates',id));};
  const addReview=async()=>{if(!newReview.name.trim()||!newReview.text.trim()){alert('Name and text required');return;}setSavingReview(true);try{await addDoc(collection(db,'reviews'),{...newReview,rating:Number(newReview.rating),createdAt:serverTimestamp()});setNewReview({name:'',rating:5,text:'',location:'',avatar:''});}catch(e){alert('Error: '+e.message);}finally{setSavingReview(false);}};
  const saveHero=async()=>{setSavingHero(true);try{await setDoc(doc(db,'settings','hero'),{...hero,updatedAt:serverTimestamp()});alert('Hero saved!');}catch(e){alert('Error: '+e.message);}finally{setSavingHero(false);}};
  const saveStats=async()=>{setSavingStats(true);try{await setDoc(doc(db,'settings','stats'),{enrolledBase:parseInt(stats.enrolledBase)||2400,completionRate:stats.completionRate||'96%',updatedAt:serverTimestamp()});alert('Stats saved!');}catch(e){alert('Error: '+e.message);}finally{setSavingStats(false);};};
  const saveHeroCarousel=async()=>{setSavingSlides(true);try{await setDoc(doc(db,'settings','heroCarousel'),{slides:heroSlides,updatedAt:serverTimestamp()});alert('Carousel saved!');}catch(e){alert('Error: '+e.message);}finally{setSavingSlides(false);};};
  const openSlide=(idx)=>{setEditingSlide(idx);setSlideForm(idx===null?{...EMPTY_SLIDE,id:Date.now().toString()}:{...heroSlides[idx]});};
  const saveSlide=()=>{const s={...slideForm};if(!s.id)s.id=Date.now().toString();if(editingSlide===null){setHeroSlides(p=>[...p,s]);}else{setHeroSlides(p=>p.map((x,i)=>i===editingSlide?s:x));}setEditingSlide(undefined);};
  const deleteSlide=(idx)=>{if(!confirm('Delete this slide?'))return;setHeroSlides(p=>p.filter((_,i)=>i!==idx));};
  const moveSlide=(idx,dir)=>{setHeroSlides(p=>{const a=[...p];const b=idx+dir;if(b<0||b>=a.length)return a;[a[idx],a[b]]=[a[b],a[idx]];return a;});};
  const saveAbout=async()=>{setSavingAbout(true);try{await setDoc(doc(db,'settings','about'),{...about,updatedAt:serverTimestamp()});alert('Saved!');}catch(e){alert('Error: '+e.message);}finally{setSavingAbout(false);}};
  const saveCoursePage=async()=>{setSavingCoursePage(true);try{await setDoc(doc(db,'settings','coursepage'),{...coursePage,updatedAt:serverTimestamp()});alert('Saved!');}catch(e){alert('Error: '+e.message);}finally{setSavingCoursePage(false);}};
  const savePricing=async()=>{setSavingPricing(true);try{await setDoc(doc(db,'settings','pricing'),{plans:pricingPlans,updatedAt:serverTimestamp()});}catch(e){alert('Error: '+e.message);}finally{setSavingPricing(false);}};
  const saveContact=async()=>{setSavingContact(true);try{await setDoc(doc(db,'settings','contact'),{...contact,updatedAt:serverTimestamp()});alert('Saved! WhatsApp number updated.');}catch(e){alert('Error: '+e.message);}finally{setSavingContact(false);}};

  const handleCertImgUpload=async(e)=>{const file=e.target.files?.[0];if(!file)return;setCertUploading(true);try{const url=await uploadToCloudinary(file,'nourishmind/certificates');setCertForm(f=>({...f,url}));}catch(err){alert('Upload failed: '+err.message);}finally{setCertUploading(false);}};

  const saveCertificate=async()=>{if(!certForm.url){alert('Please upload an image first.');return;}setSavingCert(true);try{await addDoc(collection(db,'certificates'),{url:certForm.url,alt:certForm.name||'Certificate',price:certForm.price,delivery:certForm.delivery,description:certForm.description,createdAt:serverTimestamp()});setCertForm({name:'',price:'',delivery:'',description:'',url:''});}catch(e){alert('Error: '+e.message);}finally{setSavingCert(false);}};

  const setTeamMember=(i,k,v)=>setAbout(a=>{const team=[...a.team];team[i]={...team[i],[k]:v};return{...a,team};});
  const addTeamMember=()=>setAbout(a=>({...a,team:[...a.team,{name:'',role:'',bio:'',avatar:''}]}));
  const removeTeamMember=(i)=>setAbout(a=>({...a,team:a.team.filter((_,j)=>j!==i)}));

  const sectionTitle=(title,action)=>(<div className="flex items-center justify-between mb-6"><h1 className="text-2xl font-extrabold text-white">{title}</h1>{action}</div>);
  const filteredUsers=users.filter(u=>!userSearch||u.email?.toLowerCase().includes(userSearch.toLowerCase())||u.name?.toLowerCase().includes(userSearch.toLowerCase()));

  const pendingRequests = certRequests.filter(r => r.status === 'pending');

  return (
    <div className="min-h-screen flex flex-col bg-[#0a1412] font-sans">
      <div className="fixed top-0 left-0 right-0 z-50 h-14 bg-[#0d1a17] border-b border-white/10 flex items-center px-6 gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center"><span className="text-white font-black text-sm">N</span></div>
          <span className="text-white font-bold">Admin Panel</span>
        </div>
        <span className="text-gray-500 text-sm">|</span>
        <span className="text-gray-400 text-sm">{currentUser?.email}</span>
        {pendingRequests.length>0&&<span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pendingRequests.length} new requests</span>}
        <div className="ml-auto"><Btn variant="ghost" onClick={()=>navigate('/')}><span className="text-xs">View Site</span></Btn></div>
      </div>

      <div className="flex pt-14 min-h-screen">
        <aside className="fixed top-14 left-0 bottom-0 w-52 bg-[#0d1a17] border-r border-white/10 flex flex-col pt-4 overflow-y-auto">
          {TABS.map(tab=>{const Icon=tab.icon;const active=activeTab===tab.id;return(
            <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors text-left ${active?'text-white bg-primary/15 border-r-2 border-primary':'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              <Icon className="w-4 h-4 shrink-0"/>{tab.label}
              {tab.id==='cert_requests'&&pendingRequests.length>0&&<span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingRequests.length}</span>}
            </button>
          );})}
        </aside>

        <main className="ml-52 flex-1 p-8 overflow-y-auto">

          {/* COURSES */}
          {activeTab==='courses'&&(<div>{sectionTitle('Courses',<Btn onClick={()=>setModal('add')}><Plus className="w-4 h-4"/>Add Course</Btn>)}<p className="text-gray-500 text-sm mb-6">{courses.length} total</p><div className="flex flex-col gap-3">{courses.map(course=>(<div key={course.id} className="flex items-center gap-4 bg-[#0d1a17] border border-white/10 rounded-xl p-4 hover:border-primary/30 transition-colors"><div className="w-16 h-10 rounded-lg overflow-hidden bg-white/5 shrink-0">{course.image?<img src={course.image} alt={course.title} className="w-full h-full object-cover"/>:<div className="w-full h-full flex items-center justify-center text-xl">🧠</div>}</div><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-0.5 flex-wrap"><p className="text-white font-semibold text-sm truncate">{course.title}</p>{course.featured&&<span className="bg-primary/20 text-primary text-[10px] px-1.5 py-0.5 rounded font-bold">Featured</span>}{course.new&&<span className="bg-green-500/20 text-green-400 text-[10px] px-1.5 py-0.5 rounded font-bold">New</span>}{course.top10&&<span className="bg-yellow-500/20 text-yellow-400 text-[10px] px-1.5 py-0.5 rounded font-bold">🏆 #{course.top10_rank}</span>}</div><div className="flex gap-3 text-xs text-gray-500 flex-wrap">{course.price!=null&&<span className="text-primary font-bold">${course.price}</span>}{course.level&&<span>{course.level}</span>}{course.duration_hours&&<span>{course.duration_hours}h</span>}</div></div><div className="flex items-center gap-2 shrink-0"><Btn variant="ghost" onClick={()=>setLessonEditor(course)} className="text-xs px-3 py-1.5">📚 Lessons</Btn><button onClick={()=>setModal(course)} className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-primary/40 transition-colors"><Pencil className="w-4 h-4"/></button><button onClick={()=>deleteCourse(course.id)} className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-red-400 hover:border-red-500/30 transition-colors"><Trash2 className="w-4 h-4"/></button></div></div>))}</div></div>)}

          {/* LESSONS */}
          {activeTab==='lessons'&&(<div>{sectionTitle('Lessons')}<p className="text-gray-500 text-sm mb-6">Select a course to edit its sections and lessons</p><select onChange={e=>{const c=courses.find(x=>x.id===e.target.value);if(c)setLessonEditor(c);}} defaultValue="" className="w-full max-w-sm bg-[#0d1a17] border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary mb-4"><option value="" disabled>— Choose a course —</option>{courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></div>)}

          {/* CATEGORIES */}
          {activeTab==='categories'&&(<div>{sectionTitle('Categories')}<div className="bg-[#0d1a17] border border-white/10 rounded-xl p-5 mb-6"><p className="text-white font-semibold text-sm mb-4">Add New Category</p><div className="flex gap-3 flex-wrap"><Input value={newCat.id} onChange={e=>setNewCat(p=>({...p,id:e.target.value}))} placeholder="id (e.g. gut-brain)" className="flex-1 min-w-40"/><Input value={newCat.label} onChange={e=>setNewCat(p=>({...p,label:e.target.value}))} placeholder="Label (e.g. Gut-Brain Axis)" className="flex-1 min-w-40"/><Btn onClick={addCategory}><Plus className="w-4 h-4"/>Add</Btn></div></div><div className="flex flex-col gap-2">{categories.map((cat,i)=>(<div key={cat.id} className="flex items-center justify-between bg-[#0d1a17] border border-white/10 rounded-xl px-5 py-3"><div><p className="text-white font-semibold text-sm">{cat.label}</p><p className="text-gray-500 text-xs font-mono">{cat.id}</p></div><div className="flex items-center gap-3"><span className="text-gray-600 text-xs">{courses.filter(c=>c.category===cat.id).length} courses</span><button onClick={()=>deleteCategory(i)} className="p-1.5 rounded-lg border border-white/10 text-gray-500 hover:text-red-400 hover:border-red-500/30 transition-colors"><Trash2 className="w-3.5 h-3.5"/></button></div></div>))}</div></div>)}

          {/* CERTIFICATES — enhanced */}
          {activeTab==='certificates'&&(
            <div>
              {sectionTitle('Certificates')}
              <div className="bg-[#0d1a17] border border-white/10 rounded-xl p-5 mb-6">
                <p className="text-white font-bold text-sm mb-4">➕ Add New Certificate</p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <Field label="Certificate Name"><Input value={certForm.name} onChange={e=>setCertForm(f=>({...f,name:e.target.value}))} placeholder="Nutritional Psychiatry Diploma"/></Field>
                  <Field label="Price (e.g. $120 or EGP 2,500)"><Input value={certForm.price} onChange={e=>setCertForm(f=>({...f,price:e.target.value}))} placeholder="$120"/></Field>
                  <Field label="Delivery Time"><Input value={certForm.delivery} onChange={e=>setCertForm(f=>({...f,delivery:e.target.value}))} placeholder="7–14 business days"/></Field>
                  <Field label="Short Description"><Input value={certForm.description} onChange={e=>setCertForm(f=>({...f,description:e.target.value}))} placeholder="Accredited by..."/></Field>
                </div>
                <Field label="Certificate Image">
                  <ImgUpload label={certUploading?'Uploading…':'Upload Certificate Image'} folder="nourishmind/certificates" currentUrl={certForm.url} onUpload={url=>setCertForm(f=>({...f,url}))}/>
                  {certForm.url&&<Input value={certForm.url} onChange={e=>setCertForm(f=>({...f,url:e.target.value}))} placeholder="URL" className="mt-2"/>}
                </Field>
                <div className="mt-4">
                  <Btn onClick={saveCertificate} disabled={savingCert||!certForm.url}>
                    <Check className="w-4 h-4"/>{savingCert?'Saving…':'Add Certificate'}
                  </Btn>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {certificates.map(cert=>{
                  const isValidImg = cert.url && (cert.url.includes('cloudinary.com') || cert.url.match(/\.(jpg|jpeg|png|webp|gif)$/i));
                  return (
                  <div key={cert.id} className="flex items-center gap-4 bg-[#0d1a17] border border-white/10 rounded-xl p-4">
                    {isValidImg
                      ? <img src={cert.url} alt={cert.alt} className="w-24 h-16 rounded-lg object-cover shrink-0 border border-white/10"/>
                      : <div className="w-24 h-16 rounded-lg bg-red-500/10 border border-red-500/30 flex flex-col items-center justify-center shrink-0 text-center px-1">
                          <p className="text-red-400 text-[9px] font-bold">⚠️ Invalid URL</p>
                          <p className="text-red-300 text-[8px] mt-0.5 break-all line-clamp-2">{cert.url?.slice(0,40)}</p>
                        </div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{cert.alt||'Untitled'}</p>
                      <div className="flex gap-3 mt-1 flex-wrap">
                        {cert.price&&<span className="text-primary text-xs font-bold">{cert.price}</span>}
                        {cert.delivery&&<span className="text-gray-500 text-xs">⏱ {cert.delivery}</span>}
                      </div>
                      {!isValidImg && <p className="text-red-400 text-[10px] mt-1">URL غير صالحة — احذف هذه الشهادة</p>}
                    </div>
                    <button onClick={()=>deleteCert(cert.id)}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-colors">
                      <Trash2 className="w-3.5 h-3.5"/> Delete
                    </button>
                  </div>
                  );
                })}
                {!certificates.length&&<p className="text-gray-600 text-sm">No certificates yet.</p>}
              </div>
            </div>
          )}

          {/* CERT REQUESTS */}
          {activeTab==='cert_requests'&&(
            <div>
              {sectionTitle('Certificate Requests')}
              {certRequests.length===0
                ? <p className="text-gray-600 text-sm">No requests yet.</p>
                : <div className="flex flex-col gap-3">
                    {certRequests.map(req=>(
                      <div key={req.id} className="bg-[#0d1a17] border border-white/10 rounded-xl p-5">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-white font-bold text-sm">{req.name}</p>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${req.status==='pending'?'bg-yellow-500/20 text-yellow-400':'bg-green-500/20 text-green-400'}`}>
                                {req.status||'pending'}
                              </span>
                            </div>
                            <p className="text-gray-400 text-xs">{req.userEmail}</p>
                            <p className="text-gray-400 text-xs mt-0.5">📱 {req.phone}</p>
                            {req.bestTime&&<p className="text-gray-500 text-xs mt-0.5">⏰ Best time: {req.bestTime}</p>}
                          </div>
                          <div className="text-right">
                            <p className="text-primary text-xs font-bold">{req.certName}</p>
                            <p className="text-gray-500 text-xs mt-1">{req.createdAt?.toDate?.().toLocaleDateString?.()}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <a href={`https://wa.me/${contact.whatsapp?.replace(/[^0-9]/g,'')}?text=${encodeURIComponent(`Hello ${req.name}, regarding your certificate request for "${req.certName}"...`)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold"
                            style={{background:'rgba(37,211,102,0.1)',border:'1px solid rgba(37,211,102,0.25)',color:'#25D366',textDecoration:'none'}}>
                            💬 Reply on WhatsApp
                          </a>
                          {req.status==='pending'&&(
                            <button onClick={async()=>{await updateDoc(doc(db,'certificate_requests',req.id),{status:'done'});}}
                              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold"
                              style={{background:'rgba(74,155,142,0.1)',border:'1px solid rgba(74,155,142,0.25)',color:'#5fbfb0',cursor:'pointer'}}>
                              <Check size={12}/> Mark Done
                            </button>
                          )}
                          <button onClick={async()=>{if(!confirm('Delete?'))return;await deleteDoc(doc(db,'certificate_requests',req.id));}}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold"
                            style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',color:'#ef4444',cursor:'pointer'}}>
                            <Trash2 size={12}/> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>
          )}

          {/* REVIEWS */}
          {activeTab==='reviews'&&(<div>{sectionTitle('Reviews')}<div className="bg-[#0d1a17] border border-white/10 rounded-xl p-5 mb-6"><p className="text-white font-bold text-sm mb-4">➕ Add New Review</p><div className="grid grid-cols-2 gap-4 mb-3"><Field label="Name *"><Input value={newReview.name} onChange={e=>setNewReview(r=>({...r,name:e.target.value}))} placeholder="Dr. Sarah K."/></Field><Field label="Rating (1–5)"><select value={newReview.rating} onChange={e=>setNewReview(r=>({...r,rating:Number(e.target.value)}))} className="w-full bg-[#0a1412] border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">{[5,4,3,2,1].map(n=><option key={n} value={n}>{'★'.repeat(n)} ({n})</option>)}</select></Field><Field label="Location / Title"><Input value={newReview.location} onChange={e=>setNewReview(r=>({...r,location:e.target.value}))} placeholder="Cairo, Egypt · Physician"/></Field><Field label="Avatar URL"><Input value={newReview.avatar} onChange={e=>setNewReview(r=>({...r,avatar:e.target.value}))} placeholder="https://…"/></Field></div><Field label="Review Text *"><Textarea value={newReview.text} onChange={e=>setNewReview(r=>({...r,text:e.target.value}))} placeholder="Write review…" rows={3}/></Field><div className="mt-4"><Btn onClick={addReview} disabled={savingReview}><Check className="w-4 h-4"/>{savingReview?'Saving…':'Add Review'}</Btn></div></div><div className="flex flex-col gap-3">{reviews.map(r=>(<div key={r.id} className="flex items-start gap-4 bg-[#0d1a17] border border-white/10 rounded-xl p-4">{r.avatar?<img src={r.avatar} alt={r.name} style={{width:40,height:40,borderRadius:'50%',objectFit:'cover',flexShrink:0}}/>:<div style={{width:40,height:40,borderRadius:'50%',background:'rgba(74,155,142,0.15)',display:'flex',alignItems:'center',justifyContent:'center',color:'#5fbfb0',fontWeight:700,flexShrink:0}}>{r.name?.[0]||'?'}</div>}<div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><p className="text-white font-semibold text-sm">{r.name}</p><span className="text-yellow-400 text-xs">{'★'.repeat(r.rating||5)}</span></div><p className="text-gray-400 text-sm line-clamp-2">{r.text}</p>{r.location&&<p className="text-gray-600 text-xs mt-1">{r.location}</p>}</div><button onClick={()=>deleteReview(r.id)} className="p-2 rounded-lg border border-white/10 text-gray-500 hover:text-red-400 hover:border-red-500/30 transition-colors shrink-0"><Trash2 className="w-4 h-4"/></button></div>))}{!reviews.length&&<p className="text-gray-600 text-sm">No reviews yet.</p>}</div></div>)}

          {/* PRICING */}
          {activeTab==='pricing'&&(<div>{sectionTitle('Pricing',<Btn onClick={savePricing} disabled={savingPricing}><Check className="w-4 h-4"/>{savingPricing?'Saving…':'Save Pricing'}</Btn>)}<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">{pricingPlans.map((plan,i)=>(<div key={plan.id} className="bg-[#0d1a17] border border-white/10 rounded-2xl p-6 flex flex-col gap-4"><div className="flex items-center justify-between"><p className="text-white font-bold">{plan.name}</p>{plan.badge&&<span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full font-bold">{plan.badge}</span>}</div><div className="flex items-end gap-1"><span className="text-3xl font-black text-white">${plan.price_usd}</span><span className="text-gray-500 text-sm mb-1">/ {plan.period}</span></div><div className="flex flex-col gap-2"><Field label="Price (USD)"><Input type="number" value={plan.price_usd} onChange={e=>setPricingPlans(prev=>prev.map((p,j)=>j===i?{...p,price_usd:parseFloat(e.target.value)||0}:p))}/></Field><Field label="Period"><Input value={plan.period} onChange={e=>setPricingPlans(prev=>prev.map((p,j)=>j===i?{...p,period:e.target.value}:p))}/></Field><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={!!plan.highlighted} onChange={e=>setPricingPlans(prev=>prev.map((p,j)=>j===i?{...p,highlighted:e.target.checked}:p))} className="accent-primary w-4 h-4"/><span className="text-sm text-gray-300">Highlighted</span></label></div><div><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Features</p>{plan.features?.map((f,fi)=>(<div key={fi} className="flex items-center gap-2 mb-1.5"><Input value={f} onChange={e=>setPricingPlans(prev=>prev.map((p,j)=>{if(j!==i)return p;const features=[...p.features];features[fi]=e.target.value;return{...p,features};}))}/><button onClick={()=>setPricingPlans(prev=>prev.map((p,j)=>{if(j!==i)return p;return{...p,features:p.features.filter((_,k)=>k!==fi)};}))} className="text-gray-500 hover:text-red-400 shrink-0"><X className="w-4 h-4"/></button></div>))}<button onClick={()=>setPricingPlans(prev=>prev.map((p,j)=>j===i?{...p,features:[...(p.features||[]),''] }:p))} className="text-primary text-xs hover:underline flex items-center gap-1 mt-1"><Plus className="w-3 h-3"/>Add feature</button></div></div>))}</div></div>)}

          {/* USERS */}
          {activeTab==='users'&&(<div>{sectionTitle('Users')}<div className="relative mb-6 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"/><Input value={userSearch} onChange={e=>setUserSearch(e.target.value)} placeholder="Search by email or name..." className="pl-9"/></div><div className="flex flex-col gap-3">{filteredUsers.map(user=>(<details key={user.id} className="bg-[#0d1a17] border border-white/10 rounded-xl overflow-hidden"><summary className="flex items-center gap-4 p-4 cursor-pointer list-none hover:bg-white/5 transition-colors">{user.avatar?<img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover shrink-0 border border-white/10"/>:<div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">{user.name?.[0]?.toUpperCase()||user.email?.[0]?.toUpperCase()||'?'}</div>}<div className="flex-1 min-w-0"><p className="text-white font-semibold text-sm truncate">{user.name||'No name'}</p><div className="flex gap-3 text-xs text-gray-500 flex-wrap"><span>{user.email}</span>{user.phone&&<span>{user.phone}</span>}</div></div><div className="flex items-center gap-2 shrink-0"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${user.status==='suspended'?'bg-red-500/20 text-red-400':user.role==='admin'?'bg-primary/20 text-primary':'bg-white/5 text-gray-400'}`}>{user.status==='suspended'?'Suspended':user.role||'student'}</span><span className="text-xs text-gray-500">{user.enrolledCourses?.length||0} courses</span><ChevronDown className="w-4 h-4 text-gray-500"/></div></summary><div className="border-t border-white/10 p-5 flex flex-col gap-5"><div><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Edit Name</p><div className="flex gap-2"><Input defaultValue={user.name||''} id={`name-${user.id}`} placeholder="Full name" className="max-w-xs"/><Btn onClick={async()=>{const val=document.getElementById('name-'+user.id)?.value;if(!val)return;await updateDoc(doc(db,'users',user.id),{name:val});}}><Check className="w-4 h-4"/>Save</Btn></div></div><div><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Enrolled Courses</p><div className="flex flex-wrap gap-2 mb-3">{user.enrolledCourses?.map(cid=>{const c=courses.find(x=>x.id===cid);return(<div key={cid} className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-xs px-2 py-1 rounded-lg">{c?.title||cid}<button onClick={async()=>{const updated=(user.enrolledCourses||[]).filter(id=>id!==cid);await updateDoc(doc(db,'users',user.id),{enrolledCourses:updated});}} className="text-red-400 hover:text-red-300 ml-1 font-bold">x</button></div>);})}  {!user.enrolledCourses?.length&&<p className="text-gray-600 text-xs">No courses enrolled</p>}</div><div className="flex gap-2"><select id={`enroll-${user.id}`} className="bg-[#0a1412] border border-white/10 text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-primary"><option value="">Add to course...</option>{courses.filter(c=>!user.enrolledCourses?.includes(c.id)).map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select><Btn variant="ghost" className="text-xs py-1.5" onClick={async()=>{const sel=document.getElementById('enroll-'+user.id);if(!sel?.value)return;const updated=[...(user.enrolledCourses||[]),sel.value];await updateDoc(doc(db,'users',user.id),{enrolledCourses:updated});sel.value='';}}><Plus className="w-3 h-3"/>Enroll</Btn></div></div><div className="flex gap-2 pt-2 border-t border-white/10">{user.status==='suspended'?<Btn variant="ghost" className="text-xs" onClick={async()=>{await updateDoc(doc(db,'users',user.id),{status:'active'});}}>Activate Account</Btn>:<Btn variant="danger" className="text-xs" onClick={async()=>{if(!confirm('Suspend '+(user.name||user.email)+'?'))return;await updateDoc(doc(db,'users',user.id),{status:'suspended'});}}>Suspend Account</Btn>}</div></div></details>))}{!filteredUsers.length&&<p className="text-gray-600 text-sm">No users found.</p>}</div></div>)}

          {/* HERO */}
          {activeTab==='stats'&&(<div>
  {sectionTitle('Stats Strip',<Btn onClick={saveStats} disabled={savingStats}><Check className="w-4 h-4"/>{savingStats?'Saving…':'Save Stats'}</Btn>)}
  <div className="bg-[#0d1a17] border border-white/10 rounded-xl p-5 flex flex-col gap-5">
    <div>
      <p className="text-white font-bold text-sm mb-1">📊 Stats Strip</p>
      <p className="text-xs text-gray-500 mb-4">الأرقام دي بتظهر في الـ stats bar في الصفحة الرئيسية. عدد الكورسات المعتمدة بيتحسب تلقائياً من الكورسات اللي عليها ✓ CME Accredited.</p>
    </div>
    <Field label="Enrolled Learners (Base Number)">
      <p className="text-xs text-gray-500 mb-1">الرقم الابتدائي — الموقع بيزود +5 كل دقيقة تلقائياً</p>
      <Input type="number" value={stats.enrolledBase} onChange={e=>setStats(s=>({...s,enrolledBase:e.target.value}))} placeholder="2400" min="0"/>
    </Field>
    <Field label="Completion Rate">
      <p className="text-xs text-gray-500 mb-1">بيظهر زي ما هو (مثال: 96%)</p>
      <Input value={stats.completionRate} onChange={e=>setStats(s=>({...s,completionRate:e.target.value}))} placeholder="96%"/>
    </Field>
    <div className="bg-black/20 border border-white/5 rounded-lg p-4">
      <p className="text-xs text-gray-400 mb-2">📌 Preview:</p>
      <div className="grid grid-cols-4 gap-3 text-center">
        {[
          {v:stats.enrolledBase+'+',l:'Enrolled Learners'},
          {v:'Auto',l:'Accredited Courses'},
          {v:stats.completionRate,l:'Completion Rate'},
          {v:'Internationally Accredited',l:''}
        ].map((s,i)=>(
          <div key={i} className="bg-white/3 rounded-lg p-3">
            <p className="text-primary font-bold text-lg" style={{fontFamily:"'Playfair Display',serif"}}>{s.v}</p>
            {s.l&&<p className="text-gray-500 text-xs mt-1">{s.l}</p>}
          </div>
        ))}
      </div>
    </div>
  </div>
</div>)}
{activeTab==='carousel'&&(<div>
  {sectionTitle('Hero Carousel',<Btn onClick={saveHeroCarousel} disabled={savingSlides}><Check className="w-4 h-4"/>{savingSlides?'Saving…':'Save Carousel'}</Btn>)}
  <div className="bg-[#0d1a17] border border-white/10 rounded-xl p-5 mb-5">
    <div className="flex items-center justify-between mb-4">
      <div>
        <p className="text-white font-bold text-sm">Carousel Slides</p>
        <p className="text-xs text-gray-500 mt-0.5">Each slide = one full-screen hero. Drag to reorder with ↑↓ buttons.</p>
      </div>
      <Btn onClick={()=>openSlide(null)} variant="ghost"><Plus className="w-4 h-4"/>Add Slide</Btn>
    </div>
    {heroSlides.length===0&&<p className="text-gray-600 text-sm text-center py-8">No slides yet — add your first slide above.</p>}
    <div className="flex flex-col gap-3">
      {heroSlides.map((s,i)=>(
        <div key={s.id||i} className="flex items-center gap-3 bg-[#111] border border-white/8 rounded-xl p-4">
          {s.backgroundImage&&<img src={s.backgroundImage} alt="" className="w-20 h-14 object-cover rounded-lg flex-shrink-0 border border-white/10" onError={e=>e.target.style.display='none'}/>}
          {!s.backgroundImage&&<div className="w-20 h-14 rounded-lg flex-shrink-0 bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">🎬</div>}
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm truncate">{s.title||'(no title)'}</p>
            <p className="text-gray-500 text-xs mt-0.5 truncate">{s.badge||''} {s.cta1Label||''}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={()=>moveSlide(i,-1)} disabled={i===0} className="p-1.5 text-gray-500 hover:text-white disabled:opacity-20">↑</button>
            <button onClick={()=>moveSlide(i,1)} disabled={i===heroSlides.length-1} className="p-1.5 text-gray-500 hover:text-white disabled:opacity-20">↓</button>
            <Btn variant="ghost" onClick={()=>openSlide(i)} className="text-xs px-3 py-1.5"><Pencil className="w-3 h-3"/>Edit</Btn>
            <Btn variant="danger" onClick={()=>deleteSlide(i)} className="text-xs px-3 py-1.5"><Trash2 className="w-3 h-3"/></Btn>
          </div>
        </div>
      ))}
    </div>
  </div>
  {editingSlide!==undefined&&(
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={()=>setEditingSlide(undefined)}>
      <div className="bg-[#0d1a17] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h3 className="text-white font-bold">{editingSlide===null?'New Slide':'Edit Slide'}</h3>
          <button onClick={()=>setEditingSlide(undefined)} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <Field label="Badge (top eyebrow text)"><Input value={slideForm.badge||''} onChange={e=>setSlideForm(f=>({...f,badge:e.target.value}))} placeholder="NOURISHMIND · CME Accredited"/></Field>
          <Field label="Title (use \n for line breaks)"><Textarea value={slideForm.title||''} onChange={e=>setSlideForm(f=>({...f,title:e.target.value}))} rows={3} placeholder={"Nutritional\nPsychiatry\nDiploma"}/></Field>
          <Field label="Description"><Textarea value={slideForm.description||''} onChange={e=>setSlideForm(f=>({...f,description:e.target.value}))} rows={2} placeholder="Short description shown below title"/></Field>
          <Field label="Background Type">
            <div className="flex gap-2">
              {[{v:'image',label:'🖼️ Image'},{v:'video',label:'🎥 Bunny Video'}].map(({v,label})=>(
                <button key={v} onClick={()=>setSlideForm(f=>({...f,type:v}))} className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${(slideForm.type||'image')===v?'bg-primary text-white border-primary':'border-white/10 text-gray-400 hover:text-white'}`}>{label}</button>
              ))}
            </div>
          </Field>
          {(slideForm.type||'image')==='image'?(
            <Field label="Background Image">
              <ImgUpload label="Upload Image" folder="nourishmind/hero" currentUrl={slideForm.backgroundImage} onUpload={url=>setSlideForm(f=>({...f,backgroundImage:url}))}/>
              <Input value={slideForm.backgroundImage||''} onChange={e=>setSlideForm(f=>({...f,backgroundImage:e.target.value}))} placeholder="Or paste URL…" className="mt-1"/>
            </Field>
          ):(
            <Field label="Bunny Video ID"><Input value={slideForm.backgroundVideoId||''} onChange={e=>setSlideForm(f=>({...f,backgroundVideoId:e.target.value}))} placeholder="a1b2c3d4-xxxx-xxxx-xxxx-xxxxxxxxxxxx"/></Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Button 1 Text"><Input value={slideForm.cta1Label||''} onChange={e=>setSlideForm(f=>({...f,cta1Label:e.target.value}))} placeholder="Enroll Now"/></Field>
            <Field label="Button 1 Link"><Input value={slideForm.cta1Link||''} onChange={e=>setSlideForm(f=>({...f,cta1Link:e.target.value}))} placeholder="/courses"/></Field>
            <Field label="Button 2 Text"><Input value={slideForm.cta2Label||''} onChange={e=>setSlideForm(f=>({...f,cta2Label:e.target.value}))} placeholder="Browse Courses"/></Field>
            <Field label="Button 2 Link"><Input value={slideForm.cta2Link||''} onChange={e=>setSlideForm(f=>({...f,cta2Link:e.target.value}))} placeholder="/courses"/></Field>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-white/10">
          <Btn variant="ghost" onClick={()=>setEditingSlide(undefined)}>Cancel</Btn>
          <Btn onClick={saveSlide}><Check className="w-4 h-4"/>Save Slide</Btn>
        </div>
      </div>
    </div>
  )}
</div>)}
{activeTab==='hero'&&(<div>{sectionTitle('Hero Section',<Btn onClick={saveHero} disabled={savingHero}><Check className="w-4 h-4"/>{savingHero?'Saving…':'Save Hero'}</Btn>)}<div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><div className="bg-[#0d1a17] border border-white/10 rounded-xl p-5 col-span-full"><p className="text-white font-bold text-sm mb-3">🎬 Background Type</p><div className="flex gap-3 mb-4">{[{v:'image',label:'🖼️ Image'},{v:'video',label:'🎥 Bunny Video'}].map(({v,label})=>(<button key={v} onClick={()=>setHero(h=>({...h,backgroundType:v}))} className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${hero.backgroundType===v?'bg-primary text-white border-primary':'border-white/10 text-gray-400 hover:text-white hover:border-white/30'}`}>{label}</button>))}</div>{hero.backgroundType==='video'?(<div className="flex flex-col gap-3"><p className="text-xs text-gray-500">Bunny Stream Video ID (من رابط الفيديو)</p><Input value={hero.backgroundVideoId||''} onChange={e=>setHero(h=>({...h,backgroundVideoId:e.target.value}))} placeholder="e.g. a1b2c3d4-xxxx-xxxx-xxxx-xxxxxxxxxxxx"/>{hero.backgroundVideoId&&(<div className="relative rounded-lg overflow-hidden" style={{height:140}}><iframe src={`https://iframe.mediadelivery.net/embed/683192/${hero.backgroundVideoId}?autoplay=1&loop=1&muted=1&controls=0&preload=true`} className="w-full h-full" style={{border:'none',pointerEvents:'none'}} allow="autoplay"/><div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center px-4"><span className="text-white font-bold text-sm">Video Preview</span></div></div>)}</div>):(<div className="flex flex-col gap-3">{hero.backgroundImage&&(<div className="relative rounded-lg overflow-hidden" style={{height:140}}><img src={hero.backgroundImage} alt="hero bg" className="w-full h-full object-cover"/><div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center px-4"><span className="text-white font-bold text-sm">Current Hero Background</span></div></div>)}<ImgUpload label="Upload New Background" folder="nourishmind/hero" currentUrl={null} onUpload={url=>setHero(h=>({...h,backgroundImage:url}))}/><Input value={hero.backgroundImage} onChange={e=>setHero(h=>({...h,backgroundImage:e.target.value}))} placeholder="Or paste URL…"/></div>)}</div><div className="bg-[#0d1a17] border border-white/10 rounded-xl p-5"><p className="text-white font-bold text-sm mb-4">📝 Text Content</p><div className="flex flex-col gap-3"><Field label="Tagline"><Input value={hero.tagline} onChange={e=>setHero(h=>({...h,tagline:e.target.value}))}/></Field><Field label="Title Line 1 (white)"><Input value={hero.title1} onChange={e=>setHero(h=>({...h,title1:e.target.value}))}/></Field><Field label="Title Line 2 (teal)"><Input value={hero.title2} onChange={e=>setHero(h=>({...h,title2:e.target.value}))}/></Field><Field label="Subtitle"><Textarea value={hero.subtitle} onChange={e=>setHero(h=>({...h,subtitle:e.target.value}))} rows={2}/></Field><Field label="Button 1 Text"><Input value={hero.cta1} onChange={e=>setHero(h=>({...h,cta1:e.target.value}))}/></Field><Field label="Button 2 Text"><Input value={hero.cta2} onChange={e=>setHero(h=>({...h,cta2:e.target.value}))}/></Field></div></div><div className="bg-[#0d1a17] border border-white/10 rounded-xl p-5"><p className="text-white font-bold text-sm mb-4">📊 Stats Bar</p><div className="flex flex-col gap-4">{[{vk:'stat1_value',lk:'stat1_label',label:'Stat 1'},{vk:'stat2_value',lk:'stat2_label',label:'Stat 2'},{vk:'stat3_value',lk:'stat3_label',label:'Stat 3'}].map(({vk,lk,label})=>(<div key={vk} className="flex gap-3"><Field label={`${label} Value`}><Input value={hero[vk]} onChange={e=>setHero(h=>({...h,[vk]:e.target.value}))} placeholder="50,000+"/></Field><Field label="Label"><Input value={hero[lk]} onChange={e=>setHero(h=>({...h,[lk]:e.target.value}))} placeholder="Students"/></Field></div>))}</div></div></div></div>)}

          {/* ABOUT */}
          {activeTab==='about'&&(<div>{sectionTitle('About Page',<Btn onClick={saveAbout} disabled={savingAbout}><Check className="w-4 h-4"/>{savingAbout?'Saving…':'Save About'}</Btn>)}<div className="bg-[#0d1a17] border border-white/10 rounded-xl p-5 mb-5"><p className="text-white font-bold text-sm mb-4">📝 Hero Section</p><div className="flex flex-col gap-3"><Field label="Badge Text"><Input value={about.badge} onChange={e=>setAbout(a=>({...a,badge:e.target.value}))}/></Field><Field label="Headline Line 1 (white)"><Input value={about.headline1} onChange={e=>setAbout(a=>({...a,headline1:e.target.value}))}/></Field><Field label="Headline Line 2 (teal)"><Input value={about.headline2} onChange={e=>setAbout(a=>({...a,headline2:e.target.value}))}/></Field><Field label="Intro Paragraph"><Textarea value={about.intro} onChange={e=>setAbout(a=>({...a,intro:e.target.value}))} rows={4}/></Field></div></div><div className="bg-[#0d1a17] border border-white/10 rounded-xl p-5 mb-5"><p className="text-white font-bold text-sm mb-4">📊 Stats Bar</p><div className="grid grid-cols-2 gap-4">{[{vk:'stat1_value',lk:'stat1_label'},{vk:'stat2_value',lk:'stat2_label'},{vk:'stat3_value',lk:'stat3_label'},{vk:'stat4_value',lk:'stat4_label'}].map(({vk,lk},i)=>(<div key={i} className="flex gap-2"><Field label={`Stat ${i+1} Value`}><Input value={about[vk]} onChange={e=>setAbout(a=>({...a,[vk]:e.target.value}))}/></Field><Field label="Label"><Input value={about[lk]} onChange={e=>setAbout(a=>({...a,[lk]:e.target.value}))}/></Field></div>))}</div></div><div className="bg-[#0d1a17] border border-white/10 rounded-xl p-5 mb-5"><p className="text-white font-bold text-sm mb-4">💡 Values / Mission Cards</p><div className="grid grid-cols-1 lg:grid-cols-3 gap-4">{[1,2,3].map(n=>(<div key={n} className="flex flex-col gap-2"><Field label={`Card ${n} Title`}><Input value={about[`val${n}_title`]} onChange={e=>setAbout(a=>({...a,[`val${n}_title`]:e.target.value}))}/></Field><Field label="Description"><Textarea value={about[`val${n}_desc`]} onChange={e=>setAbout(a=>({...a,[`val${n}_desc`]:e.target.value}))} rows={3}/></Field></div>))}</div></div><div className="bg-[#0d1a17] border border-white/10 rounded-xl p-5"><div className="flex items-center justify-between mb-4"><p className="text-white font-bold text-sm">👥 Team Members</p><Btn variant="ghost" onClick={addTeamMember} className="text-xs"><Plus className="w-3 h-3"/>Add Member</Btn></div><div className="flex flex-col gap-5">{about.team.map((m,i)=>(<div key={i} className="border border-white/10 rounded-xl p-4 flex flex-col gap-3"><div className="flex items-center justify-between"><p className="text-white text-sm font-semibold">{m.name||`Member ${i+1}`}</p><button onClick={()=>removeTeamMember(i)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4"/></button></div><div className="grid grid-cols-2 gap-3"><Field label="Name"><Input value={m.name} onChange={e=>setTeamMember(i,'name',e.target.value)}/></Field><Field label="Role"><Input value={m.role} onChange={e=>setTeamMember(i,'role',e.target.value)}/></Field></div><Field label="Bio"><Textarea value={m.bio} onChange={e=>setTeamMember(i,'bio',e.target.value)} rows={2}/></Field><Field label="Photo"><ImgUpload label="Upload Photo" folder="nourishmind/team" currentUrl={m.avatar} onUpload={url=>setTeamMember(i,'avatar',url)}/><Input value={m.avatar} onChange={e=>setTeamMember(i,'avatar',e.target.value)} placeholder="https://…" className="mt-1"/></Field></div>))}</div></div></div>)}

          {/* COURSE PAGE */}
          {activeTab==='coursepage'&&(<div>{sectionTitle('Course Page Defaults',<Btn onClick={saveCoursePage} disabled={savingCoursePage}><Check className="w-4 h-4"/>{savingCoursePage?'Saving…':'Save'}</Btn>)}<div className="bg-[#0d1a17] border border-white/10 rounded-xl p-5"><p className="text-white font-bold text-sm mb-3">✅ Default "What You Get" List</p><p className="text-xs text-gray-500 mb-3">كل سطر = item واحد.</p><Textarea value={coursePage.default_what_you_get} onChange={e=>setCoursePage(cp=>({...cp,default_what_you_get:e.target.value}))} rows={6} placeholder={"Expert-led video lessons\nCertificate of completion\nLifetime access\nMobile & desktop access"}/></div></div>)}

          {/* CONTACT / WHATSAPP */}
          {activeTab==='contact'&&(
            <div>
              {sectionTitle('Contact & WhatsApp', <Btn onClick={saveContact} disabled={savingContact}><Check className="w-4 h-4"/>{savingContact?'Saving…':'Save'}</Btn>)}
              <div className="bg-[#0d1a17] border border-white/10 rounded-xl p-6 max-w-lg">
                <p className="text-white font-bold text-sm mb-1">📱 WhatsApp Number</p>
                <p className="text-gray-500 text-xs mb-4">Used for the floating WhatsApp button, "Contact us" in the player, and "Book a session" messages. Include country code.</p>
                <Field label="WhatsApp Number (e.g. +201012345678)">
                  <Input value={contact.whatsapp} onChange={e=>setContact(c=>({...c,whatsapp:e.target.value}))} placeholder="+201012345678"/>
                </Field>
                {contact.whatsapp && (
                  <a href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g,'')}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-3 text-xs px-3 py-1.5 rounded-lg"
                    style={{background:'rgba(37,211,102,0.1)',border:'1px solid rgba(37,211,102,0.25)',color:'#25D366',textDecoration:'none'}}>
                    💬 Test Link
                  </a>
                )}
              </div>
            </div>
          )}

        </main>
      </div>

      
      {modal&&(<ModalErrorBoundary onClose={()=>setModal(null)}><CourseModal course={modal==='add'?null:modal} categories={categories} onSave={saveCourse} onClose={()=>setModal(null)}/></ModalErrorBoundary>)}
      {lessonEditor&&(<LessonEditor course={lessonEditor} onClose={(updatedSections)=>{if(updatedSections)setCourses(prev=>prev.map(c=>c.id===lessonEditor.id?{...c,sections:updatedSections}:c));setLessonEditor(null);}}/>)}
    </div>
  );
};

export default AdminPage;



