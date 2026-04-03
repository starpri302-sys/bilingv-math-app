import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Book, ChevronRight, User } from 'lucide-react';
import UserAvatar from './UserAvatar';

interface TermCardProps {
  term: any;
  language: string;
}

export default function TermCard({ term, language }: TermCardProps) {
  const translation = term.translations?.find((t: any) => t.lang_code === language) || term.translations?.[0] || {};
  const name = translation.name || 'No Name';
  const rawDefinition = translation.definition || '';
  
  // Strip HTML tags and decode common entities like &nbsp;
  const definition = rawDefinition
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

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
      className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm hover:shadow-md transition-all group flex flex-col"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2 text-emerald-600">
          <Book className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest">Класс {term.grade}</span>
        </div>
        <div className="flex gap-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${language === 'ru' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
            {language.toUpperCase()}
          </span>
        </div>
      </div>

      <Link to={`/term/${term.id}`} className="block flex-grow">
        <h3 className="font-serif text-2xl font-bold text-stone-900 mb-3 group-hover:text-emerald-600 transition-colors">
          {name}
        </h3>
        
        <p className="text-stone-600 text-sm line-clamp-3 mb-6 leading-relaxed italic">
          {definition}
        </p>
      </Link>

      <div className="flex items-center justify-between pt-4 border-t border-stone-100 mt-auto">
        <Link 
          to={`/user/${term.created_by}`}
          className="flex items-center gap-2 group/author hover:bg-stone-50 p-1 -ml-1 rounded-xl transition-colors"
        >
          <UserAvatar user={author} size="sm" />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Автор</span>
            <span className="text-xs font-bold text-stone-700 group-hover/author:text-emerald-600 transition-colors">
              {author.full_name || author.username || 'Аноним'}
            </span>
          </div>
        </Link>
        <Link to={`/term/${term.id}`} className="flex items-center gap-1 text-emerald-600 font-bold text-sm">
          <span>Подробнее</span>
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </motion.div>
  );
}
