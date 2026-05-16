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
  Trash2
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../store/authContext';
import MathText from '../components/MathText';
import LectureQuiz from '../components/LectureQuiz';
import SEO from '../components/SEO';
import UserAvatar from '../components/UserAvatar';

interface Lecture {
  id: string;
  course_id: string;
  title_ru: string;
  title_tyv: string;
  content_ru: string;
  content_tyv: string;
  item_type: 'theory' | 'test';
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
  const { user, profile } = useAuth();

  const fetchProgress = async () => {
    if (!user) return;
    try {
      const data = await api.getUserProgress();
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

  if (!lecture) return <div>Лекция не найдена</div>;

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <SEO 
        title={`${lang === 'ru' ? lecture.title_ru : lecture.title_tyv} - Лекторий`}
        description={lecture.content_ru.substring(0, 160)}
      />

      <div className="sticky top-16 z-40 bg-white/80 backdrop-blur-md border-b border-stone-200 py-4 shadow-sm">
        <div className="absolute bottom-0 left-0 h-1 bg-emerald-500 transition-all duration-300" style={{ width: completed ? '100%' : '20%' }} />
        <div className="max-w-4xl mx-auto px-4 md:px-0 flex justify-between items-center">
          <Link to={`/courses/${lecture.course_id}`} className="flex items-center gap-2 text-stone-500 hover:text-emerald-600 font-bold transition-colors">
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden sm:inline">К списку лекций</span>
          </Link>

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

      <div className="max-w-4xl mx-auto px-4 md:px-0 mt-12">
        <article className="bg-white rounded-[2.5rem] border border-stone-200 shadow-sm overflow-hidden">
          <div className="p-8 sm:p-12">
            <header className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3 text-stone-400 font-bold text-[10px] uppercase tracking-[0.2em]">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  Лекционный материал
                </div>
                {/* Navigation */}
                <div className="flex items-center gap-2">
                    {(() => {
                        const idx = courseLectures.findIndex(l => l.id === id);
                        return (
                            <>
                                {idx > 0 && (
                                    <Link to={`/lectures/${courseLectures[idx-1].id}`} className="text-xs font-bold text-stone-500 hover:text-emerald-600">Назад</Link>
                                )}
                                {idx < courseLectures.length - 1 && (
                                    <Link to={`/lectures/${courseLectures[idx+1].id}`} className="text-xs font-bold text-stone-500 hover:text-emerald-600">Далее</Link>
                                )}
                            </>
                        );
                    })()}
                </div>
              </div>
              <h1 className="text-4xl sm:text-5xl font-serif font-black text-stone-900 leading-tight mb-4">
                <MathText text={lang === 'ru' ? lecture.title_ru : lecture.title_tyv} />
              </h1>
              <div className="flex items-center gap-4 text-sm text-stone-400 font-medium italic">
                <span className="flex items-center gap-1.5 grayscale opacity-50">
                  <Languages className="w-4 h-4" />
                  {lang === 'ru' ? lecture.title_tyv : lecture.title_ru}
                </span>
              </div>
            </header>

            {/* Access Control Section for Admin */}
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
                     className="flex-grow px-4 py-2 rounded-xl border border-emerald-200 outline-none focus:ring-2 focus:ring-emerald-500"
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
                     className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-700"
                   >
                     Дать доступ
                   </button>
                </div>
              </div>
            )}

