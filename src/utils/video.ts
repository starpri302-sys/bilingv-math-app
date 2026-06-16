/**
 * Utility function to parse video URLs from various platforms
 * and convert them to valid embed URLs and iframe settings.
 * Supports YouTube, Vimeo, VK Video, RuTube, and direct video links.
 */

export interface ParsedVideo {
  embedUrl: string;
  type: 'youtube' | 'vimeo' | 'vk' | 'rutube' | 'direct' | 'unsupported';
  isValid: boolean;
}

export function parseVideoUrl(url: string | null | undefined): ParsedVideo {
  if (!url) {
    return { embedUrl: '', type: 'unsupported', isValid: false };
  }

  const trimmed = url.trim();

  // 1. YouTube
  // Matches watch link, mobile link, shorts, embed, youtu.be link
  if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be') || trimmed.includes('y2u.be')) {
    let videoId = '';
    
    if (trimmed.includes('youtu.be/')) {
      videoId = trimmed.split('youtu.be/')[1]?.split('?')[0]?.split('&')[0] || '';
    } else if (trimmed.includes('youtube.com/shorts/')) {
      videoId = trimmed.split('youtube.com/shorts/')[1]?.split('?')[0]?.split('&')[0] || '';
    } else if (trimmed.includes('youtube.com/embed/')) {
      videoId = trimmed.split('youtube.com/embed/')[1]?.split('?')[0]?.split('&')[0] || '';
    } else if (trimmed.includes('v=')) {
      videoId = trimmed.split('v=')[1]?.split('&')[0] || '';
    } else if (trimmed.includes('vi=')) {
      videoId = trimmed.split('vi=')[1]?.split('&')[0] || '';
    }
    
    return {
      embedUrl: videoId ? `https://www.youtube.com/embed/${videoId}` : trimmed,
      type: 'youtube',
      isValid: !!videoId
    };
  }

  // 2. Vimeo
  // Matches vimeo.com/123456
  if (trimmed.includes('vimeo.com')) {
    const parts = trimmed.split('/');
    const videoId = parts[parts.length - 1]?.split('?')[0] || '';
    return {
      embedUrl: videoId ? `https://player.vimeo.com/video/${videoId}` : trimmed,
      type: 'vimeo',
      isValid: /^\d+$/.test(videoId)
    };
  }

  // 3. VK Video / VK.com
  // Matches vk.com/video*, vkvideo.ru/video*, and vk.com/video_ext.php*
  if (trimmed.includes('vk.com/video') || trimmed.includes('vk.com/video_ext.php') || trimmed.includes('vkvideo.ru/video')) {
    if (trimmed.includes('video_ext.php')) {
      return { embedUrl: trimmed, type: 'vk', isValid: true };
    }
    
    // Extract oid and id from format "video-123456_7891011"
    const videoMatch = trimmed.match(/video(-?\d+)_(\d+)/);
    if (videoMatch) {
      const oid = videoMatch[1];
      const id = videoMatch[2];
      // Note: For newer VK video URLs, we also need hash if it's private.
      // But for public iframe embedding, standard oid/id often works or we use base embed URL.
      const urlParams = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      const hash = urlParams.searchParams.get('hash');
      const hashParam = hash ? `&hash=${hash}` : '';
      
      return {
        embedUrl: `https://vk.com/video_ext.php?oid=${oid}&id=${id}${hashParam}`,
        type: 'vk',
        isValid: true
      };
    }
    
    return { embedUrl: trimmed, type: 'vk', isValid: true };
  }

  // 4. RuTube
  // Matches rutube.ru/video/XXXX, rutube.ru/play/embed/XXXX
  if (trimmed.includes('rutube.ru')) {
    let rutubeId = '';
    if (trimmed.includes('/video/')) {
      rutubeId = trimmed.split('/video/')[1]?.split('/')[0]?.split('?')[0] || '';
    } else if (trimmed.includes('/play/embed/')) {
      rutubeId = trimmed.split('/play/embed/')[1]?.split('?')[0] || '';
    }
    return {
      embedUrl: rutubeId ? `https://rutube.ru/play/embed/${rutubeId}` : trimmed,
      type: 'rutube',
      isValid: !!rutubeId
    };
  }

  // 5. Direct Video Link
  // Matches simple video hosting extensions
  const isDirectVideo = /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(trimmed);
  if (isDirectVideo) {
    return {
      embedUrl: trimmed,
      type: 'direct',
      isValid: true
    };
  }

  // Fallback to direct as custom native player link
  return {
    embedUrl: trimmed,
    type: 'unsupported',
    isValid: false
  };
}

// Regex to capture video links in plain text rendering
export const videoRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|vimeo\.com|vk\.com\/video|vk\.com\/video_ext|vkvideo\.ru\/video|rutube\.ru\/video|rutube\.ru\/play\/embed)\/\S+)/ig;
