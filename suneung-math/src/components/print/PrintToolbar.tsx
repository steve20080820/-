"use client";

export function PrintToolbar({ title, hint, children }: { title: string; hint: string; children?: React.ReactNode }) {
  return (
    <div className="no-print sticky top-0 z-20 flex items-center gap-3 border-b border-stone-300 bg-white/95 px-5 py-2.5 text-sm shadow-sm backdrop-blur">
      <b className="font-serif">{title}</b>
      <span className="text-xs text-ink-faint">{hint}</span>
      <div className="ml-auto flex items-center gap-2">
        {children}
        <button className="btn btn-primary" onClick={() => window.print()}>
          🖨 인쇄 / PDF 저장
        </button>
      </div>
    </div>
  );
}
