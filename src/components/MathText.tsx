import React from 'react';

interface MathTextProps {
  text: string;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  isHtml?: boolean;
}

const boxTokens = /[\u25A0-\u25FF\u2610\u20DE\uF000-\uF0FF]/g;

export default function MathText({ text, className, as: Component = 'span', isHtml = false }: MathTextProps) {
  if (!text) return null;

  // If it's HTML, we need to handle it differently
  // For simplicity, we'll strip HTML tags if we want to use the React component approach,
  // or we use a replacement strategy followed by dangerouslySetInnerHTML.
  
  if (isHtml) {
    const processedHtml = text.replace(boxTokens, (match) => {
      return `<span class="inline-flex items-center justify-center w-[1.1em] h-[1.1em] border-[1.5px] border-stone-400 rounded-[4px] bg-white align-middle mx-0.5 -mt-0.5 shadow-sm" aria-hidden="true"></span>`;
    });
    
    return (
      <Component 
        className={className} 
        dangerouslySetInnerHTML={{ __html: processedHtml }} 
      />
    );
  }

  const parts = text.split(boxTokens);
  if (parts.length === 1) return <Component className={className}>{text}</Component>;

  const matches = text.match(boxTokens) || [];

  return (
    <Component className={className}>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {part}
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
