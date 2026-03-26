import React, { useState, useEffect } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { api } from '../services/api';

interface SearchBarProps {
  onSearch: (query: string, mode: 'basic' | 'advanced') => void;
  onFilterChange: (filters: any) => void;
}

export default function SearchBar({ onSearch, onFilterChange }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'basic' | 'advanced'>('basic');
  const [showFilters, setShowFilters] = useState(false);
  const [grade, setGrade] = useState('');
  const [subject, setSubject] = useState('');
  const [subjects, setSubjects] = useState<any[]>([]);

  const activeFiltersCount = [grade, subject].filter(Boolean).length;

  useEffect(() => {
    const loadFilters = async () => {
      const subjs = await api.getSubjects();
      setSubjects(subjs);
    };
    loadFilters();
  }, []);

  const handleSubjectChange = async (subjectId: string) => {
    setSubject(subjectId);
    onFilterChange({ grade, subjectId });
  };

  const clearFilters = () => {
    setGrade('');
    setSubject('');
    onFilterChange({ grade: '', subjectId: '' });
  };

  const grades = Array.from({ length: 11 }, (_, i) => (i + 1).toString());

  return (
    <div className="w-full max-w-4xl mx-auto mb-12">
      <form onSubmit={(e) => e.preventDefault()} className="relative flex flex-col md:flex-row items-stretch md:items-center gap-4">
        <div className="relative flex-1 group">
          <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${query ? 'text-emerald-500' : 'text-stone-400'}`} />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              onSearch(e.target.value, searchMode);
            }}
            placeholder={searchMode === 'basic' ? "Поиск по названию..." : "Расширенный поиск по всему тексту..."}
            className="w-full pl-12 pr-4 py-4 bg-white border border-stone-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-lg font-medium placeholder:text-stone-400"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex bg-stone-100 p-1 rounded-2xl border border-stone-200 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setSearchMode('basic');
                onSearch(query, 'basic');
              }}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${searchMode === 'basic' ? 'bg-white text-emerald-600 shadow-md scale-105' : 'text-stone-500 hover:text-stone-700'}`}
            >
              Базовый
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchMode('advanced');
                onSearch(query, 'advanced');
              }}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${searchMode === 'advanced' ? 'bg-white text-emerald-600 shadow-md scale-105' : 'text-stone-500 hover:text-stone-700'}`}
            >
              Расширенный
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`relative p-4 rounded-2xl border transition-all ${
              showFilters 
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' 
                : activeFiltersCount > 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm'
                  : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            <Filter className="w-6 h-6" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white shadow-sm animate-in zoom-in duration-300">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </form>

      {showFilters && (
        <div className="mt-4 p-6 bg-white border border-stone-200 rounded-2xl shadow-md animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex flex-wrap gap-6">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Предмет</label>
              <select
                value={subject || ''}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
              >
                <option value="">Все предметы</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name_ru}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Класс</label>
              <select
                value={grade || ''}
                onChange={(e) => {
                  setGrade(e.target.value);
                  onFilterChange({ grade: e.target.value, subjectId: subject });
                }}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
              >
                <option value="">Все классы</option>
                {grades.map(g => (
                  <option key={g} value={g}>{g} класс</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 text-stone-400 hover:text-red-600 transition-colors p-3 font-bold text-sm uppercase tracking-widest"
              >
                <X className="w-4 h-4" />
                Сбросить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
