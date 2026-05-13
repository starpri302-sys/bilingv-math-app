import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { GraduationCap, BookOpen, Clock, ChevronRight, Lock, Sparkles, Search, Plus, X, ChevronLeft, FileText } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../store/authContext';
import SEO from '../components/SEO';
import LectureEditor from '../components/LectureEditor';

interface Course {
  id: string;
  subject_id: string;
  title_ru: string;
  title_tyv: string;
  description_ru: string;
  description_tyv: string;
  subject_name_ru: string;
  subject_name_tyv: string;
  created_at: string;
}

interface Lecture {
  id: string;
  title_ru: string;
  title_tyv: string;
  order_index: number;
  is_free: number;
}

export default function Courses() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<{id: string, name_ru: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  
  // Creation States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLectureEditor, setShowLectureEditor] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCourse, setNewCourse] = useState({ title_ru: '', title_tyv: '', desc_ru: '', desc_tyv: '', subject_id: '' });
  
  // Detail States
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [lecturesLoading, setLecturesLoading] = useState(false);

  const { isPro } = useAuth();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [coursesData, subjectsData] = await Promise.all([
        api.getCourses(),
        api.getSubjects()
      ]);
      setCourses(coursesData);
      setSubjects(subjectsData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseLectures = async (courseId: string) => {
    setLecturesLoading(true);
    try {
      const data = await api.getCourseLectures(courseId);
      setLectures(data);
    } catch (err) {
      console.error('Failed to fetch lectures:', err);
    } finally {
      setLecturesLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (id) {
      const course = courses.find(c => c.id === id);
      if (course) {
        setSelectedCourse(course);
        fetchCourseLectures(id);
      } else if (!loading && courses.length > 0) {
        // Find if course exists in DB but not in local list (rare) or redirect
        const reloadCourse = async () => {
          try {
             // We don't have a direct getCourse by ID yet, but let's assume it's in the list
          } catch(e) {}
        };
        reloadCourse();
      }
    } else {
      setSelectedCourse(null);
      setLectures([]);
    }
  }, [id, courses, loading]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.title_ru || !newCourse.subject_id) return;
    setIsSubmitting(true);
    try {
      await api.createCourse({
        subject_id: newCourse.subject_id,
        title_ru: newCourse.title_ru,
        title_tyv: newCourse.title_tyv,
        description_ru: newCourse.desc_ru,
        description_tyv: newCourse.desc_tyv
      });
      setShowCreateModal(false);
      setNewCourse({ title_ru: '', title_tyv: '', desc_ru: '', desc_tyv: '', subject_id: '' });
      fetchData();
    } catch (err) {
      console.error('Failed to create course:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateLecture = async (data: { title_ru: string; title_tyv: string; content_ru: string; content_tyv: string; is_free: boolean }) => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      await api.createLecture({
        course_id: id,
        ...data
      });
      setShowLectureEditor(false);
      fetchCourseLectures(id);
    } catch (err) {
      console.error('Failed to create lecture:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCourses = courses.filter(c => {
    const matchesSearch = c.title_ru.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         c.title_tyv.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = !selectedSubject || (c as any).subject_id === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  if (selectedCourse) {
    return (
      <div className="min-h-screen bg-stone-50 pb-20">
        <SEO 
          title={`${selectedCourse.title_ru} - BilingvMath`} 
          description={selectedCourse.description_ru}
        />

        <div className="bg-white border-b border-stone-200 py-12">
          <div className="max-w-4xl mx-auto px-4">
            <button 
              onClick={() => navigate('/courses')}
              className="flex items-center gap-2 text-stone-400 hover:text-emerald-600 font-bold text-xs uppercase tracking-widest mb-8 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Назад к лекторию
            </button>

            <div className="flex flex-wrap items-center gap-3 mb-6">
               <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                 {selectedCourse.subject_name_ru}
               </span>
               <span className="text-stone-300">•</span>
               <span className="text-stone-400 text-[10px] font-bold uppercase tracking-wider">
                 {lectures.length} лекций
               </span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-serif font-black text-stone-900 mb-6 leading-tight">
              {selectedCourse.title_ru}
            </h1>
            <p className="text-stone-500 text-lg leading-relaxed max-w-2xl">
              {selectedCourse.description_ru}
            </p>

            {isPro && !showLectureEditor && (
              <div className="mt-10 pt-10 border-t border-stone-100 flex justify-between items-center">
                 <div>
                   <h3 className="font-bold text-stone-900 mb-1">Управление материалом</h3>
                   <p className="text-xs text-stone-400">Добавляйте новые лекции, используя Discourse-редактор</p>
                 </div>
                 <button 
                   onClick={() => setShowLectureEditor(true)}
                   className="flex items-center gap-2 bg-stone-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-600 transition-all active:scale-95 shadow-lg"
                 >
                   <Plus className="w-5 h-5" />
                   Добавить лекцию
                 </button>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 mt-12">
          {showLectureEditor ? (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between mb-8">
                <button 
                  onClick={() => setShowLectureEditor(false)}
                  className="flex items-center gap-2 text-stone-400 hover:text-rose-600 font-bold text-xs uppercase tracking-widest transition-colors"
                >
                  <X className="w-4 h-4" />
                  Отменить создание
                </button>
              </div>
              <LectureEditor onSave={handleCreateLecture} isSubmitting={isSubmitting} />
            </motion.div>
          ) : (
            <div className="space-y-6">
               <h2 className="text-2xl font-serif font-black text-stone-900 flex items-center gap-3">
                 Материалы курса
                 <div className="h-px bg-stone-200 flex-grow" />
               </h2>

               {lecturesLoading ? (
                 <div className="space-y-4">
                   {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse border border-stone-100" />)}
                 </div>
               ) : lectures.map((lecture, idx) => (
                 <motion.div
                   key={lecture.id}
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: idx * 0.05 }}
                   className="group relative"
                 >
                    <Link 
                      to={`/lectures/${lecture.id}`}
                      className="block bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 hover:shadow-xl hover:border-emerald-100 transition-all duration-300 relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-all duration-500 scale-0 group-hover:scale-100" />
                      
                      <div className="flex items-center gap-6 relative">
                        <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-300 font-mono font-black border border-stone-100 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                          {idx + 1}
                        </div>
                        <div className="flex-grow">
                          <h3 className="text-lg sm:text-xl font-bold text-stone-900 mb-1 group-hover:text-emerald-600 transition-colors">
                            {lecture.title_ru}
                          </h3>
                          <div className="flex items-center gap-3">
                             <div className="flex items-center gap-1.5 text-[10px] font-black text-stone-400 uppercase tracking-widest">
                               <FileText className="w-3.5 h-3.5" />
                               Лекция
                             </div>
                             {lecture.is_free === 1 ? (
                               <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-widest">Бесплатно</span>
                             ) : (
                               <span className="text-[10px] font-black text-amber-500 bg-amber-50 px-2 py-0.5 rounded-md uppercase tracking-widest flex items-center gap-1">
                                 <Sparkles className="w-3 h-3" />
                                 Pro
                               </span>
                             )}
                          </div>
                        </div>
                        <div className="shrink-0 text-stone-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all">
                          <ChevronRight className="w-6 h-6" />
                        </div>
                      </div>
                    </Link>
                 </motion.div>
               ))}

               {lectures.length === 0 && !lecturesLoading && (
                 <div className="text-center py-20 bg-white rounded-[3rem] border border-stone-200">
                    <BookOpen className="w-12 h-12 text-stone-200 mx-auto mb-4" />
                    <p className="text-stone-400 font-bold">В этом курсе пока нет лекций.</p>
                 </div>
               )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <SEO 
        title="Лекторий - BilingvMath" 
        description="Образовательные курсы и лекции по математике на русском и тувинском языках."
      />
      
      {/* Hero Header */}
      <div className="bg-white border-b border-stone-200 pt-12 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-stone-900">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider mb-6"
          >
            <GraduationCap className="w-4 h-4" />
            Академическая среда
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl font-serif font-black mb-6"
          >
            Интерактивный лекторий
          </motion.h1>
          
          <div className="max-w-xl mx-auto mt-8 flex flex-col sm:flex-row gap-4">
             <div className="relative flex-grow">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input 
                  type="text"
                  placeholder="Поиск курсов..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 pl-12 pr-12 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium"
                />
             </div>
             <select 
              value={selectedSubject || ''}
              onChange={(e) => setSelectedSubject(e.target.value || null)}
              className="bg-white border border-stone-200 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-stone-700"
             >
               <option value="">Все предметы</option>
               {subjects.map(s => <option key={s.id} value={s.id}>{s.name_ru}</option>)}
             </select>
          </div>

          {isPro && (
            <div className="mt-8 flex justify-center">
              <button 
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95"
              >
                <Plus className="w-5 h-5" />
                Создать курс
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] w-full max-w-xl overflow-hidden shadow-2xl relative"
          >
            <button 
              onClick={() => setShowCreateModal(false)}
              className="absolute top-6 right-6 text-stone-400 hover:text-stone-900 transition-colors p-2"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="p-8 sm:p-12">
              <h2 className="text-3xl font-serif font-black text-stone-900 mb-8">Новый курс</h2>
              <form onSubmit={handleCreateCourse} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Дисциплина</label>
                  <select 
                    required
                    value={newCourse.subject_id}
                    onChange={(e) => setNewCourse({ ...newCourse, subject_id: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-emerald-500/10 font-bold"
                  >
                    <option value="">Выбрать предмет...</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name_ru}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Название (RU)</label>
                    <input 
                      required
                      value={newCourse.title_ru}
                      onChange={(e) => setNewCourse({ ...newCourse, title_ru: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-emerald-500/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Название (TYV)</label>
                    <input 
                      value={newCourse.title_tyv}
                      onChange={(e) => setNewCourse({ ...newCourse, title_tyv: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-emerald-500/10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Описание</label>
                  <textarea 
                    value={newCourse.desc_ru}
                    onChange={(e) => setNewCourse({ ...newCourse, desc_ru: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 px-6 h-32 outline-none focus:ring-4 focus:ring-emerald-500/10"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-stone-900 text-white rounded-2xl py-5 font-black hover:bg-emerald-600 transition-all disabled:opacity-50 uppercase tracking-widest text-xs"
                >
                  {isSubmitting ? 'Создание...' : 'Создать курс'}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-3xl p-8 h-64 animate-pulse border border-stone-200" />
            ))}
          </div>
        ) : filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCourses.map((course, idx) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="group bg-white rounded-3xl border border-stone-200 overflow-hidden hover:shadow-xl transition-all duration-300"
              >
                <div className="p-8 pb-4">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100 text-emerald-600">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    {!isPro && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 text-[10px] font-black uppercase tracking-widest">
                        <Lock className="w-3 h-3" />
                        Pro
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-bold text-stone-900 group-hover:text-emerald-600 transition-colors mb-1">
                        {course.title_ru}
                      </h2>
                      <p className="text-sm font-medium text-stone-400 italic">
                        {course.title_tyv}
                      </p>
                    </div>
                    <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-100/50">
                      <p className="text-stone-600 text-sm line-clamp-2 leading-relaxed">
                        {course.description_ru}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="px-8 pb-8 pt-4">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4 text-xs text-stone-400 font-medium tracking-wide">
                      <div className="flex items-center gap-1.5 bg-stone-100/50 px-2.5 py-1 rounded-lg">
                        <Sparkles className="w-3 h-3 text-emerald-500" />
                        {course.subject_name_ru}
                      </div>
                    </div>
                  </div>
                  
                  <Link 
                    to={`/courses/${course.id}`}
                    className="w-full flex items-center justify-center gap-2 bg-stone-900 text-white rounded-2xl py-4 font-bold hover:bg-emerald-600 transition-all shadow-lg active:scale-95"
                  >
                    Перейти к лекциям
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-stone-200">
            <GraduationCap className="w-12 h-12 text-stone-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-stone-900 mb-2">Курсы пока не добавлены</h3>
            <p className="text-stone-500">Наши эксперты-лингвисты готовят материалы. Пожалуйста, зайдите позже.</p>
          </div>
        )}

        {/* Pro Banner */}
        {!isPro && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-20 relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-emerald-600 to-emerald-800 p-8 sm:p-12 text-white shadow-2xl"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-400/20 rounded-full blur-2xl -ml-24 -mb-24" />
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="max-w-xl text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                  🚀 Ускорьте обучение
                </div>
                <h2 className="text-3xl sm:text-4xl font-serif font-black mb-4">Разблокируйте Академический уровень</h2>
                <p className="text-emerald-50/80 leading-relaxed font-medium">
                  Получите неограниченный доступ ко всем лекциям, закрытому форуму учителей 
                  и методическим материалам для углубленного изучения математики.
                </p>
              </div>
              <button className="flex-shrink-0 bg-white text-emerald-700 px-10 py-5 rounded-2xl font-black shadow-xl hover:bg-emerald-50 transition-all active:scale-95 uppercase tracking-widest text-sm">
                Стать Pro
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
