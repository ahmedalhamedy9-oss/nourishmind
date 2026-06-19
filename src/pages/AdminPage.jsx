import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, X, Check, Shield, BookOpen, Tag, Eye, Upload, Award, Star, MessageSquare, DollarSign, Users, Ban, CheckCircle, Search, ChevronDown, LayoutDashboard, Image } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, onSnapshot, query, orderBy, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { PLACEHOLDER_COURSES, CATEGORIES as DEFAULT_CATS } from '@/lib/data';
import { uploadToCloudinary } from '@/lib/cloudinary';
import LessonEditor from '@/components/LessonEditor';

const TABS = [
  { id: 'courses',      label: 'Courses',      icon: BookOpen },
  { id: 'certificates', label: 'Certificates', icon: Award },
  { id: 'categories',   label: 'Categories',   icon: Tag },
  { id: 'reviews',      label: 'Reviews',      icon: MessageSquare },
  { id: 'pricing',      label: 'Pricing',      icon: DollarSign },
  { id: 'users',        label: 'Users',        icon: Users },
  { id: 'lessons',      label: 'Lessons',      icon: BookOpen },
];

const EMPTY = {
  title: '', description: '', category: '', level: 'Beginner',
  duration_hours: '', students_count: 0, rating: 4.5, price: '',
  featured: false, new: true, top10: false, top10_rank: '', image: '', previewVideo: '',
  instructor: '', instructor_image: '', tags: '',
};

const Field = ({ label, children }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</label>
    {children}
  </div>
);

const Input = (props) => (
  <input {...props} className={`bg-background border border-border text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder-gray-600 ${props.className || ''}`} />
);

const Textarea = (props) => (
  <textarea {...props} className={`bg-background border border-border text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder-gray-600 resize-none ${props.className || ''}`} />
);

