import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { GraduationCap, BookOpen, Clock, ChevronRight, Lock, Sparkles, Search, Plus, X, ChevronLeft, FileText, CheckCircle2, Edit3, Trash2, Trophy, BarChart3, HelpCircle, FolderPlus, Layers, Users } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../store/authContext';
import SEO from '../components/SEO';
import LectureEditor from '../components/LectureEditor';
import VisualTestEditor from '../components/VisualTestEditor';
import Pagination from '../components/Pagination';

const COURSES_PER_PAGE = 9;
const LECTURES_PER_PAGE = 10;

interface Course {
  id: string;
  subject_id: string;
  title_ru: string;
  title_tyv: string;
  description_ru: string;
  description_tyv: string;
  subject_name_ru: string;
  subject_name_tyv: string;
  subject_color?: string;
  created_at: string;
  image_url?: string;
  assigned_classes_json?: string;
}

interface Lecture {
  id: string;
  module_id: string | null;
  title_ru: string;
  title_tyv: string;
  content_ru: string;
  content_tyv: string;
  order_index: number;
  is_free: number;
  item_type: 'theory' | 'test';
  quiz?: any;
  resources?: any[];
}

interface CourseModule {
  id: string;
  course_id: string;
  title_ru: string;
  title_tyv: string;
  order_index: number;
}

