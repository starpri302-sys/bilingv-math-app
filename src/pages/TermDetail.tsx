import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import BilingualEditor from '../components/BilingualEditor';
import SEO from '../components/SEO';
import { useAuth } from '../store/authContext';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Book, Info, Lightbulb, Share2, Languages, Edit3, Trash2 } from 'lucide-react';

export default function TermDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [term, setTerm] = useState<any>(null);
  const [languages, setLanguages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<string>('both');
  const [showEditor, setShowEditor] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    try {
      const [termData, langData] = await Promise.all([
        api.getTerm(id),
        api.getLanguages()
      ]);
      
      if (termData && !termData.error) {
        setTerm(termData);
      } else {
        console.error('Term not found or error:', termData);
        setTerm(null);
      }

      if (Array.isArray(langData)) {
        setLanguages(langData);
      } else {
        console.error('Languages data is not an array:', langData);
        setLanguages([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setTerm(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const canEdit = isAdmin || (user && term && user.uid === term.created_by);

  const handleDelete = async () => {
    try {
      await api.deleteTerm(id!, profile?.role);
      navigate('/');
    } catch (error) {
      console.error('Error deleting term:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!term) {
    return (
      <div className="text-center py-20 space-y-4 bg-white rounded-3xl border border-stone-100 shadow-sm">
        <Info className="w-12 h-12 text-stone-300 mx-auto" />
        <h3 className="text-xl font-bold text-stone-900">Термин не найден</h3>
        <Link to="/" className="text-emerald-600 font-bold hover:underline">Вернуться на главную</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <SEO 
        title={term.translations?.[0]?.name || 'Термин'} 
        description={term.translations?.[0]?.definition?.replace(/<[^>]*>/g, '').substring(0, 160)}
        canonical={`https://bilingvmath.ru/term/${id}`}
      />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-stone-500 hover:text-emerald-600 transition-colors font-bold text-sm uppercase tracking-widest">
            <ArrowLeft className="w-5 h-5" />
            Назад к списку
          </Link>
          {canEdit && (
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowEditor(true)}
                className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 transition-colors font-bold text-sm uppercase tracking-widest"
              >
                <Edit3 className="w-4 h-4" />
                Редактировать
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 text-red-500 hover:text-red-600 transition-colors font-bold text-sm uppercase tracking-widest"
              >
                <Trash2 className="w-4 h-4" />
                Удалить
              </button>
            </div>
          )}
        </div>
        <div className="flex bg-stone-100 p-1 rounded-2xl border border-stone-200 overflow-x-auto max-w-full">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setViewMode(lang.code)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${viewMode === lang.code ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              {lang.code}
            </button>
          ))}
          <button
            onClick={() => setViewMode('both')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${viewMode === 'both' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
          >
            Оба
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
      >
        {/* Dynamic Content */}
        {languages.filter(lang => viewMode === 'both' || viewMode === lang.code).map((lang) => {
          const translation = term.translations?.find((t: any) => t.lang_code === lang.code);
          if (!translation) return null;

          return (
            <div 
              key={lang.code}
              className={`space-y-8 p-8 bg-white rounded-3xl border border-stone-200 shadow-sm transition-all ${viewMode === lang.code ? 'lg:col-span-2' : ''}`}
            >
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest">
                <Languages className="w-4 h-4" />
                <span>{lang.name}</span>
              </div>
              <h1 className="font-serif text-4xl sm:text-5xl font-black text-stone-900 leading-tight">
                {translation.name}
              </h1>
              <div className="space-y-6">
                <section className="space-y-3">
                  <h3 className="flex items-center gap-2 text-stone-400 font-bold text-xs uppercase tracking-widest">
                    <Book className="w-4 h-4" />
                    Определение
                  </h3>
                  <div 
                    className="text-stone-700 text-lg leading-relaxed font-medium prose prose-stone max-w-none"
                    dangerouslySetInnerHTML={{ __html: translation.definition }}
                  />
                </section>
                {translation.example && (
                  <section className="space-y-3 p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <h3 className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest">
                      <Lightbulb className="w-4 h-4" />
                      Пример
                    </h3>
                    <div 
                      className="text-emerald-900 font-medium leading-relaxed italic prose prose-emerald max-w-none"
                      dangerouslySetInnerHTML={{ __html: translation.example }}
                    />
                  </section>
                )}
                {translation.additional && (
                  <section className="space-y-3">
                    <h3 className="text-stone-400 font-bold text-xs uppercase tracking-widest">Дополнительно</h3>
                    <p className="text-stone-600 text-sm leading-relaxed">
                      {translation.additional}
                    </p>
                  </section>
                )}
              </div>
            </div>
          );
        })}
      </motion.div>

      <AnimatePresence>
        {showEditor && (
          <BilingualEditor 
            onClose={() => {
              setShowEditor(false);
              fetchData();
            }} 
            initialData={term} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
                <Trash2 className="w-8 h-8" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-stone-900">Удалить термин?</h3>
                <p className="text-stone-500">Это действие нельзя будет отменить. Все переводы и данные будут удалены навсегда.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-6 py-3 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition-all"
                >
                  Отмена
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-6 py-3 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all shadow-md hover:shadow-lg"
                >
                  Удалить
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
