"use client";
import { useEffect, useState } from "react";

export function TagInput({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const [text, setText] = useState("");
  const [all, setAll] = useState<{ name: string; count: number }[]>([]);
  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then(setAll)
      .catch(() => {});
  }, []);

  const add = (raw: string) => {
    const t = raw.trim().replace(/^#/, "").replace(/\s+/g, "_");
    if (t && !value.includes(t)) onChange([...value, t]);
    setText("");
  };

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-md border border-stone-300 bg-white px-2 py-1.5 focus-within:border-accent">
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded bg-accent-soft px-1.5 py-0.5 text-xs text-accent">
          #{t}
          <button className="text-accent/60 hover:text-accent" onClick={() => onChange(value.filter((x) => x !== t))}>
            ×
          </button>
        </span>
      ))}
      <input
        className="min-w-24 flex-1 bg-transparent text-xs outline-none"
        list="tag-suggest"
        placeholder="태그 입력 후 Enter (예: 삼각함수_그래프)"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "," || e.key === " ") {
            if (e.nativeEvent.isComposing) return;
            e.preventDefault();
            add(text);
          } else if (e.key === "Backspace" && !text && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => text && add(text)}
      />
      <datalist id="tag-suggest">
        {all.filter((t) => !value.includes(t.name)).map((t) => (
          <option key={t.name} value={t.name} />
        ))}
      </datalist>
    </div>
  );
}
