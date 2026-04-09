import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../store/authContext';
import { motion, AnimatePresence } from 'motion/react';
import { Send, MessageSquare, Clock } from 'lucide-react';
import UserAvatar from './UserAvatar';

interface CommentsProps {
  termId: string;
}

export default function Comments({ termId }: CommentsProps) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComments();
  }, [termId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const data = await api.getComments(termId);
      setComments(data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    try {
      await api.addComment(termId, {
        user_id: user.id,
        username: profile?.username || user.username,
        avatar: profile?.avatar || '',
        content: newComment
      });
      setNewComment('');
      fetchComments();
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  return (
    <div className="space-y-8 pt-12 border-t border-stone-200">
      <div className="flex items-center gap-3">
        <MessageSquare className="w-6 h-6 text-emerald-600" />
        <h2 className="text-2xl font-serif font-bold text-stone-900">Комментарии ({comments.length})</h2>
      </div>

      {user ? (
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Оставьте ваш комментарий или вопрос..."
            className="w-full p-6 bg-white border border-stone-200 rounded-3xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all min-h-[120px] text-stone-700 font-medium"
          />
          <button
            type="submit"
            disabled={!newComment.trim()}
            className="absolute right-4 bottom-4 bg-emerald-600 text-white p-3 rounded-2xl hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      ) : (
        <div className="p-6 bg-stone-50 border border-stone-200 rounded-3xl text-center space-y-2">
          <p className="text-stone-600 font-medium">Пожалуйста, войдите в систему, чтобы оставить комментарий.</p>
        </div>
      )}

      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {comments.map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex gap-4 p-6 bg-white border border-stone-100 rounded-3xl shadow-sm hover:shadow-md transition-all"
            >
              <UserAvatar user={{ username: comment.username, avatar: comment.avatar }} size="md" />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-stone-900">{comment.username}</span>
                  <div className="flex items-center gap-1 text-stone-400 text-xs font-medium">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <p className="text-stone-600 leading-relaxed font-medium">{comment.content}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <div className="text-center py-10">
            <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto"></div>
          </div>
        )}

        {!loading && comments.length === 0 && (
          <div className="text-center py-10 text-stone-400 font-medium">
            Пока нет комментариев. Будьте первым!
          </div>
        )}
      </div>
    </div>
  );
}
