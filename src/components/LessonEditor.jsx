import React, { useState } from 'react';
import { Plus, Trash2, X, Check, ChevronDown, ChevronUp, Lock, Unlock } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const genId = () => Math.random().toString(36).substr(2, 9);

const LessonEditor = ({ course, onClose }) => {
  const [sections, setSections] = useState(course.sections || []);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState({});

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
      s.id === sid ? { ...s, lessons: [...(s.lessons || []), { id: genId(), title: 'New Lesson', duration: '0:00', videoUrl: '', pdfUrl: '', free: false }] } : s
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
      onClose(sections);
    } catch (e) { alert('Error: ' + e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-3xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-white font-bold text-lg">Edit Lessons</h2>
            <p className="text-gray-400 text-sm">{course.title}</p>
          </div>
          <button onClick={() => onClose(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          {sections.map(section => (
            <div key={section.id} className="border border-border rounded-xl overflow-hidden">
              {/* Section header */}
              <div className="flex items-center gap-3 p-4 bg-background/50">
                <button onClick={() => setExpanded(prev => ({ ...prev, [section.id]: !prev[section.id] }))}
                  className="text-gray-400 hover:text-white">
                  {expanded[section.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <input
                  value={section.title}
                  onChange={e => updateSection(section.id, 'title', e.target.value)}
                  className="flex-1 bg-transparent text-white font-bold text-sm focus:outline-none border-b border-transparent focus:border-primary"
                  placeholder="Section title"
                />
                <input
                  value={section.duration}
                  onChange={e => updateSection(section.id, 'duration', e.target.value)}
                  placeholder="e.g. 35:15"
                  className="w-20 bg-background border border-border text-white text-xs rounded px-2 py-1 focus:outline-none focus:border-primary"
                />
                <button onClick={() => deleteSection(section.id)} className="text-gray-500 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Lessons */}
              {expanded[section.id] && (
                <div className="p-3 flex flex-col gap-2">
                  {section.lessons?.map(lesson => (
                    <div key={lesson.id} className="flex items-center gap-2 bg-background/30 rounded-lg p-3">
                      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <input
                            value={lesson.title}
                            onChange={e => updateLesson(section.id, lesson.id, 'title', e.target.value)}
                            placeholder="Lesson title"
                            className="flex-1 bg-background border border-border text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary placeholder-gray-600"
                          />
                          <input
                            value={lesson.duration}
                            onChange={e => updateLesson(section.id, lesson.id, 'duration', e.target.value)}
                            placeholder="7:45"
                            className="w-16 bg-background border border-border text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary"
                          />
                        </div>
                        <input
                          value={lesson.videoUrl}
                          onChange={e => updateLesson(section.id, lesson.id, 'videoUrl', e.target.value)}
                          placeholder="Bunny Stream URL (https://player.mediadelivery.net/...)"
                          className="w-full bg-background border border-border text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary placeholder-gray-600"
                        />
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* PDF Download */}
                        <input
                          value={lesson.pdfUrl || ''}
                          onChange={e => updateLesson(section.id, lesson.id, 'pdfUrl', e.target.value)}
                          placeholder="PDF Google Drive link (optional)"
                          className="flex-1 bg-transparent text-gray-400 text-xs outline-none min-w-0 border-t border-white/5 pt-1 mt-1"
                          style={{ minWidth: 0 }}
                        />
                        <button
                          onClick={() => updateLesson(section.id, lesson.id, 'free', !lesson.free)}
                          className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg border transition-colors ${lesson.free ? 'border-green-500/40 text-green-400 bg-green-500/10' : 'border-border text-gray-500 hover:border-primary'}`}
                          title="Toggle free/paid"
                        >
                          {lesson.free ? <><Unlock className="w-3 h-3" /> Free</> : <><Lock className="w-3 h-3" /> Paid</>}
                        </button>
                        <button onClick={() => deleteLesson(section.id, lesson.id)} className="text-gray-500 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => addLesson(section.id)}
                    className="flex items-center gap-2 text-primary text-sm hover:text-primary/80 transition-colors mt-1">
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

        <div className="flex justify-end gap-3 p-6 border-t border-border">
          <button onClick={() => onClose(null)} className="px-5 py-2 rounded-lg border border-border text-gray-300 hover:text-white text-sm">Cancel</button>
          <button onClick={save} disabled={saving}
            className="px-6 py-2 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
            <Check className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Lessons'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LessonEditor;
