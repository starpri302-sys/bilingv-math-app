import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Users, Calendar, ChevronLeft, GraduationCap, 
  Search, Mail, MoreVertical, ClipboardList,
  Plus, Clock, CheckCircle2, AlertCircle, FileText, BarChart3, X
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../store/authContext';
import { useSocket } from '../hooks/useSocket';
import SEO from '../components/SEO';
import Pagination from '../components/Pagination';

const ITEMS_PER_PAGE = 10;

interface Student {
  id: string;
  username: string;
  full_name: string;
  avatar: string;
  grade: string;
  enrolled_at: string;
}

interface Assignment {
  id: string;
  lecture_id: string;
  lecture_title_ru: string;
  due_date: string;
  course_id: string;
}

interface StudentProgress {
  id: string;
  user_id: string;
  lecture_id: string;
  lecture_title: string;
  username: string;
  full_name: string;
  score: number;
  max_score: number;
  completed_at: string;
}

export default function ClassDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isTeacher, isPro } = useAuth();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'students' | 'assignments' | 'progress'>('students');
  const [studentPage, setStudentPage] = useState(1);
  const [assignmentPage, setAssignmentPage] = useState(1);
  
  // Assignment Modal
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [lectures, setLectures] = useState<any[]>([]);
  const [assignmentForm, setAssignmentForm] = useState({ course_id: '', lecture_id: '', due_date: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const socket = useSocket();

  useEffect(() => {
    if (socket && id) {
      socket.emit('subscribe', { rooms: [`class-${id}`] });
      
      const handleProgressUpdate = async (data: any) => {
        // Re-fetch progress to stay in sync
        try {
          const progressData = await api.getClassProgress(id);
          setProgress(progressData);
        } catch(e) {}
      };

      socket.on('assignment_progress_update', handleProgressUpdate);
      return () => {
        socket.off('assignment_progress_update', handleProgressUpdate);
      };
    }
  }, [socket, id]);

  const handleExportCSV = () => {
    // 1. Prepare data
    const header = ['Ученик', 'Лекция', 'Баллы', 'Макс. Балл', 'Дата сдачи'];
    const rows = progress.map(p => [
      p.full_name || p.username,
      p.lecture_title,
      p.score,
      p.max_score,
      new Date(p.completed_at).toLocaleString()
    ]);
    
    // 2. Build CSV string
    const csvContent = [
      header.join(','),
      ...rows.map(e => e.join(','))
    ].join('\\n');
    
    // 3. Trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `class_${id}_progress.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (!isTeacher && !isPro) {
      navigate('/courses');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setStudentPage(1);
      setAssignmentPage(1);
      try {
        const [studentsData, assignmentsData, progressData, coursesData] = await Promise.all([
          api.getClassStudents(id!),
          api.getClassAssignments(id!),
          api.getClassProgress(id!),
          api.getCourses()
        ]);
        setStudents(studentsData);
        setAssignments(assignmentsData);
        setProgress(progressData);
        setCourses(coursesData);
      } catch (err) {
        console.error('Failed to fetch class data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, isTeacher, isPro, navigate]);

  const loadLectures = async (courseId: string) => {
    try {
      const data = await api.getCourseLectures(courseId);
      setLectures(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentForm.lecture_id || !assignmentForm.due_date) return;
    setIsSubmitting(true);
    try {
      await api.createAssignment(id!, { lecture_id: assignmentForm.lecture_id, due_date: assignmentForm.due_date });
      setShowCreateAssignment(false);
      setAssignmentForm({ course_id: '', lecture_id: '', due_date: '' });
      const [assignmentsData, progressData] = await Promise.all([
        api.getClassAssignments(id!),
        api.getClassProgress(id!)
      ]);
      setAssignments(assignmentsData);
      setProgress(progressData);
    } catch (err) {
      console.error('Failed to create assignment:', err);
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

  const getStudentCompletions = (userId: string) => {
    return progress.filter(p => p.user_id === userId);
  };

  return (
    <div className="space-y-8 pb-20">
      <SEO title="Управление классом - BilingvMath" />
      
      <button 
        onClick={() => navigate('/teacher')}
        className="flex items-center gap-2 text-stone-400 hover:text-stone-900 font-bold text-xs uppercase tracking-widest transition-colors mb-4"
      >
        <ChevronLeft className="w-4 h-4" />
        К списку классов
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-serif font-black text-stone-900 mb-2">Журнал успеваемости</h1>
          <p className="text-stone-500 font-medium">Мониторинг активности и успеваемости студентов.</p>
        </div>
        <button 
          onClick={handleExportCSV}
          className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-xl hover:bg-emerald-700 transition-colors font-bold uppercase tracking-widest text-[10px]"
        >
          <FileText className="w-4 h-4" />
          Экспорт CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-stone-100 rounded-2xl w-fit overflow-x-auto no-scrollbar max-w-full">
        <button
          onClick={() => setActiveTab('students')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shrink-0 ${activeTab === 'students' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
        >
          <Users className="w-4 h-4" />
          Студенты ({students.length})
        </button>
        <button
          onClick={() => setActiveTab('progress')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shrink-0 ${activeTab === 'progress' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
        >
          <BarChart3 className="w-4 h-4" />
          Успеваемость
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shrink-0 ${activeTab === 'assignments' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
        >
          <ClipboardList className="w-4 h-4" />
          Задания ({assignments.length})
        </button>
      </div>

      {activeTab === 'students' ? (
        <div className="bg-white rounded-[2.5rem] border border-stone-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-stone-100">
                  <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-widest">Студент</th>
                  <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-widest">Класс/Год</th>
                  <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-widest">Прогресс</th>
                  <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-widest">Дата вступления</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {students
                  .slice((studentPage - 1) * ITEMS_PER_PAGE, studentPage * ITEMS_PER_PAGE)
                  .map((student) => {
                    const studentCompletions = getStudentCompletions(student.id);
                    return (
                      <tr key={student.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            {student.avatar ? (
                              <img src={student.avatar} className="w-10 h-10 rounded-xl object-cover" alt="" />
                            ) : (
                              <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center text-stone-400">
                                <GraduationCap className="w-5 h-5" />
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-stone-900">{student.full_name || student.username}</p>
                              <p className="text-[10px] text-stone-400 font-medium">@{student.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-sm font-medium text-stone-600">{student.grade || '—'}</span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2">
                             <div className="flex -space-x-1">
                                {studentCompletions.slice(0, 5).map((c, i) => (
                                  <div key={i} className="w-6 h-6 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center" title={c.lecture_title}>
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  </div>
                                ))}
                                {studentCompletions.length > 5 && (
                                  <div className="w-6 h-6 rounded-full bg-stone-100 border-2 border-white flex items-center justify-center text-[8px] font-black text-stone-400">
                                    +{studentCompletions.length - 5}
                                  </div>
                                )}
                             </div>
                             <span className="text-[10px] font-black text-stone-400 ml-1">{studentCompletions.length} пройденных</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-sm text-stone-500">{new Date(student.enrolled_at).toLocaleDateString()}</span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          {students.length > ITEMS_PER_PAGE && (
            <div className="px-8 pb-4">
              <Pagination 
                currentPage={studentPage}
                totalPages={Math.ceil(students.length / ITEMS_PER_PAGE)}
                onPageChange={setStudentPage}
              />
            </div>
          )}
          {students.length === 0 && (
            <div className="text-center py-20 text-stone-400">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>В этом классе пока нет студентов.</p>
            </div>
          )}
        </div>
      ) : activeTab === 'progress' ? (
        <div className="bg-white rounded-[2.5rem] border border-stone-200 p-8">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-serif font-black text-stone-900">Последняя активность</h3>
              <div className="p-2 bg-stone-50 rounded-xl">
                 <BarChart3 className="w-5 h-5 text-stone-400" />
              </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {progress.length > 0 ? (
                progress.map((p) => (
                  <div key={p.id} className="p-4 bg-stone-50 rounded-3xl border border-stone-100 hover:border-emerald-200 transition-all">
                     <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                           <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                           <p className="text-xs font-black text-stone-900 truncate">{p.full_name || p.username}</p>
                           <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{new Date(p.completed_at).toLocaleDateString()}</p>
                        </div>
                     </div>
                     <p className="text-sm font-serif font-black text-stone-800 line-clamp-1 mb-2">{p.lecture_title}</p>
                     {p.max_score > 0 && (
                       <div className="flex items-center justify-between pt-2 border-t border-stone-200/50">
                          <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Результат теста</span>
                          <span className="text-xs font-black text-emerald-600">{p.score} / {p.max_score}</span>
                       </div>
                     )}
                  </div>
                ))
              ) : (
                <div className="col-span-full py-20 text-center text-stone-400">
                   <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-stone-100">
                      <BarChart3 className="w-6 h-6 opacity-20" />
                   </div>
                   <p className="font-bold">Нет данных о прохождении лекций.</p>
                </div>
              )}
           </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {assignments
              .slice((assignmentPage - 1) * (ITEMS_PER_PAGE - 1), assignmentPage * (ITEMS_PER_PAGE - 1))
              .map((assignment) => (
              <div key={assignment.id} className="bg-white p-8 rounded-[2rem] border border-stone-200">
                <div className="flex items-center justify-between mb-6">
                  <div className="p-3 bg-stone-50 text-stone-600 rounded-2xl">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-2 text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100">
                    <Clock className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      До {new Date(assignment.due_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <h4 className="text-xl font-serif font-black text-stone-900 mb-2 truncate">{assignment.lecture_title_ru}</h4>
                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mb-6">Назначенная лекция</p>
                
                <div className="flex items-center justify-between pt-6 border-t border-stone-100">
                  <Link to={`/lectures/${assignment.lecture_id}`} className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline">Просмотр материала</Link>
                  <div className="text-[10px] font-black text-stone-500 uppercase tracking-widest">
                    Пройдено: {progress.filter(p => p.lecture_id === assignment.lecture_id).length} / {students.length}
                  </div>
                </div>
              </div>
            ))}
            <button 
              onClick={() => setShowCreateAssignment(true)}
              className="flex flex-col items-center justify-center p-8 rounded-[2rem] border-2 border-dashed border-stone-200 text-stone-400 hover:border-emerald-600 hover:text-emerald-600 transition-all group"
            >
               <Plus className="w-8 h-8 mb-4 group-hover:scale-110 transition-transform" />
               <span className="font-black uppercase tracking-widest text-xs">Добавить задание</span>
            </button>
          </div>
          {assignments.length > (ITEMS_PER_PAGE - 1) && (
            <Pagination 
              currentPage={assignmentPage}
              totalPages={Math.ceil(assignments.length / (ITEMS_PER_PAGE - 1))}
              onPageChange={setAssignmentPage}
            />
          )}
        </div>
      )}

      {/* Create Assignment Modal */}
      {showCreateAssignment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md">
           <motion.div 
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl relative"
           >
             <button 
               onClick={() => setShowCreateAssignment(false)}
               className="absolute top-6 right-6 text-stone-400 hover:text-stone-900 transition-colors p-2"
             >
               <X className="w-6 h-6" />
             </button>
             
             <div className="p-10">
                <h2 className="text-2xl font-serif font-black text-stone-900 mb-6">Новое задание</h2>
                <form onSubmit={handleCreateAssignment} className="space-y-6">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Курс</label>
                     <select 
                       required
                       value={assignmentForm.course_id}
                       onChange={(e) => {
                         setAssignmentForm(prev => ({ ...prev, course_id: e.target.value, lecture_id: '' }));
                         if (e.target.value) loadLectures(e.target.value);
                       }}
                       className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-emerald-500/10 font-bold text-sm"
                     >
                       <option value="">Выберите курс</option>
                       {courses.map(c => (
                         <option key={c.id} value={c.id}>{c.title_ru}</option>
                       ))}
                     </select>
                   </div>
                   
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Лекция</label>
                     <select 
                       required
                       disabled={!assignmentForm.course_id}
                       value={assignmentForm.lecture_id}
                       onChange={(e) => setAssignmentForm({ ...assignmentForm, lecture_id: e.target.value })}
                       className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-emerald-500/10 font-bold text-sm disabled:opacity-50"
                     >
                       <option value="">Выберите лекцию</option>
                       {lectures.map(l => (
                         <option key={l.id} value={l.id}>{l.title_ru}</option>
                       ))}
                     </select>
                   </div>

                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Крайний срок (Дата)</label>
                     <input 
                       type="date"
                       required
                       min={new Date().toISOString().split('T')[0]}
                       value={assignmentForm.due_date}
                       onChange={(e) => setAssignmentForm({ ...assignmentForm, due_date: e.target.value })}
                       className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-emerald-500/10 font-bold text-sm"
                     />
                   </div>

                   <button 
                     type="submit"
                     disabled={isSubmitting || !assignmentForm.lecture_id}
                     className="w-full bg-emerald-600 text-white rounded-2xl py-5 font-black shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all uppercase tracking-widest text-xs disabled:opacity-50"
                   >
                     {isSubmitting ? 'Назначение...' : 'Назначить классу'}
                   </button>
                 </form>
             </div>
           </motion.div>
        </div>
      )}
    </div>
  );
}
