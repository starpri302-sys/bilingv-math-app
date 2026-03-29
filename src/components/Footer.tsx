import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-stone-200 py-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <h3 className="font-serif text-xl font-black text-stone-900">БилингвМат</h3>
            <p className="text-stone-500 text-sm leading-relaxed">
              Интерактивный справочник математических терминов на русском и тувинском языках.
            </p>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-bold text-stone-900 uppercase tracking-widest text-xs">Разделы</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="text-stone-500 hover:text-emerald-600 transition-colors">Главная</Link></li>
              <li><Link to="/login" className="text-stone-500 hover:text-emerald-600 transition-colors">Вход</Link></li>
              <li><Link to="/register" className="text-stone-500 hover:text-emerald-600 transition-colors">Регистрация</Link></li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-bold text-stone-900 uppercase tracking-widest text-xs">Правовая информация</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/privacy" className="text-stone-500 hover:text-emerald-600 transition-colors">Политика конфиденциальности</Link></li>
              <li><Link to="/terms" className="text-stone-500 hover:text-emerald-600 transition-colors">Пользовательское соглашение</Link></li>
              <li><span className="text-stone-400">Соответствие ФЗ-152 РФ</span></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-stone-100 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-stone-400 text-xs">
            © {new Date().getFullYear()} БилингвМат. Все права защищены.
          </p>
          <div className="flex gap-6">
            <span className="text-stone-400 text-xs">Сделано с любовью к математике</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
