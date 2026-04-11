import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Book, ChevronRight, User, Heart } from 'lucide-react';
import UserAvatar from './UserAvatar';
import { api } from '../services/api';
import { useAuth } from '../store/authContext';

interface TermCardProps {
  term: any;
  language: string;
}

export default function TermCard({ term, language }: TermCardProps) {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    if (user) {
      api.getFavoriteStatus(term.id).then(res => setIsFavorite(res.isFavorite));
    }
  }, [term.id, user]);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || isToggling) return;

    setIsToggling(true);
    try {
      await api.toggleFavorite(term.id, isFavorite);
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsToggling(false);
    }
  };

  const translation = term.translations?.find((t: any) => t.lang_code === language) || term.translations?.[0] || {};
  const name = translation.name || 'No Name';
  const rawDefinition = translation.definition || '';
  
  // Strip HTML tags and decode common entities like &nbsp;
  const definition = rawDefinition
    .replace(/<br\s*\/?>|<\/p>|<\/div>|<\/li>|<\/h\d>/gi, ' ') // Replace block tags with spaces to avoid merging words
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, '\u00A0') // Keep non-breaking spaces as characters
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+-\s+/g, '\u00A0\u2014 ')
    .replace(/\s+—\s+/g, '\u00A0\u2014 ');

  const author = {
    username: term.author_name,
    full_name: term.author_full_name,
    avatar: term.author_avatar
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-[2rem] border border-stone-200 p-6 shadow-sm hover:shadow-md transition-all group flex flex-col h-full"
    >
      {/* Top Section: Author and Favorite */}
      <div className="flex items-center justify-between mb-6">
        <Link 
          to={`/user/${term.created_by}`}
          className="flex items-center gap-3 group/author hover:bg-stone-50 p-1 -ml-1 rounded-2xl transition-colors min-w-0"
        >
          <UserAvatar user={author} size="sm" className="ring-2 ring-stone-50" />
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider leading-none mb-1">Автор</span>
            <span className="text-sm font-bold text-stone-700 group-hover/author:text-emerald-600 transition-colors truncate">
              {author.full_name || author.username || 'Аноним'}
            </span>
          </div>
        </Link>
        
        {user && (
          <button
            onClick={handleToggleFavorite}
            disabled={isToggling}
            className={`p-2.5 rounded-2xl transition-all ${isFavorite ? 'bg-red-50 text-red-500 shadow-sm' : 'bg-stone-100 text-stone-400 hover:text-red-400 hover:bg-red-50'}`}
            title={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        )}
      </div>

      {/* Main Content */}
      <Link to={`/term/${term.id}`} className="block flex-grow group-hover:no-underline">
        <h3 className="font-serif text-2xl font-bold text-stone-900 mb-3 group-hover:text-emerald-600 transition-colors break-words leading-tight">
          {name}
        </h3>
        
        {/* Metadata Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
            <Book className="w-3 h-3" />
            <span>Класс {term.grade}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-stone-100 text-stone-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-stone-200">
            <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
            <span>{term.subject_name_ru || 'Математика'}</span>
          </div>
        </div>

        <div className="bg-stone-50/50 border border-stone-100 rounded-2xl p-4 mb-6 group-hover:bg-white transition-colors">
          <p className="text-stone-600 text-sm line-clamp-3 leading-relaxed italic break-words text-pretty">
            {definition}
          </p>
        </div>
      </Link>

      {/* Footer Section */}
      <div className="flex items-center justify-between pt-5 border-t border-stone-100 mt-auto">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400 shrink-0">Языки:</span>
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {term.translations?.map((t: any) => (
              <span 
                key={t.lang_code}
                className="px-1.5 py-0.5 bg-stone-50 text-stone-500 rounded border border-stone-200 text-[8px] font-black uppercase tracking-wider"
              >
                {t.lang_code}
              </span>
            ))}
          </div>
        </div>
        
        <Link to={`/term/${term.id}`} className="flex items-center gap-1 text-emerald-600 font-bold text-sm hover:underline shrink-0 ml-4">
          <span>Подробнее</span>
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </motion.div>
  );
}
