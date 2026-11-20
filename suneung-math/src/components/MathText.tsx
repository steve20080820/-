"use client";
import { memo, useMemo } from "react";
import { renderMath } from "@/lib/math";

function MathTextImpl({ text, className, as = "span" }: { text: string; className?: string; as?: "span" | "div" }) {
  const html = useMemo(() => renderMath(text), [text]);
  const Tag = as;
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

export const MathText = memo(MathTextImpl);
