import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../store/authContext';
import { motion } from 'motion/react';
import { User, School, GraduationCap, BookOpen, Mail, ShieldCheck, LogIn } from 'lucide-react';
import UserAvatar from '../components/UserAvatar';
import TermCard from '../components/TermCard';

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser, loading: authLoading } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [terms, setTerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      if (!id || !currentUser) return;
      try {
        setLoading(true);
        const [userData, userTerms] = await Promise.all([
          api.getUsers(id),
          api.getTerms({ createdBy: id, status: 'published' })
        ]);
        setUser(userData);
        setTerms(userTerms);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError('Не удалось загрузить профиль пользователя');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchUserData();
    }
  }, [id, currentUser, authLoading]);

  if (authLoading || (loading && currentUser)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 sm:p-12 rounded-[2.5rem] border border-stone-200 shadow-xl space-y-8"
        >
          <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto">
            <User className="w-12 h-12" />
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-serif font-black text-stone-900">Профиль автора</h2>
            <p className="text-stone-500 text-lg font-medium leading-relaxed">
              Просмотр профилей авторов доступен только зарегистрированным пользователям. 
              Присоединяйтесь к нашему сообществу, чтобы видеть достижения других и делиться своими знаниями!
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link 
              to="/login" 
              className="flex items-center justify-center gap-2 bg-stone-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-stone-800 transition-all shadow-lg"
            >
              <LogIn className="w-5 h-5" />
              Войти
            </Link>
            <Link 
              to="/register" 
              className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg"
            >
              Зарегистрироваться
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <User className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-serif font-black text-stone-900 mb-4">Упс!</h2>
        <p className="text-stone-500 mb-8">{error || 'Пользователь не найден'}</p>
        <Link to="/" className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg">
          На главную
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto space-y-8"
    >
      {/* Profile Header */}
      <div className="bg-white rounded-[2.5rem] border border-stone-200 p-8 md:p-12 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full -mr-32 -mt-32 opacity-50" />
        
        <div className="relative flex flex-col md:flex-row items-center md:items-start gap-8">
          <UserAvatar user={user} size="xl" className="ring-8 ring-stone-50 shadow-2xl" />
          
          <div className="flex-grow text-center md:text-left space-y-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <h1 className="text-4xl font-serif font-black text-stone-900">
                  {user.full_name || user.username}
                </h1>
                {user.role === 'super_admin' && (
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Админ
                  </span>
                )}
              </div>
              <p className="text-stone-400 font-bold uppercase tracking-widest text-sm">@{user.username}</p>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-6 pt-2">
              {user.school && (
                <div className="flex items-center gap-2 text-stone-600 bg-stone-50 px-4 py-2 rounded-xl border border-stone-100">
                  <School className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-bold">{user.school}</span>
                </div>
              )}
              {user.contact_info && (
                <div className="flex items-center gap-2 text-stone-600 bg-stone-50 px-4 py-2 rounded-xl border border-stone-100">
                  <Mail className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-bold">{user.contact_info}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-stone-600 bg-stone-50 px-4 py-2 rounded-xl border border-stone-100">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold">{terms.length} терминов</span>
              </div>
            </div>

            {user.bio && (
              <div className="pt-4 text-stone-600 font-medium leading-relaxed max-w-2xl">
                <p className="whitespace-pre-wrap">{user.bio}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User's Terms */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-2xl font-serif font-black text-stone-900 flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-emerald-600" />
            Термины автора
          </h2>
        </div>

        {terms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {terms.map((term) => (
              <TermCard key={term.id} term={term} language="ru" />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center">
            <div className="w-16 h-16 bg-stone-50 text-stone-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8" />
            </div>
            <p className="text-stone-500 font-medium">Автор еще не опубликовал ни одного термина</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
