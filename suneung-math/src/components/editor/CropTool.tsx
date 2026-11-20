"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Rect = { x: number; y: number; w: number; h: number };

/** 그레이스케일 + 레벨/대비 보정 (시험지 인쇄용 고대비 흑백) */
export function toPrintGray(ctx: CanvasRenderingContext2D, w: number, h: number, contrast: number, whiten: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const white = 255 - whiten; // 이 값 이상은 순백으로
  const black = 40;
  for (let i = 0; i < d.length; i += 4) {
    let v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    v = ((v - black) / Math.max(1, white - black)) * 255; // 레벨
    v = (v - 128) * contrast + 128; // 대비
    v = v < 0 ? 0 : v > 255 ? 255 : v;
    // 투명 배경은 흰색으로
    const a = d[i + 3] / 255;
    v = v * a + 255 * (1 - a);
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

export function CropTool({
  src,
  onClose,
  onDone,
}: {
  src: string;
  onClose: () => void;
  onDone: (dataUrl: string) => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [sel, setSel] = useState<Rect | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [gray, setGray] = useState(true);
  const [contrast, setContrast] = useState(1.4);
  const [whiten, setWhiten] = useState(45);

  const pos = (e: React.PointerEvent) => {
    const r = imgRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(r.width, e.clientX - r.left)),
      y: Math.max(0, Math.min(r.height, e.clientY - r.top)),
    };
  };

  const render = useCallback(() => {
    const img = imgRef.current;
    const cv = previewRef.current;
    if (!img || !cv || !img.naturalWidth) return null;
    const scale = img.naturalWidth / img.getBoundingClientRect().width;
    const r = sel && sel.w > 4 && sel.h > 4 ? sel : { x: 0, y: 0, w: img.getBoundingClientRect().width, h: img.getBoundingClientRect().height };
    const sx = Math.round(r.x * scale);
    const sy = Math.round(r.y * scale);
    const sw = Math.max(1, Math.round(r.w * scale));
    const sh = Math.max(1, Math.round(r.h * scale));
    cv.width = sw;
    cv.height = sh;
    const ctx = cv.getContext("2d", { willReadFrequently: true })!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, sw, sh);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    if (gray) toPrintGray(ctx, sw, sh, contrast, whiten);
    return cv;
  }, [sel, gray, contrast, whiten]);

  useEffect(() => {
    render();
  }, [render]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={onClose}>
      <div className="card flex max-h-full w-full max-w-6xl flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <div className="font-semibold">도형·그래프 영역 크롭</div>
            <div className="text-xs text-ink-faint">원본 이미지에서 도형 부분을 드래그해 선택하세요. 선택하지 않으면 전체가 사용됩니다.</div>
          </div>
          <button className="btn btn-ghost" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-auto p-4 md:grid-cols-[3fr_2fr]">
          <div className="relative select-none self-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={imgRef} src={src} alt="원본" className="block w-full" draggable={false} onLoad={() => render()} crossOrigin="anonymous" />
            <div
              className="absolute inset-0 cursor-crosshair touch-none"
              onPointerDown={(e) => {
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                const p = pos(e);
                setDrag(p);
                setSel({ x: p.x, y: p.y, w: 0, h: 0 });
              }}
              onPointerMove={(e) => {
                if (!drag) return;
                const p = pos(e);
                setSel({ x: Math.min(p.x, drag.x), y: Math.min(p.y, drag.y), w: Math.abs(p.x - drag.x), h: Math.abs(p.y - drag.y) });
              }}
              onPointerUp={() => setDrag(null)}
            >
              {sel && sel.w > 0 && (
                <div
                  className="absolute border-2 border-sky-500 bg-sky-400/10"
                  style={{ left: sel.x, top: sel.y, width: sel.w, height: sel.h, boxShadow: "0 0 0 9999px rgba(0,0,0,.35)" }}
                />
              )}
            </div>
          </div>
          <div className="space-y-3">
            <div className="label">미리보기 (인쇄용)</div>
            <div className="flex min-h-32 items-center justify-center rounded border bg-white p-2">
              <canvas ref={previewRef} className="max-h-72 max-w-full" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={gray} onChange={(e) => setGray(e.target.checked)} />
              고대비 흑백 필터 (Grayscale + Contrast)
            </label>
            {gray && (
              <>
                <label className="block text-xs text-ink-soft">
                  대비 {contrast.toFixed(1)}
                  <input type="range" min={1} max={3} step={0.1} value={contrast} onChange={(e) => setContrast(+e.target.value)} className="w-full" />
                </label>
                <label className="block text-xs text-ink-soft">
                  배경 지우기(흰색 레벨) {whiten}
                  <input type="range" min={0} max={120} step={5} value={whiten} onChange={(e) => setWhiten(+e.target.value)} className="w-full" />
                </label>
              </>
            )}
            <div className="flex gap-2 pt-2">
              <button className="btn" onClick={() => setSel(null)}>
                선택 해제
              </button>
              <button
                className="btn btn-primary flex-1"
                onClick={() => {
                  const cv = render();
                  if (cv) onDone(cv.toDataURL("image/png"));
                }}
              >
                도형으로 첨부
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
