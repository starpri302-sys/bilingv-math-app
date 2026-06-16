import React from 'react';
import { parseVideoUrl, videoRegex } from '../utils/video';

interface MathTextProps {
  text: string;
  className?: string;
  as?: any;
  isHtml?: boolean;
}

const boxTokens = /[\u25A0-\u25FF\u2610\u20DE\uF000-\uF0FF]/g;

export default function MathText({ text, className, as: Component = 'span', isHtml = false }: MathTextProps) {
  if (!text) return null;

  const styleDigit = (match: string) => {
    return `<span class="font-mono font-medium text-[1.1em] text-emerald-700 bg-emerald-50/50 px-0.5 rounded leading-none" aria-hidden="false">${match}</span>`;
  };

  const styleSymbol = (match: string) => {
    return `<span class="font-mono font-black text-emerald-600 scale-110 inline-block mx-0.5">${match}</span>`;
  };

  if (isHtml) {
    const processedHtml = text.replace(/<[^>]+>|[^<]+/g, (match) => {
      if (match.startsWith('<')) return match; // Skip HTML tags
      
      const parts = match.split(videoRegex);
      
      return parts.map((part, index) => {
        if (index % 2 === 1) { // It's a video URL
          const parsed = parseVideoUrl(part);
          if (parsed.type === 'direct') {
            return `<div class="my-8 rounded-3xl overflow-hidden shadow-xl aspect-video bg-black"><video src="${parsed.embedUrl}" controls class="w-full h-full"></video></div>`;
          } else {
            return `<div class="my-8 rounded-3xl overflow-hidden shadow-xl aspect-video bg-black"><iframe class="w-full h-full" src="${parsed.embedUrl}" allowfullscreen allow="autoplay; encrypted-media; fullscreen; picture-in-picture;" frameborder="0"></iframe></div>`;
          }
        } else {
          // Process text for numbers and symbols in a single pass to avoid corrupting injected HTML
          return part.replace(/(\b\d+\b)|([\+\-\=\>\<\*\/\^√])/g, (m, digit, symbol) => {
            if (digit) return styleDigit(digit);
            if (symbol) return styleSymbol(symbol);
            return m;
          });
        }
      }).join('');
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
    // Handle video links first
    const parts = rawText.split(videoRegex);
    
    return parts.map((part, index) => {
      if (index % 2 === 1) { // It's a video URL
        const parsed = parseVideoUrl(part);
        if (parsed.type === 'direct') {
          return (
            <div key={index} className="my-8 rounded-3xl overflow-hidden shadow-xl aspect-video bg-black">
              <video src={parsed.embedUrl} controls className="w-full h-full" />
            </div>
          );
        } else {
          return (
            <div key={index} className="my-8 rounded-3xl overflow-hidden shadow-xl aspect-video bg-black/5 flex items-center justify-center relative">
              <iframe className="w-full h-full rounded-3xl absolute inset-0" src={parsed.embedUrl} allowFullScreen allow="autoplay; encrypted-media; fullscreen; picture-in-picture;" frameBorder="0" />
            </div>
          );
        }
      }

      const textParts = part.split(/(\d+|\+|-|=|>|<|\*|\/|\^|√)/g);
      return textParts.map((subPart, subIndex) => {
        if (/^\d+$/.test(subPart)) {
          return (
            <span key={`${index}-${subIndex}`} className="font-mono font-medium text-[1.1em] text-emerald-700 bg-emerald-50/50 px-0.5 rounded leading-none">
              {subPart}
            </span>
          );
        }
        if (/^(\+|-|=|>|<|\*|\/|\^|√)$/.test(subPart)) {
          return (
            <span key={`${index}-${subIndex}`} className="font-mono font-black text-emerald-600 scale-110 inline-block mx-0.5">
              {subPart}
            </span>
          );
        }
        return subPart;
      });
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
