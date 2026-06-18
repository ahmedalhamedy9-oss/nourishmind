import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext(null);
export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'en');
  const isAr = lang === 'ar';

  useEffect(() => {
    localStorage.setItem('lang', lang);
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const toggle = () => setLang(l => l === 'en' ? 'ar' : 'en');

  return (
    <LanguageContext.Provider value={{ lang, isAr, toggle, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
};
