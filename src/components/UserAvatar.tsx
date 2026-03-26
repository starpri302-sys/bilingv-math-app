import React from 'react';

interface UserAvatarProps {
  user?: {
    full_name?: string;
    username?: string;
    email?: string;
    avatar?: string;
  };
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function UserAvatar({ user, size = 'md', className = '' }: UserAvatarProps) {
  const avatar = user?.avatar;
  const name = user?.full_name || user?.username || user?.email || '?';
  const firstLetter = name.charAt(0).toUpperCase();

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-24 h-24 text-4xl'
  };

  const isImage = avatar?.startsWith('http') || avatar?.startsWith('data:image');
  const isEmoji = avatar && !isImage && avatar.length <= 2; // Simple emoji check

  return (
    <div className={`rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow-sm shrink-0 ${sizeClasses[size]} ${className} ${!isImage ? 'bg-emerald-100 text-emerald-700 font-bold' : ''}`}>
      {isImage ? (
        <img 
          src={avatar} 
          alt={name} 
          className="w-full h-full object-cover" 
          referrerPolicy="no-referrer"
          onError={(e) => {
            // Fallback if image fails to load
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).parentElement!.classList.add('bg-emerald-100', 'text-emerald-700', 'font-bold');
            (e.target as HTMLImageElement).parentElement!.innerText = firstLetter;
          }}
        />
      ) : isEmoji ? (
        <span>{avatar}</span>
      ) : (
        <span>{firstLetter}</span>
      )}
    </div>
  );
}
