"use client";
import { useEffect, useRef, useState } from "react";

/** 실제 mm 폭의 지면을 부모 폭에 맞게 축소해서 보여줌 (조판 비율 유지) */
export function FitWidth({ widthMm, children }: { widthMm: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = (widthMm * 96) / 25.4;
    const ro = new ResizeObserver(() => setZoom(Math.min(1, el.clientWidth / target)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [widthMm]);
  return (
    <div ref={ref} className="w-full">
      <div style={{ width: `${widthMm}mm`, zoom }}>{children}</div>
    </div>
  );
}
