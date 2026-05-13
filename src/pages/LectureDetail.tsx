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
  Send
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
  is_free: number;
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

export default function LectureDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<'ru' | 'tyv'>('ru');
  const [isProNeeded, setIsProNeeded] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user, profile } = useAuth();

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

  useEffect(() => {
    const fetchLecture = async () => {
      try {
        const data = await api.getLecture(id!);
        setLecture(data);
        fetchComments();
        fetchQuiz();
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
              <div className="flex items-center gap-3 text-stone-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-6">
                <FileText className="w-4 h-4 text-emerald-600" />
                Лекционный материал
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
          </div>

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
                <p className="text-stone-400 text-sm mb-4">Отметьте лекцию как изученную.</p>
                <button className="w-full bg-emerald-600 text-white rounded-xl py-3 text-xs font-bold hover:bg-emerald-700 transition-all">
                  Отметить как пройденную
                </button>
              </div>
            </div>
          </div>
        </article>

        {/* Quiz Section */}
        {quiz && quiz.questions && quiz.questions.length > 0 && (
          <div className="mt-16">
            <LectureQuiz quiz={quiz} lang={lang} />
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
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-stone-600 leading-relaxed text-sm">
                    <MathText text={comment.content} />
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