// ── Cloudinary Upload Button ──────────────────────────────────────────────────
const CloudinaryUpload = ({ onUpload, folder = 'nourishmind', label = 'Upload Image', currentUrl }) => {
  const [uploading, setUploading] = useState(false);

  const handle = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, folder);
      onUpload(url);
    } catch (err) {
      alert('Upload failed — make sure Cloudinary upload preset is set up.\n\n' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {currentUrl && (
        <img src={currentUrl} alt="preview" className="h-24 w-auto rounded-lg object-cover border border-border" onError={e => e.target.style.display='none'} />
      )}
      <label className={`flex items-center gap-2 cursor-pointer bg-background border border-border border-dashed text-gray-400 hover:border-primary hover:text-primary rounded-lg px-3 py-2 text-sm transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
        <Upload className="w-4 h-4" />
        {uploading ? 'Uploading...' : label}
        <input type="file" accept="image/*" className="hidden" onChange={handle} />
      </label>
      <p className="text-gray-600 text-xs">Or paste URL directly in the field below</p>
    </div>
  );
};

// ── Course Modal ──────────────────────────────────────────────────────────────
const CourseModal = ({ course, categories, onSave, onClose }) => {
  const [form, setForm] = useState(course || EMPTY);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) return alert('Title is required');
    setSaving(true);
    try {
      await onSave({
        ...form,
        duration_hours: parseFloat(form.duration_hours) || 0,
        price: parseFloat(form.price) || 0,
        rating: parseFloat(form.rating) || 4.5,
        tags: typeof form.tags === 'string' ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : form.tags,
      });
      onClose();
    } catch (e) { alert('Error saving: ' + e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-white font-bold text-lg">{course ? 'Edit Course' : 'Add New Course'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Title *">
            <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Course title" />
          </Field>

          <Field label="Category">
            <select value={form.category} onChange={e => set('category', e.target.value)}
              className="bg-background border border-border text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
              <option value="">Select category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>

          <div className="sm:col-span-2">
            <Field label="Description">
              <Textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Course description" rows={3} />
            </Field>
          </div>

          <Field label="Level">
            <select value={form.level} onChange={e => set('level', e.target.value)}
              className="bg-background border border-border text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
              {['Beginner', 'Intermediate', 'Advanced'].map(l => <option key={l}>{l}</option>)}
            </select>
          </Field>

          <Field label="Duration (hours)">
            <Input type="number" value={form.duration_hours} onChange={e => set('duration_hours', e.target.value)} placeholder="3.5" min="0" step="0.5" />
          </Field>

          <Field label="Price ($) — 0 for free">
            <Input type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="49" min="0" />
          </Field>

          <Field label="Rating (0-5)">
            <Input type="number" value={form.rating} onChange={e => set('rating', e.target.value)} placeholder="4.8" min="0" max="5" step="0.1" />
          </Field>

          {/* Thumbnail — Cloudinary upload */}
          <div className="sm:col-span-2">
            <Field label="Course Thumbnail">
              <CloudinaryUpload
                folder="nourishmind/thumbnails"
                label="Upload Thumbnail from Cloudinary"
                currentUrl={form.image}
                onUpload={url => set('image', url)}
              />
              <Input value={form.image} onChange={e => set('image', e.target.value)} placeholder="https://res.cloudinary.com/..." className="mt-2" />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label="Preview Video URL (Bunny Stream)">
              <Input value={form.previewVideo} onChange={e => set('previewVideo', e.target.value)} placeholder="https://player.mediadelivery.net/embed/LIBRARY_ID/VIDEO_ID" />
            </Field>
          </div>

          <Field label="Instructor Name">
            <Input value={form.instructor} onChange={e => set('instructor', e.target.value)} placeholder="Dr. Sarah Ahmed" />
          </Field>

          {/* Instructor image — Cloudinary upload */}
          <Field label="Instructor Photo">
            <CloudinaryUpload
              folder="nourishmind/instructors"
              label="Upload Instructor Photo"
              currentUrl={form.instructor_image}
              onUpload={url => set('instructor_image', url)}
            />
            <Input value={form.instructor_image} onChange={e => set('instructor_image', e.target.value)} placeholder="https://res.cloudinary.com/..." className="mt-2" />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Tags (comma separated)">
              <Input
                value={Array.isArray(form.tags) ? form.tags.join(', ') : form.tags}
                onChange={e => set('tags', e.target.value)}
                placeholder="Nutrition, Science, Beginner"
              />
            </Field>
          </div>

          <div className="flex items-center gap-6 sm:col-span-2 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.featured} onChange={e => set('featured', e.target.checked)} className="accent-primary w-4 h-4" />
              <span className="text-sm text-gray-300">Featured</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.new} onChange={e => set('new', e.target.checked)} className="accent-primary w-4 h-4" />
              <span className="text-sm text-gray-300">Mark as New</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.top10} onChange={e => set('top10', e.target.checked)} className="accent-primary w-4 h-4" />
              <span className="text-sm text-gray-300">🏆 Top 10</span>
            </label>
            {form.top10 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Rank:</span>
                <input type="number" min="1" max="10" value={form.top10_rank} onChange={e => set('top10_rank', e.target.value)} placeholder="1-10"
                  className="w-16 bg-background border border-border text-white rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-primary" />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-border">
          <button onClick={onClose} className="px-5 py-2 rounded-lg border border-border text-gray-300 hover:text-white text-sm transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">
            <Check className="w-4 h-4" />{saving ? 'Saving...' : 'Save Course'}
          </button>
        </div>
      </div>
    </div>
  );
};


// ── Inline Lesson Editor ──────────────────────────────────────────────────────
const genId = () => Math.random().toString(36).substr(2, 9);

const InlineLessonEditor = ({ course, onSave }) => {
  const [sections, setSections] = React.useState(course.sections || []);
  const [saving, setSaving] = React.useState(false);
  const [expanded, setExpanded] = React.useState(() => {
    const e = {};
    (course.sections || []).forEach(s => { e[s.id] = true; });
    return e;
  });

  const addSection = () => {
    const id = genId();
    setSections(prev => [...prev, { id, title: 'New Section', duration: '', lessons: [] }]);
    setExpanded(prev => ({ ...prev, [id]: true }));
  };

  const updateSection = (sid, key, val) =>
    setSections(prev => prev.map(s => s.id === sid ? { ...s, [key]: val } : s));

  const deleteSection = (sid) =>
    setSections(prev => prev.filter(s => s.id !== sid));

  const addLesson = (sid) =>
    setSections(prev => prev.map(s =>
      s.id === sid ? { ...s, lessons: [...(s.lessons || []), { id: genId(), title: 'New Lesson', duration: '0:00', videoUrl: '', free: false }] } : s
    ));

  const updateLesson = (sid, lid, key, val) =>
    setSections(prev => prev.map(s =>
      s.id === sid ? { ...s, lessons: s.lessons.map(l => l.id === lid ? { ...l, [key]: val } : l) } : s
    ));

  const deleteLesson = (sid, lid) =>
    setSections(prev => prev.map(s =>
      s.id === sid ? { ...s, lessons: s.lessons.filter(l => l.id !== lid) } : s
    ));

  const save = async () => {
    setSaving(true);
    try {
      const isReal = course.id && course.id.length > 10;
      if (isReal) {
        await updateDoc(doc(db, 'courses', course.id), { sections, updatedAt: serverTimestamp() });
      }
      onSave(sections);
      alert('✅ Lessons saved!');
    } catch (e) { alert('Error: ' + e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-white font-bold">{course.title}</p>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 bg-primary text-white font-bold px-5 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 text-sm">
          <Check className="w-4 h-4" /> {saving ? 'Saving...' : 'Save All Lessons'}
        </button>
      </div>

      {sections.map(section => (
        <div key={section.id} className="border border-border rounded-xl overflow-hidden">
          {/* Section header */}
          <div className="flex items-center gap-3 p-4 bg-background/50">
            <button onClick={() => setExpanded(prev => ({ ...prev, [section.id]: !prev[section.id] }))}
              className="text-gray-400 hover:text-white shrink-0">
              {expanded[section.id] ? <ChevronDown className="w-4 h-4 rotate-180" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <input value={section.title} onChange={e => updateSection(section.id, 'title', e.target.value)}
              className="flex-1 bg-transparent text-white font-bold text-sm focus:outline-none border-b border-transparent focus:border-primary"
              placeholder="Section title" />
            <input value={section.duration} onChange={e => updateSection(section.id, 'duration', e.target.value)}
              placeholder="35:15" className="w-20 bg-background border border-border text-white text-xs rounded px-2 py-1 focus:outline-none focus:border-primary" />
            <button onClick={() => deleteSection(section.id)} className="text-gray-500 hover:text-red-400 transition-colors shrink-0">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Lessons */}
          {expanded[section.id] && (
            <div className="p-3 flex flex-col gap-2">
              {section.lessons?.map(lesson => (
                <div key={lesson.id} className="flex flex-col gap-2 bg-background/30 rounded-lg p-3 border border-border/50">
                  <div className="flex items-center gap-2">
                    <input value={lesson.title} onChange={e => updateLesson(section.id, lesson.id, 'title', e.target.value)}
                      placeholder="Lesson title"
                      className="flex-1 bg-background border border-border text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-primary placeholder-gray-600" />
                    <input value={lesson.duration} onChange={e => updateLesson(section.id, lesson.id, 'duration', e.target.value)}
                      placeholder="7:45" className="w-16 bg-background border border-border text-white text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-primary" />
                    <button onClick={() => updateLesson(section.id, lesson.id, 'free', !lesson.free)}
                      className={`flex items-center gap-1 text-xs font-bold px-2.5 py-2 rounded-lg border transition-colors shrink-0 ${lesson.free ? 'border-green-500/40 text-green-400 bg-green-500/10' : 'border-border text-gray-500 hover:border-primary'}`}>
                      {lesson.free ? '🔓 Free' : '🔒 Paid'}
                    </button>
                    <button onClick={() => deleteLesson(section.id, lesson.id)} className="text-gray-500 hover:text-red-400 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <input value={lesson.videoUrl} onChange={e => updateLesson(section.id, lesson.id, 'videoUrl', e.target.value)}
                    placeholder="Bunny Stream URL: https://player.mediadelivery.net/embed/LIBRARY_ID/VIDEO_ID"
                    className="w-full bg-background border border-border text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-primary placeholder-gray-600" />
                </div>
              ))}
              <button onClick={() => addLesson(section.id)}
                className="flex items-center gap-2 text-primary text-sm hover:text-primary/80 mt-1">
                <Plus className="w-4 h-4" /> Add Lesson
              </button>
            </div>
          )}
        </div>
      ))}

      <button onClick={addSection}
        className="flex items-center gap-2 bg-white/5 border border-dashed border-border text-gray-300 hover:text-white hover:border-primary rounded-xl px-4 py-3 text-sm transition-colors">
        <Plus className="w-4 h-4" /> Add Section
      </button>
    </div>
  );
};

// ── Main Admin Page ───────────────────────────────────────────────────────────
const AdminPage = () => {
  const { isAdmin, currentUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('courses');
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATS);
  const [certificates, setCertificates] = useState([]);
  const [modal, setModal] = useState(null);
  const [newCat, setNewCat] = useState({ id: '', label: '' });
  const [useFirebase, setUseFirebase] = useState(false);
  const [certUploading, setCertUploading] = useState(false);
  const [lessonEditor, setLessonEditor] = useState(null);
  const [lessonsCourse, setLessonsCourse] = useState(null); // course selected in lessons tab
  const [pricingPlans, setPricingPlans] = useState([]);
  const [savingPricing, setSavingPricing] = useState(false);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewModal, setReviewModal] = useState(null);
  const EMPTY_REVIEW = { name: '', location: '', rating: 5, text: '', course: '', avatar: '' };
  const [reviewForm, setReviewForm] = useState(EMPTY_REVIEW);
  const [certName, setCertName] = useState('');

  useEffect(() => {
    if (currentUser && !isAdmin) navigate('/');
  }, [currentUser, isAdmin]);

  // Load categories from Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'categories'),
      snap => {
        if (snap.exists() && snap.data().list?.length) {
          setCategories(snap.data().list);
        } else {
          // First time: seed Firestore with default categories
          setDoc(doc(db, 'settings', 'categories'), { list: DEFAULT_CATS });
          setCategories(DEFAULT_CATS);
        }
      },
      () => setCategories(DEFAULT_CATS)
    );
    return unsub;
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q,
      snap => {
        setUseFirebase(true);
        setCourses(snap.empty ? PLACEHOLDER_COURSES : snap.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      () => {
        setUseFirebase(false);
        setCourses(PLACEHOLDER_COURSES);
      }
    );
    return unsub;
  }, []);

  // Load users from Firestore
  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q,
      snap => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => {}
    );
    return unsub;
  }, []);

  const updateUser = async (uid, data) => {
    await updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() });
  };

  const toggleUserStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    await updateUser(user.id, { status: newStatus });
  };

  const addCourseToUser = async (uid, courseId) => {
    const user = users.find(u => u.id === uid);
    const enrolled = user?.enrolledCourses || [];
    if (enrolled.includes(courseId)) return;
    await updateUser(uid, { enrolledCourses: [...enrolled, courseId] });
  };

  const removeCourseFromUser = async (uid, courseId) => {
    const user = users.find(u => u.id === uid);
    const enrolled = (user?.enrolledCourses || []).filter(id => id !== courseId);
    await updateUser(uid, { enrolledCourses: enrolled });
  };

  // Load pricing from Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'pricing'),
      snap => { if (snap.exists()) setPricingPlans(snap.data().plans || []); },
      () => {}
    );
    return unsub;
  }, []);

  const DEFAULT_PLANS = [
    { id: 'single', name: 'Single Course', price_usd: 49, period: 'one-time', description: 'Perfect for exploring one topic in depth.', icon: 'Zap', highlighted: false, badge: '', features: ['Access to 1 course of your choice', 'Certificate of completion', 'Lifetime access', 'Mobile & desktop access'], cta: 'Buy a Course' },
    { id: 'quarterly', name: 'Quarterly Plan', price_usd: 89, period: '3 months', description: 'Full access to all subscription courses for 3 months.', icon: 'Star', highlighted: true, badge: 'Most Popular', features: ['Access to ALL subscription courses', 'New courses added monthly', 'All certificates included', 'Priority support', 'Download for offline viewing'], cta: 'Start Quarterly' },
    { id: 'annual', name: 'Annual Plan', price_usd: 249, period: 'per year', description: 'Best value — save 30% compared to quarterly.', icon: 'Crown', highlighted: false, badge: 'Best Value', features: ['Everything in Quarterly', 'Save 30% vs quarterly', 'Early access to new courses', 'Live Q&A sessions', '1-on-1 consultation (monthly)'], cta: 'Get Annual Access' },
  ];

  const initPricing = async () => {
    setSavingPricing(true);
    try {
      await setDoc(doc(db, 'settings', 'pricing'), { plans: DEFAULT_PLANS, updatedAt: serverTimestamp() });
      setPricingPlans(DEFAULT_PLANS);
      alert('✅ Default plans initialized!');
    } catch(e) { alert('Error: ' + e.message); }
    finally { setSavingPricing(false); }
  };

  const savePricing = async () => {
    setSavingPricing(true);
    try {
      await setDoc(doc(db, 'settings', 'pricing'), { plans: pricingPlans, updatedAt: serverTimestamp() });
      alert('✅ Pricing saved!');
    } catch(e) { alert('Error: ' + e.message); }
    finally { setSavingPricing(false); }
  };

  // Load reviews from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'reviews'),
      snap => setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => {}
    );
    return unsub;
  }, []);

  // Load certificates from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'certificates'),
      snap => setCertificates(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => {}
    );
    return unsub;
  }, []);

  // Upload certificate image
  const handleCertUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCertUploading(true);
    try {
      const url = await uploadToCloudinary(file, 'nourishmind/certificates');
      const name = certName.trim() || file.name;
      await addDoc(collection(db, 'certificates'), { url, alt: name, createdAt: serverTimestamp() });
      setCertName('');
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setCertUploading(false);
    }
  };

  const saveReview = async () => {
    if (!reviewForm.name || !reviewForm.text) return alert('Name and review text are required');
    if (reviewForm.id && reviewForm.id.length > 10) {
      const { id, ...rest } = reviewForm;
      await updateDoc(doc(db, 'reviews', id), { ...rest, updatedAt: serverTimestamp() });
    } else {
      const { id, ...rest } = reviewForm;
      await addDoc(collection(db, 'reviews'), { ...rest, createdAt: serverTimestamp() });
    }
    setReviewModal(null);
    setReviewForm(EMPTY_REVIEW);
  };

  const deleteReview = async (id) => {
    if (!confirm('Delete this review?')) return;
    await deleteDoc(doc(db, 'reviews', id));
  };

  const importPlaceholderReviews = async () => {
    const PLACEHOLDERS = [
      { name: 'Nour Al-Huda', location: 'Cairo, Egypt', rating: 5, text: '"This platform completely changed my perspective on mental health. The content is deep and beautifully organized."', course: 'Secrets of Mental Health', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80' },
      { name: 'Mohammed Al-Ali', location: 'Riyadh, Saudi Arabia', rating: 5, text: '"The best online platform for nutrition. Professional instructors and scientifically sound, easy-to-follow content."', course: 'Therapeutic Nutrition', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80' },
      { name: 'Sara Al-Jamil', location: 'Dubai, UAE', rating: 5, text: '"The mindfulness course made a real difference in my daily life. Highly recommended for anyone feeling overwhelmed."', course: 'Mindfulness Practice', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&q=80' },
    ];
    for (const r of PLACEHOLDERS) {
      await addDoc(collection(db, 'reviews'), { ...r, createdAt: serverTimestamp() });
    }
    alert('✅ 3 reviews imported successfully!');
  };

  const deleteCert = async (id) => {
    if (!confirm('Delete this certificate?')) return;
    await deleteDoc(doc(db, 'certificates', id));
  };

  if (!currentUser) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <p className="text-white text-xl font-bold mb-4">Please log in first</p>
        <button onClick={() => navigate('/login')} className="text-primary hover:underline">Login</button>
      </div>
    </div>
  );

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-14 bg-card border-b border-border flex items-center px-6 gap-4">
        <div className="flex items-center gap-2 text-primary font-bold">
          <Shield className="w-5 h-5" /> Admin Panel
        </div>
        <span className="text-gray-500 text-sm">|</span>
        <span className="text-gray-400 text-sm">{currentUser.email}</span>
        <div className="ml-auto flex items-center gap-3">
          {!useFirebase && (
            <span className="text-xs bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 px-3 py-1 rounded-full">
              Firebase not connected
            </span>
          )}
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
            <Eye className="w-4 h-4" /> View Site
          </button>
        </div>
      </div>

      <div className="pt-14 flex">
        {/* Sidebar */}
        <aside className="fixed top-14 left-0 bottom-0 w-48 bg-card border-r border-border flex flex-col pt-4">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${activeTab === tab.id ? 'text-white bg-primary/15 border-r-2 border-primary' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </aside>

        <main className="ml-48 flex-1 p-8">

          {/* ── COURSES TAB ── */}
          {activeTab === 'courses' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-extrabold text-white">Courses</h1>
                  <p className="text-gray-500 text-sm mt-1">{courses.length} total</p>
                </div>
                <button onClick={() => setModal('add')}
                  className="flex items-center gap-2 bg-primary text-white font-bold px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-colors">
                  <Plus className="w-4 h-4" /> Add Course
                </button>
              </div>
              <div className="grid gap-3">
                {courses.map(course => (
                  <div key={course.id} className="flex items-center gap-4 bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
                    {course.image
                      ? <img src={course.image} alt={course.title} className="w-20 h-14 rounded-lg object-cover shrink-0" />
                      : <div className="w-20 h-14 rounded-lg bg-primary/10 shrink-0 flex items-center justify-center"><BookOpen className="w-6 h-6 text-primary/40" /></div>
                    }
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-white font-semibold text-sm truncate">{course.title}</h3>
                        {course.featured && <span className="bg-primary/20 text-primary text-[10px] px-1.5 py-0.5 rounded font-bold">Featured</span>}
                        {course.new && <span className="bg-green-500/20 text-green-400 text-[10px] px-1.5 py-0.5 rounded font-bold">New</span>}
                      </div>
                      <p className="text-gray-500 text-xs mt-0.5 truncate">{course.instructor}</p>
                      <div className="flex gap-3 mt-1 text-xs text-gray-500">
                        {course.price ? <span className="text-primary font-bold">${course.price}</span> : <span className="text-green-400 font-bold">Free</span>}
                        {course.level && <span>{course.level}</span>}
                        {course.duration_hours && <span>{course.duration_hours}h</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => setLessonEditor(course)}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition-colors">
                        📚 Lessons
                      </button>
                      <button onClick={() => setModal(course)} className="p-2 rounded-lg border border-border text-gray-400 hover:text-white hover:border-primary/50 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteCourse(course.id)} className="p-2 rounded-lg border border-border text-gray-400 hover:text-red-400 hover:border-red-500/30 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── CERTIFICATES TAB ── */}
          {activeTab === 'certificates' && (
            <div>
              <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-white">Certificates</h1>
                  <p className="text-gray-500 text-sm mt-1">Shown as 3D carousel on homepage</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    type="text"
                    placeholder="Certificate name..."
                    value={certName}
                    onChange={e => setCertName(e.target.value)}
                    className="bg-card border border-border text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary placeholder-gray-600 w-72"
                  />
                  <label className={`flex items-center gap-2 bg-primary text-white font-bold px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-colors cursor-pointer ${certUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Upload className="w-4 h-4" />
                    {certUploading ? 'Uploading...' : 'Upload Certificate'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleCertUpload} />
                  </label>
                </div>
              </div>

              {certificates.length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-2xl p-16 text-center">
                  <Award className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500">No certificates yet — upload your first one</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {certificates.map(cert => (
                    <div key={cert.id} className="relative group rounded-xl overflow-hidden border border-border aspect-video bg-card">
                      <img src={cert.url} alt={cert.alt} className="w-full h-full object-cover" />
                      <button
                        onClick={() => deleteCert(cert.id)}
                        className="absolute top-2 right-2 w-7 h-7 bg-red-500/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── CATEGORIES TAB ── */}
          {activeTab === 'categories' && (
            <div>
              <h1 className="text-2xl font-extrabold text-white mb-6">Categories</h1>
              <div className="bg-card border border-border rounded-xl p-5 mb-6">
                <h2 className="text-white font-bold mb-4">Add New Category</h2>
                <div className="flex gap-3 flex-wrap">
                  <Input value={newCat.id} onChange={e => setNewCat(c => ({ ...c, id: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} placeholder="category-id" className="flex-1 min-w-[160px]" />
                  <Input value={newCat.label} onChange={e => setNewCat(c => ({ ...c, label: e.target.value }))} placeholder="Display Label" className="flex-1 min-w-[160px]" />
                  <button onClick={addCategory} className="flex items-center gap-2 bg-primary text-white font-bold px-5 py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm">
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              </div>
              <div className="grid gap-2">
                {categories.map((cat, i) => (
                  <div key={cat.id} className="flex items-center justify-between bg-card border border-border rounded-xl px-5 py-3">
                    <div>
                      <p className="text-white font-medium text-sm">{cat.label}</p>
                      <p className="text-gray-500 text-xs font-mono">{cat.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">{courses.filter(c => c.category === cat.id).length} courses</span>
                      <button onClick={() => deleteCategory(i)}
                        className="p-1.5 rounded-lg border border-border text-gray-500 hover:text-red-400 hover:border-red-500/30 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── REVIEWS TAB ── */}
          {activeTab === 'reviews' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-extrabold text-white">Reviews</h1>
                  <p className="text-gray-500 text-sm mt-1">{reviews.length} reviews on homepage</p>
                </div>
                <div className="flex items-center gap-3">
                  {reviews.length === 0 && (
                    <button onClick={importPlaceholderReviews}
                      className="flex items-center gap-2 bg-white/10 border border-border text-gray-300 font-semibold px-4 py-2.5 rounded-lg hover:bg-white/20 transition-colors text-sm">
                      ↓ Import Sample Reviews
                    </button>
                  )}
                  <button onClick={() => { setReviewForm(EMPTY_REVIEW); setReviewModal('add'); }}
                    className="flex items-center gap-2 bg-primary text-white font-bold px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-colors">
                    <Plus className="w-4 h-4" /> Add Review
                  </button>
                </div>
              </div>

              <div className="grid gap-3">
                {reviews.map(review => (
                  <div key={review.id} className="flex items-start gap-4 bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
                    {review.avatar
                      ? <img src={review.avatar} alt={review.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                      : <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">{review.name?.[0]}</div>
                    }
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white font-bold text-sm">{review.name}</p>
                        <span className="text-gray-500 text-xs">{review.location}</span>
                        <div className="flex gap-0.5 ml-1">
                          {[1,2,3,4,5].map(i => <Star key={i} className={`w-3 h-3 ${i <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} />)}
                        </div>
                      </div>
                      <p className="text-gray-400 text-xs line-clamp-2">{review.text}</p>
                      {review.course && <span className="text-primary text-xs mt-1 block">{review.course}</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => { setReviewForm(review); setReviewModal('edit'); }}
                        className="p-2 rounded-lg border border-border text-gray-400 hover:text-white hover:border-primary/50 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteReview(review.id)}
                        className="p-2 rounded-lg border border-border text-gray-400 hover:text-red-400 hover:border-red-500/30 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}


          {/* ── PRICING TAB ── */}
          {activeTab === 'pricing' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-extrabold text-white">Pricing Plans</h1>
                  <p className="text-gray-500 text-sm mt-1">Edit prices and features shown on the Pricing page</p>
                </div>
                <button onClick={savePricing} disabled={savingPricing}
                  className="flex items-center gap-2 bg-primary text-white font-bold px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
                  <Check className="w-4 h-4" /> {savingPricing ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

              {pricingPlans.length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-2xl p-16 text-center">
                  <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">No pricing loaded yet</p>
                  <button onClick={initPricing} disabled={savingPricing}
                    className="bg-primary text-white font-bold px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
                    {savingPricing ? 'Loading...' : '↓ Initialize Default Plans'}
                  </button>
                </div>
              ) : (
                <div className="grid gap-5">
                  {pricingPlans.map((plan, i) => (
                    <div key={plan.id} className="bg-card border border-border rounded-2xl p-6">
                      <div className="grid sm:grid-cols-3 gap-4 mb-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-gray-400 uppercase">Plan Name</label>
                          <input value={plan.name} onChange={e => setPricingPlans(prev => prev.map((p,j) => j===i ? {...p, name: e.target.value} : p))}
                            className="bg-background border border-border text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-gray-400 uppercase">Price (USD)</label>
                          <input type="number" value={plan.price_usd} onChange={e => setPricingPlans(prev => prev.map((p,j) => j===i ? {...p, price_usd: Number(e.target.value)} : p))}
                            className="bg-background border border-border text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-gray-400 uppercase">Period</label>
                          <input value={plan.period} onChange={e => setPricingPlans(prev => prev.map((p,j) => j===i ? {...p, period: e.target.value} : p))}
                            className="bg-background border border-border text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 mb-4">
                        <label className="text-xs font-semibold text-gray-400 uppercase">Description</label>
                        <input value={plan.description} onChange={e => setPricingPlans(prev => prev.map((p,j) => j===i ? {...p, description: e.target.value} : p))}
                          className="bg-background border border-border text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-400 uppercase">Features (one per line)</label>
                        <textarea rows={4} value={plan.features?.join('\n')} onChange={e => setPricingPlans(prev => prev.map((p,j) => j===i ? {...p, features: e.target.value.split('\n').filter(Boolean)} : p))}
                          className="bg-background border border-border text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none" />
                      </div>
                      <div className="flex items-center gap-4 mt-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={!!plan.highlighted} onChange={e => setPricingPlans(prev => prev.map((p,j) => j===i ? {...p, highlighted: e.target.checked} : p))} className="accent-primary w-4 h-4" />
                          <span className="text-sm text-gray-300">Highlighted (Most Popular)</span>
                        </label>
                        <input value={plan.badge || ''} onChange={e => setPricingPlans(prev => prev.map((p,j) => j===i ? {...p, badge: e.target.value} : p))}
                          placeholder="Badge text (e.g. Most Popular)"
                          className="bg-background border border-border text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary flex-1" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}


          {/* ── USERS TAB ── */}
          {activeTab === 'users' && (
            <div>
              <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-white">Users</h1>
                  <p className="text-gray-500 text-sm mt-1">{users.length} registered users</p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className="bg-card border border-border text-white rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary placeholder-gray-600 w-64"
                  />
                </div>
              </div>

              <div className="grid gap-3">
                {users
                  .filter(u => !userSearch || u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase()))
                  .map(user => (
                  <div key={user.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      {user.avatar
                        ? <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                        : <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">{user.name?.[0] || '?'}</div>
                      }

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-white font-bold text-sm">{user.name}</p>
                          <span className="text-gray-500 text-xs">@{user.username}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${user.status === 'suspended' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                            {user.status || 'active'}
                          </span>
                          {user.role === 'admin' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary">Admin</span>}
                        </div>
                        <p className="text-gray-400 text-xs">{user.email}</p>
                        {user.phone && <p className="text-gray-500 text-xs">{user.phone}</p>}
                        <p className="text-gray-600 text-xs mt-1">Joined: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</p>

                        {/* Enrolled courses */}
                        {user.enrolledCourses?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {user.enrolledCourses.map(cid => {
                              const c = courses.find(x => x.id === cid);
                              return c ? (
                                <span key={cid} className="flex items-center gap-1 bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full">
                                  {c.title.slice(0, 20)}...
                                  <button onClick={() => removeCourseFromUser(user.id, cid)} className="text-red-400 hover:text-red-300 ml-0.5">×</button>
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          onClick={() => toggleUserStatus(user)}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${user.status === 'suspended' ? 'border-green-500/30 text-green-400 hover:bg-green-500/10' : 'border-red-500/30 text-red-400 hover:bg-red-500/10'}`}
                        >
                          {user.status === 'suspended' ? <><CheckCircle className="w-3 h-3" /> Activate</> : <><Ban className="w-3 h-3" /> Suspend</>}
                        </button>
                        <button
                          onClick={() => setSelectedUser(selectedUser?.id === user.id ? null : user)}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-border text-gray-400 hover:text-white hover:border-primary/50 transition-colors"
                        >
                          + Add Course
                        </button>
                      </div>
                    </div>

                    {/* Add course dropdown */}
                    {selectedUser?.id === user.id && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs text-gray-400 mb-2">Select course to enroll:</p>
                        <div className="flex flex-wrap gap-2">
                          {courses
                            .filter(c => !user.enrolledCourses?.includes(c.id))
                            .map(c => (
                              <button key={c.id} onClick={() => { addCourseToUser(user.id, c.id); setSelectedUser(null); }}
                                className="text-xs bg-primary/10 border border-primary/20 text-primary px-3 py-1 rounded-full hover:bg-primary/20 transition-colors">
                                {c.title.slice(0, 25)}
                              </button>
                            ))
                          }
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}


          {/* ── LESSONS TAB ── */}
          {activeTab === 'lessons' && (
            <div>
              <h1 className="text-2xl font-extrabold text-white mb-2">Lessons</h1>
              <p className="text-gray-500 text-sm mb-6">Select a course to edit its sections and lessons</p>

              {/* Course selector */}
              <div className="bg-card border border-border rounded-xl p-4 mb-6">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Select Course</label>
                <select
                  value={lessonsCourse?.id || ''}
                  onChange={e => setLessonsCourse(courses.find(c => c.id === e.target.value) || null)}
                  className="w-full bg-background border border-border text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
                >
                  <option value="">-- Choose a course --</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              {/* Inline lesson editor */}
              {lessonsCourse && (
                <InlineLessonEditor
                  course={lessonsCourse}
                  onSave={(sections) => {
                    setCourses(prev => prev.map(c => c.id === lessonsCourse.id ? { ...c, sections } : c));
                    setLessonsCourse(prev => ({ ...prev, sections }));
                  }}
                />
              )}
            </div>
          )}



        </main>
      </div>

      {modal && (
        <CourseModal
          course={modal === 'add' ? null : modal}
          categories={categories}
          onSave={saveCourse}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
};

export default AdminPage;

