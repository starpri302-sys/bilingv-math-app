import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../store/authContext';
import { motion } from 'motion/react';
import { UserPlus, Mail, Lock, User, School, GraduationCap, AlertCircle, ChevronDown } from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    school: '',
    grade: ''
  });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (!consent) {
      setError('Необходимо согласие на обработку персональных данных');
      setLoading(false);
      return;
    }
    try {
      const res = await register(formData);
      if (res.success) {
        if (res.generatedPassword) {
          setGeneratedPassword(res.generatedPassword);
        } else {
          navigate('/');
        }
      } else {
        setError(res.error || 'Ошибка регистрации');
      }
    } catch (err) {
      setError('Произошла ошибка при регистрации');
    } finally {
      setLoading(false);
    }
  };

  if (generatedPassword) {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-3xl border border-stone-200 shadow-xl space-y-6 text-center"
        >
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-serif font-black text-stone-900">Регистрация успешна!</h2>
            <p className="text-stone-500 text-sm">Ваш временный пароль сгенерирован автоматически. Пожалуйста, сохраните его.</p>
          </div>
          
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl font-mono text-xl font-bold text-emerald-700 tracking-wider">
            {generatedPassword}
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg"
          >
            Перейти в кабинет
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-3xl border border-stone-200 shadow-xl space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-serif font-black text-stone-900">Регистрация</h1>
          <p className="text-stone-400 font-bold uppercase tracking-widest text-xs">Создайте аккаунт в БилингвМат</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-stone-400 ml-1">Имя пользователя</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
                  placeholder="username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-stone-400 ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
                  placeholder="example@mail.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-stone-400 ml-1">ФИО</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
                  placeholder="Иванов Иван Иванович"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-stone-400 ml-1">Школа</label>
                <div className="relative">
                  <School className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                  <input
                    type="text"
                    value={formData.school}
                    onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
                    placeholder="№1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-stone-400 ml-1">Класс</label>
                <div className="relative">
                  <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 z-10" />
                  <select
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="w-full pl-12 pr-10 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium appearance-none"
                  >
                    <option value="">Класс</option>
                    {[5, 6, 7, 8, 9, 10, 11].map((g) => (
                      <option key={g} value={g.toString()}>{g}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-100">
            <input
              type="checkbox"
              id="consent"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 w-4 h-4 text-emerald-600 border-stone-300 rounded focus:ring-emerald-500"
            />
            <label htmlFor="consent" className="text-[10px] text-stone-500 font-medium leading-relaxed">
              Я соглашаюсь на обработку моих персональных данных в соответствии с ФЗ-152 РФ и принимаю условия{' '}
              <a href="#" className="text-emerald-600 hover:underline">Пользовательского соглашения</a>.
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className="text-center pt-4">
          <p className="text-stone-500 text-sm">
            Уже есть аккаунт?{' '}
            <Link to="/login" className="text-emerald-600 font-bold hover:underline">
              Войти
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