            {lecture.item_type === 'test' ? (
              <div className="space-y-8">
                 {visualBlocks.map((block) => (
                   <div key={block.id} className={`${block.layout === 'half' ? 'lg:w-1/2' : block.layout === 'third' ? 'lg:w-1/3' : 'w-full'}`}>
                      {block.type === 'text' && (
                        <div className="bg-stone-50 p-8 rounded-[2rem] border border-stone-100">
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
                  className="prose prose-stone prose-lg max-w-none prose-p:leading-relaxed prose-headings:font-serif prose-headings:font-black"
                >
                  <MathText 
                    text={lang === 'ru' ? lecture.content_ru : lecture.content_tyv} 
                    isHtml 
                    className="text-stone-700 space-y-6"
                  />
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* Resources Section */}
          {resources.length > 0 && (
            <div className="px-8 sm:px-12 pb-12 space-y-6 border-t border-stone-50 pt-12">
               <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest flex items-center gap-2">
                 <FileText className="w-4 h-4" />
                 Дополнительные материалы
               </h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {resources.map((res) => (
                    res.type === 'video' ? (
                      <div key={res.id} className="col-span-full relative bg-black rounded-3xl overflow-hidden shadow-xl aspect-video border border-stone-200">
                         {res.url.includes('youtube.com') || res.url.includes('youtu.be') ? (
                           <iframe
                             className="w-full h-full"
                             src={`https://www.youtube.com/embed/${res.url.split('v=')[1]?.split('&')[0] || res.url.split('/').pop()}`}
                             allowFullScreen
                           />
                         ) : res.url.includes('vimeo.com') ? (
                           <iframe
                             className="w-full h-full"
                             src={`https://player.vimeo.com/video/${res.url.split('/').pop()}`}
                             allowFullScreen
                           />
                         ) : res.url.includes('vk.com') ? (
                           <iframe
                             className="w-full h-full"
                             src={res.url.includes('video_ext.php') ? res.url : res.url.replace('vk.com/video', 'vk.com/video_ext.php')}
                             allow="autoplay; encrypted-media; fullscreen; picture-in-picture;"
                             allowFullScreen
                           />
                         ) : (
                           <video src={res.url} controls className="w-full h-full" />
                         )}
                         <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-white/20">
                            Видео-материал
                         </div>
                      </div>
                    ) : (
                      <a 
                        key={res.id}
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-100 hover:border-emerald-600 hover:bg-emerald-50 transition-all group"
                      >
                         <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-stone-400 group-hover:text-emerald-600 shadow-sm border border-stone-100">
                            {res.type === 'pdf' ? <FileText className="w-5 h-5" /> : <div className="w-2 h-2 bg-emerald-500 rounded-full" />}
                         </div>
                         <div className="flex-grow min-w-0">
                            <p className="text-xs font-bold text-stone-900 truncate">{res.title}</p>
                            <p className="text-[10px] text-stone-400 uppercase tracking-widest">{res.type}</p>
                         </div>
                      </a>
                    )
                  ))}
               </div>
            </div>
          )}

          <div className="bg-stone-50/50 border-t border-stone-100 p-8 sm:p-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-6 bg-white border border-stone-200 rounded-3xl shadow-sm">
                <div className="p-2 bg-emerald-50 rounded-lg w-fit text-emerald-600 mb-4">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-stone-900 mb-2">Обсуждение</h4>
                <p className="text-stone-500 text-sm">Присоединяйтесь к дискуссии ниже.</p>
              </div>
              <div className="p-6 bg-stone-900 text-white rounded-3xl shadow-xl">
                <div className="p-2 bg-white/10 rounded-lg w-fit text-emerald-400 mb-4">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h4 className="font-bold mb-2">Прогресс обучения</h4>
                <p className="text-stone-400 text-sm mb-4">
                  {completed ? 'Вы успешно изучили этот материал!' : 'Отметьте лекцию как изученную.'}
                </p>
                {completed ? (
                  <div className="w-full bg-emerald-600/20 text-emerald-400 rounded-xl py-3 text-xs font-black flex items-center justify-center gap-2 border border-emerald-600/30">
                    <CheckCircle2 className="w-4 h-4" />
                    Пройдено
                  </div>
                ) : (
                  <button 
                    onClick={() => handleComplete()}
                    className="w-full bg-emerald-600 text-white rounded-xl py-3 text-xs font-bold hover:bg-emerald-700 transition-all active:scale-95"
                  >
                    Отметить как пройденную
                  </button>
                )}
              </div>
            </div>
          </div>
        </article>

        {/* Quiz Section */}
        {quiz && quiz.questions && quiz.questions.length > 0 && (
          <div className="mt-16">
            <LectureQuiz 
              quiz={quiz} 
              lang={lang} 
              onComplete={(score, max) => handleComplete(score, max)} 
            />
          </div>
        )}

        {/* Comments Section */}
        <div className="mt-12 space-y-8">
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
                placeholder="Ваш комментарий или вопрос... Поддерживаются математические формулы □"
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
                className="bg-white rounded-3xl border border-stone-200 p-6 flex gap-4"
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
                          <Trash2 className="w-3 h-3" />
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
      </div>
    </div>
  );
}
