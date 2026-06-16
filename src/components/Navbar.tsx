import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../store/authContext';
import { LogIn, LogOut, Shield, BookOpen, ChevronDown, LayoutDashboard, Sparkles } from 'lucide-react';
import UserAvatar from './UserAvatar';
import NotificationCenter from './NotificationCenter';
import { motion } from 'motion/react';

export default function Navbar() {
  const { user, profile, isAdmin, isTeacher, isPro, login, logout } = useAuth();
  const [showLoginMenu, setShowLoginMenu] = useState(false);

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-stone-200 sticky top-0 z-50 print:hidden">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-8">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link to="/" className="flex items-center gap-3 group">
                <div className="relative">
                  <div className="w-9 h-9 bg-stone-900 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:rotate-6 group-hover:bg-emerald-600 shadow-lg shadow-stone-200">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <motion.div 
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white"
                  />
                  <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-amber-400 rounded-sm rotate-12" />
                </div>
                <div className="flex flex-col -space-y-1">
                  <div className="flex items-center gap-1">
                    <span className="font-sans text-xl font-black text-stone-900 tracking-tight">Bilingv</span>
                    <span className="font-sans text-xl font-normal text-emerald-600 tracking-tight">Math</span>
                  </div>
                  <span className="font-sans text-[9px] font-bold text-stone-400 uppercase tracking-[0.3em] pl-0.5">Education Hub</span>
                </div>
              </Link>
            </motion.div>
            
            <div className="hidden md:flex items-center gap-8 border-l border-stone-100 pl-8 h-8">
              <Link to="/" className="text-sm font-semibold text-stone-600 hover:text-emerald-600 transition-colors uppercase tracking-wider">Справочник</Link>
              <Link to="/courses" className="text-sm font-semibold text-stone-600 hover:text-emerald-600 transition-colors uppercase tracking-wider flex items-center gap-1.5">
                Лекторий
              </Link>
              {(isTeacher || isAdmin || isPro) && (
                <Link to="/teacher" className="text-sm font-black text-stone-900 hover:text-emerald-600 transition-colors uppercase tracking-widest flex items-center gap-2 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-100">
                  <LayoutDashboard className="w-4 h-4 text-emerald-500" />
                  Хаб
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                {profile?.subscription_tier === 'pro' && (
                  <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg" title="PRO Аккаунт">
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-tighter">Pro</span>
                  </div>
                )}
                <NotificationCenter />
                {isAdmin && (
                  <Link to="/admin" className="text-stone-600 hover:text-emerald-600 p-2 rounded-full hover:bg-stone-50 transition-all" title="Admin Panel">
                    <Shield className="w-5 h-5" />
                  </Link>
                )}
                <Link to="/profile" className="flex items-center gap-2 text-stone-700 hover:text-emerald-600 transition-all">
                  <span className="text-sm font-medium hidden sm:inline">{profile?.username || user.username}</span>
                  <UserAvatar user={profile || user} size="sm" />
                </Link>
                <button
                  onClick={logout}
                  className="text-stone-600 hover:text-red-600 p-2 rounded-full hover:bg-stone-50 transition-all"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="flex items-center gap-2 text-stone-600 hover:text-emerald-600 px-4 py-2 rounded-full hover:bg-stone-50 transition-all font-medium"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Войти</span>
                </Link>
                <Link
                  to="/register"
                  className="bg-emerald-600 text-white px-6 py-2 rounded-full hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md font-medium"
                >
                  Регистрация
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
