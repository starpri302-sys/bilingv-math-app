import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../store/authContext';
import { api } from '../services/api';
import { motion } from 'motion/react';
import { User, Mail, School, GraduationCap, Save, ShieldCheck, Camera, Trash2, BookOpen, Clock, CheckCircle, Key, Eye, EyeOff, Lock, ChevronDown } from 'lucide-react';
import UserAvatar from '../components/UserAvatar';
import TermCard from '../components/TermCard';
import { AnimatePresence } from 'motion/react';

export default function Profile() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    school: '',
    grade: '',
    avatar: ''
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [userTerms, setUserTerms] = useState<any[]>([]);
  const [termsLoading, setTermsLoading] = useState(true);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        full_name: profile.full_name || '',
        school: profile.school || '',
        grade: profile.grade || '',
        avatar: profile.avatar || ''
      });
      fetchUserTerms();
    }
  }, [profile]);

  const fetchUserTerms = async () => {
    if (!profile?.id) return;
    setTermsLoading(true);
    try {
      const data = await api.getTerms({ createdBy: profile.id });
      setUserTerms(data);
    } catch (error) {
      console.error('Error fetching user terms:', error);
    } finally {
      setTermsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) { // 500KB limit for base64
        setMessage('Ошибка: Файл слишком большой (макс. 500KB)');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      await api.saveUser({
        ...formData,
        id: user.uid,
        email: user.email,
        role: profile?.role || 'student'
      });
      await refreshProfile();
      setMessage('Профиль успешно обновлен!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Ошибка при обновлении профиля.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage('Ошибка: Пароли не совпадают');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordMessage('Ошибка: Пароль должен быть не менее 6 символов');
      return;
    }

    setPasswordSaving(true);
    setPasswordMessage('');
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token');
      
      const res = await api.changePassword(token, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (res.success) {
        setPasswordMessage('Пароль успешно изменен!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => setPasswordMessage(''), 3000);
      } else {
        setPasswordMessage(`Ошибка: ${res.error || 'Не удалось сменить пароль'}`);
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordMessage('Ошибка при смене пароля.');
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) return <div className="text-center py-20">Загрузка...</div>;
  if (!user) return <div className="text-center py-20">Пожалуйста, войдите в систему.</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-12">
      <header className="text-center space-y-6">
        <div className="relative inline-block group">
          <UserAvatar 
            user={{ ...profile, ...formData }} 
            size="xl" 
            className="border-4 border-white shadow-xl ring-1 ring-stone-100" 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 p-3 bg-emerald-600 text-white rounded-2xl shadow-lg hover:bg-emerald-700 transition-all transform hover:scale-110 active:scale-95"
            title="Сменить фото"
          >
            <Camera className="w-5 h-5" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-serif font-black text-stone-900 leading-tight">Личный кабинет</h1>
          <div className="flex justify-center gap-2">
            <span className="px-3 py-1 bg-stone-100 text-stone-600 rounded-full text-xs font-bold uppercase tracking-widest border border-stone-200">
              {profile?.role || 'student'}
            </span>
            {profile?.role === 'admin' && (
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-widest border border-emerald-200 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Admin
              </span>
            )}
          </div>
        </div>
      </header>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="bg-white p-8 sm:p-12 rounded-3xl border border-stone-200 shadow-sm space-y-8"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center text-stone-600">
            <User className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-serif font-black text-stone-900">Основные данные</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400">
              <User className="w-4 h-4" />
              Логин
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
              placeholder="username"
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400">
              <Mail className="w-4 h-4" />
              Email
            </label>
            <input
              type="email"
              value={user.email || ''}
              disabled
              className="w-full p-4 bg-stone-100 border border-stone-200 rounded-2xl text-stone-500 font-medium cursor-not-allowed"
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400">
              <GraduationCap className="w-4 h-4" />
              Отображаемое имя (Никнейм)
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
              placeholder="Иван Иванов"
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400">
              <School className="w-4 h-4" />
              Школа
            </label>
            <input
              type="text"
              value={formData.school}
              onChange={(e) => setFormData({ ...formData, school: e.target.value })}
              className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
              placeholder="Школа №1"
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400">
              <GraduationCap className="w-4 h-4" />
              Класс
            </label>
            <div className="relative">
              <select
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium appearance-none"
              >
                <option value="">Выберите класс</option>
                {[5, 6, 7, 8, 9, 10, 11].map((g) => (
                  <option key={g} value={g.toString()}>{g} класс</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 pointer-events-none" />
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400">
              <User className="w-4 h-4" />
              Аватар (URL картинки или Emoji)
            </label>
            <div className="flex gap-4">
              <input
                type="text"
                value={formData.avatar}
                onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                className="flex-1 p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
                placeholder="https://example.com/photo.jpg или 👤"
              />
              {formData.avatar && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, avatar: '' })}
                  className="p-4 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                  title="Удалить аватар"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">
              Если пусто, будет использована первая буква имени
            </p>
          </div>
        </div>

        <div className="pt-8 border-t border-stone-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          {message && (
            <p className={`text-sm font-bold ${message.includes('Ошибка') ? 'text-red-500' : 'text-emerald-600'}`}>
              {message}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-stone-900 text-white px-8 py-4 rounded-2xl hover:bg-stone-800 transition-all shadow-md hover:shadow-lg font-bold disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </div>
      </motion.form>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handlePasswordSubmit}
        className="bg-white p-8 sm:p-12 rounded-3xl border border-stone-200 shadow-sm space-y-8"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center text-stone-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-serif font-black text-stone-900">Конфиденциальность</h2>
        </div>
        
        <div className="grid grid-cols-1 gap-8">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400">
              <Key className="w-4 h-4" />
              Текущий пароль
            </label>
            <div className="relative">
              <input
                type={showPasswords ? "text" : "password"}
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                {showPasswords ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400">
                <Lock className="w-4 h-4" />
                Новый пароль
              </label>
              <input
                type={showPasswords ? "text" : "password"}
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
                placeholder="••••••••"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400">
                <CheckCircle className="w-4 h-4" />
                Подтвердите пароль
              </label>
              <input
                type={showPasswords ? "text" : "password"}
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
                placeholder="••••••••"
                required
              />
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-stone-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          {passwordMessage && (
            <p className={`text-sm font-bold ${passwordMessage.includes('Ошибка') ? 'text-red-500' : 'text-emerald-600'}`}>
              {passwordMessage}
            </p>
          )}
          <button
            type="submit"
            disabled={passwordSaving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-stone-900 text-white px-8 py-4 rounded-2xl hover:bg-stone-800 transition-all shadow-md hover:shadow-lg font-bold disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {passwordSaving ? 'Обновление...' : 'Сменить пароль'}
          </button>
        </div>
      </motion.form>

      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-3xl font-serif font-black text-stone-900">Мои термины</h2>
            <p className="text-stone-500 font-medium">Термины, которые вы добавили в справочник</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-xl shadow-sm">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-bold text-stone-900">{userTerms.length}</span>
            </div>
          </div>
        </div>

        {termsLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
          </div>
        ) : userTerms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {userTerms.map((term) => (
                <div key={term.id} className="relative group">
                  <div className={`absolute -top-2 -right-2 z-10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border ${
                    term.status === 'published' 
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                      : 'bg-amber-100 text-amber-700 border-amber-200'
                  }`}>
                    <div className="flex items-center gap-1">
                      {term.status === 'published' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {term.status === 'published' ? 'Опубликован' : 'На проверке'}
                    </div>
                  </div>
                  <TermCard term={term} language="ru" />
                </div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-16 bg-stone-50 rounded-3xl border-2 border-dashed border-stone-200">
            <BookOpen className="w-12 h-12 text-stone-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-stone-900">Вы еще не добавили ни одного термина</h3>
            <p className="text-stone-500 max-w-xs mx-auto mt-2">
              Ваши вклады помогают сделать справочник лучше для всех!
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
