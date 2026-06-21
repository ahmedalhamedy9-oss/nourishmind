export const CATEGORIES = [
  { id: 'nutritional-psychiatry', label: 'Nutritional Psychiatry' },
  { id: 'mental-wellness', label: 'Mental Wellness' },
  { id: 'gut-brain', label: 'Gut-Brain Axis' },
  { id: 'anxiety-depression', label: 'Anxiety & Depression' },
  { id: 'sleep-health', label: 'Sleep & Health' },
  { id: 'for-professionals', label: 'For Professionals' },
];

export const PLACEHOLDER_COURSES = [];

export const ROWS = [
  { id: 'featured',      title: '🔥 Featured Courses',            filter: c => c.featured },
  { id: 'new',           title: '✨ New Releases',                 filter: c => c.new },
  { id: 'gut-brain',     title: 'Gut-Brain Axis',                  filter: c => c.category === 'gut-brain' },
  { id: 'professionals', title: 'For Medical Professionals',       filter: c => c.category === 'for-professionals' },
  { id: 'arabic',        title: '🌙 المحتوى العربي',               filter: c => c.tags?.includes('عربي') },
  { id: 'beginners',     title: 'Perfect for Beginners',           filter: c => c.level === 'Beginner' },
];
