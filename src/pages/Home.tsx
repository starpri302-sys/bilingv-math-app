import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import TermCard from '../components/TermCard';
import SearchBar from '../components/SearchBar';
import SEO from '../components/SEO';
import BilingualEditor from '../components/BilingualEditor';
import { useAuth } from '../store/authContext';
import { motion, AnimatePresence } from 'motion/react';
import { Languages, Info, Plus } from 'lucide-react';

export default function Home() {
  const { user, isAdmin, isEditor, isGuest } = useAuth();
  const [terms, setTerms] = useState<any[]>([]);
  const [filteredTerms, setFilteredTerms] = useState<any[]>([]);
  const [languages, setLanguages] = useState<any[]>([]);
  const [language, setLanguage] = useState<string>('ru');
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    fetchLanguages();
    fetchTerms();
  }, []);

  const fetchLanguages = async () => {
    try {
      const data = await api.getLanguages();
      if (Array.isArray(data)) {
        setLanguages(data);
        if (data.length > 0 && !data.find((l: any) => l.code === 'ru')) {
          setLanguage(data[0].code);
        }
      } else {
        console.error('Languages data is not an array:', data);
        setLanguages([]);
      }
    } catch (error) {
      console.error("Error fetching languages:", error);
      setLanguages([]);
    }
  };

  const fetchTerms = async (filters?: any) => {
    setLoading(true);
    try {
      const data = await api.getTerms({ status: 'published', ...filters });
      if (Array.isArray(data)) {
        setTerms(data);
        setFilteredTerms(data);
      } else {
        console.error('Terms data is not an array:', data);
        setTerms([]);
        setFilteredTerms([]);
      }
    } catch (error) {
      console.error("Error fetching terms:", error);
      setTerms([]);
      setFilteredTerms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string, mode: 'basic' | 'advanced') => {
    if (!query.trim()) {
      setFilteredTerms(terms);
      return;
    }

    const filtered = terms.filter(term => 
      term.translations?.some((t: any) => {
        const nameMatch = t.name.toLowerCase().includes(query.toLowerCase());
        if (mode === 'basic') return nameMatch;
        
        const definitionMatch = t.definition.toLowerCase().includes(query.toLowerCase());
        return nameMatch || definitionMatch;
      })
    );
    setFilteredTerms(filtered);
  };

  const handleFilterChange = (filters: any) => {
    fetchTerms(filters);
  };

  return (
    <div className="space-y-12">
      <SEO />
      <header className="text-center space-y-6 max-w-4xl mx-auto px-4">
        <h1 className="font-serif text-4xl sm:text-7xl font-black text-stone-900 leading-[1.1] tracking-tight">
          <span className="block">Билингвальный справочник</span>
          <span className="block text-emerald-600 italic">по математике</span>
        </h1>
        <p className="text-stone-500 text-lg sm:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
          Интерактивный билингвальный справочник терминов и понятий по математике
        </p>
      </header>

      <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
        <div className="flex bg-stone-100 p-1 rounded-2xl border border-stone-200 overflow-x-auto max-w-full">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`px-6 py-2 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${language === lang.code ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              {lang.name}
            </button>
          ))}
        </div>
        
        {user && (
          <button
            onClick={() => setShowEditor(true)}
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg font-bold text-sm"
          >
            <Plus className="w-5 h-5" />
            Добавить термин
          </button>
        )}
      </div>

      <SearchBar onSearch={handleSearch} onFilterChange={handleFilterChange} />

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
        </div>
      ) : filteredTerms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredTerms.map((term) => (
              <TermCard key={term.id} term={term} language={language} />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-20 space-y-4 bg-white rounded-3xl border border-stone-100 shadow-sm">
          <Info className="w-12 h-12 text-stone-300 mx-auto" />
          <h3 className="text-xl font-bold text-stone-900">Термины не найдены</h3>
          <p className="text-stone-500">Попробуйте изменить параметры поиска или фильтры.</p>
        </div>
      )}

      <AnimatePresence>
        {showEditor && <BilingualEditor onClose={() => setShowEditor(false)} />}
      </AnimatePresence>
    </div>
  );
}

