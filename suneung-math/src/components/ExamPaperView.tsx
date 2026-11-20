"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ProblemView } from "./ProblemView";
import type { ExamData } from "@/lib/types";

/** 용지 규격 (mm) */
export const PAPER = {
  B4: { w: 257, h: 364, top: 14, bottom: 13, side: 16, gap: 12, head1: 42, head: 17, foot: 11, font: "10.5pt" },
  A4: { w: 210, h: 297, top: 11, bottom: 10, side: 13, gap: 9, head1: 34, head: 14, foot: 9, font: "8.8pt" },
} as const;

const MM = 96 / 25.4; // 1mm → px (CSS 기준)

type Page = { cols: [number[], number[]] };

export function paginate(heightsMm: number[], breaks: string[], firstColH: number, colH: number): Page[] {
  const pages: Page[] = [{ cols: [[], []] }];
  let page = 0;
  let col = 0;
  let used = 0;
  const cap = () => (page === 0 ? firstColH : colH);
  const nextCol = () => {
    if (col === 0) col = 1;
    else {
      pages.push({ cols: [[], []] });
      page++;
      col = 0;
    }
    used = 0;
  };
  heightsMm.forEach((h, i) => {
    const cur = pages[page].cols[col];
    if (breaks[i] === "page" && (pages[page].cols[0].length || pages[page].cols[1].length)) {
      pages.push({ cols: [[], []] });
      page++;
      col = 0;
      used = 0;
    } else if (breaks[i] === "column" && cur.length) {
      nextCol();
    } else if (used + h > cap() + 0.5 && cur.length) {
      nextCol();
    }
    pages[page].cols[col].push(i);
    used += h;
  });
  return pages;
}

