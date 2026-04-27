import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useAuth } from '../store/authContext';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'motion/react';
import { Save, X, Book, Lightbulb, Info, Languages, PlusCircle, Image as ImageIcon, Video as VideoIcon, Upload, Trash2 } from 'lucide-react';

interface BilingualEditorProps {
  onClose: () => void;
  initialData?: any;
}

export default function BilingualEditor({ onClose, initialData }: BilingualEditorProps) {
  const { user, profile } = useAuth();
  const [languages, setLanguages] = useState<any[]>([]);
  const [activeLang, setActiveLang] = useState<string>('ru');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [formData, setFormData] = useState<any>({
    grade: initialData?.grade || '1',
    subject_id: initialData?.subject_id || 's1',
    translations: {}
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [langs, subjs] = await Promise.all([
          api.getLanguages(),
          api.getSubjects()
        ]);
        
        if (Array.isArray(langs)) {
          setLanguages(langs);
        } else {
          console.error('Languages data is not an array:', langs);
          setLanguages([]);
        }

        if (Array.isArray(subjs)) {
          setSubjects(subjs);
        } else {
          console.error('Subjects data is not an array:', subjs);
          setSubjects([]);
        }
        
        // Initialize translations
        const initialTranslations: any = {};
        const langList = Array.isArray(langs) ? langs : [];
        langList.forEach((l: any) => {
          const existing = initialData?.translations?.find((t: any) => t.lang_code === l.code);
          initialTranslations[l.code] = {
            name: existing?.name || '',
            definition: existing?.definition || '',
            example: existing?.example || '',
            additional: existing?.additional || ''
          };
        });
        setFormData((prev: any) => ({ ...prev, translations: initialTranslations }));
      } catch (error) {
        console.error('Failed to load initial data for editor:', error);
      }
    };
    loadInitialData();
  }, [initialData]);

  const handleTranslationChange = (langCode: string, field: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      translations: {
        ...prev.translations,
        [langCode]: {
          ...prev.translations[langCode],
          [field]: value
        }
      }
    }));
  };

  const handleSubjectChange = async (subjectId: string) => {
    setFormData({ ...formData, subject_id: subjectId });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Check if at least one language has a name
    const hasName = Object.values(formData.translations).some((t: any) => t.name.trim() !== '');
    if (!hasName) return;

    setSaving(true);
    try {
      const userInfo = {
        uid: user.uid || user.id,
        username: profile?.full_name || user.email || 'Anonymous',
        role: profile?.role || 'guest'
      };

      const isModerator = profile?.role === 'chief_editor' || profile?.role === 'super_admin';
      const newStatus = isModerator ? 'published' : 'pending';

      if (initialData?.id) {
        await api.updateTerm(initialData.id, {
          ...formData,
          status: isModerator ? (initialData.status || 'published') : 'pending'
        }, userInfo);
      } else {
        await api.createTerm({
          ...formData,
          id: Math.random().toString(36).substr(2, 9),
          user_id: user.id,
          status: newStatus
        }, profile?.role);
      }
      onClose();
    } catch (error) {
      console.error('Error saving term:', error);
    } finally {
      setSaving(false);
    }
  };

  const grades = Array.from({ length: 11 }, (_, i) => (i + 1).toString());

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link', 'image', 'video'],
      ['clean']
    ],
  };

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list',
    'link', 'image', 'video'
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl flex flex-col"
      >
        <header className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-black text-stone-900 leading-tight">
                {initialData ? 'Редактировать термин' : 'Новый термин'}
              </h2>
              <p className="text-stone-400 text-xs font-bold uppercase tracking-widest">
                {initialData ? 'Изменение существующего контента' : 'Создание билингвального контента'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 sm:p-12 space-y-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Предмет</label>
              <select
                value={formData.subject_id || ''}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
              >
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name_ru}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Класс</label>
              <select
                value={formData.grade || ''}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
              >
                {grades.map(g => (
                  <option key={g} value={g}>{g} класс</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-8">
            <div className="flex flex-wrap gap-2 p-1 bg-stone-100 rounded-2xl border border-stone-200 w-fit">
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => setActiveLang(lang.code)}
                  className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeLang === lang.code ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                >
                  <span>{lang.flag}</span>
                  {lang.native_name}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {languages.map(lang => activeLang === lang.code && (
                <motion.div
                  key={lang.code}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400">
                        <Languages className="w-4 h-4" />
                        Название ({lang.name})
                      </label>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const current = formData.translations[lang.code]?.name || '';
                            handleTranslationChange(lang.code, 'name', current + '□');
                          }}
                          className="px-2 py-1 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded text-xs font-bold text-stone-600 transition-all flex items-center gap-1"
                          title="Вставить квадрат (плейсхолдер)"
                        >
                          <span className="text-sm">□</span>
                          Вставить бокс
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={formData.translations[lang.code]?.name || ''}
                      onChange={(e) => handleTranslationChange(lang.code, 'name', e.target.value)}
                      className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium text-xl"
                      placeholder={`Название на языке ${lang.native_name}...`}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400">
                        <Book className="w-4 h-4" />
                        Определение
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const current = formData.translations[lang.code]?.definition || '';
                          handleTranslationChange(lang.code, 'definition', current + ' □ ');
                        }}
                        className="px-2 py-1 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded text-xs font-bold text-stone-600 transition-all flex items-center gap-1"
                        title="Вставить квадрат (плейсхолдер)"
                      >
                        <span className="text-sm">□</span>
                        Вставить бокс
                      </button>
                    </div>
                    <div className="bg-stone-50 border border-stone-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
                      <ReactQuill
                        theme="snow"
                        value={formData.translations[lang.code]?.definition || ''}
                        onChange={(content) => handleTranslationChange(lang.code, 'definition', content)}
                        modules={quillModules}
                        formats={quillFormats}
                        placeholder="Введите определение..."
                        className="bg-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400">
                      <Lightbulb className="w-4 h-4" />
                      Пример
                    </label>
                    <div className="bg-stone-50 border border-stone-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
                      <ReactQuill
                        theme="snow"
                        value={formData.translations[lang.code]?.example || ''}
                        onChange={(content) => handleTranslationChange(lang.code, 'example', content)}
                        modules={quillModules}
                        formats={quillFormats}
                        placeholder="Пример использования..."
                        className="bg-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400">
                      <Info className="w-4 h-4" />
                      Дополнительно
                    </label>
                    <textarea
                      value={formData.translations[lang.code]?.additional || ''}
                      onChange={(e) => handleTranslationChange(lang.code, 'additional', e.target.value)}
                      className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium h-32"
                      placeholder="Дополнительная информация..."
                    />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <footer className="p-6 border-t border-stone-100 bg-stone-50 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-2xl text-stone-500 hover:text-stone-700 font-bold text-sm transition-all"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !Object.values(formData.translations).some((t: any) => t.name.trim() !== '')}
            className="flex items-center gap-2 bg-emerald-600 text-white px-8 py-3 rounded-2xl hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg font-bold disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </footer>
      </motion.div>
    </motion.div>
  );
}
