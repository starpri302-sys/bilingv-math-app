/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './store/authContext';
import Home from './pages/Home';
import TermDetail from './pages/TermDetail';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import AdminPanel from './pages/AdminPanel';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Courses from './pages/Courses';
import LectureDetail from './pages/LectureDetail';
import TeacherDashboard from './pages/TeacherDashboard';
import ClassDetail from './pages/ClassDetail';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-stone-50 text-stone-900 font-sans flex flex-col">
          <Navbar />
          <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/term/:id" element={<TermDetail />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/user/:id" element={<UserProfile />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              
              {/* Educational content routes */}
              <Route path="/courses" element={<Courses />} />
              <Route path="/courses/:id" element={<Courses />} />
              <Route path="/lectures/:id" element={<LectureDetail />} />
              <Route path="/teacher" element={<TeacherDashboard />} />
              <Route path="/teacher/classes/:id" element={<ClassDetail />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

