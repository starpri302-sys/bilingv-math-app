import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  
  // Show max 5 page buttons around current page
  const getVisiblePages = () => {
    if (totalPages <= 7) return pages;
    
    if (currentPage <= 4) return [...pages.slice(0, 5), '...', totalPages];
    if (currentPage >= totalPages - 3) return [1, '...', ...pages.slice(totalPages - 5)];
    
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  return (
    <div className="flex items-center justify-center gap-2 mt-12 pb-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-3 rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 hover:border-emerald-600 hover:text-emerald-600 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-stone-600 disabled:hover:border-stone-200 transition-all shadow-sm"
        aria-label="Previous page"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-1.5 px-2">
        {getVisiblePages().map((page, index) => (
          <React.Fragment key={index}>
            {page === '...' ? (
              <span className="px-3 py-2 text-stone-400 font-bold">...</span>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onPageChange(page as number)}
                className={`w-11 h-11 rounded-xl font-bold text-sm transition-all shadow-sm ${
                  currentPage === page
                    ? 'bg-emerald-600 text-white shadow-emerald-200'
                    : 'bg-white border border-stone-200 text-stone-600 hover:border-emerald-200 hover:text-emerald-600'
                }`}
              >
                {page}
              </motion.button>
            )}
          </React.Fragment>
        ))}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-3 rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 hover:border-emerald-600 hover:text-emerald-600 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-stone-600 disabled:hover:border-stone-200 transition-all shadow-sm"
        aria-label="Next page"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
