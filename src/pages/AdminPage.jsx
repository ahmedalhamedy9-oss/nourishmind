import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Pencil, Trash2, X, Check, BookOpen, Tag, Upload,
  Award, Star, MessageSquare, DollarSign, Users, Search, ChevronDown, ChevronUp
} from 'lucide-react';
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  serverTimestamp, onSnapshot, query, orderBy, setDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { PLACEHOLDER_COURSES, CATEGORIES as DEFAULT_CATS } from '@/lib/data';
import { uploadToCloudinary } from '@/lib/cloudinary';
import LessonEditor from '@/components/LessonEditor';

// ── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'courses',      label: 'Courses',      icon: BookOpen },
  { id: 'lessons',      label: 'Lessons',      icon: BookOpen },
  { id: 'categories',   label: 'Categories',   icon: Tag },
  { id: 'certificates', label: 'Certificates', icon: Award },
  { id: 'reviews',      label: 'Reviews',      icon: MessageSquare },
  { id: 'pricing',      label: 'Pricing',      icon: DollarSign },
  { id: 'users',        label: 'Users',        icon: Users },
];

// ── Shared UI ─────────────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</label>
    {children}
  </div>
);

const Input = ({ className = '', ...props }) => (
  <input
    {...props}
    className={`w-full bg-[#0a1412] border border-white/10 text-white rounded-lg px-3 py-2 text-sm
      focus:outline-none focus:border-primary placeholder-gray-600 ${className}`}
  />
);

const Textarea = ({ className = '', ...props }) => (
  <textarea
    {...props}
    className={`w-full bg-[#0a1412] border border-white/10 text-white rounded-lg px-3 py-2 text-sm
      focus:outline-none focus:border-primary placeholder-gray-600 resize-none ${className}`}
  />
);

