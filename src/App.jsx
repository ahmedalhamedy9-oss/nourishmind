import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import HomePage from '@/pages/HomePage';
import CoursesPage from '@/pages/CoursesPage';
import CourseDetailPage from '@/pages/CourseDetailPage';
import { LoginPage, SignupPage } from '@/pages/AuthPages';
import AboutPage from '@/pages/AboutPage';
import PricingPage from '@/pages/PricingPage';
import MyCoursesPage from '@/pages/MyCoursesPage';
import CoursePlayerPage from '@/pages/CoursePlayerPage';
import AdminPage from '@/pages/AdminPage';

const AdminRoute = ({ children }) => {
  const { isAdmin, currentUser, loading } = useAuth();
  if (loading) return null;
  if (!currentUser) return <Navigate to="/login" />;
  if (!isAdmin) return <Navigate to="/" />;
  return children;
};

const App = () => (
  <BrowserRouter>
    <LanguageProvider>
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/course/:id" element={<CourseDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/my-courses" element={<MyCoursesPage />} />
        <Route path="/course/:id/learn" element={<CoursePlayerPage />} />
        <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AuthProvider>
    </LanguageProvider>
  </BrowserRouter>
);

export default App;
