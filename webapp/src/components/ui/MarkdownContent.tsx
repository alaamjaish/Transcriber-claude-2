"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownContentProps {
  content?: string | null;
  emptyMessage?: string;
  className?: string;
}

const BASE_CLASSNAME = [
  "prose",
  "prose-sm",
  "prose-slate",
  "dark:prose-invert",
  "max-w-none",
  "prose-headings:font-semibold",
  "prose-h1:text-xl",
  "prose-h2:text-lg",
  "prose-h3:text-base",
  "prose-p:text-xs",
  "prose-li:text-xs",
  "prose-code:text-[11px]",
  "prose-pre:bg-slate-900/5",
  "prose-pre:text-[11px]",
  "[&_p]:whitespace-pre-wrap",
  "[&_li]:whitespace-pre-wrap",
  "[&_code]:whitespace-pre-wrap",
  "[&_p]:leading-5",
  "[&_li]:leading-5",
  "[&_ul]:pl-5",
  "[&_ol]:pl-5",
  "[&_ul]:my-1",
  "[&_ol]:my-1",
].join(" ");

export function MarkdownContent({ content, emptyMessage = "", className }: MarkdownContentProps) {
  const trimmed = content?.trim();

  if (!trimmed) {
    return emptyMessage ? <p className="text-xs text-slate-500">{emptyMessage}</p> : null;
  }

  const classes = className ? `${BASE_CLASSNAME} ${className}` : BASE_CLASSNAME;

  return (
    <div className={classes}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{trimmed}</ReactMarkdown>
    </div>
  );
}

