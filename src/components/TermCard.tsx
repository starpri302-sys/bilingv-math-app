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
      className="bg-white rounded-[2rem] border border-stone-200 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all group flex flex-col h-full"
    >
      {/* Author and Info at Top */}
      <div className="flex flex-col gap-4 mb-5">
        <div className="flex items-center justify-between">
          <Link 
            to={`/user/${term.created_by}`}
            className="flex items-center gap-2 group/author hover:bg-stone-50 p-1 -ml-1 rounded-xl transition-colors max-w-[70%]"
          >
            <UserAvatar user={author} size="sm" />
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 truncate">Автор</span>
              <span className="text-[11px] font-bold text-stone-700 group-hover/author:text-emerald-600 transition-colors truncate">
                {author.full_name || author.username || 'Аноним'}
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-100 text-stone-600 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-stone-200 shrink-0">
            <Book className="w-3 h-3 text-emerald-600" />
            <span>Класс {term.grade}</span>
          </div>
        </div>

        {/* Languages Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Языки:</span>
          <div className="flex gap-1.5 flex-wrap">
            {term.translations?.map((t: any) => (
              <span 
                key={t.lang_code}
                className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[9px] font-black uppercase tracking-wider border border-emerald-100"
              >
                {t.lang_code}
              </span>
            ))}
          </div>
        </div>
      </div>

      <Link to={`/term/${term.id}`} className="block flex-grow group-hover:no-underline">
        <h3 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 mb-2 group-hover:text-emerald-600 transition-colors break-words leading-tight">
          {name}
        </h3>
        
        <p className="text-stone-600 text-sm line-clamp-3 mb-4 leading-relaxed italic break-words">
          {definition}
        </p>
      </Link>

      <div className="flex items-center justify-between pt-4 border-t border-stone-100 mt-auto">
        <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
          {term.subject_name_ru || 'Математика'}
        </div>
        <Link to={`/term/${term.id}`} className="flex items-center gap-1 text-emerald-600 font-bold text-sm hover:underline">
          <span>Подробнее</span>
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </motion.div>
  );
}
