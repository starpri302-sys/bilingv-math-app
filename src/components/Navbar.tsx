import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../store/authContext';
import { LogIn, LogOut, Shield, BookOpen, ChevronDown } from 'lucide-react';
import UserAvatar from './UserAvatar';
import NotificationCenter from './NotificationCenter';

export default function Navbar() {
  const { user, profile, isAdmin, login, logout } = useAuth();
  const [showLoginMenu, setShowLoginMenu] = useState(false);

  return (
    <nav className="bg-white border-b border-stone-200 sticky top-0 z-50">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2 text-stone-900 hover:text-emerald-600 transition-colors">
              <BookOpen className="w-6 h-6 text-emerald-600" />
              <span className="font-serif text-xl font-bold tracking-tight">BilingvMath</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
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
