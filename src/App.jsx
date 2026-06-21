import React, { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import SplashScreen from '@/components/SplashScreen';
import HomePage from '@/pages/HomePage';
import CoursesPage from '@/pages/CoursesPage';
import CourseDetailPage from '@/pages/CourseDetailPage';
import { LoginPage, SignupPage } from '@/pages/AuthPages';
import AboutPage from '@/pages/AboutPage';
import PricingPage from '@/pages/PricingPage';
import MyCoursesPage from '@/pages/MyCoursesPage';
import CoursePlayerPage from '@/pages/CoursePlayerPage';
import AdminPage from '@/pages/AdminPage';
import CertificatePage from '@/pages/CertificatePage';

/* Show splash only on first visit per session */
const hasSeenSplash = sessionStorage.getItem('nm_splash_done') === '1';

const AdminRoute = ({ children }) => {
  const { isAdmin, currentUser, loading } = useAuth();
  if (loading) return null;
  if (!currentUser) return <Navigate to="/login" />;
  if (!isAdmin)    return <Navigate to="/" />;
  return children;
};

const PrivateRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  if (loading) return null;
  if (!currentUser) return <Navigate to="/login" />;
  return children;
};

const AppRoutes = ({ onAuthReady }) => {
  const { loading } = useAuth();

  /* Tell SplashScreen when Firebase is done */
  React.useEffect(() => {
    if (!loading) onAuthReady();
  }, [loading]);

  return (
    <Routes>
      <Route path="/"                element={<HomePage />} />
      <Route path="/courses"         element={<CoursesPage />} />
      <Route path="/course/:id"      element={<CourseDetailPage />} />
      <Route path="/login"           element={<LoginPage />} />
      <Route path="/signup"          element={<SignupPage />} />
      <Route path="/about"           element={<AboutPage />} />
      <Route path="/pricing"         element={<PricingPage />} />
      <Route path="/my-courses"      element={<MyCoursesPage />} />
      <Route path="/course/:id/learn" element={<CoursePlayerPage />} />
      <Route path="/certificates"    element={<PrivateRoute><CertificatePage /></PrivateRoute>} />
      <Route path="/admin"           element={<AdminRoute><AdminPage /></AdminRoute>} />
      <Route path="*"               element={<Navigate to="/" />} />
    </Routes>
  );
};

const App = () => {
  const [showSplash,  setShowSplash]  = useState(!hasSeenSplash);
  const [authReady,   setAuthReady]   = useState(false);
  const [appVisible,  setAppVisible]  = useState(hasSeenSplash);

  const handleAuthReady = useCallback(() => {
    setAuthReady(true);
  }, []);

  const handleSplashDone = useCallback(() => {
    sessionStorage.setItem('nm_splash_done', '1');
    setShowSplash(false);
    setAppVisible(true);
  }, []);

  /* Pass _ready flag to SplashScreen via callback object */
  const splashCallback = handleSplashDone;
  splashCallback._ready = authReady;

  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          {showSplash && <SplashScreen onComplete={splashCallback} />}
          <div style={{ opacity: appVisible ? 1 : 0, transition: 'opacity 0.3s ease' }}>
            <AppRoutes onAuthReady={handleAuthReady} />
          </div>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
};

export default App;
