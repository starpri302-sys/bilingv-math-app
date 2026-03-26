import React, { useState, useEffect } from 'react';
import { useAuth } from '../store/authContext';
import { api } from '../services/api';
import BilingualEditor from '../components/BilingualEditor';
import UserAvatar from '../components/UserAvatar';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, CheckCircle, Trash2, Clock, Info, Plus, Languages, Book, Calculator, Settings, Edit3, Terminal, Download, Database as DbIcon, Upload, FileJson } from 'lucide-react';

type AdminTab = 'moderation' | 'subjects' | 'languages' | 'users' | 'system';

export default function AdminPanel() {
  const { isAdmin, isSuperAdmin, isChiefEditor, profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('moderation');
  const [pendingTerms, setPendingTerms] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [languages, setLanguages] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [importing, setImporting] = useState(false);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [showTermEditor, setShowTermEditor] = useState(false);
  const [editingTerm, setEditingTerm] = useState<any>(null);
  const [subjectForm, setSubjectForm] = useState({ id: '', slug: '', name_ru: '', name_tyv: '', icon: 'calculator' });
  const [langForm, setLangForm] = useState({ code: '', name: '', native_name: '', flag: '' });

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin, activeTab]);

  const loadData = async () => {
    setFetching(true);
    try {
      if (activeTab === 'moderation') {
        const data = await api.getTerms({ status: 'pending' });
        setPendingTerms(data);
      } else if (activeTab === 'subjects' && isSuperAdmin) {
        const data = await api.getSubjects();
        setSubjects(data);
      } else if (activeTab === 'languages' && isSuperAdmin) {
        const data = await api.getLanguages();
        setLanguages(data);
      } else if (activeTab === 'users' && isSuperAdmin) {
        const data = await api.getAllUsers();
        setUsers(data);
      } else if (activeTab === 'system' && isSuperAdmin) {
        const data = await api.getAdminLogs(profile?.role || '');
        setLogs(data);
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setFetching(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (!isSuperAdmin) return;
    try {
      await api.updateUserRole(userId, newRole, profile?.role);
      loadData();
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  const handleExportTerms = async () => {
    if (!isSuperAdmin) return;
    try {
      const data = await api.exportTerms(profile?.role || '');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `terms_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Ошибка при экспорте терминов');
    }
  };

  const handleImportTerms = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isSuperAdmin) return;

    if (!window.confirm('ВНИМАНИЕ: Импорт полностью заменит текущую базу терминов! Вы уверены?')) {
      e.target.value = '';
      return;
    }

    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await api.importTerms(profile?.role || '', data);
      if (res.success) {
        alert('База терминов успешно восстановлена!');
        loadData();
      } else {
        alert(`Ошибка: ${res.error}`);
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Ошибка при импорте. Проверьте формат файла.');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.updateTermStatus(id, 'published', profile?.role);
      loadData();
    } catch (error) {
      console.error('Error approving term:', error);
    }
  };

  const handleReject = async (id: string) => {
    if (!window.confirm('Вы уверены, что хотите отклонить и удалить этот термин?')) return;
    try {
      await api.deleteTerm(id, profile?.role);
      loadData();
    } catch (error) {
      console.error('Error rejecting term:', error);
    }
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    try {
      const id = subjectForm.id || Math.random().toString(36).substr(2, 9);
      await api.saveSubject({ ...subjectForm, id }, profile?.role);
      setShowForm(false);
      setSubjectForm({ id: '', slug: '', name_ru: '', name_tyv: '', icon: 'calculator' });
      loadData();
    } catch (error) {
      console.error('Error saving subject:', error);
    }
  };

  const handleSaveLanguage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    try {
      await api.saveLanguage(langForm, profile?.role);
      setShowForm(false);
      setLangForm({ code: '', name: '', native_name: '', flag: '' });
      loadData();
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!isSuperAdmin) return;
    if (!window.confirm('Удалить предмет? Это может повлиять на связанные темы и термины.')) return;
    await api.deleteSubject(id, profile?.role);
    loadData();
  };

  const handleDeleteLanguage = async (code: string) => {
    if (!isSuperAdmin) return;
    if (!window.confirm('Удалить язык?')) return;
    await api.deleteLanguage(code, profile?.role);
    loadData();
  };

  if (loading) return <div className="text-center py-20">Загрузка...</div>;
  if (!isAdmin) return <div className="text-center py-20 text-red-500 font-bold">Доступ запрещен.</div>;

  const tabs = [
    { id: 'moderation', label: 'Модерация', icon: Clock, visible: true },
    { id: 'subjects', label: 'Предметы', icon: Calculator, visible: isSuperAdmin },
    { id: 'languages', label: 'Языки', icon: Languages, visible: isSuperAdmin },
    { id: 'users', label: 'Пользователи', icon: Shield, visible: isSuperAdmin },
    { id: 'system', label: 'Система', icon: Terminal, visible: isSuperAdmin },
  ].filter(t => t.visible);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto border-2 border-emerald-200">
          <Shield className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-serif font-black text-stone-900 leading-tight">
          {isSuperAdmin ? 'Панель Супер-админа' : 'Панель Главного редактора'}
        </h1>
        <p className="text-stone-500 font-medium">
          {isSuperAdmin 
            ? 'Полный доступ к управлению контентом и структурой.' 
            : 'Модерация предложенных терминов и понятий.'}
        </p>
      </header>

      <nav className="flex flex-wrap gap-2 p-1 bg-stone-100 rounded-2xl border border-stone-200 w-fit mx-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as AdminTab); setShowForm(false); }}
            className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="space-y-6">
        {activeTab === 'moderation' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              На модерации ({pendingTerms.length})
            </h2>
            <div className="grid grid-cols-1 gap-6">
              <AnimatePresence mode="popLayout">
                {pendingTerms.map((term) => (
                  <motion.div
                    key={term.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded text-[10px] font-bold uppercase tracking-widest border border-stone-200">
                          Класс {term.grade}
                        </span>
                      </div>
                      <h3 className="text-2xl font-serif font-bold text-stone-900">
                        {term.translations?.map((t: any) => t.name).join(' / ')}
                      </h3>
                      <p className="text-stone-500 text-sm line-clamp-2 italic">
                        {term.translations?.[0]?.definition?.replace(/<[^>]*>/g, '')}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <button
                        onClick={() => { setEditingTerm(term); setShowTermEditor(true); }}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-stone-100 text-stone-600 px-6 py-3 rounded-2xl hover:bg-stone-200 transition-all font-bold text-sm"
                      >
                        <Edit3 className="w-4 h-4" />
                        Правка
                      </button>
                      <button
                        onClick={() => handleApprove(term.id)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl hover:bg-emerald-700 transition-all font-bold text-sm shadow-sm hover:shadow-md"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Одобрить
                      </button>
                      <button
                        onClick={() => handleReject(term.id)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white text-red-600 border border-red-100 px-6 py-3 rounded-2xl hover:bg-red-50 transition-all font-bold text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        Удалить
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {pendingTerms.length === 0 && !fetching && (
                <div className="text-center py-20 space-y-4 bg-white rounded-3xl border border-stone-100 shadow-sm">
                  <Info className="w-12 h-12 text-stone-300 mx-auto" />
                  <h3 className="text-xl font-bold text-stone-900">Очередь пуста</h3>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'subjects' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-stone-900">Список предметов</h2>
              <button
                onClick={() => { setShowForm(true); setSubjectForm({ id: '', slug: '', name_ru: '', name_tyv: '', icon: 'calculator' }); }}
                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-all font-bold text-sm"
              >
                <Plus className="w-4 h-4" />
                Добавить предмет
              </button>
            </div>

            {showForm && (
              <form onSubmit={handleSaveSubject} className="bg-stone-50 p-6 rounded-3xl border border-stone-200 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Slug (напр: math)"
                    value={subjectForm.slug}
                    onChange={e => setSubjectForm({ ...subjectForm, slug: e.target.value })}
                    className="p-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Название (RU)"
                    value={subjectForm.name_ru}
                    onChange={e => setSubjectForm({ ...subjectForm, name_ru: e.target.value })}
                    className="p-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Название (TYV)"
                    value={subjectForm.name_tyv}
                    onChange={e => setSubjectForm({ ...subjectForm, name_tyv: e.target.value })}
                    className="p-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Icon name (lucide)"
                    value={subjectForm.icon}
                    onChange={e => setSubjectForm({ ...subjectForm, icon: e.target.value })}
                    className="p-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold">Сохранить</button>
                  <button type="button" onClick={() => setShowForm(false)} className="text-stone-500 px-6 py-2 font-bold">Отмена</button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map(s => (
                <div key={s.id} className="bg-white p-4 rounded-2xl border border-stone-200 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-stone-900">{s.name_ru}</h3>
                    <p className="text-xs text-stone-400 uppercase tracking-widest">{s.slug}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setSubjectForm(s); setShowForm(true); }} className="p-2 text-stone-400 hover:text-stone-600"><Settings className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteSubject(s.id)} className="p-2 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'languages' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-stone-900">Список языков</h2>
              <button
                onClick={() => { setShowForm(true); setLangForm({ code: '', name: '', native_name: '', flag: '' }); }}
                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-all font-bold text-sm"
              >
                <Plus className="w-4 h-4" />
                Добавить язык
              </button>
            </div>

            {showForm && (
              <form onSubmit={handleSaveLanguage} className="bg-stone-50 p-6 rounded-3xl border border-stone-200 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Код (напр: en)"
                    value={langForm.code}
                    onChange={e => setLangForm({ ...langForm, code: e.target.value })}
                    className="p-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Название (напр: English)"
                    value={langForm.name}
                    onChange={e => setLangForm({ ...langForm, name: e.target.value })}
                    className="p-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Native Name (напр: English)"
                    value={langForm.native_name}
                    onChange={e => setLangForm({ ...langForm, native_name: e.target.value })}
                    className="p-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Flag Emoji (напр: 🇺🇸)"
                    value={langForm.flag}
                    onChange={e => setLangForm({ ...langForm, flag: e.target.value })}
                    className="p-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold">Сохранить</button>
                  <button type="button" onClick={() => setShowForm(false)} className="text-stone-500 px-6 py-2 font-bold">Отмена</button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {languages.map(l => (
                <div key={l.code} className="bg-white p-4 rounded-2xl border border-stone-200 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{l.flag}</span>
                    <div>
                      <h3 className="font-bold text-stone-900">{l.native_name}</h3>
                      <p className="text-xs text-stone-400 uppercase tracking-widest">{l.name} ({l.code})</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setLangForm(l); setShowForm(true); }} className="p-2 text-stone-400 hover:text-stone-600"><Settings className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteLanguage(l.code)} className="p-2 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-stone-900">Список пользователей ({users.length})</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {users.map(u => (
                <div key={u.id} className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <UserAvatar user={u} size="md" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-stone-900 truncate">{u.full_name || u.username}</h3>
                      <p className="text-xs text-stone-400 truncate">{u.email}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded text-[10px] font-bold uppercase tracking-widest border border-stone-200">
                          {u.role}
                        </span>
                        {u.grade && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[10px] font-bold uppercase tracking-widest border border-emerald-100">
                            {u.grade} класс
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {isSuperAdmin && u.id !== profile?.id && (
                    <div className="pt-4 border-t border-stone-100">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 block mb-2">Изменить роль</label>
                      <select 
                        value={u.role}
                        onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                        className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                      >
                        <option value="guest">Гость (Ученик)</option>
                        <option value="editor">Редактор (Учитель)</option>
                        <option value="chief_editor">Главный редактор (Админ)</option>
                        <option value="super_admin">Супер-админ</option>
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'system' && isSuperAdmin && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-emerald-600" />
                  Системные логи
                </h2>
                <p className="text-sm text-stone-500 font-medium">Последние 500 действий в системе</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleExportTerms}
                  className="flex items-center gap-2 bg-white text-stone-900 border border-stone-200 px-6 py-3 rounded-2xl hover:bg-stone-50 transition-all font-bold text-sm shadow-sm"
                >
                  <FileJson className="w-4 h-4 text-emerald-600" />
                  Экспорт терминов (JSON)
                </button>
                <label className="flex items-center gap-2 bg-white text-stone-900 border border-stone-200 px-6 py-3 rounded-2xl hover:bg-stone-50 transition-all font-bold text-sm shadow-sm cursor-pointer">
                  <Upload className="w-4 h-4 text-amber-600" />
                  {importing ? 'Восстановление...' : 'Импорт терминов (JSON)'}
                  <input type="file" accept=".json" onChange={handleImportTerms} className="hidden" disabled={importing} />
                </label>
                <button
                  onClick={() => api.downloadBackup(profile?.role || '')}
                  className="flex items-center gap-2 bg-stone-900 text-white px-6 py-3 rounded-2xl hover:bg-stone-800 transition-all font-bold text-sm shadow-md"
                >
                  <Download className="w-4 h-4" />
                  Скачать бэкап БД (.db)
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-bottom border-stone-200">
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-stone-400">Время</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-stone-400">Пользователь</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-stone-400">Действие</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-stone-400">Детали</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-stone-50 transition-colors">
                        <td className="p-4 text-xs font-mono text-stone-500">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-stone-900">{log.username || 'System'}</span>
                            {log.user_id && <span className="text-[10px] text-stone-400 font-mono">({log.user_id})</span>}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${
                            log.action.includes('FAILED') 
                              ? 'bg-red-50 text-red-600 border-red-100' 
                              : log.action.includes('SUCCESS') || log.action === 'REGISTER'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              : 'bg-stone-100 text-stone-600 border-stone-200'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="max-w-xs truncate text-xs text-stone-500 font-medium" title={log.details}>
                            {log.details}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {logs.length === 0 && !fetching && (
                <div className="text-center py-20 text-stone-400 font-bold">Логов пока нет</div>
              )}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showTermEditor && (
          <BilingualEditor 
            onClose={() => {
              setShowTermEditor(false);
              setEditingTerm(null);
              loadData();
            }} 
            initialData={editingTerm} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
