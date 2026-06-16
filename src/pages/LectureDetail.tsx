import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Languages, 
  BookOpen, 
  Clock, 
  Lock, 
  ChevronRight, 
  FileText,
  MessageSquare,
  Send,
  CheckCircle2,
  Trash2,
  X,
  Menu,
  GraduationCap,
  Trophy,
  PlayCircle,
  Printer
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../store/authContext';
import MathText from '../components/MathText';
import LectureQuiz from '../components/LectureQuiz';
import SEO from '../components/SEO';
import UserAvatar from '../components/UserAvatar';
import { parseVideoUrl } from '../utils/video';

interface Lecture {
  id: string;
  course_id: string;
  module_id?: string;
  title_ru: string;
  title_tyv: string;
  content_ru: string;
  content_tyv: string;
  item_type: string;
  course_created_by?: string;
}

interface VisualBlock {
  id: string;
  type: 'text' | 'image' | 'question' | 'video';
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  questionData?: {
    ru: string;
    tyv: string;
    options: { text_ru: string; text_tyv: string; is_correct: boolean; id: string }[];
  };
  layout?: 'full' | 'half' | 'third';
}

interface Quiz {
  id: string;
  title_ru: string;
  title_tyv: string;
  questions: any[];
}

interface Comment {
  id: string;
  user_id: string;
  username: string;
  avatar: string;
  content: string;
  created_at: string;
}

interface Resource {
  id: string;
  lecture_id: string;
  title: string;
  type: 'pdf' | 'link' | 'video' | 'file';
  url: string;
}