const Btn = ({ children, onClick, disabled, variant = 'primary', className = '' }) => {
  const base = 'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40';
  const styles = {
    primary:  'bg-primary text-white hover:bg-primary/80',
    ghost:    'border border-white/10 text-gray-300 hover:text-white hover:border-white/30',
    danger:   'border border-red-500/30 text-red-400 hover:bg-red-500/10',
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
};

// ── Cloudinary Upload ─────────────────────────────────────────────────────────
const ImgUpload = ({ label, folder, currentUrl, onUpload }) => {
  const [busy, setBusy] = useState(false);
  const handle = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try { onUpload(await uploadToCloudinary(file, folder)); }
    catch (err) { alert('Upload failed: ' + err.message); }
    finally { setBusy(false); }
  };
  return (
    <div className="flex flex-col gap-2">
      {currentUrl && (
        <img src={currentUrl} alt="" className="h-20 w-auto rounded-lg object-cover border border-white/10"
          onError={e => e.target.style.display = 'none'} />
      )}
      <label className={`flex items-center gap-2 cursor-pointer border border-dashed border-white/15
        text-gray-400 hover:text-primary hover:border-primary rounded-lg px-3 py-2 text-sm transition-colors
        ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
        <Upload className="w-4 h-4" />
        {busy ? 'Uploading…' : label}
        <input type="file" accept="image/*" className="hidden" onChange={handle} />
      </label>
    </div>
  );
};

// ── Course Modal ──────────────────────────────────────────────────────────────
const EMPTY = {
  title: '', description: '', category: '', level: 'Beginner',
  duration_hours: '', students_count: '', rating: '4.5', price: '',
  featured: false, new: true, top10: false, top10_rank: '',
  image: '', previewVideo: '', instructor: '', instructor_image: '', tags: '',
};

const safe = (course) => ({
  ...EMPTY,
  ...course,
  title:           course.title            || '',
  description:     course.description      || '',
  category:        course.category         || '',
  level:           course.level            || 'Beginner',
  duration_hours:  course.duration_hours   != null ? String(course.duration_hours) : '',
  students_count:  course.students_count   != null ? String(course.students_count) : '',
  rating:          course.rating           != null ? String(course.rating) : '4.5',
  price:           course.price            != null ? String(course.price) : '',
  image:           course.image            || '',
  previewVideo:    course.previewVideo     || '',
  instructor:      course.instructor       || '',
  instructor_image: course.instructor_image || '',
  tags:            Array.isArray(course.tags) ? course.tags.join(', ') : (course.tags || ''),
  top10_rank:      course.top10_rank       != null ? String(course.top10_rank) : '',
  featured:        !!course.featured,
  new:             course.new != null ? !!course.new : true,
  top10:           !!course.top10,
});

const CourseModal = ({ course, categories, onSave, onClose }) => {
  const [form, setForm]     = useState(course ? safe(course) : EMPTY);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) { alert('Title is required'); return; }
    setSaving(true);
    try {
      await onSave({
        ...form,
        duration_hours:  parseFloat(form.duration_hours)  || 0,
        price:           parseFloat(form.price)           || 0,
        rating:          parseFloat(form.rating)          || 4.5,
        students_count:  parseInt(form.students_count)    || 0,
        top10_rank:      parseInt(form.top10_rank)        || '',
        tags: typeof form.tags === 'string'
          ? form.tags.split(',').map(t => t.trim()).filter(Boolean)
          : (form.tags || []),
      });
      onClose();
    } catch (e) { alert('Error: ' + e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-[#0d1a17] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-white font-bold text-lg">{course ? 'Edit Course' : 'Add New Course'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Fields */}
        <div className="p-6 flex flex-col gap-4">
          <Field label="Title *">
            <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Course title" />
          </Field>

          <Field label="Description">
            <Textarea value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Course description" rows={3} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="w-full bg-[#0a1412] border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </Field>

            <Field label="Level">
              <select value={form.level} onChange={e => set('level', e.target.value)}
                className="w-full bg-[#0a1412] border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
                {['Beginner', 'Intermediate', 'Advanced'].map(l => <option key={l}>{l}</option>)}
              </select>
            </Field>

            <Field label="Duration (hours)">
              <Input type="number" value={form.duration_hours} onChange={e => set('duration_hours', e.target.value)} placeholder="3.5" min="0" step="0.5" />
            </Field>

            <Field label="Price ($) — 0 = Free">
              <Input type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="49" min="0" />
            </Field>

            <Field label="Rating (0–5)">
              <Input type="number" value={form.rating} onChange={e => set('rating', e.target.value)} placeholder="4.8" min="0" max="5" step="0.1" />
            </Field>

            <Field label="Students count">
              <Input type="number" value={form.students_count} onChange={e => set('students_count', e.target.value)} placeholder="1200" min="0" />
            </Field>
          </div>

          <Field label="Instructor Name">
            <Input value={form.instructor} onChange={e => set('instructor', e.target.value)} placeholder="Dr. Ahmed Al-Hamedy" />
          </Field>

          <Field label="Instructor Photo">
            <ImgUpload label="Upload Photo" folder="nourishmind/instructors"
              currentUrl={form.instructor_image} onUpload={url => set('instructor_image', url)} />
            <Input value={form.instructor_image} onChange={e => set('instructor_image', e.target.value)}
              placeholder="https://res.cloudinary.com/…" className="mt-1" />
          </Field>

          <Field label="Course Thumbnail">
            <ImgUpload label="Upload Thumbnail" folder="nourishmind/thumbnails"
              currentUrl={form.image} onUpload={url => set('image', url)} />
            <Input value={form.image} onChange={e => set('image', e.target.value)}
              placeholder="https://res.cloudinary.com/…" className="mt-1" />
          </Field>

          <Field label="Preview Video URL (Bunny Stream)">
            <Input value={form.previewVideo} onChange={e => set('previewVideo', e.target.value)}
              placeholder="https://player.mediadelivery.net/play/LIBRARY_ID/VIDEO_ID" />
          </Field>

          <Field label="Tags (comma separated)">
            <Input value={form.tags} onChange={e => set('tags', e.target.value)}
              placeholder="Nutrition, Science, Beginner" />
          </Field>

          {/* Badges */}
          <div className="flex flex-wrap gap-5 pt-2">
            {[
              { key: 'featured', label: 'Featured' },
              { key: 'new',      label: 'Mark as New' },
              { key: 'top10',    label: '🏆 Top 10' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!form[key]} onChange={e => set(key, e.target.checked)}
                  className="accent-primary w-4 h-4" />
                <span className="text-sm text-gray-300">{label}</span>
              </label>
            ))}
            {form.top10 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Rank:</span>
                <Input type="number" min="1" max="10" value={form.top10_rank}
                  onChange={e => set('top10_rank', e.target.value)} placeholder="1–10" className="w-20" />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-white/10">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={handleSave} disabled={saving}>
            <Check className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Course'}
          </Btn>
        </div>
      </div>
    </div>
  );
};

// ── Main AdminPage ────────────────────────────────────────────────────────────
const AdminPage = () => {
  const navigate              = useNavigate();
  const { currentUser }       = useAuth();

  // ── State ──
  const [activeTab, setActiveTab]     = useState('courses');
  const [courses,   setCourses]       = useState(PLACEHOLDER_COURSES);
  const [users,     setUsers]         = useState([]);
  const [categories, setCategories]   = useState(DEFAULT_CATS);
  const [reviews,   setReviews]       = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [pricingPlans, setPricingPlans] = useState([]);
  const [modal,     setModal]         = useState(null);   // null | 'add' | course obj
  const [lessonEditor, setLessonEditor] = useState(null); // null | course obj
  const [newCat,    setNewCat]        = useState({ id: '', label: '' });
  const [certName,  setCertName]      = useState('');
  const [certUploading, setCertUploading] = useState(false);
  const [userSearch, setUserSearch]   = useState('');
  const [savingPricing, setSavingPricing] = useState(false);

  // ── Auth guard ──
  useEffect(() => {
    if (currentUser === null) navigate('/');
  }, [currentUser]);

  // ── Firestore listeners ──
  useEffect(() => {
    // Categories
    const unsubCats = onSnapshot(
      doc(db, 'settings', 'categories'),
      snap => {
        if (snap.exists() && snap.data().list?.length) setCategories(snap.data().list);
        else { setDoc(doc(db, 'settings', 'categories'), { list: DEFAULT_CATS }); setCategories(DEFAULT_CATS); }
      },
      () => setCategories(DEFAULT_CATS)
    );

    // Courses
    const qCourses = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));
    const unsubCourses = onSnapshot(qCourses,
      snap => setCourses(snap.empty ? PLACEHOLDER_COURSES : snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => {
        // fallback without orderBy if index missing
        const unsubFallback = onSnapshot(collection(db, 'courses'),
          snap => setCourses(snap.empty ? PLACEHOLDER_COURSES : snap.docs.map(d => ({ id: d.id, ...d.data() }))),
          () => setCourses(PLACEHOLDER_COURSES)
        );
        return unsubFallback;
      }
    );

    // Users
    const unsubUsers = onSnapshot(
      query(collection(db, 'users'), orderBy('createdAt', 'desc')),
      snap => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => {}
    );

    // Reviews
    const unsubReviews = onSnapshot(collection(db, 'reviews'),
      snap => setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => {}
    );

    // Certificates
    const unsubCerts = onSnapshot(collection(db, 'certificates'),
      snap => setCertificates(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => {}
    );

    // Pricing
    const unsubPricing = onSnapshot(doc(db, 'settings', 'pricing'),
      snap => {
        if (snap.exists() && snap.data().plans?.length) setPricingPlans(snap.data().plans);
        else {
          const DEFAULT = [
            { id: 'single',    name: 'Single Course',   price_usd: 49,  period: 'one-time', highlighted: false, badge: '',             features: ['1 course of your choice', 'Certificate of completion', 'Lifetime access', 'Mobile & desktop'] },
            { id: 'quarterly', name: 'Quarterly Plan',  price_usd: 89,  period: '3 months', highlighted: true,  badge: 'Most Popular', features: ['ALL subscription courses', 'New courses monthly', 'All certificates', 'Priority support'] },
            { id: 'annual',    name: 'Annual Plan',     price_usd: 249, period: 'per year', highlighted: false, badge: 'Best Value',   features: ['Everything in Quarterly', 'Save 30% vs quarterly', 'Early access', 'Live Q&A sessions'] },
          ];
          setDoc(doc(db, 'settings', 'pricing'), { plans: DEFAULT });
          setPricingPlans(DEFAULT);
        }
      },
      () => {}
    );

    return () => { unsubCats(); unsubCourses(); unsubUsers(); unsubReviews(); unsubCerts(); unsubPricing(); };
  }, []);

  // ── Course CRUD ──
  const saveCourse = async (data) => {
    const { id, ...rest } = data;
    if (id && id.length > 10) {
      await updateDoc(doc(db, 'courses', id), { ...rest, updatedAt: serverTimestamp() });
    } else {
      await addDoc(collection(db, 'courses'), { ...rest, createdAt: serverTimestamp() });
    }
  };

  const deleteCourse = async (id) => {
    if (!confirm('Delete this course?')) return;
    if (id && id.length > 10) await deleteDoc(doc(db, 'courses', id));
    else setCourses(prev => prev.filter(c => c.id !== id));
  };

  // ── Category CRUD ──
  const addCategory = async () => {
    if (!newCat.id.trim() || !newCat.label.trim()) return;
    const updated = [...categories, newCat];
    setCategories(updated);
    setNewCat({ id: '', label: '' });
    await setDoc(doc(db, 'settings', 'categories'), { list: updated });
  };

  const deleteCategory = async (idx) => {
    const updated = categories.filter((_, i) => i !== idx);
    setCategories(updated);
    await setDoc(doc(db, 'settings', 'categories'), { list: updated });
  };

  // ── Certificate CRUD ──
  const handleCertUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCertUploading(true);
    try {
      const url = await uploadToCloudinary(file, 'nourishmind/certificates');
      const name = certName.trim() || file.name;
      await addDoc(collection(db, 'certificates'), { url, alt: name, createdAt: serverTimestamp() });
      setCertName('');
    } catch (err) { alert('Upload failed: ' + err.message); }
    finally { setCertUploading(false); }
  };

  const deleteCert = async (id) => {
    if (!confirm('Delete this certificate?')) return;
    await deleteDoc(doc(db, 'certificates', id));
  };

  // ── Review CRUD ──
  const deleteReview = async (id) => {
    if (!confirm('Delete this review?')) return;
    await deleteDoc(doc(db, 'reviews', id));
  };

  // ── Pricing save ──
  const savePricing = async () => {
    setSavingPricing(true);
    try { await setDoc(doc(db, 'settings', 'pricing'), { plans: pricingPlans, updatedAt: serverTimestamp() }); }
    catch (e) { alert('Error: ' + e.message); }
    finally { setSavingPricing(false); }
  };

  // ── Render helpers ──
  const sectionTitle = (title, action) => (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-extrabold text-white">{title}</h1>
      {action}
    </div>
  );

  const filteredUsers = users.filter(u =>
    !userSearch || u.email?.toLowerCase().includes(userSearch.toLowerCase()) || u.name?.toLowerCase().includes(userSearch.toLowerCase())
  );

  // ── JSX ──
  return (
    <div className="min-h-screen flex flex-col bg-[#0a1412] font-sans">

      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-14 bg-[#0d1a17] border-b border-white/10 flex items-center px-6 gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-black text-sm">N</span>
          </div>
          <span className="text-white font-bold">Admin Panel</span>
        </div>
        <span className="text-gray-500 text-sm">|</span>
        <span className="text-gray-400 text-sm">{currentUser?.email}</span>
        <div className="ml-auto">
          <Btn variant="ghost" onClick={() => navigate('/')}>
            <span className="text-xs">View Site</span>
          </Btn>
        </div>
      </div>

      <div className="flex pt-14 min-h-screen">

        {/* Sidebar */}
        <aside className="fixed top-14 left-0 bottom-0 w-48 bg-[#0d1a17] border-r border-white/10 flex flex-col pt-4 overflow-y-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors text-left
                  ${active ? 'text-white bg-primary/15 border-r-2 border-primary' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <Icon className="w-4 h-4 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </aside>

        {/* Main */}
        <main className="ml-48 flex-1 p-8 overflow-y-auto">

          {/* ══ COURSES ══════════════════════════════════════════════════════ */}
          {activeTab === 'courses' && (
            <div>
              {sectionTitle(`Courses`, (
                <Btn onClick={() => setModal('add')}>
                  <Plus className="w-4 h-4" /> Add Course
                </Btn>
              ))}
              <p className="text-gray-500 text-sm mb-6">{courses.length} total</p>

              <div className="flex flex-col gap-3">
                {courses.map(course => (
                  <div key={course.id}
                    className="flex items-center gap-4 bg-[#0d1a17] border border-white/10 rounded-xl p-4 hover:border-primary/30 transition-colors">
                    {/* Thumbnail */}
                    <div className="w-16 h-10 rounded-lg overflow-hidden bg-white/5 shrink-0">
                      {course.image
                        ? <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-xl">🧠</div>
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="text-white font-semibold text-sm truncate">{course.title}</p>
                        {course.featured && <span className="bg-primary/20 text-primary text-[10px] px-1.5 py-0.5 rounded font-bold">Featured</span>}
                        {course.new      && <span className="bg-green-500/20 text-green-400 text-[10px] px-1.5 py-0.5 rounded font-bold">New</span>}
                        {course.top10    && <span className="bg-yellow-500/20 text-yellow-400 text-[10px] px-1.5 py-0.5 rounded font-bold">🏆 #{course.top10_rank}</span>}
                      </div>
                      <div className="flex gap-3 text-xs text-gray-500 flex-wrap">
                        {course.price != null && <span className="text-primary font-bold">${course.price}</span>}
                        {course.level         && <span>{course.level}</span>}
                        {course.duration_hours && <span>{course.duration_hours}h</span>}
                        {course.category      && <span>{course.category}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Btn variant="ghost" onClick={() => setLessonEditor(course)} className="text-xs px-3 py-1.5">
                        📚 Lessons
                      </Btn>
                      <button onClick={() => setModal(course)}
                        className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-primary/40 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteCourse(course.id)}
                        className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-red-400 hover:border-red-500/30 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ LESSONS ══════════════════════════════════════════════════════ */}
          {activeTab === 'lessons' && (
            <div>
              {sectionTitle('Lessons')}
              <p className="text-gray-500 text-sm mb-6">Select a course to edit its sections and lessons</p>
              <select
                onChange={e => {
                  const c = courses.find(x => x.id === e.target.value);
                  if (c) setLessonEditor(c);
                }}
                defaultValue=""
                className="w-full max-w-sm bg-[#0d1a17] border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary mb-4">
                <option value="" disabled>— Choose a course —</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              <p className="text-gray-600 text-sm">Or click 📚 Lessons button next to any course in the Courses tab.</p>
            </div>
          )}

          {/* ══ CATEGORIES ═══════════════════════════════════════════════════ */}
          {activeTab === 'categories' && (
            <div>
              {sectionTitle('Categories')}

              {/* Add new */}
              <div className="bg-[#0d1a17] border border-white/10 rounded-xl p-5 mb-6">
                <p className="text-white font-semibold text-sm mb-4">Add New Category</p>
                <div className="flex gap-3 flex-wrap">
                  <Input value={newCat.id} onChange={e => setNewCat(p => ({ ...p, id: e.target.value }))}
                    placeholder="id (e.g. gut-brain)" className="flex-1 min-w-40" />
                  <Input value={newCat.label} onChange={e => setNewCat(p => ({ ...p, label: e.target.value }))}
                    placeholder="Label (e.g. Gut-Brain Axis)" className="flex-1 min-w-40" />
                  <Btn onClick={addCategory}><Plus className="w-4 h-4" /> Add</Btn>
                </div>
              </div>

              {/* List */}
              <div className="flex flex-col gap-2">
                {categories.map((cat, i) => (
                  <div key={cat.id}
                    className="flex items-center justify-between bg-[#0d1a17] border border-white/10 rounded-xl px-5 py-3">
                    <div>
                      <p className="text-white font-semibold text-sm">{cat.label}</p>
                      <p className="text-gray-500 text-xs font-mono">{cat.id}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-600 text-xs">{courses.filter(c => c.category === cat.id).length} courses</span>
                      <button onClick={() => deleteCategory(i)}
                        className="p-1.5 rounded-lg border border-white/10 text-gray-500 hover:text-red-400 hover:border-red-500/30 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ CERTIFICATES ═════════════════════════════════════════════════ */}
          {activeTab === 'certificates' && (
            <div>
              {sectionTitle('Certificates')}

              {/* Upload */}
              <div className="bg-[#0d1a17] border border-white/10 rounded-xl p-5 mb-6">
                <p className="text-white font-semibold text-sm mb-4">Upload New Certificate</p>
                <div className="flex gap-3 flex-wrap items-end">
                  <div className="flex-1 min-w-48">
                    <Field label="Name (optional)">
                      <Input value={certName} onChange={e => setCertName(e.target.value)} placeholder="Certificate name" />
                    </Field>
                  </div>
                  <label className={`flex items-center gap-2 cursor-pointer bg-primary text-white rounded-lg px-4 py-2 text-sm font-semibold
                    ${certUploading ? 'opacity-50 pointer-events-none' : 'hover:bg-primary/80'}`}>
                    <Upload className="w-4 h-4" />
                    {certUploading ? 'Uploading…' : 'Upload Image'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleCertUpload} />
                  </label>
                </div>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {certificates.map(cert => (
                  <div key={cert.id} className="relative group rounded-xl overflow-hidden border border-white/10 aspect-video bg-white/5">
                    <img src={cert.url} alt={cert.alt} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button onClick={() => deleteCert(cert.id)}
                        className="p-2 rounded-lg bg-red-500/80 text-white hover:bg-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {cert.alt && <p className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] px-2 py-1 truncate">{cert.alt}</p>}
                  </div>
                ))}
                {!certificates.length && <p className="text-gray-600 text-sm col-span-4">No certificates yet.</p>}
              </div>
            </div>
          )}

          {/* ══ REVIEWS ══════════════════════════════════════════════════════ */}
          {activeTab === 'reviews' && (
            <div>
              {sectionTitle('Reviews')}
              <div className="flex flex-col gap-3">
                {reviews.map(r => (
                  <div key={r.id}
                    className="flex items-start gap-4 bg-[#0d1a17] border border-white/10 rounded-xl p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white font-semibold text-sm">{r.name}</p>
                        <span className="text-yellow-400 text-xs">{'★'.repeat(r.rating || 5)}</span>
                      </div>
                      <p className="text-gray-400 text-sm line-clamp-2">{r.text}</p>
                      {r.location && <p className="text-gray-600 text-xs mt-1">{r.location}</p>}
                    </div>
                    <button onClick={() => deleteReview(r.id)}
                      className="p-2 rounded-lg border border-white/10 text-gray-500 hover:text-red-400 hover:border-red-500/30 transition-colors shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {!reviews.length && <p className="text-gray-600 text-sm">No reviews yet.</p>}
              </div>
            </div>
          )}

          {/* ══ PRICING ══════════════════════════════════════════════════════ */}
          {activeTab === 'pricing' && (
            <div>
              {sectionTitle('Pricing', (
                <Btn onClick={savePricing} disabled={savingPricing}>
                  <Check className="w-4 h-4" /> {savingPricing ? 'Saving…' : 'Save Pricing'}
                </Btn>
              ))}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {pricingPlans.map((plan, i) => (
                  <div key={plan.id} className="bg-[#0d1a17] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <p className="text-white font-bold">{plan.name}</p>
                      {plan.badge && <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full font-bold">{plan.badge}</span>}
                    </div>
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-black text-white">${plan.price_usd}</span>
                      <span className="text-gray-500 text-sm mb-1">/ {plan.period}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Field label="Price (USD)">
                        <Input type="number" value={plan.price_usd}
                          onChange={e => setPricingPlans(prev => prev.map((p, j) => j === i ? { ...p, price_usd: parseFloat(e.target.value) || 0 } : p))} />
                      </Field>
                      <Field label="Period">
                        <Input value={plan.period}
                          onChange={e => setPricingPlans(prev => prev.map((p, j) => j === i ? { ...p, period: e.target.value } : p))} />
                      </Field>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={!!plan.highlighted}
                          onChange={e => setPricingPlans(prev => prev.map((p, j) => j === i ? { ...p, highlighted: e.target.checked } : p))}
                          className="accent-primary w-4 h-4" />
                        <span className="text-sm text-gray-300">Highlighted</span>
                      </label>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Features</p>
                      {plan.features?.map((f, fi) => (
                        <div key={fi} className="flex items-center gap-2 mb-1.5">
                          <Input value={f}
                            onChange={e => setPricingPlans(prev => prev.map((p, j) => {
                              if (j !== i) return p;
                              const features = [...p.features];
                              features[fi] = e.target.value;
                              return { ...p, features };
                            }))} />
                          <button onClick={() => setPricingPlans(prev => prev.map((p, j) => {
                            if (j !== i) return p;
                            return { ...p, features: p.features.filter((_, k) => k !== fi) };
                          }))} className="text-gray-500 hover:text-red-400 shrink-0"><X className="w-4 h-4" /></button>
                        </div>
                      ))}
                      <button
                        onClick={() => setPricingPlans(prev => prev.map((p, j) => j === i ? { ...p, features: [...(p.features || []), ''] } : p))}
                        className="text-primary text-xs hover:underline flex items-center gap-1 mt-1">
                        <Plus className="w-3 h-3" /> Add feature
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ USERS ════════════════════════════════════════════════════════ */}
          {activeTab === 'users' && (
            <div>
              {sectionTitle(`Users`)}

              {/* Search */}
              <div className="relative mb-6 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search by email or name…" className="pl-9" />
              </div>

              <div className="flex flex-col gap-3">
                {filteredUsers.map(user => (
                  <div key={user.id}
                    className="flex items-center gap-4 bg-[#0d1a17] border border-white/10 rounded-xl p-4">
                    <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                      {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{user.name || '—'}</p>
                      <p className="text-gray-500 text-xs truncate">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                        ${user.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-white/5 text-gray-400'}`}>
                        {user.role || 'student'}
                      </span>
                      {user.enrolledCourses?.length > 0 && (
                        <span className="text-xs text-gray-500">{user.enrolledCourses.length} courses</span>
                      )}
                    </div>
                  </div>
                ))}
                {!filteredUsers.length && <p className="text-gray-600 text-sm">No users found.</p>}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ── Course Modal ── */}
      {modal && (
        <CourseModal
          course={modal === 'add' ? null : modal}
          categories={categories}
          onSave={saveCourse}
          onClose={() => setModal(null)}
        />
      )}

      {/* ── Lesson Editor ── */}
      {lessonEditor && (
        <LessonEditor
          course={lessonEditor}
          onClose={(updatedSections) => {
            if (updatedSections) {
              setCourses(prev => prev.map(c =>
                c.id === lessonEditor.id ? { ...c, sections: updatedSections } : c
              ));
            }
            setLessonEditor(null);
          }}
        />
      )}
    </div>
  );
};

export default AdminPage;
// force rebuild Fri Jun 19 01:22:05 UTC 2026
