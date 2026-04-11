import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import BilingualEditor from '../components/BilingualEditor';
import SEO from '../components/SEO';
import UserAvatar from '../components/UserAvatar';
import { useAuth } from '../store/authContext';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Book, Info, Lightbulb, Share2, Languages, Edit3, Trash2, User, Heart } from 'lucide-react';

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
  const [isFavorite, setIsFavorite] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    try {
      const [termData, langData, favStatus] = await Promise.all([
        api.getTerm(id),
        api.getLanguages(),
        user ? api.getFavoriteStatus(id) : Promise.resolve({ isFavorite: false })
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

      setIsFavorite(favStatus.isFavorite);
    } catch (error) {
      console.error('Error fetching data:', error);
      setTerm(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, user]);

  const toggleFavorite = async () => {
    if (!user || isToggling) return;
    setIsToggling(true);
    try {
      await api.toggleFavorite(id!, isFavorite);
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsToggling(false);
    }
  };

  const canEdit = isAdmin || (user && term && user.id === term.created_by);

  const handleDelete = async () => {
    try {
      await api.deleteTerm(id!);
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

  const formatContent = (html: string) => {
    if (!html) return '';
    return html;
  };

  const activeLanguages = languages.filter(lang => viewMode === 'both' || viewMode === lang.code);
  const isBoth = viewMode === 'both';

  const hasExample = activeLanguages.some(lang => 
    term.translations?.find((t: any) => t.lang_code === lang.code)?.example
  );
  const hasAdditional = activeLanguages.some(lang => 
    term.translations?.find((t: any) => t.lang_code === lang.code)?.additional
  );

  return (
    <div className="space-y-12">
      <SEO 
        title={term.translations?.[0]?.name || 'Термин'} 
        description={term.translations?.[0]?.definition
          ?.replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .substring(0, 160)}
        canonical={`https://bilingvmath.ru/term/${id}`}
      />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-stone-500 hover:text-emerald-600 transition-colors font-bold text-sm uppercase tracking-widest">
            <ArrowLeft className="w-5 h-5" />
            Назад
          </Link>
          {user && (
            <button
              onClick={toggleFavorite}
              disabled={isToggling}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-sm uppercase tracking-widest transition-all ${isFavorite ? 'bg-red-50 text-red-500' : 'bg-stone-100 text-stone-500 hover:bg-red-50 hover:text-red-500'}`}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
              {isFavorite ? 'В избранном' : 'В избранное'}
            </button>
          )}
          {canEdit && (
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowEditor(true)}
                className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 transition-colors font-bold text-sm uppercase tracking-widest"
              >
                <Edit3 className="w-4 h-4" />
                Изменить
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

      {/* New Header Section: Author, Subject, Grade */}
      <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <Link 
            to={`/user/${term.created_by}`}
            className="flex items-center gap-4 group/author hover:bg-stone-50 p-2 -ml-2 rounded-3xl transition-all"
          >
            <UserAvatar 
              user={{
                username: term.author_name,
                full_name: term.author_full_name,
                avatar: term.author_avatar
              }} 
              size="lg" 
            />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Автор термина</span>
              <span className="text-lg font-bold text-stone-900 group-hover/author:text-emerald-600 transition-colors leading-tight">
                {term.author_full_name || term.author_name || 'Аноним'}
              </span>
            </div>
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-600 rounded-2xl text-xs font-bold uppercase tracking-widest border border-stone-200">
              <Book className="w-4 h-4 text-emerald-600" />
              <span>{term.subject_name_ru || 'Математика'}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-600 rounded-2xl text-xs font-bold uppercase tracking-widest border border-stone-200">
              <User className="w-4 h-4 text-emerald-600" />
              <span>Класс {term.grade}</span>
            </div>
          </div>
        </div>

        {/* Language Indicator Badge */}
        <div className="pt-6 border-t border-stone-100 flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Доступные языки:</span>
          <div className="flex gap-2">
            {term.translations?.map((t: any) => {
              const lang = languages.find(l => l.code === t.lang_code);
              return (
                <span 
                  key={t.lang_code}
                  className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-wider border border-emerald-100"
                >
                  {lang?.name || t.lang_code}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Aligned Desktop View (Both Languages) */}
        {isBoth && (
          <div className="hidden lg:grid grid-cols-2 gap-x-4">
            {/* Headers */}
            {activeLanguages.map(lang => (
              <div key={`header-${lang.code}`} className="bg-white p-6 pb-4 rounded-t-[2.5rem] border-x border-t border-stone-200">
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest">
                  <Languages className="w-4 h-4" />
                  <span>{lang.name}</span>
                </div>
              </div>
            ))}

            {/* Titles */}
            {activeLanguages.map(lang => {
              const translation = term.translations?.find((t: any) => t.lang_code === lang.code);
              return (
                <div key={`title-${lang.code}`} className="bg-white px-6 pb-6 border-x border-stone-200">
                  <h1 className="font-serif text-4xl font-black text-stone-900 leading-tight">
                    {translation?.name}
                  </h1>
                </div>
              );
            })}

            {/* Definitions */}
            {activeLanguages.map(lang => {
              const translation = term.translations?.find((t: any) => t.lang_code === lang.code);
              return (
                <div key={`def-${lang.code}`} className="bg-white px-4 pb-8 border-x border-stone-200 flex flex-col min-w-0">
                  <section className="space-y-3 flex-grow w-full">
                    <h3 className="flex items-center gap-2 text-stone-400 font-bold text-xs uppercase tracking-widest">
                      <Book className="w-4 h-4" />
                      Определение
                    </h3>
                    <div className="bg-stone-50 border border-stone-200 rounded-3xl p-6 sm:p-8 focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
                      <div 
                        className="text-stone-700 text-lg leading-relaxed font-medium prose prose-stone !max-w-none w-full overflow-x-auto text-pretty hyphens-auto"
                        dangerouslySetInnerHTML={{ __html: formatContent(translation?.definition || '') }}
                      />
                    </div>
                  </section>
                </div>
              );
            })}

            {/* Examples */}
            {hasExample && activeLanguages.map(lang => {
              const translation = term.translations?.find((t: any) => t.lang_code === lang.code);
              return (
                <div key={`example-${lang.code}`} className="bg-white px-4 pb-8 border-x border-stone-200 min-w-0">
                  {translation?.example ? (
                    <section className="space-y-3 p-6 bg-emerald-50 rounded-2xl border border-emerald-100 h-full w-full">
                      <h3 className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest">
                        <Lightbulb className="w-4 h-4" />
                        Пример
                      </h3>
                      <div 
                        className="text-emerald-900 font-medium leading-relaxed italic prose prose-emerald !max-w-none w-full overflow-x-auto text-pretty hyphens-auto"
                        dangerouslySetInnerHTML={{ __html: formatContent(translation.example) }}
                      />
                    </section>
                  ) : (
                    <div className="h-full" />
                  )}
                </div>
              );
            })}

            {/* Additional */}
            {hasAdditional && activeLanguages.map(lang => {
              const translation = term.translations?.find((t: any) => t.lang_code === lang.code);
              return (
                <div key={`add-${lang.code}`} className="bg-white px-6 pb-8 border-x border-stone-200">
                  {translation?.additional ? (
                    <section className="space-y-3">
                      <h3 className="text-stone-400 font-bold text-xs uppercase tracking-widest">Дополнительно</h3>
                      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
                        <p className="text-stone-600 text-sm leading-relaxed">
                          {translation.additional}
                        </p>
                      </div>
                    </section>
                  ) : (
                    <div className="h-full" />
                  )}
                </div>
              );
            })}

            {/* Footers (Simplified) */}
            {activeLanguages.map(lang => (
              <div key={`footer-${lang.code}`} className="bg-white p-6 pt-2 rounded-b-[2.5rem] border-x border-b border-stone-200">
                {/* Empty footer space to maintain the rounded bottom look */}
              </div>
            ))}
          </div>
        )}

        {/* Mobile or Single Language View */}
        <div className={`${isBoth ? 'lg:hidden' : ''} grid grid-cols-1 gap-8`}>
          {activeLanguages.map((lang) => {
            const translation = term.translations?.find((t: any) => t.lang_code === lang.code);
            if (!translation) return null;

            return (
              <div 
                key={lang.code}
                className={`space-y-8 p-5 sm:p-8 bg-white rounded-3xl border border-stone-200 shadow-sm transition-all ${viewMode === lang.code ? 'lg:col-span-2' : ''}`}
              >
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest">
                  <Languages className="w-4 h-4" />
                  <span>{lang.name}</span>
                </div>
                <h1 className="font-serif text-3xl sm:text-5xl font-black text-stone-900 leading-tight break-words text-pretty">
                  {translation.name}
                </h1>
                <div className="space-y-6">
                  <section className="space-y-3">
                    <h3 className="flex items-center gap-2 text-stone-400 font-bold text-xs uppercase tracking-widest">
                      <Book className="w-4 h-4" />
                      Определение
                    </h3>
                    <div className="bg-stone-50 border border-stone-200 rounded-3xl p-6 sm:p-8">
                      <div 
                        className="text-stone-700 text-lg leading-relaxed font-medium prose prose-stone !max-w-none w-full overflow-x-auto text-pretty hyphens-auto"
                        dangerouslySetInnerHTML={{ __html: formatContent(translation.definition) }}
                      />
                    </div>
                  </section>
                  {translation.example && (
                    <section className="space-y-3 p-4 sm:p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <h3 className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest">
                        <Lightbulb className="w-4 h-4" />
                        Пример
                      </h3>
                      <div 
                        className="text-emerald-900 font-medium leading-relaxed italic prose prose-emerald !max-w-none w-full overflow-x-auto text-pretty hyphens-auto"
                        dangerouslySetInnerHTML={{ __html: formatContent(translation.example) }}
                      />
                    </section>
                  )}
                  {translation.additional && (
                    <section className="space-y-3">
                      <h3 className="text-stone-400 font-bold text-xs uppercase tracking-widest">Дополнительно</h3>
                      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-6">
                        <p className="text-stone-600 text-sm leading-relaxed break-words">
                          {translation.additional}
                        </p>
                      </div>
                    </section>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