export default function LectureDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [courseLectures, setCourseLectures] = useState<Lecture[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [userProgress, setUserProgress] = useState<any[]>([]);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<'ru' | 'tyv'>('ru');
  const [visualBlocks, setVisualBlocks] = useState<VisualBlock[]>([]);
  const [isProNeeded, setIsProNeeded] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [isMobileSyllabusOpen, setIsMobileSyllabusOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { user, profile } = useAuth();

  const fetchProgress = async () => {
    if (!user) return;
    try {
      const data = await api.getUserProgress();
      setUserProgress(data);
      const isDone = data.some((p: any) => p.lecture_id === id);
      setCompleted(isDone);
    } catch (err) {
      console.error('Failed to fetch progress:', err);
    }
  };

  const fetchComments = async () => {
    try {
      const data = await api.getLectureComments(id!);
      setComments(data);
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    }
  };

  const fetchQuiz = async () => {
    try {
      const data = await api.getLectureQuiz(id!);
      setQuiz(data);
    } catch (err) {
      console.error('Failed to fetch quiz:', err);
    }
  };

  const fetchResources = async () => {
    try {
      const data = await api.getLectureResources(id!);
      setResources(data);
    } catch (err) {
      console.error('Failed to fetch resources:', err);
    }
  };

  useEffect(() => {
    const fetchLecture = async () => {
      try {
        const data = await api.getLecture(id!);
        setLecture(data);
        const lecturesRes = await api.getCourseLectures(data.course_id);
        setCourseLectures(lecturesRes);

        try {
          const modulesRes = await api.getModules(data.course_id);
          setModules(modulesRes);
        } catch (mErr) {
          console.error('Failed to fetch modules:', mErr);
        }

        if (data.item_type === 'test' && data.content_ru) {
          try {
            setVisualBlocks(JSON.parse(data.content_ru));
          } catch(e) { console.error('Failed to parse test blocks'); }
        }
        fetchComments();
        fetchQuiz();
        fetchProgress();
        fetchResources();
      } catch (err: any) {
        if (err.message.includes('Pro subscription required')) {
          setIsProNeeded(true);
        } else {
          console.error('Failed to fetch lecture:', err);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchLecture();
  }, [id]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setSubmitting(true);
    try {
      await api.addLectureComment(id!, newComment);
      setNewComment('');
      fetchComments();
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommentPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (!blob) continue;

        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          const imgTag = `<img src="${base64}" class="max-w-full rounded-2xl shadow-md my-4" />`;
          setNewComment(prev => prev + "\n" + imgTag + "\n");
        };
        reader.readAsDataURL(blob);
      }
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот комментарий?')) return;
    try {
      await api.deleteLectureComment(id!, commentId);
      fetchComments();
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const handleComplete = async (score?: number, max?: number) => {
    if (!user) return;
    try {
      await api.completeLecture(id!, { score, max_score: max });
      setCompleted(true);
      fetchProgress();
    } catch (err) {
      console.error('Failed to complete lecture:', err);
    }
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto py-20 px-4">
      <div className="h-10 bg-stone-200 rounded-xl w-48 animate-pulse mb-8" />
      <div className="h-64 bg-stone-100 rounded-3xl animate-pulse" />
    </div>
  );

  if (isProNeeded) return (
    <div className="max-w-4xl mx-auto py-20 px-4">
      <div className="bg-white rounded-[2.5rem] border border-stone-200 p-8 sm:p-16 text-center shadow-xl">
        <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-amber-100">
          <Lock className="w-10 h-10 text-amber-600" />
        </div>
        <h1 className="text-3xl font-serif font-black text-stone-900 mb-6">Доступ ограничен</h1>
        <p className="text-stone-500 mb-10 max-w-md mx-auto leading-relaxed">
          Эта лекция входит в состав <b>Pro-курса</b>. Оформите подписку, чтобы получить доступ к лекторию и форуму учителей.
        </p>
        <button className="bg-stone-900 text-white px-12 py-5 rounded-2xl font-black shadow-xl hover:bg-emerald-600 transition-all active:scale-95 uppercase tracking-widest text-sm">
          Стать Pro
        </button>
      </div>
    </div>
  );

  if (!lecture) return <div className="p-8 text-center text-stone-500 font-bold">Лекция не найдена</div>;

  // Navigation Logic
  const currentIdx = courseLectures.findIndex(l => l.id === id);
  const prevLecture = currentIdx > 0 ? courseLectures[currentIdx - 1] : null;
  const nextLecture = currentIdx < courseLectures.length - 1 ? courseLectures[currentIdx + 1] : null;

  // Process Modules and Sections
  const modulesWithLectures = modules.map(m => {
    const lectures = courseLectures.filter(l => l.module_id === m.id);
    const completed = lectures.filter(l => userProgress.some(p => p.lecture_id === l.id));
    return {
      id: m.id,
      title_ru: m.title_ru,
      title_tyv: m.title_tyv,
      lectures,
      completedCount: completed.length,
      totalCount: lectures.length,
      progressPercent: lectures.length > 0 ? Math.round((completed.length / lectures.length) * 100) : 0
    };
  });

  const unparentedLectures = courseLectures.filter(l => !l.module_id);
  const unparentedCompleted = unparentedLectures.filter(l => userProgress.some(p => p.lecture_id === l.id));
  const unparentedModule = unparentedLectures.length > 0 ? {
    id: 'unparented',
    title_ru: 'Общие материалы',
    title_tyv: 'Ниити материалдар',
    lectures: unparentedLectures,
    completedCount: unparentedCompleted.length,
    totalCount: unparentedLectures.length,
    progressPercent: Math.round((unparentedCompleted.length / unparentedLectures.length) * 100)
  } : null;

  const allSections = [...modulesWithLectures];
  if (unparentedModule) {
    allSections.push(unparentedModule);
  }

  // Active module calculation
  const activeModuleId = lecture.module_id || "unparented";
  const activeModuleObj = allSections.find(s => s.id === activeModuleId);
  const activeModuleProgressPercent = activeModuleObj?.progressPercent || 0;
  const activeModuleTitle = activeModuleObj
    ? (lang === 'ru' ? activeModuleObj.title_ru : activeModuleObj.title_tyv)
    : (lang === 'ru' ? 'Общие материалы' : 'Ниити материалдар');

  const courseCompletedCount = courseLectures.filter(l => userProgress.some(p => p.lecture_id === l.id)).length;
  const courseTotalCount = courseLectures.length;
  const courseProgressPercent = courseTotalCount > 0 ? Math.round((courseCompletedCount / courseTotalCount) * 100) : 0;
  const normalizedCourseProgressPercent = Math.min(courseProgressPercent, 100);

  // Shared Syllabus Component Renderer
  const renderSyllabus = () => (
    <div className="space-y-4">
      {allSections.map((section) => {
        const isSectionActive = section.id === activeModuleId;
        const sectionTitle = lang === 'ru' ? section.title_ru : section.title_tyv;
        
        return (
          <div 
            key={section.id} 
            className={`p-5 rounded-3xl border transition-all ${isSectionActive ? 'bg-emerald-50/40 border-emerald-100 shadow-sm' : 'bg-white border-stone-200'}`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <h4 className={`text-xs font-black uppercase tracking-wider truncate ${isSectionActive ? 'text-emerald-800' : 'text-stone-800'}`}>
                  {sectionTitle}
                </h4>
                <p className="text-[10px] text-stone-400 font-bold mt-0.5">
                  {section.completedCount} из {section.totalCount} пройденных ({section.progressPercent}%)
                </p>
              </div>
              {section.progressPercent === 100 && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
            </div>

            {/* Micro Progress Bar */}
            <div className="w-full bg-stone-100 rounded-full h-1.5 mb-4 overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500" 
                style={{ 
                  width: `${section.progressPercent}%`, 
                  backgroundColor: isSectionActive ? '#10b981' : '#78716c' 
                }}
              />
            </div>

            {/* Lectures inside Section */}
            <div className="space-y-1.5 pl-1.5 border-l border-stone-150">
              {section.lectures.map((l: any) => {
                const isLCurrent = l.id === id;
                const isLCompleted = userProgress.some(p => p.lecture_id === l.id);
                const lTitle = lang === 'ru' ? l.title_ru : l.title_tyv;
                
                return (
                  <Link
                    key={l.id}
                    to={`/lectures/${l.id}`}
                    onClick={() => setIsMobileSyllabusOpen(false)}
                    className={`group flex items-center justify-between gap-2 p-2 rounded-xl text-left transition-all text-xs ${isLCurrent ? 'bg-stone-950 text-white font-black shadow-md' : 'hover:bg-stone-50 text-stone-600 font-medium'}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isLCompleted ? (
                        <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isLCurrent ? 'text-emerald-400' : 'text-emerald-600'}`} />
                      ) : (
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isLCurrent ? 'bg-emerald-400 animate-pulse' : 'bg-stone-300'}`} />
                      )}
                      <span className="truncate">
                        {lTitle}
                      </span>
                    </div>
                    <ChevronRight className={`w-3 h-3 shrink-0 transition-transform group-hover:translate-x-0.5 ${isLCurrent ? 'text-emerald-400' : 'text-stone-300'}`} />
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <SEO 
        title={`${lang === 'ru' ? lecture.title_ru : lecture.title_tyv} - Лектория`}
        description={lecture.content_ru.substring(0, 160)}
      />

      {/* Top Banner & Control Bar */}
      <div className="sticky top-16 z-40 bg-white/80 backdrop-blur-md border-b border-stone-200 py-4 shadow-sm print:hidden">
        <div className="absolute bottom-0 left-0 h-1 bg-emerald-500 transition-all duration-300" style={{ width: completed ? '100%' : '20%' }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to={`/courses/${lecture.course_id}`} className="flex items-center gap-2 text-stone-500 hover:text-emerald-600 font-bold transition-colors">
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden sm:inline">К списку лекций</span>
            </Link>

            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden lg:flex items-center gap-2 text-stone-500 hover:text-stone-800 font-bold transition-colors text-xs px-3 py-1.5 rounded-xl hover:bg-stone-100 border border-transparent hover:border-stone-200"
              title={isSidebarCollapsed ? "Показать программу" : "Скрыть программу"}
            >
              <Menu className="w-4 h-4 text-stone-400" />
              <span>{isSidebarCollapsed ? "Показать меню" : "Во весь экран"}</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 text-stone-500 hover:text-emerald-600 bg-stone-100 hover:bg-stone-200/60 border border-stone-200 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all"
              title="Печать занятия"
            >
              <Printer className="w-4 h-4 text-stone-400" />
              <span className="hidden sm:inline">Печать</span>
            </button>

            {/* Desktop Menu Status Toggle if needed, but simple lang selector is great */}
            <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200">
              <button
                onClick={() => setLang('ru')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${lang === 'ru' ? 'bg-white text-emerald-600 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
              >
                Русский
              </button>
              <button
                onClick={() => setLang('tyv')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${lang === 'tyv' ? 'bg-white text-emerald-600 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
              >
                Тувинский
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive Grid Structure */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 print:max-w-none print:px-0 print:mt-4">
        <div className={`grid grid-cols-1 ${isSidebarCollapsed ? 'max-w-4xl mx-auto' : 'lg:grid-cols-4'} gap-8 items-start print:block`}>
          
          {/* Syllabus Sticky Sidebar (Desktop only) */}
          <aside className={`hidden lg:block ${isSidebarCollapsed ? 'hidden' : 'lg:col-span-1'} sticky top-28 h-[calc(100vh-10rem)] overflow-y-auto pr-2 space-y-6 print:hidden`}>
            <div className="bg-stone-900 text-white rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-400" />
                <span className="text-[10px] uppercase font-black tracking-widest text-stone-400">Текущий раздел</span>
              </div>
              <div className="space-y-1">
                <h3 className="font-serif font-black text-sm tracking-tight line-clamp-2 leading-snug">
                  {activeModuleTitle}
                </h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-bold text-stone-300">
                  <span>Пройдено разделов</span>
                  <span>{activeModuleProgressPercent}%</span>
                </div>
                <div className="w-full bg-stone-800 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500" 
                    style={{ width: `${activeModuleProgressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-400 px-1">
                Программа курса ({courseLectures.length})
              </h3>
              {renderSyllabus()}
            </div>
          </aside>

          {/* Main Course Module Content Area */}
          <main className={`${isSidebarCollapsed ? 'col-span-full' : 'lg:col-span-3'} print:col-span-full print:w-full space-y-8`}>
            <article className="bg-white rounded-[2.5rem] border border-stone-200 shadow-sm overflow-hidden print:border-none print:shadow-none print:rounded-none">
              <div className="p-8 sm:p-12 print:p-0">
                
                {/* Visual Indicators & Module Progress Mini card */}
                <header className="mb-10 pb-6 border-b border-stone-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3 text-stone-400 font-bold text-[10px] uppercase tracking-[0.2em]">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      Урок {currentIdx + 1} из {courseLectures.length} • {activeModuleTitle}
                    </div>
                    {/* Course Progress Component */}
                    {courseTotalCount > 0 && (
                      <div className="flex items-center gap-3 bg-stone-50 border border-stone-200/60 rounded-2xl px-4 py-2 text-xs shrink-0 print:hidden select-none">
                        <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                        <div className="space-y-1 min-w-[120px]">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-stone-500 gap-4">
                            <span>Курс пройден</span>
                            <span className="text-stone-850">{normalizedCourseProgressPercent}%</span>
                          </div>
                          <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="h-full rounded-full bg-emerald-500 transition-all duration-500" 
                              style={{ width: `${normalizedCourseProgressPercent}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-stone-500 bg-stone-100 px-2 py-1 rounded-md shrink-0">
                          {courseCompletedCount}/{courseTotalCount}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Course Title and Dual Language translation display */}
                  <h1 className="text-3xl sm:text-4xl font-serif font-black text-stone-900 leading-tight mb-2 tracking-tight">
                    <MathText text={lang === 'ru' ? lecture.title_ru : lecture.title_tyv} />
                  </h1>
                  
                  <div className="text-stone-400 text-sm font-medium flex items-center gap-2 mt-3">
                    <span className="bg-stone-100 text-stone-500 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider">
                      {lang === 'ru' ? 'TYV' : 'RU'}
                    </span>
                    <MathText text={lang === 'ru' ? lecture.title_tyv : lecture.title_ru} />
                  </div>
                </header>

                {/* Access Control Manager (SuperAdmin / Chief Editor only) */}
                {(user?.role === 'super_admin' || user?.role === 'chief_editor') && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 mb-8">
                    <h4 className="font-bold text-emerald-900 mb-4 flex items-center gap-2">
                      <Lock className="w-5 h-5" />
                      Управление доступом
                    </h4>
                    <div className="flex gap-2">
                       <input 
                         type="text"
                         placeholder="ID ученика"
                         id="userIdInput"
                         className="flex-grow px-4 py-3 rounded-xl border border-emerald-200 outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                       />
                       <button 
                         onClick={async () => {
                           const userId = (document.getElementById('userIdInput') as HTMLInputElement).value;
                           if (!userId) return;
                           try {
                             await api.grantLectureAccess(id!, userId);
                             alert('Доступ предоставлен');
                           } catch (e) {
                             alert('Ошибка доступа');
                           }
                         }}
                         className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-colors text-xs uppercase tracking-widest"
                       >
                         Дать доступ
                       </button>
                    </div>
                  </div>
                )}

                {/* Lecture Visual Block / Plain HTML prose renders */}
                {lecture.item_type === 'test' ? (
                  <div className="space-y-8">
                     {visualBlocks.map((block) => (
                       <div key={block.id} className={`${block.layout === 'half' ? 'lg:w-1/2' : block.layout === 'third' ? 'lg:w-1/3' : 'w-full'}`}>
                          {block.type === 'text' && (
                            <div className="bg-stone-50 p-8 rounded-[2rem] border border-stone-100 lecture-content-renderer">
                               <MathText text={block.content} isHtml />
                            </div>
                          )}
                          {block.type === 'image' && block.imageUrl && (
                            <img src={block.imageUrl} alt="" className="w-full rounded-[2.5rem] shadow-lg mb-8" />
                          )}
                          {block.type === 'video' && block.videoUrl && (
                            <div className="mb-8 rounded-[2.5rem] overflow-hidden shadow-2xl bg-black aspect-video">
                              {block.videoUrl.includes('youtube.com') || block.videoUrl.includes('youtu.be') ? (
                                <iframe
                                  className="w-full h-full"
                                  src={`https://www.youtube.com/embed/${block.videoUrl.split('v=')[1]?.split('&')[0] || block.videoUrl.split('/').pop()}`}
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              ) : block.videoUrl.includes('vimeo.com') ? (
                                <iframe
                                  className="w-full h-full"
                                  src={`https://player.vimeo.com/video/${block.videoUrl.split('/').pop()}`}
                                  allow="autoplay; fullscreen; picture-in-picture"
                                  allowFullScreen
                                />
                              ) : (
                                <video 
                                  src={block.videoUrl} 
                                  controls 
                                  className="w-full h-full"
                                />
                              )}
                            </div>
                          )}
                          {block.type === 'question' && block.questionData && (
                            <div className="mt-8">
                               <LectureQuiz 
                                 quiz={{
                                   id: block.id,
                                   title_ru: 'Вопрос',
                                   title_tyv: 'Айтырыг',
                                   questions: [{
                                     id: block.id,
                                     question_ru: block.questionData.ru,
                                     question_tyv: block.questionData.tyv,
                                     options: block.questionData.options.map((o, i) => ({
                                       id: o.id || String(i),
                                       text_ru: o.text_ru,
                                       text_tyv: o.text_tyv,
                                       is_correct: o.is_correct ? 1 : 0
                                     }))
                                   }]
                                 }}
                                 lang={lang}
                                 onComplete={(score, max) => console.log('Partial score:', score, max)}
                               />
                            </div>
                          )}
                       </div>
                     ))}
                  </div>
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={lang}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="prose prose-stone prose-lg max-w-none prose-p:leading-relaxed prose-headings:font-serif prose-headings:font-black lecture-content-renderer"
                    >
                      <MathText 
                        text={lang === 'ru' ? lecture.content_ru : lecture.content_tyv} 
                        isHtml 
                        className="text-stone-700 space-y-6"
                      />
                    </motion.div>
                  </AnimatePresence>
                )}

                {/* Lecture Resources panel rendered beautifully directly below content */}
                {resources.length > 0 && (
                  <div className="mt-12 pt-8 border-t border-stone-100 space-y-6">
                     <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest flex items-center gap-2">
                       <FileText className="w-4 h-4 text-emerald-600" />
                       Дополнительные материалы
                     </h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {resources.map((res) => {
                          if (res.type === 'video') {
                            const parsed = parseVideoUrl(res.url);
                            return (
                              <div key={res.id} className="col-span-full relative bg-stone-900 rounded-2xl overflow-hidden shadow-md aspect-video border border-stone-200">
                                 {parsed.type === 'direct' ? (
                                   <video src={parsed.embedUrl} controls className="w-full h-full" />
                                 ) : (
                                   <iframe
                                     className="w-full h-full"
                                     src={parsed.embedUrl}
                                     allowFullScreen
                                     allow="autoplay; encrypted-media; fullscreen; picture-in-picture;"
                                     frameBorder="0"
                                   />
                                 )}
                                 <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-white/10">
                                    Видео-материал
                                 </div>
                              </div>
                            );
                          } else {
                            return (
                              <a 
                                key={res.id}
                                href={res.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-100 hover:border-emerald-600 hover:bg-emerald-50/20 transition-all group"
                              >
                                 <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-stone-400 group-hover:text-emerald-600 shadow-sm border border-stone-150">
                                    {res.type === 'pdf' ? <FileText className="w-5 h-5 text-emerald-600" /> : <div className="w-2 h-2 bg-emerald-500 rounded-full" />}
                                 </div>
                                 <div className="flex-grow min-w-0">
                                    <p className="text-xs font-bold text-stone-900 truncate">{res.title}</p>
                                    <p className="text-[10px] text-stone-400 uppercase tracking-widest">{res.type}</p>
                                 </div>
                              </a>
                            );
                          }
                        })}
                     </div>
                  </div>
                )}

              </div>

              {/* Combined Progress Completion and Navigation Dashboard */}
              <div className="bg-stone-55 border-t border-stone-100 p-8 sm:p-12 print:hidden">
                <div className="max-w-3xl mx-auto space-y-8">
                  {/* Progress completion action */}
                  <div className="bg-white rounded-[2rem] border border-stone-200 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 h-full w-1.5 bg-emerald-500" />
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`p-3 rounded-2xl shrink-0 ${completed ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-400'}`}>
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-stone-900 text-base">Изучение занятия</h4>
                        <p className="text-stone-500 text-sm mt-0.5">
                          {completed ? 'Вы успешно изучили этот материал!' : 'Отметьте урок как изученный для сохранения прогресса.'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="w-full sm:w-auto shrink-0 z-10">
                      {completed ? (
                        <div className="bg-emerald-50 text-emerald-700 px-6 py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 border border-emerald-100">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          Раздел изучен
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleComplete()}
                          className="w-full sm:w-auto bg-stone-900 hover:bg-emerald-600 text-white px-8 py-3.5 rounded-2xl text-sm font-bold shadow-md transition-all active:scale-95 duration-200 flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          Изучено
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Elegant Prev/Next Lecture Navigation row */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                    {prevLecture ? (
                      <Link 
                        to={`/lectures/${prevLecture.id}`} 
                        className="flex-1 flex items-center gap-4 p-4.5 bg-white hover:bg-stone-50 rounded-2xl border border-stone-200 hover:border-stone-300 shadow-sm transition-all text-left"
                      >
                        <ChevronLeft className="w-5 h-5 text-stone-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[9px] text-stone-400 font-black uppercase tracking-widest mb-0.5">Предыдущий урок</p>
                          <p className="text-stone-800 font-bold text-xs truncate">{lang === 'ru' ? prevLecture.title_ru : prevLecture.title_tyv}</p>
                        </div>
                      </Link>
                    ) : (
                      <div className="flex-1 hidden sm:block" />
                    )}
                    
                    {nextLecture ? (
                      <Link 
                        to={`/lectures/${nextLecture.id}`} 
                        className="flex-1 flex items-center justify-between gap-4 p-4.5 bg-white hover:bg-emerald-50/10 rounded-2xl border border-stone-200 hover:border-emerald-500/20 shadow-sm transition-all text-right"
                      >
                        <div className="min-w-0 text-left sm:text-right flex-grow">
                          <p className="text-[9px] text-stone-400 font-black uppercase tracking-widest mb-0.5">Следующий урок</p>
                          <p className="text-stone-800 font-bold text-xs truncate">{lang === 'ru' ? nextLecture.title_ru : nextLecture.title_tyv}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-emerald-600 shrink-0" />
                      </Link>
                    ) : (
                      <Link 
                        to={`/courses/${lecture.course_id}`} 
                        className="flex-1 flex items-center justify-between gap-4 p-4.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-2xl border border-emerald-150 transition-all text-right shadow-sm"
                      >
                        <div className="min-w-0 text-left sm:text-right flex-grow">
                          <p className="text-[9px] text-emerald-600 font-black uppercase tracking-widest mb-0.5">Раздел завершен!</p>
                          <p className="font-bold text-xs">Каталог разделов</p>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 animate-pulse" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </article>

            {/* Quiz module questions component */}
            {quiz && quiz.questions && quiz.questions.length > 0 && (
              <div className="mt-16 print:hidden">
                <LectureQuiz 
                  quiz={quiz} 
                  lang={lang} 
                  onComplete={(score, max) => handleComplete(score, max)} 
                />
              </div>
            )}

            {/* Global commenting forum support */}
            <div className="mt-12 space-y-8 print:hidden">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-6 h-6 text-emerald-600" />
                <h2 className="text-2xl font-serif font-black text-stone-900">Комментарии</h2>
                <span className="bg-stone-200 text-stone-600 px-2 py-0.5 rounded-md text-xs font-bold">
                  {comments.length}
                </span>
              </div>

              {user ? (
                <form onSubmit={handlePostComment} className="bg-white rounded-[2rem] border border-stone-200 p-6 shadow-sm overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onPaste={handleCommentPaste}
                    placeholder="Ваш комментарий или вопрос... Поддерживаются математические формулы"
                    className="w-full bg-stone-50 border border-stone-100 rounded-2xl p-4 min-h-[100px] outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-stone-700 font-medium mb-4"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submitting || !newComment.trim()}
                      className="flex items-center gap-2 bg-stone-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {submitting ? 'Отправка...' : 'Отправить'}
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bg-white rounded-[2rem] border border-stone-200 p-8 text-center">
                  <p className="text-stone-500 mb-4 font-medium">Войдите, чтобы оставить комментарий.</p>
                  <Link to="/login" className="inline-block bg-stone-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-600 transition-all">
                    Войти
                  </Link>
                </div>
              )}

              <div className="space-y-4">
                {comments.map((comment) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl border border-stone-200 p-6 flex gap-4 animate-fadeIn"
                  >
                    <Link to={`/user/${comment.user_id}`} className="shrink-0">
                      <UserAvatar user={{ username: comment.username, avatar: comment.avatar }} size="sm" />
                    </Link>
                    <div className="flex-grow space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-stone-900">{comment.username}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(comment.created_at).toLocaleDateString()}
                          </span>
                          {(user?.id === comment.user_id || profile?.role === 'super_admin' || profile?.role === 'chief_editor') && (
                            <button 
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-stone-300 hover:text-rose-500 transition-colors p-1"
                              title="Удалить"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-stone-600 leading-relaxed text-sm">
                        <MathText text={comment.content} isHtml />
                      </div>
                    </div>
                  </motion.div>
                ))}

                {comments.length === 0 && (
                  <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-stone-200">
                    <p className="text-stone-400 font-medium">Пока нет комментариев. Будьте первыми!</p>
                  </div>
                )}
              </div>
            </div>
          </main>

        </div>
      </div>

      {/* Floating Syllabus Accessor Button on Mobile */}
      <div className="lg:hidden fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsMobileSyllabusOpen(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-4.5 rounded-full shadow-2xl transition-all active:scale-95 border border-emerald-500/20 text-xs uppercase tracking-widest"
        >
          <Menu className="w-4 h-4 shrink-0" />
          <span>План курса ({courseLectures.length})</span>
        </button>
      </div>

      {/* Mobile Drawer Slide-in Menu Drawer */}
      <AnimatePresence>
        {isMobileSyllabusOpen && (
          <div className="fixed inset-0 z-[100] lg:hidden">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileSyllabusOpen(false)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />
            {/* Drawer Body panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="absolute top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50">
                <div>
                  <h3 className="font-serif font-black text-stone-900 text-lg">Содержание курса</h3>
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-0.5">Всего уроков: {courseLectures.length}</p>
                </div>
                <button 
                  onClick={() => setIsMobileSyllabusOpen(false)}
                  className="p-2 text-stone-400 hover:text-stone-900 rounded-lg hover:bg-stone-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable program wrapper list */}
              <div className="flex-grow overflow-y-auto p-6 space-y-4">
                 <div className="bg-stone-900 text-white rounded-3xl p-5 shadow-md space-y-3 mb-4">
                   <div className="flex items-center gap-2">
                     <GraduationCap className="w-4 h-4 text-emerald-400" />
                     <span className="text-[9px] uppercase font-black tracking-widest text-stone-400">Активный раздел</span>
                   </div>
                   <h4 className="font-serif font-black text-xs leading-snug line-clamp-2">
                     {activeModuleTitle}
                   </h4>
                   <div className="space-y-1.5 pt-1">
                     <div className="flex justify-between text-[10px] font-bold text-stone-300">
                       <span>Прогресс</span>
                       <span>{activeModuleProgressPercent}%</span>
                     </div>
                     <div className="w-full bg-stone-800 rounded-full h-1 overflow-hidden">
                       <div 
                         className="h-full rounded-full bg-emerald-500" 
                         style={{ width: `${activeModuleProgressPercent}%` }}
                       />
                     </div>
                   </div>
                 </div>

                 {renderSyllabus()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
