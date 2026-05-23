/**
 * KaTeXRenderer — renders LaTeX math using KaTeX
 * Supports multi-line expressions split by \\
 */
import { useMemo } from "react";
import katex from "katex";

interface Props {
  latex: string;
  block?: boolean;
  className?: string;
}

export default function KaTeXRenderer({ latex, block = false, className = "" }: Props) {
  const html = useMemo(() => {
    try {
      // Split by \\ for multi-line display
      if (block && latex.includes("\\\\")) {
        const lines = latex.split("\\\\").map((l) => l.trim());
        return lines
          .map((line) => {
            try {
              return katex.renderToString(line, {
                throwOnError: false,
                displayMode: true,
                output: "html",
              });
            } catch {
              return `<span style="color:#ff4466;font-size:11px">${line}</span>`;
            }
          })
          .join("");
      }
      return katex.renderToString(latex, {
        throwOnError: false,
        displayMode: block,
        output: "html",
      });
    } catch {
      return `<span style="color:#ff4466;font-size:11px">${latex}</span>`;
    }
  }, [latex, block]);

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
      style={{ lineHeight: block ? 1.8 : undefined }}
    />
  );
}
