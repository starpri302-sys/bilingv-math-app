import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layout, Eye, Edit3, Send, ChevronRight, Info, AlertCircle, Plus, Trash2, CheckCircle2, HelpCircle, FileText } from 'lucide-react';
import MathText from './MathText';

interface QuizOption {
  text_ru: string;
  text_tyv: string;
  is_correct: boolean;
}

interface QuizQuestion {
  text_ru: string;
  text_tyv: string;
  options: QuizOption[];
}

interface Resource {
  title: string;
  type: 'pdf' | 'link' | 'video' | 'file';
  url: string;
}

interface EditorProps {
  initialTitleRu?: string;
  initialTitleTyv?: string;
  initialContentRu?: string;
  initialContentTyv?: string;
  initialIsFree?: boolean;
  initialVisibility?: 'public' | 'private';
  initialAccessType?: 'free' | 'paid';
  initialQuiz?: { questions: QuizQuestion[] } | null;
  initialResources?: Resource[];
  onSave: (data: { 
    title_ru: string; 
    title_tyv: string; 
    content_ru: string; 
    content_tyv: string; 
    is_free: boolean;
    visibility: 'public' | 'private';
    access_type: 'free' | 'paid';
    quiz?: { questions: QuizQuestion[] };
    resources?: Resource[];
  }) => Promise<void>;
  isSubmitting?: boolean;
}

