import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, BookOpen, GraduationCap, Plus, FolderPlus, 
  ChevronRight, ArrowRight, BarChart3, Clock, 
  Star, ClipboardList, Settings, Search, MoreHorizontal,
  Mail, School, BookMarked, Layers, FileText, CheckCircle2, X
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../store/authContext';
import SEO from '../components/SEO';
import Pagination from '../components/Pagination';

const ITEMS_PER_PAGE = 6;

interface DashboardData {
  courses: any[];
  classes: any[];
  stats: {
    total_students: number;
    total_assignments: number;
  };
  recent_activity: any[];
}

export default function TeacherDashboard() {
  console.log('TeacherDashboard component rendering');
  const navigate = useNavigate();
  const { user, isPro, isTeacher, loading: authLoading } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'classes' | 'resources'>('overview');
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coursesPage, setCoursesPage] = useState(1);
  const [classesPage, setClassesPage] = useState(1);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!isTeacher && !isPro) {
      navigate('/courses');
      return;
    }

    const fetchData = async () => {
      if (!user) return;
      try {
        const [dashboardData, notificationsData] = await Promise.all([
          api.getTeacherDashboard(),
          api.getNotifications(user.id)
        ]);
        setData(dashboardData);
        setNotifications(notificationsData);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isTeacher, isPro, navigate, user?.id]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    setIsSubmitting(true);
    try {
      await api.createClass({ name: newClassName });
      setNewClassName('');
      setShowCreateClass(false);
      // Refresh data
      const dashboardData = await api.getTeacherDashboard();
      setData(dashboardData);
    } catch (err) {
      console.error('Failed to create class:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-stone-500">
        <p className="mb-4">Не удалось загрузить данные панели управления.</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-emerald-600 text-white px-6 py-2 rounded-xl"
        >
          Обновить страницу
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <SEO title="Хаб учителя - BilingvMath" />
      
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-serif font-black text-stone-900 mb-2">
            Здравствуйте, {user?.full_name || user?.username}!
          </h1>
          <p className="text-stone-500 font-medium">Добро пожаловать в личный кабинет преподавателя.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowCreateClass(true)}
            className="flex items-center gap-2 bg-stone-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-stone-200"
          >
            <Users className="w-5 h-5" />
            Создать класс
          </button>
          <Link 
            to="/courses"
            className="flex items-center gap-2 bg-white text-stone-900 border border-stone-200 px-6 py-3 rounded-2xl font-bold hover:bg-stone-50 transition-all"
          >
            <BookOpen className="w-5 h-5" />
            Новый курс
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Мои курсы', value: data.courses?.length || 0, icon: Layers, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Активные классы', value: data.classes?.length || 0, icon: Users, color: 'bg-blue-50 text-blue-600' },
          { label: 'Всего учеников', value: data.stats?.total_students || 0, icon: GraduationCap, color: 'bg-purple-50 text-purple-600' },
          { label: 'Назначения', value: data.stats?.total_assignments || 0, icon: ClipboardList, color: 'bg-amber-50 text-amber-600' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <span className="text-stone-300">
                <ChevronRight className="w-5 h-5" />
              </span>
            </div>
            <div className="text-3xl font-black text-stone-900 mb-1">{stat.value}</div>
            <div className="text-xs font-black text-stone-400 uppercase tracking-widest">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: List areas */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 p-1.5 bg-stone-100 rounded-2xl w-fit">
            {[
              { id: 'overview', label: 'Обзор', icon: BarChart3 },
              { id: 'courses', label: 'Мои Курсы', icon: BookOpen },
              { id: 'classes', label: 'Классы', icon: Users },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-8">
               {/* Notifications Section */}
               {notifications.length > 0 && (
                 <div className="bg-white rounded-[2.5rem] border border-stone-200 p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                       <h3 className="text-xl font-serif font-black text-stone-900">Уведомления</h3>
                    </div>
                    <div className="space-y-4">
                       {notifications.map((n) => (
                         <div key={n.id} className={`p-4 rounded-xl flex items-center justify-between border ${n.is_read ? 'bg-stone-50 border-stone-100' : 'bg-emerald-50 border-emerald-100'}`}>
                           <p className="text-sm font-medium text-stone-900">{n.message}</p>
                           {!n.is_read && (
                             <button 
                               onClick={async () => {
                                 await api.markNotificationAsRead(n.id);
                                 setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, is_read: 1 } : item));
                               }}
                               className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline"
                             >
                               Прочитано
                             </button>
                           )}
                         </div>
                       ))}
                    </div>
                 </div>
               )}

               <div className="bg-white rounded-[2.5rem] border border-stone-200 p-8">
                 <div className="flex items-center justify-between mb-8">
                   <h3 className="text-xl font-serif font-black text-stone-900">Последняя активность</h3>
                   <button className="text-xs font-black text-emerald-600 uppercase tracking-widest hover:underline">Смотреть всё</button>
                 </div>
                 
                 <div className="space-y-6">
                    {data.recent_activity && data.recent_activity.length > 0 ? (
                      data.recent_activity.map((activity: any) => (
                        <div key={activity.id} className="flex gap-4 items-start group">
                          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div className="flex-grow">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-bold text-stone-900">{activity.full_name || activity.username}</p>
                              <span className="text-[10px] font-black text-stone-300 uppercase tracking-widest">{new Date(activity.completed_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs text-stone-500">
                              Изучил лекцию <span className="font-bold text-stone-700">«{activity.lecture_title}»</span>
                              {activity.max_score > 0 && ` с результатом ${activity.score}/${activity.max_score}`}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex gap-4 items-start">
                        <div className="w-10 h-10 bg-stone-50 rounded-xl flex items-center justify-center text-stone-400 border border-stone-100">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-stone-600 text-sm">Пока нет уведомлений об активности учеников.</p>
                        </div>
                      </div>
                    )}
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-emerald-900 rounded-[2rem] p-8 text-white relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
                   <h4 className="text-xl font-serif font-black mb-4">База знаний</h4>
                   <p className="text-emerald-100/70 text-sm mb-6 leading-relaxed">
                     Изучите методические рекомендации по ведению уроков математики на двух языках.
                   </p>
                   <button className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">
                     Перейти <ArrowRight className="w-4 h-4" />
                   </button>
                 </div>

                 <div className="bg-amber-500 rounded-[2rem] p-8 text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-black/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
                    <h4 className="text-xl font-serif font-black mb-4">Сообщество</h4>
                    <p className="text-amber-50 text-sm mb-6 leading-relaxed">
                      Общайтесь с коллегами и делитесь шаблонами своих лекций.
                    </p>
                    <button className="flex items-center gap-2 bg-black/10 hover:bg-black/20 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">
                      Присоединиться <ArrowRight className="w-4 h-4" />
                    </button>
                 </div>
               </div>
            </div>
          )}

          {activeTab === 'courses' && (
            <div className="space-y-4">
               {(data.courses || []).slice((coursesPage - 1) * ITEMS_PER_PAGE, coursesPage * ITEMS_PER_PAGE).map((course, idx) => (
                 <Link 
                  key={course.id} 
                  to={`/courses/${course.id}`}
                  className="block bg-white p-6 rounded-[2rem] border border-stone-200 hover:shadow-lg transition-all group"
                 >
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-50 transition-colors">
                         <BookMarked className="w-6 h-6" />
                       </div>
                       <div>
                         <h4 className="font-bold text-stone-900 group-hover:text-emerald-600 transition-colors">{course.title_ru}</h4>
                         <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Создан {new Date(course.created_at).toLocaleDateString()}</p>
                       </div>
                     </div>
                     <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                   </div>
                 </Link>
               ))}
               {data.courses && data.courses.length > ITEMS_PER_PAGE && (
                  <Pagination 
                    currentPage={coursesPage}
                    totalPages={Math.ceil(data.courses.length / ITEMS_PER_PAGE)}
                    onPageChange={setCoursesPage}
                  />
               )}
               {data.courses.length === 0 && (
                 <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-stone-200 text-stone-400">
                    Начните с создания вашего первого курса
                 </div>
               )}
            </div>
          )}

          {activeTab === 'classes' && (
            <div className="space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(data.classes || []).slice((classesPage - 1) * ITEMS_PER_PAGE, classesPage * ITEMS_PER_PAGE).map((cls) => (
                 <div key={cls.id} className="bg-white p-8 rounded-[2rem] border border-stone-200 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                        <Users className="w-6 h-6" />
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Код доступа</p>
                        <span className="font-mono font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">{cls.invite_code}</span>
                      </div>
                    </div>
                    <h4 className="text-xl font-serif font-black text-stone-900 mb-2">{cls.name}</h4>
                    <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mb-8">Класс активен</p>
                    
                    <div className="flex items-center justify-between pt-6 border-t border-stone-100">
                       <Link to={`/teacher/classes/${cls.id}`} className="text-[10px] font-black text-stone-900 uppercase tracking-widest hover:text-emerald-600 underline">Журнал</Link>
                       <button className="text-[10px] font-black text-stone-400 uppercase tracking-widest hover:text-rose-600">Настройки</button>
                    </div>
                 </div>
               ))}
               </div>
               {data.classes && data.classes.length > ITEMS_PER_PAGE && (
                  <Pagination 
                    currentPage={classesPage}
                    totalPages={Math.ceil(data.classes.length / ITEMS_PER_PAGE)}
                    onPageChange={setClassesPage}
                  />
               )}
               {data.classes.length === 0 && (
                 <div className="md:col-span-2 text-center py-20 bg-white rounded-[2rem] border border-dashed border-stone-200 text-stone-400">
                    У вас пока нет активных классов
                 </div>
               )}
            </div>
          )}
        </div>

        {/* Right Column: Sidebar info */}
        <div className="space-y-8">
           <div className="bg-white rounded-[2.5rem] border border-stone-200 p-8 shadow-sm">
             <div className="flex items-center gap-3 mb-8">
               <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
               <h3 className="text-xl font-serif font-black text-stone-900">Избранное</h3>
             </div>
             
             <div className="space-y-4">
                {/* Bookmarked items go here */}
                <div className="p-4 bg-stone-50 rounded-2xl text-stone-400 text-center italic text-sm">
                  Здесь появятся материалы, которые вы отметили как избранные
                </div>
             </div>
           </div>

           <div className="bg-stone-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group shadow-xl">
             <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.2),transparent)] opacity-0 group-hover:opacity-100 transition-opacity" />
             <h3 className="text-xl font-serif font-black mb-6 flex items-center gap-3">
               <ClipboardList className="w-5 h-5 text-emerald-400" />
               План обучения
             </h3>
             <ul className="space-y-4 relative">
               <li className="flex gap-3">
                 <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                 <p className="text-stone-400 text-sm">Завершить модуль "Алгебра 10"</p>
               </li>
               <li className="flex gap-3">
                 <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                 <p className="text-stone-400 text-sm">Назначить тест для 11-Б класса</p>
               </li>
               <li className="flex gap-3">
                 <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-stone-600 shrink-0" />
                 <p className="text-stone-500 text-sm italic">Подготовить материалы к ЕГЭ</p>
               </li>
             </ul>
             <button className="w-full mt-8 bg-white/10 hover:bg-white/20 text-white rounded-xl py-4 font-black uppercase tracking-widest text-[10px] transition-colors">
               Редактировать план
             </button>
           </div>
        </div>
      </div>

      {/* Create Class Modal */}
      {showCreateClass && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md">
           <motion.div 
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl relative"
           >
             <button 
               onClick={() => setShowCreateClass(false)}
               className="absolute top-6 right-6 text-stone-400 hover:text-stone-900 transition-colors p-2"
             >
               <X className="w-6 h-6" />
             </button>
             
             <div className="p-10">
                <h2 className="text-3xl font-serif font-black text-stone-900 mb-8">Новый класс</h2>
                <form onSubmit={handleCreateClass} className="space-y-6">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Название класса</label>
                     <input 
                       required
                       autoFocus
                       placeholder="Напр: 10-А класс, Математика"
                       value={newClassName}
                       onChange={(e) => setNewClassName(e.target.value)}
                       className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-emerald-500/10 font-bold"
                     />
                   </div>
                   <button 
                     type="submit"
                     disabled={isSubmitting}
                     className="w-full bg-emerald-600 text-white rounded-2xl py-5 font-black shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all uppercase tracking-widest text-xs disabled:opacity-50"
                   >
                     {isSubmitting ? 'Создание...' : 'Создать и получить код'}
                   </button>
                 </form>
             </div>
           </motion.div>
        </div>
      )}
    </div>
  );
}
