import React from 'react';

interface MathTextProps {
  text: string;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  isHtml?: boolean;
}

const boxTokens = /[\u25A0-\u25FF\u2610\u20DE\uF000-\uF0FF]/g;
const digitRegex = /(\d+)/g;

export default function MathText({ text, className, as: Component = 'span', isHtml = false }: MathTextProps) {
  if (!text) return null;

  const styleDigit = (match: string) => {
    return `<span class="font-mono font-bold text-[0.95em] text-stone-800" aria-hidden="false">${match}</span>`;
  };

  if (isHtml) {
    let processedHtml = text.replace(boxTokens, () => {
      return `<span class="inline-flex items-center justify-center w-[1.1em] h-[1.1em] border-[1.5px] border-stone-400 rounded-[4px] bg-white align-middle mx-0.5 -mt-0.5 shadow-sm" aria-hidden="true"></span>`;
    });

    // We only want to replace digits that are NOT part of HTML attributes
    // This is a bit complex with regex, but for standard digits in text nodes:
    processedHtml = processedHtml.replace(/(?<!<[^>]*)\b(\d+)\b(?![^<]*>)/g, styleDigit);
    
    return (
      <Component 
        className={className} 
        dangerouslySetInnerHTML={{ __html: processedHtml }} 
      />
    );
  }

  // Plain text processing
  const renderTextWithDigits = (rawText: string) => {
    const textParts = rawText.split(digitRegex);
    return textParts.map((part, index) => {
      if (digitRegex.test(part)) {
        return (
          <span key={index} className="font-mono font-bold text-[1.05em] text-stone-800">
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