export default function LectureEditor({ 
  initialTitleRu = '', 
  initialTitleTyv = '', 
  initialContentRu = '', 
  initialContentTyv = '', 
  initialIsFree = true,
  initialQuiz = null,
  initialResources = [],
  onSave, 
  isSubmitting = false 
}: EditorProps) {
  const [titleRu, setTitleRu] = useState(initialTitleRu);
  const [titleTyv, setTitleTyv] = useState(initialTitleTyv);
  const [contentRu, setContentRu] = useState(initialContentRu);
  const [contentTyv, setContentTyv] = useState(initialContentTyv);
  const [isFree, setIsFree] = useState(initialIsFree);
  const [visibility, setVisibility] = useState<'public' | 'private'>(initialVisibility || 'public');
  const [accessType, setAccessType] = useState<'free' | 'paid'>(initialAccessType || 'free');
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'quiz' | 'resources'>('edit');
  const [lang, setLang] = useState<'ru' | 'tyv'>('ru');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(initialQuiz?.questions || []);
  const [resources, setResources] = useState<Resource[]>(initialResources);
  const [splitWidth, setSplitWidth] = useState(50); // percentage for editor area
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const stopResizing = () => {
    setIsResizing(false);
  };

  const resize = (e: MouseEvent) => {
    if (!isResizing) return;
    const editorContainer = document.getElementById('lecture-editor-container');
    if (!editorContainer) return;
    
    const containerWidth = editorContainer.offsetWidth;
    const newWidth = (e.clientX - editorContainer.getBoundingClientRect().left) / containerWidth * 100;
    
    if (newWidth > 20 && newWidth < 80) {
      setSplitWidth(newWidth);
    }
  };

  React.useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title_ru: titleRu,
      title_tyv: titleTyv,
      content_ru: contentRu,
      content_tyv: contentTyv,
      is_free: isFree,
      visibility,
      access_type: accessType,
      quiz: quizQuestions.length > 0 ? { questions: quizQuestions } : undefined,
      resources: resources.length > 0 ? resources : undefined
    });
  };

  const handlePaste = (e: React.ClipboardEvent, target: 'ru' | 'tyv') => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (!blob) continue;

        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          const imgTag = `<img src="${base64}" class="w-full rounded-3xl shadow-lg my-8" />`;
          if (target === 'ru') {
            setContentRu(prev => prev + "\n" + imgTag + "\n");
          } else {
            setContentTyv(prev => prev + "\n" + imgTag + "\n");
          }
        };
        reader.readAsDataURL(blob);
      }
    }
  };

  const addQuestion = () => {
    setQuizQuestions([...quizQuestions, {
      text_ru: '',
      text_tyv: '',
      options: [
        { text_ru: '', text_tyv: '', is_correct: true },
        { text_ru: '', text_tyv: '', is_correct: false },
        { text_ru: '', text_tyv: '', is_correct: false },
        { text_ru: '', text_tyv: '', is_correct: false }
      ]
    }]);
  };

  const removeQuestion = (idx: number) => {
    setQuizQuestions(quizQuestions.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, field: keyof QuizQuestion, value: any) => {
    const newQuestions = [...quizQuestions];
    newQuestions[idx] = { ...newQuestions[idx], [field]: value };
    setQuizQuestions(newQuestions);
  };

  const updateOption = (qIdx: number, oIdx: number, field: keyof QuizOption, value: any) => {
    const newQuestions = [...quizQuestions];
    const newOptions = [...newQuestions[qIdx].options];
    
    if (field === 'is_correct' && value === true) {
      newOptions.forEach((opt, i) => opt.is_correct = (i === oIdx));
    } else {
      newOptions[oIdx] = { ...newOptions[oIdx], [field]: value };
    }
    
    newQuestions[qIdx].options = newOptions;
    setQuizQuestions(newQuestions);
  };

  const addResource = () => {
    setResources([...resources, { title: '', type: 'pdf', url: '' }]);
  };

  const updateResource = (idx: number, field: keyof Resource, value: any) => {
    const newResources = [...resources];
    newResources[idx] = { ...newResources[idx], [field]: value };
    setResources(newResources);
  };

  const removeResource = (idx: number) => {
    setResources(resources.filter((_, i) => i !== idx));
  };

  return (
    <div id="lecture-editor-container" className="bg-white rounded-[2.5rem] border border-stone-200 shadow-xl overflow-hidden min-h-[700px] flex flex-col">
      {/* Editor Header */}
      <div className="bg-stone-50 border-b border-stone-200 p-4 sm:px-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
            <Edit3 className="w-5 h-5" />
          </div>
          <h2 className="font-serif font-black text-stone-900 tracking-tight">
            {activeTab === 'quiz' ? 'Настройка теста' : 'Редактор лекции'}
          </h2>
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
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'preview' ? 'bg-emerald-600 text-white shadow-md' : 'text-stone-500 hover:text-stone-700'} md:hidden`}
          >
            <Eye className="w-4 h-4" />
            Предпросмотр
          </button>
          <button
            onClick={() => setActiveTab('quiz')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'quiz' ? 'bg-amber-600 text-white shadow-md' : 'text-stone-500 hover:text-stone-700'}`}
          >
            <HelpCircle className="w-4 h-4" />
            Тест/Квиз
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'resources' ? 'bg-blue-600 text-white shadow-md' : 'text-stone-500 hover:text-stone-700'}`}
          >
            <FileText className="w-4 h-4" />
            Ресурсы
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
             <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{visibility === 'public' ? 'Публично' : 'Приватно'}:</span>
             <button 
               onClick={() => setVisibility(visibility === 'public' ? 'private' : 'public')}
               className={`w-10 h-5 rounded-full relative transition-colors ${visibility === 'public' ? 'bg-emerald-500' : 'bg-stone-300'}`}
             >
               <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${visibility === 'public' ? 'right-1' : 'left-1'}`} />
             </button>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{accessType === 'free' ? 'Бесплатно' : 'Платно'}:</span>
             <button 
               onClick={() => setAccessType(accessType === 'free' ? 'paid' : 'free')}
               className={`w-10 h-5 rounded-full relative transition-colors ${accessType === 'free' ? 'bg-emerald-500' : 'bg-stone-300'}`}
             >
               <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${accessType === 'free' ? 'right-1' : 'left-1'}`} />
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
      <div className="flex-grow flex flex-col md:flex-row relative">
        {/* Languages Switcher */}
        <div className="bg-stone-50/50 p-4 border-b md:border-b-0 md:border-r border-stone-200 flex md:flex-col gap-2 min-w-[60px] z-10">
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

        {/* Dynamic Split Layout */}
        <div className="flex-grow flex flex-col md:flex-row relative overflow-hidden">
          
          {/* Main Editing Area (Text or Quiz) */}
          <div 
            style={{ width: activeTab === 'edit' && window.innerWidth >= 768 ? `${splitWidth}%` : '100%' }}
            className={`flex flex-col min-h-0 bg-stone-50 ${activeTab === 'preview' ? 'hidden md:flex' : 'flex'} ${activeTab === 'quiz' ? 'md:w-full' : ''}`}
          >
            {activeTab === 'resources' ? (
              <div className="flex-grow p-6 sm:p-8 space-y-8 overflow-y-auto">
                 <div className="flex items-center justify-between">
                    <div>
                       <h3 className="text-xl font-serif font-black text-stone-900">Дополнительные ресурсы</h3>
                       <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mt-1">Прикрепите файлы или ссылки к лекции</p>
                    </div>
                    <button 
                      onClick={addResource}
                      className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-bold hover:bg-blue-100 transition-all text-xs"
                    >
                      <Plus className="w-4 h-4" />
                      Добавить ресурс
                    </button>
                 </div>

                 <div className="space-y-4">
                    {resources.map((res, idx) => (
                      <div key={idx} className="bg-white border border-stone-200 rounded-[1.5rem] p-6 flex flex-wrap items-end gap-4 shadow-sm">
                         <div className="flex-grow min-w-[200px] space-y-1">
                            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Заголовок</label>
                            <input 
                              value={res.title}
                              onChange={(e) => updateResource(idx, 'title', e.target.value)}
                              placeholder="Напр: Сборник задач"
                              className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 outline-none focus:border-blue-500"
                            />
                         </div>
                         <div className="w-32 space-y-1">
                            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Тип</label>
                            <select 
                              value={res.type}
                              onChange={(e) => updateResource(idx, 'type', e.target.value)}
                              className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 outline-none focus:border-blue-500 appearance-none"
                            >
                               <option value="pdf">PDF</option>
                               <option value="link">Ссылка</option>
                               <option value="file">Файл</option>
                               <option value="video">Видео</option>
                            </select>
                         </div>
                         <div className="flex-grow min-w-[200px] space-y-1">
                            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">URL</label>
                            <input 
                              value={res.url}
                              onChange={(e) => updateResource(idx, 'url', e.target.value)}
                              placeholder="https://..."
                              className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 outline-none focus:border-blue-500"
                            />
                         </div>
                         <button 
                           onClick={() => removeResource(idx)}
                           className="p-3 text-stone-400 hover:text-rose-600 mb-0.5"
                         >
                            <Trash2 className="w-5 h-5" />
                         </button>
                      </div>
                    ))}
                    {resources.length === 0 && (
                      <div className="text-center py-20 bg-stone-50/50 rounded-[3rem] border border-dashed border-stone-200">
                         <p className="text-stone-400 font-bold uppercase tracking-widest text-xs">Нет прикрепленных ресурсов</p>
                      </div>
                    )}
                 </div>
              </div>
            ) : activeTab === 'quiz' ? (
              <div className="flex-grow p-6 sm:p-8 space-y-8 overflow-y-auto">
                 <div className="flex items-center justify-between">
                    <div>
                       <h3 className="text-xl font-serif font-black text-stone-900">Редактор тестов</h3>
                       <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mt-1">Добавьте проверочные вопросы</p>
                    </div>
                    <button 
                      onClick={addQuestion}
                      className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl font-bold hover:bg-emerald-100 transition-all text-xs"
                    >
                      <Plus className="w-4 h-4" />
                      Добавить вопрос
                    </button>
                 </div>

                 <div className="space-y-6">
                    {quizQuestions.map((q, qIdx) => (
                      <motion.div 
                        key={qIdx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white border border-stone-200 rounded-[2rem] p-6 relative group/q shadow-sm"
                      >
                        <button 
                          onClick={() => removeQuestion(qIdx)}
                          className="absolute top-4 right-4 p-2 text-stone-300 hover:text-rose-600 transition-colors opacity-0 group-hover/q:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="space-y-4">
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                 <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Вопрос (RU)</label>
                                 <input 
                                   value={q.text_ru}
                                   onChange={(e) => updateQuestion(qIdx, 'text_ru', e.target.value)}
                                   className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-emerald-500/20"
                                 />
                              </div>
                              <div className="space-y-1">
                                 <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Вопрос (TYV)</label>
                                 <input 
                                   value={q.text_tyv}
                                   onChange={(e) => updateQuestion(qIdx, 'text_tyv', e.target.value)}
                                   className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-emerald-500/20"
                                 />
                              </div>
                           </div>

                           <div className="space-y-3 pt-2">
                              <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">Варианты ответов</label>
                              <div className="grid grid-cols-1 gap-2">
                                 {q.options.map((opt, oIdx) => (
                                   <div key={oIdx} className="flex gap-2">
                                      <button 
                                        onClick={() => updateOption(qIdx, oIdx, 'is_correct', true)}
                                        className={`shrink-0 w-10 flex items-center justify-center rounded-xl transition-all ${opt.is_correct ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-stone-50 border border-stone-200 text-stone-200'}`}
                                      >
                                        <CheckCircle2 className="w-5 h-5" />
                                      </button>
                                      <input 
                                        placeholder="Вариант (RU)"
                                        value={opt.text_ru}
                                        onChange={(e) => updateOption(qIdx, oIdx, 'text_ru', e.target.value)}
                                        className="flex-grow bg-white border border-stone-200 rounded-xl py-2 px-4 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                                      />
                                      <input 
                                        placeholder="Вариант (TYV)"
                                        value={opt.text_tyv}
                                        onChange={(e) => updateOption(qIdx, oIdx, 'text_tyv', e.target.value)}
                                        className="flex-grow bg-white border border-stone-200 rounded-xl py-2 px-4 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                                      />
                                   </div>
                                 ))}
                              </div>
                           </div>
                        </div>
                      </motion.div>
                    ))}

                    {quizQuestions.length === 0 && (
                      <div className="text-center py-20 border-2 border-dashed border-stone-200 rounded-[3rem] bg-white">
                         <HelpCircle className="w-12 h-12 text-stone-200 mx-auto mb-4" />
                         <p className="text-stone-400 font-bold">Тесты не добавлены.</p>
                      </div>
                    )}
                 </div>
              </div>
            ) : (
              <div className="p-6 sm:p-8 space-y-6 flex-grow overflow-y-auto">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Заголовок лекции</label>
                  <input 
                    type="text"
                    value={lang === 'ru' ? titleRu : titleTyv}
                    onChange={(e) => lang === 'ru' ? setTitleRu(e.target.value) : setTitleTyv(e.target.value)}
                    placeholder={lang === 'ru' ? "Название раздела..." : "Бөлүктүң ады..."}
                    className="w-full bg-white border border-stone-100 rounded-2xl py-4 px-6 text-xl font-serif font-black text-stone-900 outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-sm"
                  />
                </div>

                <div className="flex-grow flex flex-col space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] flex items-center justify-between">
                    Содержание
                    <span className="flex items-center gap-1 font-bold text-emerald-600 normal-case tracking-normal">
                      <HelpCircle className="w-3 h-3" />
                      LaTeX: $E = mc^2$
                    </span>
                  </label>
                  <textarea 
                    value={lang === 'ru' ? contentRu : contentTyv}
                    onChange={(e) => lang === 'ru' ? setContentRu(e.target.value) : setContentTyv(e.target.value)}
                    onPaste={(e) => handlePaste(e, lang)}
                    placeholder="Напишите материал лекции..."
                    className="flex-grow w-full bg-white border border-stone-100 rounded-[2.5rem] p-8 text-stone-700 outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all min-h-[400px] leading-relaxed shadow-sm resize-y"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Resizer Handle */}
          {activeTab === 'edit' && window.innerWidth >= 768 && (
            <div 
              onMouseDown={startResizing}
              className={`w-1.5 h-full bg-stone-100 hover:bg-emerald-400 transition-colors cursor-col-resize flex items-center justify-center group ${isResizing ? 'bg-emerald-500' : ''}`}
            >
              <div className="w-px h-8 bg-stone-300 group-hover:bg-white" />
            </div>
          )}

          {/* Live Preview Area */}
          <div 
            style={{ width: activeTab === 'edit' && window.innerWidth >= 768 ? `${100 - splitWidth}%` : '100%' }}
            className={`flex-grow bg-white p-6 sm:p-12 overflow-y-auto ${activeTab === 'edit' ? 'hidden md:block' : (activeTab === 'preview' ? 'block' : 'hidden')} border-l border-stone-100`}
          >
            <div className="max-w-prose mx-auto">
              <div className="flex items-center gap-2 mb-10 text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] bg-emerald-50 w-fit px-3 py-1 rounded-full">
                 <Eye className="w-3.5 h-3.5" />
                 Предпросмотр
              </div>
              
              <h1 className="text-4xl sm:text-5xl font-serif font-black text-stone-900 mb-10 leading-tight">
                <MathText text={lang === 'ru' ? titleRu : titleTyv} />
              </h1>

              <div className="prose prose-stone prose-lg max-w-none prose-p:leading-relaxed">
                <MathText 
                  text={lang === 'ru' ? contentRu : contentTyv} 
                  isHtml 
                  className="text-stone-700 space-y-6"
                />
                {!(lang === 'ru' ? contentRu : contentTyv) && (
                  <div className="flex flex-col items-center justify-center py-32 text-stone-200 border-2 border-dashed border-stone-100 rounded-[3rem]">
                    <Layout className="w-16 h-16 mb-4 opacity-50" />
                    <p className="font-bold">Контент пока пуст...</p>
                  </div>
                )}
              </div>
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
