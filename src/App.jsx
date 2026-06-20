import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Lazy load all pages
const HomePage         = lazy(() => import('@/pages/HomePage'));
const CoursesPage      = lazy(() => import('@/pages/CoursesPage'));
const CourseDetailPage = lazy(() => import('@/pages/CourseDetailPage'));
const AuthPages        = lazy(() => import('@/pages/AuthPages'));
const AboutPage        = lazy(() => import('@/pages/AboutPage'));
const PricingPage      = lazy(() => import('@/pages/PricingPage'));
const MyCoursesPage    = lazy(() => import('@/pages/MyCoursesPage'));
const CoursePlayerPage = lazy(() => import('@/pages/CoursePlayerPage'));
const AdminPage        = lazy(() => import('@/pages/AdminPage'));
const CertificatePage  = lazy(() => import('@/pages/CertificatePage'));

const PageLoader = () => (
  <div style={{ minHeight: '100vh', background: '#080c0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ width: 40, height: 40, border: '3px solid rgba(74,155,142,0.2)', borderTop: '3px solid #4a9b8e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const AdminRoute = ({ children }) => {
  const { isAdmin, currentUser, authChecked } = useAuth();
  // Wait for auth check before redirecting
  if (!authChecked) return null;
  if (!currentUser) return <Navigate to="/login" />;
  if (!isAdmin) return <Navigate to="/" />;
  return children;
};

const PrivateRoute = ({ children }) => {
  const { currentUser, authChecked } = useAuth();
  // Wait for auth check before redirecting
  if (!authChecked) return null;
  if (!currentUser) return <Navigate to="/login" />;
  return children;
};

const LazyLogin  = () => { const C = lazy(() => import('@/pages/AuthPages').then(m => ({ default: m.LoginPage  }))); return <Suspense fallback={<PageLoader />}><C /></Suspense>; };
const LazySignup = () => { const C = lazy(() => import('@/pages/AuthPages').then(m => ({ default: m.SignupPage }))); return <Suspense fallback={<PageLoader />}><C /></Suspense>; };

const App = () => (
  <BrowserRouter>
    <LanguageProvider>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"                 element={<HomePage />} />
            <Route path="/courses"          element={<CoursesPage />} />
            <Route path="/course/:id"       element={<CourseDetailPage />} />
            <Route path="/login"            element={<LazyLogin />} />
            <Route path="/signup"           element={<LazySignup />} />
            <Route path="/about"            element={<AboutPage />} />
            <Route path="/pricing"          element={<PricingPage />} />
            <Route path="/my-courses"       element={<MyCoursesPage />} />
            <Route path="/course/:id/learn" element={<CoursePlayerPage />} />
            <Route path="/certificates"     element={<PrivateRoute><CertificatePage /></PrivateRoute>} />
            <Route path="/admin"            element={<AdminRoute><AdminPage /></AdminRoute>} />
            <Route path="*"                 element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </LanguageProvider>
  </BrowserRouter>
);

export default App;
