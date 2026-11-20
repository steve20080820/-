"use client";

export function Stars({ value, onChange, label }: { value: number; onChange?: (v: number) => void; label?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-sm" title={label}>
      {label && <span className="mr-1 text-[11px] text-ink-faint">{label}</span>}
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={`${n <= value ? "text-amber-500" : "text-stone-300"} ${onChange ? "hover:scale-110" : "cursor-default"}`}
        >
          ★
        </button>
      ))}
    </span>
  );
}