export default function Courses() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<{id: string, name_ru: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [lecturePage, setLecturePage] = useState(1);
  
  // Creation States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLectureEditor, setShowLectureEditor] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCourse, setNewCourse] = useState({ title_ru: '', title_tyv: '', desc_ru: '', desc_tyv: '', subject_id: '', image_url: '' });
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card');

  // Detail States
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [userProgress, setUserProgress] = useState<any[]>([]);
  const [lecturesLoading, setLecturesLoading] = useState(false);
  const [lectureSearchQuery, setLectureSearchQuery] = useState('');
  const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);

  const filteredLectures = lectures.filter(l => {
    if (!lectureSearchQuery.trim()) return true;
    const query = lectureSearchQuery.toLowerCase();
    const matchesTitle = (l.title_ru || '').toLowerCase().includes(query) || 
                         (l.title_tyv || '').toLowerCase().includes(query);
    const matchesContent = (l.content_ru || '').toLowerCase().includes(query) || 
                           (l.content_tyv || '').toLowerCase().includes(query);
    return matchesTitle || matchesContent;
  });
  const [createType, setCreateType] = useState<'theory' | 'test' | null>(null);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null);
  const [newModule, setNewModule] = useState({ title_ru: '', title_tyv: '', order_index: 0 });
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [showAcademicModal, setShowAcademicModal] = useState(false);
  const [academicForm, setAcademicForm] = useState({ full_name: '', school: '', position: '', subjects: '' });
  
  const [showClassesModal, setShowClassesModal] = useState(false);
  const [teacherClasses, setTeacherClasses] = useState<any[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [isSavingClasses, setIsSavingClasses] = useState(false);

  const { isPro, isTeacher, user, profile } = useAuth();

  const fetchTeacherClasses = async (courseId: string) => {
    try {
      const allRes = await api.getClasses();
      const selectedRes = await fetch(`/api/courses/${courseId}/classes`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!selectedRes.ok) throw new Error('Failed to fetch assigned classes');
      const selectedIds = await selectedRes.json();
      setTeacherClasses(allRes);
      setSelectedClassIds(selectedIds);
      setShowClassesModal(true);
    } catch (err) {
      console.error(err);
      alert('Ошибка при загрузке классов');
    }
  };

  const saveCourseClasses = async () => {
    if (!selectedCourse) return;
    setIsSavingClasses(true);
    try {
      const res = await fetch(`/api/courses/${selectedCourse.id}/classes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ class_ids: selectedClassIds })
      });
      if (!res.ok) throw new Error('Failed to save');
      setShowClassesModal(false);
      fetchData(); // Refresh list to get updated json array
    } catch (err) {
      console.error(err);
      alert('Ошибка при сохранении доступов');
    } finally {
      setIsSavingClasses(false);
    }
  };

  const handleAcademicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.submitAcademicRequest(academicForm);
      alert('Ваша заявка успешно отправлена и будет рассмотрена администратором.');
      setShowAcademicModal(false);
    } catch (err: any) {
      alert(err.message || 'Ошибка отправки заявки');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinClass = async () => {
    if (!inviteCode.trim() || !user) return;
    setJoining(true);
    setCurrentPage(1);
    try {
      await api.joinClass(inviteCode.trim());
      alert('Вы успешно присоединились к классу!');
      setInviteCode('');
    } catch (err: any) {
      alert(err.message || 'Не удалось присоединиться к классу. Проверьте код.');
    } finally {
      setJoining(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setCurrentPage(1);
    try {
      const [coursesData, subjectsData] = await Promise.all([
        api.getCourses(),
        api.getSubjects()
      ]);
      setCourses(coursesData);
      setSubjects(subjectsData);
      
      if (user) {
        try {
          const progressData = await api.getUserProgress();
          if (Array.isArray(progressData)) {
            setUserProgress(progressData);
          }
        } catch (e) {
          console.error('Failed to fetch user progress:', e);
        }
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (courseId: string) => {
    try {
      const data = await api.getCourseStats(courseId);
      setStats(data);
      setShowStats(true);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchCourseLectures = async (courseId: string) => {
    setLecturesLoading(true);
    try {
      const [lecturesData, modulesData] = await Promise.all([
        api.getCourseLectures(courseId),
        api.getModules(courseId)
      ]);
      setLectures(lecturesData);
      setModules(modulesData);
    } catch (err) {
      console.error('Failed to fetch lectures or modules:', err);
    } finally {
      setLecturesLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setLectureSearchQuery('');
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

  useEffect(() => {
    if (id && selectedCourse) {
      const fetchStats = async () => {
        try {
          const data = await api.getCourseStats(id);
          setStats(data);
        } catch (e) {}
      };
      if (showStats) fetchStats();
    }
  }, [id, selectedCourse, showStats]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.title_ru || !newCourse.subject_id) return;
    setIsSubmitting(true);
    try {
      if (editingCourse) {
        await api.updateCourse(editingCourse.id, {
          subject_id: newCourse.subject_id,
          title_ru: newCourse.title_ru,
          title_tyv: newCourse.title_tyv,
          description_ru: newCourse.desc_ru,
          description_tyv: newCourse.desc_tyv,
          image_url: newCourse.image_url
        });
      } else {
        await api.createCourse({
          subject_id: newCourse.subject_id,
          title_ru: newCourse.title_ru,
          title_tyv: newCourse.title_tyv,
          description_ru: newCourse.desc_ru,
          description_tyv: newCourse.desc_tyv,
          image_url: newCourse.image_url
        });
      }
      setShowCreateModal(false);
      setEditingCourse(null);
      setNewCourse({ title_ru: '', title_tyv: '', desc_ru: '', desc_tyv: '', subject_id: '', image_url: '' });
      fetchData();
    } catch (err: any) {
      console.error('Failed to save course:', err);
      alert('Ошибка при сохранении курса: ' + (err.message || 'Неизвестная ошибка'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    try {
      await api.deleteCourse(id);
      setShowDeleteConfirm(null);
      fetchData();
    } catch (err) {
      console.error('Failed to delete course:', err);
    }
  };

  const handleCreateLecture = async (data: any) => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      let lectureId = editingLecture?.id;
      const payload = {
        course_id: id,
        item_type: createType || editingLecture?.item_type || 'theory',
        ...data
      };

      if (editingLecture) {
        await api.updateLecture(editingLecture.id, payload);
      } else {
        const res = await api.createLecture(payload);
        lectureId = res.id;
      }

      if (lectureId && data.quiz) {
        await api.saveLectureQuiz(lectureId, data.quiz);
      }

      if (lectureId && data.resources) {
        await api.saveLectureResources(lectureId, data.resources);
      } else if (lectureId && data.blocks) {
        // For visual tests, we store blocks as JSON in content
        // Or we can have a separate structure. For now, let's store JSON in content_ru
        await api.updateLecture(lectureId, {
          ...payload,
          content_ru: JSON.stringify(data.blocks)
        });
      }

      setShowLectureEditor(false);
      setEditingLecture(null);
      setCreateType(null);
      fetchCourseLectures(id);
    } catch (err) {
      console.error('Failed to save lecture:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newModule.title_ru) return;
    setIsSubmitting(true);
    try {
      if (editingModule) {
        await api.updateModule(editingModule.id, newModule);
      } else {
        await api.createModule(id, newModule);
      }
      setShowModuleModal(false);
      setEditingModule(null);
      setNewModule({ title_ru: '', title_tyv: '', order_index: 0 });
      fetchCourseLectures(id);
    } catch (err: any) {
      console.error('Failed to save module:', err);
      alert('Ошибка при сохранении модуля: ' + (err.message || 'Неизвестная ошибка'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!window.confirm('Удалить модуль? Подключенные лекции останутся без модуля.')) return;
    try {
      await api.deleteModule(moduleId);
      fetchCourseLectures(id!);
    } catch (err) {
      console.error('Failed to delete module:', err);
    }
  };

  const handleDeleteLecture = async (lectureId: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту лекцию?')) return;
    try {
      await api.deleteLecture(lectureId);
      fetchCourseLectures(id!);
    } catch (err) {
      console.error('Failed to delete lecture:', err);
    }
  };

  const filteredCourses = courses.filter(c => {
    const matchesSearch = c.title_ru.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         c.title_tyv.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = !selectedSubject || (c as any).subject_id === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const totalCoursePages = Math.ceil(filteredCourses.length / COURSES_PER_PAGE);
  const currentCourses = filteredCourses.slice(
    (currentPage - 1) * COURSES_PER_PAGE,
    currentPage * COURSES_PER_PAGE
  );

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

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex-grow">
                <h1 className="text-4xl sm:text-5xl font-serif font-black text-stone-900 mb-6 leading-tight">
                  {selectedCourse.title_ru}
                </h1>
                <p className="text-stone-500 text-lg leading-relaxed max-w-2xl">
                  {selectedCourse.description_ru}
                </p>
              </div>
              {isPro && (
                <div className="flex sm:flex-col gap-2">
                   <button 
                     onClick={() => {
                        setEditingCourse(selectedCourse);
                        setNewCourse({
                          title_ru: selectedCourse.title_ru,
                          title_tyv: selectedCourse.title_tyv,
                          desc_ru: selectedCourse.description_ru,
                          desc_tyv: selectedCourse.description_tyv,
                          subject_id: selectedCourse.subject_id,
                          image_url: selectedCourse.image_url || ''
                        });
                        setShowCreateModal(true);
                     }}
                     className="flex items-center justify-center gap-2 bg-stone-100 text-stone-600 px-5 py-3 rounded-xl font-bold hover:bg-stone-200 transition-all text-xs uppercase tracking-widest"
                   >
                     <Edit3 className="w-4 h-4" />
                     Изменить
                   </button>
                   <button 
                     onClick={() => setShowStats(!showStats)}
                     className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold transition-all text-xs uppercase tracking-widest ${showStats ? 'bg-emerald-600 text-white shadow-lg' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                   >
                     <BarChart3 className="w-4 h-4" />
                     {showStats ? 'Скрыть отчет' : 'Прогресс учеников'}
                   </button>
                   <button 
                     onClick={() => fetchTeacherClasses(selectedCourse.id)}
                     className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold bg-stone-100 text-stone-600 hover:bg-stone-200 transition-all text-xs uppercase tracking-widest"
                   >
                     <Users className="w-4 h-4" />
                     Доступ
                   </button>
                </div>
              )}
            </div>

            {showStats && isPro && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-12 overflow-hidden"
              >
                <div className="bg-stone-50 border border-stone-200 rounded-3xl p-8">
                   <div className="flex items-center gap-3 mb-8">
                      <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                        <Trophy className="w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-serif font-black text-stone-900">Успеваемость курса</h3>
                   </div>
                   
                   <div className="space-y-4">
                      {stats.length > 0 ? stats.map((stat, i) => (
                        <div key={i} className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-stone-100 rounded-2xl">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 font-bold border border-emerald-100">
                                {stat.username[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-stone-900">{stat.username}</p>
                                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{stat.lecture_title}</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-8">
                             <div className="text-center">
                               <p className="text-[10px] text-stone-400 font-black uppercase tracking-widest mb-1">Оценка</p>
                               <span className={`text-sm font-black ${stat.score / stat.max_score > 0.8 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                 {stat.score} / {stat.max_score}
                               </span>
                             </div>
                             <div className="text-right">
                               <p className="text-[10px] text-stone-400 font-black uppercase tracking-widest mb-1">Дата</p>
                               <span className="text-xs text-stone-500 font-medium">
                                 {new Date(stat.completed_at).toLocaleDateString()}
                               </span>
                             </div>
                           </div>
                        </div>
                      )) : (
                        <div className="text-center py-10 text-stone-400 font-medium italic">
                          Никто еще не прошел этот курс.
                        </div>
                      )}
                   </div>
                </div>
              </motion.div>
            )}

            {isPro && !showLectureEditor && (
              <div className="mt-10 pt-10 border-t border-stone-100 flex flex-wrap justify-between items-center gap-6">
                 <div>
                   <h3 className="font-bold text-stone-900 mb-1 font-serif text-xl">Управление материалом</h3>
                   <p className="text-xs text-stone-400 font-bold uppercase tracking-widest">Создавайте лекции и интерактивные тесты</p>
                 </div>
                 <div className="flex items-center gap-3">
                   <button 
                     onClick={() => { setCreateType('theory'); setShowLectureEditor(true); }}
                     className="flex items-center gap-2 bg-stone-100 text-stone-600 px-6 py-3 rounded-2xl font-bold hover:bg-stone-200 transition-all active:scale-95"
                   >
                     <FileText className="w-5 h-5 text-emerald-500" />
                     Лекция
                   </button>
                   <button 
                     onClick={() => { setCreateType('test'); setShowLectureEditor(true); }}
                     className="flex items-center gap-2 bg-stone-100 text-stone-600 px-6 py-3 rounded-2xl font-bold hover:bg-stone-200 transition-all active:scale-95"
                   >
                     <HelpCircle className="w-5 h-5 text-amber-500" />
                     Тест
                   </button>
                   <button 
                     onClick={() => { setEditingModule(null); setNewModule({ title_ru: '', title_tyv: '', order_index: modules.length }); setShowModuleModal(true); }}
                     className="flex items-center gap-2 bg-stone-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-stone-200"
                   >
                     <FolderPlus className="w-5 h-5 text-emerald-400" />
                     Модуль
                   </button>
                 </div>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 mt-12">
          {showLectureEditor ? (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => { setShowLectureEditor(false); setEditingLecture(null); setCreateType(null); }}
                  className="flex items-center gap-2 text-stone-400 hover:text-rose-600 font-bold text-xs uppercase tracking-widest transition-colors"
                >
                  <X className="w-4 h-4" />
                  Отменить {editingLecture ? 'редактирование' : 'создание'}
                </button>
              </div>

              {(createType === 'test' || editingLecture?.item_type === 'test') ? (
                <div className="space-y-8">
                   <div className="bg-white p-8 rounded-[2.5rem] border border-stone-200">
                      <h2 className="text-2xl font-serif font-black text-stone-900 mb-8">Настройки теста</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Название теста (RU)</label>
                          <input 
                            value={editingLecture?.title_ru || ''}
                            onChange={(e) => setEditingLecture(prev => ({ ...(prev as any), title_ru: e.target.value }))}
                            className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-emerald-500/10 font-bold"
                            placeholder="Напр: Итоговый тест по тригонометрии"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Название теста (TYV)</label>
                          <input 
                            value={editingLecture?.title_tyv || ''}
                            onChange={(e) => setEditingLecture(prev => ({ ...(prev as any), title_tyv: e.target.value }))}
                            className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-emerald-500/10 font-bold"
                          />
                        </div>
                      </div>
                   </div>
                   <VisualTestEditor 
                     initialBlocks={editingLecture?.content_ru ? JSON.parse(editingLecture.content_ru) : []}
                     onSave={(blocks) => handleCreateLecture({ 
                       title_ru: editingLecture?.title_ru || 'Без названия', 
                       title_tyv: editingLecture?.title_tyv || '',
                       blocks,
                       is_free: editingLecture?.is_free === 1
                     })} 
                   />
                </div>
              ) : (
                <LectureEditor 
                  onSave={handleCreateLecture} 
                  isSubmitting={isSubmitting} 
                  initialTitleRu={editingLecture?.title_ru}
                  initialTitleTyv={editingLecture?.title_tyv}
                  initialContentRu={editingLecture?.content_ru}
                  initialContentTyv={editingLecture?.content_tyv}
                  initialIsFree={editingLecture?.is_free === 1}
                  initialQuiz={editingLecture?.quiz}
                  initialResources={editingLecture?.resources}
                  lectureId={editingLecture?.id}
                  courseId={id}
                />
              )}
            </motion.div>
          ) : (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                   <h2 className="text-2xl font-serif font-black text-stone-900 flex items-center gap-3 shrink-0">
                     Материалы курса
                   </h2>
                   
                   {lectures.length > 0 && (
                     <div className="relative w-full max-w-md">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                       <input 
                         type="text"
                         placeholder="Поиск по названию или содержанию..."
                         value={lectureSearchQuery}
                         onChange={(e) => { setLectureSearchQuery(e.target.value); setLecturePage(1); }}
                         className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-2.5 pl-11 pr-10 text-sm outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-stone-850"
                       />
                       {lectureSearchQuery && (
                         <button
                           onClick={() => setLectureSearchQuery('')}
                           className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                         >
                           <X className="w-4 h-4" />
                         </button>
                       )}
                     </div>
                   )}
                </div>

               {lecturesLoading ? (
                 <div className="space-y-4">
                   {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse border border-stone-100" />)}
                 </div>
               ) : (
                  <div className="space-y-12">
                    {/* Render Modules */}
                    {modules.map((module) => {
                      const moduleLectures = filteredLectures.filter(l => l.module_id === module.id);
                      if (lectureSearchQuery.trim() && moduleLectures.length === 0) return null;

                      return (
                        <div key={module.id} className="space-y-6">
                          <div className="flex items-center justify-between group">
                            <h3 className="text-xl font-serif font-black text-stone-900 flex items-center gap-3">
                               <Layers className="w-5 h-5 text-emerald-500" />
                               {module.title_ru}
                            </h3>
                            {isPro && (
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                 <button 
                                   onClick={() => { setEditingModule(module); setNewModule({ title_ru: module.title_ru, title_tyv: module.title_tyv || '', order_index: module.order_index }); setShowModuleModal(true); }}
                                   className="p-2 text-stone-400 hover:text-emerald-600"
                                 >
                                   <Edit3 className="w-4 h-4" />
                                 </button>
                                 <button 
                                   onClick={() => handleDeleteModule(module.id)}
                                   className="p-2 text-stone-400 hover:text-rose-600"
                                 >
                                   <Trash2 className="w-4 h-4" />
                                 </button>
                              </div>
                            )}
                          </div>
                          <div className="space-y-4 ml-8 border-l-2 border-stone-100 pl-8">
                            {moduleLectures.map((lecture, idx) => (
                              <LectureCard 
                                key={lecture.id} 
                                lecture={lecture} 
                                idx={idx} 
                                userProgress={userProgress} 
                                isPro={isPro}
                                onEdit={() => {
                                  const loadAndEdit = async () => {
                                    const fullLec = await api.getLecture(lecture.id);
                                    let fullQuiz = null;
                                    let lResources = [];
                                    try { fullQuiz = await api.getLectureQuiz(lecture.id); } catch(e) {}
                                    try { lResources = await api.getLectureResources(lecture.id); } catch(e) {}
                                    setEditingLecture({ ...fullLec, quiz: fullQuiz, resources: lResources });
                                    setShowLectureEditor(true);
                                  };
                                  loadAndEdit();
                                }}
                                onDelete={() => handleDeleteLecture(lecture.id)}
                              />
                            ))}
                            {moduleLectures.length === 0 && (
                              <p className="text-xs text-stone-400 font-bold uppercase tracking-widest py-4">В этом модуле пока нет лекций</p>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Uncategorized Lectures */}
                    {filteredLectures.filter(l => !l.module_id).length > 0 && (
                      <div className="space-y-6">
                        <h3 className="text-xl font-serif font-black text-stone-400">Вне модулей</h3>
                        <div className="space-y-4">
                          {filteredLectures
                            .filter(l => !l.module_id)
                            .slice((lecturePage - 1) * LECTURES_PER_PAGE, lecturePage * LECTURES_PER_PAGE)
                            .map((lecture, idx) => (
                             <LectureCard 
                              key={lecture.id} 
                              lecture={lecture} 
                              idx={idx} 
                              userProgress={userProgress} 
                              isPro={isPro}
                              onEdit={() => {
                                const loadAndEdit = async () => {
                                  const fullLec = await api.getLecture(lecture.id);
                                  let fullQuiz = null;
                                  let lResources = [];
                                  try { fullQuiz = await api.getLectureQuiz(lecture.id); } catch(e) {}
                                  try { lResources = await api.getLectureResources(lecture.id); } catch(e) {}
                                  setEditingLecture({ ...fullLec, quiz: fullQuiz, resources: lResources });
                                  setShowLectureEditor(true);
                                };
                                loadAndEdit();
                              }}
                              onDelete={() => handleDeleteLecture(lecture.id)}
                            />
                          ))}
                        </div>
                        <Pagination 
                          currentPage={lecturePage}
                          totalPages={Math.ceil(filteredLectures.filter(l => !l.module_id).length / LECTURES_PER_PAGE)}
                          onPageChange={(page) => {
                            setLecturePage(page);
                            window.scrollTo({ top: 600, behavior: 'smooth' });
                          }}
                        />
                      </div>
                    )}
                  </div>
               )}

               {lectures.length > 0 && filteredLectures.length === 0 && !lecturesLoading && (
                 <div className="text-center py-20 bg-white rounded-[3rem] border border-stone-200">
                    <Search className="w-12 h-12 text-stone-200 mx-auto mb-4" />
                    <p className="text-stone-400 font-bold mb-2">Ничего не найдено</p>
                    <p className="text-stone-400 text-xs">Попробуйте изменить поисковый запрос.</p>
                    <button 
                      onClick={() => setLectureSearchQuery('')}
                      className="mt-6 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs px-5 py-3 rounded-xl transition-all"
                    >
                      Сбросить поиск
                    </button>
                 </div>
               )}

               {lectures.length === 0 && !lecturesLoading && (
                 <div className="text-center py-20 bg-white rounded-[3rem] border border-stone-200">
                    <BookOpen className="w-12 h-12 text-stone-200 mx-auto mb-4" />
                    <p className="text-stone-400 font-bold">В этом курсе пока нет лекций.</p>
                 </div>
               )}
            </div>
          )}
        </div>

        {showModuleModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl relative"
            >
              <button 
                onClick={() => setShowModuleModal(false)}
                className="absolute top-6 right-6 text-stone-400 hover:text-stone-900 transition-colors p-2"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="p-8 sm:p-10">
                <h2 className="text-2xl font-serif font-black text-stone-900 mb-8">
                  {editingModule ? 'Редактировать модуль' : 'Новый модуль'}
                </h2>
                <form onSubmit={handleSaveModule} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Название (RU)</label>
                    <input 
                      required
                      value={newModule.title_ru}
                      onChange={(e) => setNewModule({ ...newModule, title_ru: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-emerald-500/10"
                      placeholder="Напр: Основы тригонометрии"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Название (TYV)</label>
                    <input 
                      value={newModule.title_tyv}
                      onChange={(e) => setNewModule({ ...newModule, title_tyv: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-emerald-500/10"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-stone-900 text-white rounded-2xl py-5 font-black hover:bg-emerald-600 transition-all disabled:opacity-50 uppercase tracking-widest text-xs"
                  >
                    {isSubmitting ? 'Сохранение...' : 'Сохранить модуль'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}

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
              <h2 className="text-3xl font-serif font-black text-stone-900 mb-8">
                {editingCourse ? 'Редактировать курс' : 'Новый курс'}
              </h2>
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
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Ссылка на изображение</label>
                  <input 
                    value={newCourse.image_url}
                    onChange={(e) => setNewCourse({ ...newCourse, image_url: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-emerald-500/10"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-stone-900 text-white rounded-2xl py-5 font-black hover:bg-emerald-600 transition-all disabled:opacity-50 uppercase tracking-widest text-xs"
                >
                  {isSubmitting ? 'Сохранение...' : (editingCourse ? 'Сохранить изменения' : 'Создать курс')}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {showClassesModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] w-full max-w-xl overflow-hidden shadow-2xl relative"
          >
            <button 
              onClick={() => setShowClassesModal(false)}
              className="absolute top-6 right-6 text-stone-400 hover:text-stone-900 transition-colors p-2"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="p-8 sm:p-12">
              <h2 className="text-3xl font-serif font-black text-stone-900 mb-8">
                Доступ для классов
              </h2>
              <div className="space-y-4 mb-8 max-h-[50vh] overflow-y-auto pr-2">
                {teacherClasses.length === 0 ? (
                  <p className="text-stone-500 font-medium text-center">У вас пока нет созданных классов.</p>
                ) : (
                  teacherClasses.map(c => (
                    <label key={c.id} className="flex items-center gap-4 p-4 border border-stone-200 rounded-2xl cursor-pointer hover:bg-stone-50 transition-colors">
                      <input 
                        type="checkbox"
                        checked={selectedClassIds.includes(c.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedClassIds([...selectedClassIds, c.id]);
                          else setSelectedClassIds(selectedClassIds.filter(id => id !== c.id));
                        }}
                        className="w-5 h-5 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="font-bold text-stone-900">{c.name}</span>
                    </label>
                  ))
                )}
              </div>
              <button 
                onClick={saveCourseClasses}
                disabled={isSavingClasses}
                className="w-full bg-stone-900 text-white rounded-2xl py-5 font-black hover:bg-emerald-600 transition-all disabled:opacity-50 uppercase tracking-widest text-xs"
              >
                {isSavingClasses ? 'Сохранение...' : 'Сохранить доступ'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-stone-900 relative">
          
          {/* Join Class Tool for Students */}
          {!isTeacher && !isPro && user && (
            <div className="absolute top-0 right-0 hidden lg:block">
               <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 shadow-sm max-w-xs text-left">
                  <h4 className="text-xs font-black text-emerald-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Вступить в класс
                  </h4>
                  <p className="text-[10px] text-emerald-700 font-medium mb-4">Введите код, полученный от преподавателя, чтобы получить доступ к заданиям.</p>
                  <div className="flex gap-2">
                    <input 
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      placeholder="КОД"
                      className="w-full bg-white border border-emerald-200 rounded-xl px-4 py-2 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <button 
                      onClick={handleJoinClass}
                      disabled={joining || !inviteCode}
                      className="bg-emerald-600 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      {joining ? '...' : 'ОК'}
                    </button>
                  </div>
               </div>
            </div>
          )}

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
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 pl-12 pr-12 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium"
                />
             </div>
             <select 
              value={selectedSubject || ''}
              onChange={(e) => { setSelectedSubject(e.target.value || null); setCurrentPage(1); }}
              className="bg-white border border-stone-200 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-stone-700"
             >
               <option value="">Все предметы</option>
               {subjects.map(s => <option key={s.id} value={s.id}>{s.name_ru}</option>)}
             </select>
             <div className="flex bg-white border border-stone-200 rounded-2xl p-1 shrink-0">
                <button 
                  onClick={() => setViewMode('card')}
                  className={`p-3 rounded-xl transition-all ${viewMode === 'card' ? 'bg-emerald-50 text-emerald-600' : 'text-stone-400'}`}
                >
                  <Layers className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-3 rounded-xl transition-all ${viewMode === 'list' ? 'bg-emerald-50 text-emerald-600' : 'text-stone-400'}`}
                >
                  <FileText className="w-5 h-5" />
                </button>
             </div>
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
              <h2 className="text-3xl font-serif font-black text-stone-900 mb-8">
                {editingCourse ? 'Редактировать курс' : 'Новый курс'}
              </h2>
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
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Ссылка на изображение</label>
                  <input 
                    value={newCourse.image_url}
                    onChange={(e) => setNewCourse({ ...newCourse, image_url: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-emerald-500/10"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-stone-900 text-white rounded-2xl py-5 font-black hover:bg-emerald-600 transition-all disabled:opacity-50 uppercase tracking-widest text-xs"
                >
                  {isSubmitting ? 'Сохранение...' : (editingCourse ? 'Сохранить изменения' : 'Создать курс')}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Module Modal */}
      {showModuleModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl relative"
          >
            <button 
              onClick={() => setShowModuleModal(false)}
              className="absolute top-6 right-6 text-stone-400 hover:text-stone-900 transition-colors p-2"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="p-8 sm:p-10">
              <h2 className="text-2xl font-serif font-black text-stone-900 mb-8">
                {editingModule ? 'Редактировать модуль' : 'Новый модуль'}
              </h2>
              <form onSubmit={handleSaveModule} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Название (RU)</label>
                  <input 
                    required
                    value={newModule.title_ru}
                    onChange={(e) => setNewModule({ ...newModule, title_ru: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-emerald-500/10"
                    placeholder="Напр: Основы тригонометрии"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Название (TYV)</label>
                  <input 
                    value={newModule.title_tyv}
                    onChange={(e) => setNewModule({ ...newModule, title_tyv: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-emerald-500/10"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-stone-900 text-white rounded-2xl py-5 font-black hover:bg-emerald-600 transition-all disabled:opacity-50 uppercase tracking-widest text-xs"
                >
                  {isSubmitting ? 'Сохранение...' : 'Сохранить модуль'}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md">
           <motion.div 
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             className="bg-white rounded-[2rem] p-8 max-w-sm text-center shadow-2xl"
           >
              <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-rose-500">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-serif font-black text-stone-900 mb-2">Удалить курс?</h3>
              <p className="text-stone-500 text-sm mb-8">Это действие необратимо и удалит все лекции внутри этого курса.</p>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="bg-stone-50 border border-stone-200 text-stone-600 py-4 rounded-xl font-bold hover:bg-stone-100 transition-all"
                >
                  Отмена
                </button>
                <button 
                  onClick={() => handleDeleteCourse(showDeleteConfirm)}
                  className="bg-rose-600 text-white py-4 rounded-xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
                >
                  Удалить
                </button>
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
        ) : currentCourses.length > 0 ? (
          <div>
            <div className={viewMode === 'card' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" : "space-y-4"}>
              {currentCourses.map((course, idx) => {
                let assignedToClasses: any[] = [];
                try {
                  if (course.assigned_classes_json) {
                    const parsed = JSON.parse(course.assigned_classes_json);
                    assignedToClasses = parsed.filter((p: any) => p && p.id != null);
                  }
                } catch(e) {}

                return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className={viewMode === 'card' 
                    ? "group bg-white rounded-3xl border border-stone-200 overflow-hidden hover:shadow-xl transition-all duration-300"
                    : "group bg-white rounded-3xl border border-stone-200 p-6 flex flex-col md:flex-row items-start md:items-center justify-between hover:shadow-lg transition-all duration-300 gap-4"
                  }
                >
                  <div className={viewMode === 'card' ? "p-8 pb-4" : "flex items-center gap-6 flex-grow"}>
                    {course.image_url && (
                        <div className={viewMode === 'card' ? "mb-6 rounded-2xl overflow-hidden h-32" : "rounded-2xl overflow-hidden h-20 w-20 flex-shrink-0"}>
                           <img src={course.image_url} alt={course.title_ru} className="w-full h-full object-cover" />
                        </div>
                    )}
                    <div className={viewMode === 'card' ? "flex justify-between items-start mb-6" : "flex items-center gap-4"}>
                      {viewMode === 'card' && (
                        <div className="p-3 rounded-2xl border border-stone-100" style={course.subject_color ? { backgroundColor: `${course.subject_color}20`, color: course.subject_color } : {}}>
                          <BookOpen className="w-6 h-6" />
                        </div>
                      )}
                      
                      <div className="space-y-1">
                        <h2 className="text-xl font-bold text-stone-900 group-hover:text-emerald-600 transition-colors">
                          {course.title_ru}
                        </h2>
                        <p className="text-sm font-medium text-stone-400 italic">
                          {course.title_tyv}
                        </p>
                      </div>
                      
                      {viewMode === 'list' && (
                         <div className="text-stone-600 text-sm line-clamp-1 ml-auto">
                          {course.description_ru}
                        </div>
                      )}
                      
                      {isPro && (
                         <div className="flex items-center gap-2">
                            <button 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setEditingCourse(course);
                                setNewCourse({
                                  title_ru: course.title_ru,
                                  title_tyv: course.title_tyv,
                                  desc_ru: course.description_ru,
                                  desc_tyv: course.description_tyv,
                                  subject_id: course.subject_id,
                                  image_url: course.image_url || ''
                                });
                                setShowCreateModal(true);
                              }}
                              className="p-2 bg-stone-50 rounded-xl text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowDeleteConfirm(course.id);
                              }}
                              className="p-2 bg-stone-50 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                         </div>
                      )}
                    </div>
                    
                    {viewMode === 'card' && (
                      <div className="space-y-4">
                        <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-100/50">
                          <p className="text-stone-600 text-sm line-clamp-2 leading-relaxed">
                            {course.description_ru}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="px-8 pb-8 pt-4">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-400 font-medium tracking-wide">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={course.subject_color ? { backgroundColor: `${course.subject_color}10`, color: course.subject_color } : {}}>
                          <Sparkles className="w-3 h-3" />
                          {course.subject_name_ru}
                        </div>
                        {assignedToClasses.length > 0 ? assignedToClasses.map(cls => (
                          <div key={cls.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100/80 text-stone-500">
                            <Users className="w-3 h-3" />
                            {cls.name}
                          </div>
                        )) : (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/80 text-emerald-600">
                            Общий доступ
                          </div>
                        )}
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
                );
              })}
            </div>
            
            <Pagination 
              currentPage={currentPage}
              totalPages={totalCoursePages}
              onPageChange={(page) => {
                setCurrentPage(page);
                window.scrollTo({ top: 400, behavior: 'smooth' });
              }}
            />
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
              <button 
                onClick={() => setShowAcademicModal(true)}
                className="flex-shrink-0 bg-white text-emerald-700 px-10 py-5 rounded-2xl font-black shadow-xl hover:bg-emerald-50 transition-all active:scale-95 uppercase tracking-widest text-sm"
              >
                Получить доступ
              </button>
            </div>
          </motion.div>
        )}

        {showAcademicModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl relative"
            >
              <button 
                onClick={() => setShowAcademicModal(false)}
                className="absolute top-6 right-6 text-stone-400 hover:text-stone-900 transition-colors p-2"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="p-8 sm:p-10">
                <h2 className="text-3xl font-serif font-black text-stone-900 mb-2">Академический доступ</h2>
                <p className="text-stone-500 mb-8 text-sm">Доступ предоставляется учителям базовых и партнерских школ.</p>
                <form onSubmit={handleAcademicSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">ФИО полностью</label>
                    <input 
                      required
                      value={academicForm.full_name}
                      onChange={(e) => setAcademicForm({ ...academicForm, full_name: e.target.value })}
                      autoFocus
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-emerald-500/10"
                      placeholder="Иванов Иван Иванович"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Школа / Учебное заведение</label>
                    <input 
                      required
                      value={academicForm.school}
                      onChange={(e) => setAcademicForm({ ...academicForm, school: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-emerald-500/10"
                      placeholder="МБОУ СОШ №1 г. Кызыл"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Должность</label>
                    <input 
                      required
                      value={academicForm.position}
                      onChange={(e) => setAcademicForm({ ...academicForm, position: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-emerald-500/10"
                      placeholder="Учитель математики, Завуч"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Предметы (для каких будете использовать)</label>
                    <textarea 
                      required
                      value={academicForm.subjects}
                      onChange={(e) => setAcademicForm({ ...academicForm, subjects: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 px-6 h-32 outline-none focus:ring-4 focus:ring-emerald-500/10"
                      placeholder="Математика, Алгебра (7-9 классы)"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-stone-900 text-white rounded-2xl py-5 font-black hover:bg-emerald-600 transition-all disabled:opacity-50 uppercase tracking-widest text-xs"
                  >
                    {isSubmitting ? 'Отправка...' : 'Отправить заявку'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

function LectureCard({ lecture, idx, userProgress, isPro, onEdit, onDelete }: { 
  lecture: any, idx: number, userProgress: any[], isPro: boolean, onEdit: () => void, onDelete: () => void 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.05 }}
      className="group relative"
    >
      <div className="flex gap-4">
        <Link 
          to={`/lectures/${lecture.id}`}
          className="flex-grow block bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 hover:shadow-xl hover:border-emerald-100 transition-all duration-300 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-all duration-500 scale-0 group-hover:scale-100" />
          <div className="flex items-center gap-6 relative">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-mono font-black border transition-colors bg-stone-50 text-stone-300 border-stone-100 group-hover:bg-emerald-50 group-hover:text-emerald-500">
               {lecture.item_type === 'test' ? (userProgress.some((p: any) => p.lecture_id === lecture.id) ? <Trophy className="w-6 h-6 text-emerald-600" /> : <HelpCircle className="w-6 h-6" />) : (userProgress.some((p: any) => p.lecture_id === lecture.id) ? <CheckCircle2 className="w-6 h-6 text-emerald-600" /> : idx + 1)}
            </div>
            <div className="flex-grow">
              <h3 className="text-lg sm:text-xl font-bold text-stone-900 mb-1 group-hover:text-emerald-600 transition-colors">
                <div className="flex items-center gap-3">
                  {lecture.title_ru}
                  {userProgress.find((p: any) => p.lecture_id === lecture.id)?.score !== undefined && (
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 uppercase tracking-widest leading-none">
                      {userProgress.find((p: any) => p.lecture_id === lecture.id).score} / {userProgress.find((p: any) => p.lecture_id === lecture.id).max_score}
                    </span>
                  )}
                </div>
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-[10px] font-black text-stone-400 uppercase tracking-widest">
                  {lecture.item_type === 'test' ? <HelpCircle className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                  {lecture.item_type === 'test' ? 'Итоговый Тест' : 'Лекция'}
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
        {isPro && (
          <div className="flex flex-col gap-2">
            <button 
              onClick={onEdit}
              className="p-4 bg-white border border-stone-200 rounded-2xl text-stone-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm"
            >
              <Edit3 className="w-5 h-5" />
            </button>
            <button 
              onClick={onDelete}
              className="p-4 bg-white border border-stone-200 rounded-2xl text-stone-400 hover:text-rose-600 hover:border-rose-100 transition-all shadow-sm"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
