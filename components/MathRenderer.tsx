import React, { useEffect, useRef } from 'react';
import katex from 'katex';

interface MathRendererProps {
  text: string;
  className?: string;
}

const MathRenderer: React.FC<MathRendererProps> = ({ text, className = '' }) => {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Simplified Regex for maximum browser compatibility (removed lookbehind (?<!...))
    // 1. $$...$$ (Block)
    // 2. \[...\] (Block)
    // 3. \(...\) (Inline)
    // 4. $...$ (Inline) - Matches any char except $ inside.
    const regex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|(?:\$[^$]+\$))/g;
    
    // Split text into parts
    const parts = text.split(regex);
    
    containerRef.current.innerHTML = '';
    
    parts.forEach(part => {
      if (!part) return; // Skip empty parts

      let latex = '';
      let isDisplayMode = false;
      let isMath = false;
      const trimmedPart = part.trim();

      // Check delimiters
      if (trimmedPart.startsWith('$$') && trimmedPart.endsWith('$$')) {
        latex = trimmedPart.slice(2, -2);
        isDisplayMode = true;
        isMath = true;
      } else if (trimmedPart.startsWith('\\[') && trimmedPart.endsWith('\\]')) {
        latex = trimmedPart.slice(2, -2);
        isDisplayMode = true;
        isMath = true;
      } else if (trimmedPart.startsWith('\\(') && trimmedPart.endsWith('\\)')) {
        latex = trimmedPart.slice(2, -2);
        isDisplayMode = false;
        isMath = true;
      } else if (trimmedPart.startsWith('$') && trimmedPart.endsWith('$')) {
        // Simple check: Must start and end with $. 
        // We accept space inside (e.g., "$ \sin x $")
        if (trimmedPart.length > 2) {
             latex = trimmedPart.slice(1, -1);
             isDisplayMode = false;
             isMath = true;
        }
      }

      if (isMath) {
        const span = document.createElement('span');
        
        // Clean the latex string
        const cleanLatex = latex
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            // Remove trailing backslashes that might break katex
            .replace(/\\$/g, '') 
            .trim();

        try {
          katex.render(cleanLatex, span, { 
            throwOnError: false, 
            displayMode: isDisplayMode,
            output: 'html', // Generate HTML output for better accessibility/performance
            trust: true,
            strict: false,
            globalGroup: true 
          });
          containerRef.current?.appendChild(span);
        } catch (e) {
          console.warn("KaTeX render error:", e);
          // If render fails, show original text to ensure data isn't lost
          containerRef.current?.appendChild(document.createTextNode(part));
        }
      } else {
        // Render plain text with line break support
        const textSpan = document.createElement('span');
        // Handle newlines as <br>
        const lines = part.split('\n');
        lines.forEach((line, i) => {
            if (i > 0) textSpan.appendChild(document.createElement('br'));
            textSpan.appendChild(document.createTextNode(line));
        });
        containerRef.current?.appendChild(textSpan);
      }
    });

  }, [text]);

  return <span ref={containerRef} className={`${className} leading-relaxed break-words block-math-adjustment`} />;
};

export default MathRenderer;