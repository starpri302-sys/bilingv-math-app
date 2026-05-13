import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layout, Eye, Edit3, Send, ChevronRight, Info, AlertCircle } from 'lucide-react';
import MathText from './MathText';

interface EditorProps {
  initialTitleRu?: string;
  initialTitleTyv?: string;
  initialContentRu?: string;
  initialContentTyv?: string;
  onSave: (data: { title_ru: string; title_tyv: string; content_ru: string; content_tyv: string; is_free: boolean }) => Promise<void>;
  isSubmitting?: boolean;
}

export default function LectureEditor({ 
  initialTitleRu = '', 
  initialTitleTyv = '', 
  initialContentRu = '', 
  initialContentTyv = '', 
  onSave, 
  isSubmitting = false 
}: EditorProps) {
  const [titleRu, setTitleRu] = useState(initialTitleRu);
  const [titleTyv, setTitleTyv] = useState(initialTitleTyv);
  const [contentRu, setContentRu] = useState(initialContentRu);
  const [contentTyv, setContentTyv] = useState(initialContentTyv);
  const [isFree, setIsFree] = useState(true);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [lang, setLang] = useState<'ru' | 'tyv'>('ru');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title_ru: titleRu,
      title_tyv: titleTyv,
      content_ru: contentRu,
      content_tyv: contentTyv,
      is_free: isFree
    });
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-stone-200 shadow-xl overflow-hidden min-h-[600px] flex flex-col">
      {/* Editor Header */}
      <div className="bg-stone-50 border-b border-stone-200 p-4 sm:px-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
            <Edit3 className="w-5 h-5" />
          </div>
          <h2 className="font-serif font-black text-stone-900 tracking-tight">Создание лекции</h2>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-stone-200">
          <button
            onClick={() => setActiveTab('edit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'edit' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-500 hover:text-stone-700'}`}
          >
            <Edit3 className="w-4 h-4" />
            Редактор
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'preview' ? 'bg-emerald-600 text-white shadow-md' : 'text-stone-500 hover:text-stone-700'}`}
          >
            <Eye className="w-4 h-4" />
            Предпросмотр
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
             <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Бесплатная:</span>
             <button 
               onClick={() => setIsFree(!isFree)}
               className={`w-10 h-5 rounded-full relative transition-colors ${isFree ? 'bg-emerald-500' : 'bg-stone-300'}`}
             >
               <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isFree ? 'right-1' : 'left-1'}`} />
             </button>
          </div>
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting || !titleRu || !contentRu}
            className="flex items-center gap-2 bg-stone-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50 text-sm"
          >
            {isSubmitting ? 'Сохранение...' : 'Опубликовать'}
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-grow flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-stone-200">
        {/* Languages Switcher */}
        <div className="bg-stone-50/50 p-4 border-b md:border-b-0 md:border-r border-stone-200 flex md:flex-col gap-2 min-w-[60px]">
          <button 
            onClick={() => setLang('ru')}
            className={`w-full aspect-square md:w-10 md:h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all ${lang === 'ru' ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100' : 'text-stone-400 hover:text-stone-600'}`}
          >
            RU
          </button>
          <button 
            onClick={() => setLang('tyv')}
            className={`w-full aspect-square md:w-10 md:h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all ${lang === 'tyv' ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100' : 'text-stone-400 hover:text-stone-600'}`}
          >
            TYV
          </button>
        </div>

        {/* Input Area */}
        <div className={`flex-grow flex flex-col p-6 sm:p-8 space-y-6 ${activeTab === 'preview' ? 'hidden md:flex' : 'flex'}`}>
           <div className="space-y-2">
             <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Заголовок ({lang === 'ru' ? 'Рус' : 'Тув'})</label>
             <input 
               type="text"
               value={lang === 'ru' ? titleRu : titleTyv}
               onChange={(e) => lang === 'ru' ? setTitleRu(e.target.value) : setTitleTyv(e.target.value)}
               placeholder={lang === 'ru' ? "Например: Основы логарифмов" : "Чижээ: Логарифмнар үндезини"}
               className="w-full bg-stone-50 border border-stone-100 rounded-2xl py-4 px-6 text-xl font-serif font-bold text-stone-900 outline-none focus:ring-4 focus:ring-stone-500/5 transition-all"
             />
           </div>

           <div className="flex-grow flex flex-col space-y-2">
             <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] flex items-center justify-between">
               Содержание лекции
               <span className="flex items-center gap-1 font-bold text-emerald-600 normal-case tracking-normal">
                 <Info className="w-3 h-3" />
                 Поддерживает LaTeX: $x^2$
               </span>
             </label>
             <textarea 
               value={lang === 'ru' ? contentRu : contentTyv}
               onChange={(e) => lang === 'ru' ? setContentRu(e.target.value) : setContentTyv(e.target.value)}
               placeholder="Пишите лекционный материал здесь..."
               className="flex-grow w-full bg-stone-50 border border-stone-100 rounded-[2rem] p-8 text-stone-700 outline-none focus:ring-4 focus:ring-stone-500/5 transition-all min-h-[300px] resize-none leading-relaxed"
             />
           </div>
        </div>

        {/* Preview Area (Side-by-side or Tab) */}
        <div className={`flex-grow bg-white p-6 sm:p-8 overflow-y-auto ${activeTab === 'edit' ? 'hidden md:block' : 'block'} border-l border-stone-100`}>
          <div className="max-w-prose mx-auto">
            <div className="flex items-center gap-2 mb-8 text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">
               <Eye className="w-4 h-4" />
               Живой предпросмотр
            </div>
            
            <h1 className="text-4xl font-serif font-black text-stone-900 mb-8 leading-tight">
              <MathText text={lang === 'ru' ? titleRu : titleTyv} />
            </h1>

            <div className="prose prose-stone prose-lg max-w-none prose-p:leading-relaxed">
              <MathText 
                text={lang === 'ru' ? contentRu : contentTyv} 
                isHtml 
                className="text-stone-700 space-y-6"
              />
              {!(lang === 'ru' ? contentRu : contentTyv) && (
                <div className="flex flex-col items-center justify-center py-20 text-stone-300">
                  <Layout className="w-12 h-12 mb-4" />
                  <p className="font-bold">Начните вводить текст...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Editor Footer / Info */}
      <div className="bg-emerald-900 p-4 px-8 text-emerald-50 text-xs font-bold flex items-center gap-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-emerald-400" />
          <span>Вы используете расширенный редактор Лектория. Материал будет доступен всем пользователям.</span>
        </div>
      </div>
    </div>
  );
}
