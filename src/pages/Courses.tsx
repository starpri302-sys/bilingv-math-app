import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { GraduationCap, BookOpen, Clock, ChevronRight, Lock, Sparkles, Search } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../store/authContext';
import SEO from '../components/SEO';

interface Course {
  id: string;
  title_ru: string;
  title_tyv: string;
  description_ru: string;
  description_tyv: string;
  subject_name_ru: string;
  subject_name_tyv: string;
  created_at: string;
}

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<{id: string, name_ru: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const { isPro } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
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
    fetchData();
  }, []);

  const filteredCourses = courses.filter(c => {
    const matchesSearch = c.title_ru.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         c.title_tyv.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = !selectedSubject || c.subject_id === selectedSubject;
    return matchesSearch && matchesSubject;
  });

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
                  className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium"
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
        </div>
      </div>

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
