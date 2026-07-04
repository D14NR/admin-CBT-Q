import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface FormattedQuestionProps {
  html: string;
  className?: string;
}

export function FormattedQuestion({ html, className = '' }: FormattedQuestionProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Find all formula spans and render them with KaTeX
    const formulas = containerRef.current.querySelectorAll('[data-latex]');
    formulas.forEach((el) => {
      const latex = el.getAttribute('data-latex');
      if (latex) {
        try {
          const html = katex.renderToString(latex, {
            throwOnError: false,
            displayMode: el.className.includes('display'),
          });
          el.innerHTML = html;
        } catch (err) {
          console.error('KaTeX render error:', err);
          el.innerHTML = `$${latex}$`;
        }
      }
    });
  }, [html]);

  return (
    <div
      ref={containerRef}
      className={`prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
      style={{
        wordWrap: 'break-word',
        overflowWrap: 'break-word',
      }}
    />
  );
}
