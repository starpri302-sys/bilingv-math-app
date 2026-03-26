import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Book, ChevronRight, Image, Video } from 'lucide-react';

interface TermCardProps {
  term: any;
  language: string;
}

export default function TermCard({ term, language }: TermCardProps) {
  const translation = term.translations?.find((t: any) => t.lang_code === language) || term.translations?.[0] || {};
  const name = translation.name || 'No Name';
  const rawDefinition = translation.definition || '';
  const definition = rawDefinition.replace(/<[^>]*>/g, '');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm hover:shadow-md transition-all group"
    >
      <Link to={`/term/${term.id}`} className="block">
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

        <h3 className="font-serif text-2xl font-bold text-stone-900 mb-3 group-hover:text-emerald-600 transition-colors">
          {name}
        </h3>
        
        <p className="text-stone-600 text-sm line-clamp-3 mb-6 leading-relaxed italic">
          {definition}
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-stone-100">
          <div className="flex items-center gap-4 text-stone-400 text-xs font-medium">
          </div>
          <div className="flex items-center gap-1 text-emerald-600 font-bold text-sm">
            <span>Подробнее</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
