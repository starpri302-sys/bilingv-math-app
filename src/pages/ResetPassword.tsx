import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock, ArrowLeft, Save, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { api } from '../services/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!token || !email) {
      setMessage('Ошибка: Токен или email сброса пароля отсутствует.');
    }
  }, [token, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !email) return;

    if (password !== confirmPassword) {
      setMessage('Ошибка: Пароли не совпадают');
      return;
    }

    if (password.length < 6) {
      setMessage('Ошибка: Пароль должен быть не менее 6 символов');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const res = await api.resetPassword(email, token, password);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 5000);
      } else {
        setMessage(`Ошибка: ${res.error || 'Не удалось сбросить пароль'}`);
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setMessage('Произошла ошибка при сбросе пароля.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white p-12 rounded-3xl border border-stone-200 shadow-xl text-center space-y-6"
        >
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-serif font-black text-stone-900">Пароль сброшен</h1>
          <p className="text-stone-600 font-medium">
            Ваш пароль был успешно изменен. Теперь вы можете войти с новым паролем.
          </p>
          <p className="text-stone-400 text-sm">Перенаправление на страницу входа через 5 секунд...</p>
          <div className="pt-6">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-emerald-600 font-bold hover:text-emerald-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Вернуться к входу
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white p-12 rounded-3xl border border-stone-200 shadow-xl space-y-8"
      >
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-serif font-black text-stone-900">Сброс пароля</h1>
          <p className="text-stone-500 font-medium">Введите ваш новый пароль</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400">
              <Lock className="w-4 h-4" />
              Новый пароль
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
                placeholder="••••••••"
                required
                disabled={!token}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400">
              <CheckCircle className="w-4 h-4" />
              Подтвердите пароль
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
              placeholder="••••••••"
              required
              disabled={!token}
            />
          </div>

          {message && (
            <p className="text-sm font-bold text-red-500 text-center bg-red-50 p-3 rounded-xl border border-red-100">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full flex items-center justify-center gap-2 bg-stone-900 text-white p-4 rounded-2xl hover:bg-stone-800 transition-all shadow-md hover:shadow-lg font-bold disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Сброс...' : 'Сбросить пароль'}
          </button>
        </form>

        <div className="text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-stone-400 font-bold hover:text-stone-600 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Вернуться к входу
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
