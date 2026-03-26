import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, ArrowLeft, Send, CheckCircle } from 'lucide-react';
import { api } from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await api.forgotPassword(email);
      if (res.success) {
        setSuccess(true);
      } else {
        setMessage(`Ошибка: ${res.error || 'Не удалось отправить запрос'}`);
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setMessage('Произошла ошибка при отправке запроса.');
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
          <h1 className="text-3xl font-serif font-black text-stone-900">Запрос отправлен</h1>
          <p className="text-stone-600 font-medium">
            Если аккаунт с email <strong>{email}</strong> существует, вы получите инструкции по сбросу пароля.
          </p>
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
          <h1 className="text-4xl font-serif font-black text-stone-900">Забыли пароль?</h1>
          <p className="text-stone-500 font-medium">Введите ваш email для получения ссылки на сброс пароля</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400">
              <Mail className="w-4 h-4" />
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
              placeholder="your@email.com"
              required
            />
          </div>

          {message && (
            <p className="text-sm font-bold text-red-500 text-center bg-red-50 p-3 rounded-xl border border-red-100">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-stone-900 text-white p-4 rounded-2xl hover:bg-stone-800 transition-all shadow-md hover:shadow-lg font-bold disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
            {loading ? 'Отправка...' : 'Отправить ссылку'}
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
