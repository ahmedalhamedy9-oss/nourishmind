export const t = {
  // Navbar
  home:           { en: 'Home',           ar: 'الرئيسية' },
  courses:        { en: 'Courses',        ar: 'الكورسات' },
  about:          { en: 'About',          ar: 'من نحن' },
  pricing:        { en: 'Pricing',        ar: 'الأسعار' },
  myCourses:      { en: 'My Courses',     ar: 'كورساتي' },
  signIn:         { en: 'Sign In',        ar: 'تسجيل الدخول' },
  startFree:      { en: 'Start Free',     ar: 'ابدأ مجاناً' },
  admin:          { en: 'Admin',          ar: 'الإدارة' },

  // Hero
  heroTitle:      { en: 'Nourish Your Mind,\nElevate Your Life', ar: 'غذِّ عقلك،\nارتقِ بحياتك' },
  heroDesc:       { en: 'Expert-led courses in mental health, psychology & nutrition — available in Arabic & English.', ar: 'كورسات متخصصة في الصحة النفسية وعلم النفس والتغذية — متاحة بالعربية والإنجليزية.' },
  startLearning:  { en: 'Start Learning',  ar: 'ابدأ التعلم' },
  browseCourses:  { en: 'Browse Courses',  ar: 'تصفح الكورسات' },
  students:       { en: '50,000+ Students', ar: '+50,000 طالب' },
  rating:         { en: '4.8 Rating',      ar: 'تقييم 4.8' },

  // Courses
  allCourses:     { en: 'All Courses',     ar: 'كل الكورسات' },
  searchCourses:  { en: 'Search courses...', ar: 'ابحث عن كورس...' },
  free:           { en: 'Free',            ar: 'مجاني' },
  enroll:         { en: 'Enroll Now',      ar: 'سجّل الآن' },
  startCourse:    { en: 'Start Course',    ar: 'ابدأ الكورس' },

  // Reviews
  whatStudentsSay: { en: 'What Our Students Say', ar: 'ماذا يقول طلابنا' },

  // Certificates
  earnCerts:      { en: 'Earn Recognized Certificates', ar: 'احصل على شهادات معتمدة' },
  earnCertsDesc:  { en: 'Complete courses and earn certificates recognized by leading healthcare institutions.', ar: 'أكمل الكورسات واحصل على شهادات معتمدة من أبرز المؤسسات الصحية.' },

  // About
  ourStory:       { en: 'Our Story',       ar: 'قصتنا' },
  meetTeam:       { en: 'Meet the Team',   ar: 'فريقنا' },

  // Pricing
  simplePricing:  { en: 'Simple, Transparent Pricing', ar: 'أسعار واضحة وبسيطة' },
  pricingDesc:    { en: 'Choose what works for you.', ar: 'اختر ما يناسبك.' },

  // Auth
  login:          { en: 'Sign In',         ar: 'تسجيل الدخول' },
  signup:         { en: 'Create Account',  ar: 'إنشاء حساب' },
  email:          { en: 'Email',           ar: 'البريد الإلكتروني' },
  password:       { en: 'Password',        ar: 'كلمة المرور' },
  name:           { en: 'Full Name',       ar: 'الاسم الكامل' },

  // My Courses
  welcomeBack:    { en: 'Welcome back',    ar: 'أهلاً بعودتك' },
  continueLearning: { en: 'Continue Learning', ar: 'أكمل التعلم' },
  noCourses:      { en: 'No courses yet',  ar: 'لا كورسات بعد' },
};

// Helper: tr(key, lang)
export const tr = (key, lang = 'en') => t[key]?.[lang] || t[key]?.en || key;