export function ExamPaperView({
  exam,
  zoom = 1,
  selected,
  onSelect,
  onLayout,
}: {
  exam: ExamData;
  zoom?: number;
  selected?: number | null;
  onSelect?: (index: number) => void;
  onLayout?: (info: { pages: number; overflow: number[] }) => void;
}) {
  const g = PAPER[exam.paperSize] ?? PAPER.B4;
  const colW = (g.w - g.side * 2 - g.gap) / 2;
  const firstColH = g.h - g.top - g.head1 - g.foot - g.bottom;
  const colH = g.h - g.top - g.head - g.foot - g.bottom;

  const measureRef = useRef<HTMLDivElement>(null);
  const [heights, setHeights] = useState<number[]>([]);

  const measure = useCallback(() => {
    const root = measureRef.current;
    if (!root) return;
    const hs = Array.from(root.children).map((el) => (el as HTMLElement).getBoundingClientRect().height / MM);
    setHeights((prev) => (prev.length === hs.length && prev.every((v, i) => Math.abs(v - hs[i]) < 0.2) ? prev : hs));
  }, []);

  useLayoutEffect(measure, [exam, measure]);
  useEffect(() => {
    const root = measureRef.current;
    if (!root) return;
    const ro = new ResizeObserver(() => measure());
    Array.from(root.children).forEach((c) => ro.observe(c));
    window.addEventListener("sn-fonts-changed", measure);
    document.fonts?.ready.then(measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("sn-fonts-changed", measure);
    };
  }, [exam, measure]);

  const pages = useMemo(
    () =>
      heights.length === exam.items.length
        ? paginate(heights, exam.items.map((i) => i.breakBefore), firstColH, colH)
        : [{ cols: [[], []] as [number[], number[]] }],
    [heights, exam.items, firstColH, colH],
  );

  const overflow = useMemo(
    () => heights.map((h, i) => (h > colH + 0.5 ? i : -1)).filter((i) => i >= 0),
    [heights, colH],
  );
  useEffect(() => {
    onLayout?.({ pages: pages.length, overflow });
  }, [pages.length, overflow, onLayout]);

  const totalPoints = exam.items.reduce((s, it) => s + (it.problem.points || 0), 0);

  const renderItem = (i: number, inMeasure = false) => {
    const it = exam.items[i];
    return (
      <div
        key={(it.id ?? it.problemId) + (inMeasure ? "-m" : "")}
        className={`sn-item ${!inMeasure && onSelect ? "cursor-pointer" : ""} ${
          !inMeasure && selected === i ? "outline outline-2 outline-offset-2 outline-sky-400 print:outline-none" : ""
        }`}
        style={{
          paddingBottom: `${it.spacing}mm`,
          flex: exam.distribute && !inMeasure ? "1 1 auto" : "none",
        }}
        onClick={!inMeasure && onSelect ? () => onSelect(i) : undefined}
      >
        <ProblemView problem={it.problem} number={i + 1} showSource={exam.showSource} />
      </div>
    );
  };

  return (
    <>
      {/* 높이 측정용 숨김 영역 (줌 영향 없음) */}
      <div
        ref={measureRef}
        aria-hidden
        className="sn-paper no-print"
        style={{
          position: "absolute",
          left: -20000,
          top: 0,
          width: `${colW}mm`,
          visibility: "hidden",
          ["--sn-size" as string]: g.font,
        }}
      >
        {exam.items.map((_, i) => renderItem(i, true))}
      </div>

      <div className="print-zoom-reset flex flex-col items-center gap-6" style={{ zoom }}>
        {pages.map((pg, pi) => {
          const first = pi === 0;
          const headH = first ? g.head1 : g.head;
          const bodyTop = g.top + headH;
          const bodyH = first ? firstColH : colH;
          const pageNo = pi + 1;
          const isLast = pi === pages.length - 1;
          return (
            <div
              key={pi}
              className="sn-page sn-paper"
              style={{ width: `${g.w}mm`, height: `${g.h}mm`, ["--sn-size" as string]: g.font }}
            >
              {/* 머리말 */}
              <div
                className="absolute"
                style={{ left: `${g.side}mm`, right: `${g.side}mm`, top: `${g.top}mm`, height: `${headH - 3}mm` }}
              >
                {first ? (
                  <div className="flex h-full flex-col justify-end border-b-[2.5px] border-black pb-[2mm]">
                    <div className="sn-head-title text-center" style={{ fontSize: exam.paperSize === "B4" ? "13pt" : "11pt" }}>
                      {exam.title}
                    </div>
                    <div className="relative mt-[3mm] flex items-end justify-center">
                      <span className="sn-period absolute left-0 bottom-[1mm]" style={{ fontSize: exam.paperSize === "B4" ? "12pt" : "10pt" }}>
                        {exam.period}
                      </span>
                      <span className="sn-area" style={{ fontSize: exam.paperSize === "B4" ? "26pt" : "21pt" }}>
                        {exam.area}
                      </span>
                      <span className="absolute right-0 bottom-0 font-black" style={{ fontSize: exam.paperSize === "B4" ? "24pt" : "19pt" }}>
                        {pageNo}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="relative flex h-full items-end justify-center border-b-[1.6px] border-black pb-[1.5mm]">
                    <span
                      className={`absolute bottom-[1mm] font-black ${pageNo % 2 === 0 ? "left-0" : "right-0"}`}
                      style={{ fontSize: exam.paperSize === "B4" ? "20pt" : "16pt" }}
                    >
                      {pageNo}
                    </span>
                    <span className="sn-area" style={{ fontSize: exam.paperSize === "B4" ? "14pt" : "11.5pt" }}>
                      {exam.area}
                    </span>
                  </div>
                )}
              </div>

              {/* 2단 본문 */}
              {[0, 1].map((c) => (
                <div
                  key={c}
                  className="absolute flex flex-col"
                  style={{
                    left: `${g.side + c * (colW + g.gap)}mm`,
                    width: `${colW}mm`,
                    top: `${bodyTop}mm`,
                    height: `${bodyH}mm`,
                    overflow: "hidden",
                  }}
                >
                  {pg.cols[c].map((i) => renderItem(i))}
                </div>
              ))}
              <div
                className="sn-colline"
                style={{ left: `${g.w / 2}mm`, top: `${bodyTop - 1}mm`, height: `${bodyH + 1}mm` }}
              />

              {/* 꼬리말 */}
              <div
                className="absolute flex flex-col items-center justify-end"
                style={{ left: `${g.side}mm`, right: `${g.side}mm`, bottom: `${g.bottom}mm`, height: `${g.foot}mm`, fontSize: "8pt" }}
              >
                {isLast && exam.footer && <div className="mb-[1mm] font-semibold">{exam.footer}</div>}
                <div className="flex w-full items-center justify-center border-t border-black pt-[1mm] text-[7.5pt]">
                  <span>
                    {pageNo} / {pages.length}
                  </span>
                  {isLast && <span className="absolute right-0">총 {exam.items.length}문항 · {totalPoints}점</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/** 인쇄 시 용지 크기를 @page로 지정 */
export function PageSizeStyle({ size }: { size: "B4" | "A4" }) {
  const g = PAPER[size];
  return <style>{`@page { size: ${g.w}mm ${g.h}mm; margin: 0; }`}</style>;
}
