import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  isDestructive = true
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-white w-full max-w-md overflow-hidden rounded-3xl shadow-2xl flex flex-col"
        >
          <header className="p-6 border-b border-stone-100 flex justify-between items-start bg-stone-50">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border shrink-0 ${isDestructive ? 'bg-red-100 text-red-600 border-red-200' : 'bg-emerald-100 text-emerald-600 border-emerald-200'}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-serif font-black text-stone-900 leading-tight break-words">
                {title}
              </h2>
            </div>
            <button onClick={onCancel} className="p-2 text-stone-400 hover:text-stone-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </header>

          <div className="p-6">
            <p className="text-stone-600 text-sm leading-relaxed font-medium">
              {message}
            </p>
          </div>

          <footer className="p-6 border-t border-stone-100 bg-stone-50 flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-5 py-2.5 rounded-xl text-stone-600 hover:bg-stone-200 font-bold text-sm transition-all"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onCancel();
              }}
              className={`px-5 py-2.5 rounded-xl text-white font-bold text-sm transition-all shadow-sm hover:shadow-md ${isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            >
              {confirmText}
            </button>
          </footer>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
