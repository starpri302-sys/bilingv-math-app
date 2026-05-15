import React from 'react';

interface MathTextProps {
  text: string;
  className?: string;
  as?: any;
  isHtml?: boolean;
}

const boxTokens = /[\u25A0-\u25FF\u2610\u20DE\uF000-\uF0FF]/g;
const digitRegex = /(\d+)/g;

export default function MathText({ text, className, as: Component = 'span', isHtml = false }: MathTextProps) {
  if (!text) return null;

  const styleDigit = (match: string) => {
    return `<span class="font-mono font-medium text-[1.1em] text-emerald-700 bg-emerald-50/50 px-0.5 rounded leading-none" aria-hidden="false">${match}</span>`;
  };

  if (isHtml) {
    // Improved character-level processing for HTML to avoid tagging digits in attributes
    const processedHtml = text.replace(/<[^>]+>|[^<]+/g, (match) => {
      if (match.startsWith('<')) return match; // Skip HTML tags
      
      // Process text nodes: replace digits and math symbols
      let nodeText = match.replace(/\b(\d+)\b/g, styleDigit);
      nodeText = nodeText.replace(/(\+|-|=|>|<|\*|\/|\^|√)/g, '<span class="font-mono font-black text-emerald-600 scale-110 inline-block mx-0.5">$1</span>');
      
      // Detected video links then wrap them
      nodeText = nodeText.replace(/(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|vimeo\.com)\/\S+)/g, (url) => {
        let embedUrl = url;
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
          const videoId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
          embedUrl = `https://www.youtube.com/embed/${videoId}`;
        } else if (url.includes('vimeo.com')) {
          const videoId = url.split('/').pop();
          embedUrl = `https://player.vimeo.com/video/${videoId}`;
        }
        
        return `<div class="my-8 rounded-3xl overflow-hidden shadow-xl aspect-video bg-black"><iframe class="w-full h-full" src="${embedUrl}" allowfullscreen></iframe></div>`;
      });

      return nodeText;
    });
    
    return (
      <Component 
        className={className} 
        dangerouslySetInnerHTML={{ __html: processedHtml }} 
      />
    );
  }

  // Plain text processing
  const renderTextWithDigits = (rawText: string) => {
    const textParts = rawText.split(/(\d+|\+|-|=|>|<|\*|\/|\^|√)/g);
    return textParts.map((part, index) => {
      if (/^\d+$/.test(part)) {
        return (
          <span key={index} className="font-mono font-medium text-[1.1em] text-emerald-700 bg-emerald-50/50 px-0.5 rounded leading-none">
            {part}
          </span>
        );
      }
      if (/^(\+|-|=|>|<|\*|\/|\^|√)$/.test(part)) {
        return (
          <span key={index} className="font-mono font-black text-emerald-600 scale-110 inline-block mx-0.5">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const parts = text.split(boxTokens);
  const matches = text.match(boxTokens) || [];

  return (
    <Component className={className}>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {renderTextWithDigits(part)}
          {i < matches.length && (
            <span 
              className="inline-flex items-center justify-center w-[1.1em] h-[1.1em] border-[1.5px] border-stone-400 rounded-[4px] bg-white align-middle mx-0.5 -mt-0.5 shadow-sm"
              aria-hidden="true"
            />
          )}
        </React.Fragment>
      ))}
    </Component>
  );
}
