"use client";
import { MathText } from "../MathText";
import { ProblemView, sourceLabel } from "../ProblemView";
import { PrintToolbar } from "./PrintToolbar";
import { CIRCLED, type ExamData, type ProblemData } from "@/lib/types";
import { useState } from "react";

export function answerLabel(p: ProblemData) {
  const a = (p.answer ?? "").trim();
  if (!a) return "-";
  if (p.type === "multiple" && /^[1-5]$/.test(a)) return CIRCLED[+a - 1];
  return a;
}

export function PrintAnswers({ exam }: { exam: ExamData }) {
  const [withProblem, setWithProblem] = useState(true);
  const [withMemo, setWithMemo] = useState(true);
  const items = exam.items;
  const rows = Math.ceil(items.length / 10);

  return (
    <>
      <style>{`@page { size: 210mm 297mm; margin: 14mm 14mm 16mm; }`}</style>
      <PrintToolbar title={`${exam.title} — 정답 및 해설`} hint="A4 · 인쇄 대화상자에서 '배경 그래픽'을 켜면 표 음영이 함께 인쇄됩니다.">
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" checked={withProblem} onChange={(e) => setWithProblem(e.target.checked)} /> 문제 포함
        </label>
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" checked={withMemo} onChange={(e) => setWithMemo(e.target.checked)} /> 내 메모·손글씨
        </label>
        <a className="btn" href={`/print/exam/${exam.id}`}>
          문제지
        </a>
      </PrintToolbar>

      <div className="sn-paper mx-auto my-8 bg-white p-[14mm] shadow print:m-0 print:p-0 print:shadow-none" style={{ width: "210mm" }}>
        <header className="mb-5 border-b-2 border-black pb-2 text-center">
          <div className="text-[10pt]">{exam.title}</div>
          <div className="text-[18pt] font-black tracking-[0.3em]">{exam.area} 정답 및 해설</div>
        </header>

        {/* 빠른 정답표 */}
        <h2 className="mb-2 text-[11pt] font-bold">■ 빠른 정답</h2>
        <table className="mb-6 w-full table-fixed border-collapse text-center text-[10pt]">
          <tbody>
            {Array.from({ length: rows }, (_, r) => {
              const slice = items.slice(r * 10, r * 10 + 10);
              return (
                <tr key={r}>
                  {Array.from({ length: 10 }, (_, c) => {
                    const it = slice[c];
                    const n = r * 10 + c + 1;
                    return (
                      <td key={c} className="border border-black p-0">
                        {it && (
                          <>
                            <div className="border-b border-black bg-stone-100 py-0.5 text-[9pt] font-bold">{n}</div>
                            <div className="py-1 font-semibold">{answerLabel(it.problem)}</div>
                            <div className="pb-0.5 text-[7.5pt] text-stone-500">{it.problem.points}점</div>
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* 해설 */}
        <h2 className="mb-3 text-[11pt] font-bold">■ 문항별 해설</h2>
        <div className="space-y-5">
          {items.map((it, i) => {
            const p = it.problem;
            return (
              <section key={it.problemId} className="break-inside-avoid-page border-t border-stone-400 pt-3">
                <div className="mb-2 flex flex-wrap items-baseline gap-2 text-[9pt]">
                  <b className="text-[12pt]">{i + 1}번</b>
                  <span>
                    정답 <b>{answerLabel(p)}</b>
                  </span>
                  <span className="text-stone-600">· {p.points}점 · {[p.unitMajor, p.unitMiddle, p.unitDetail].filter(Boolean).join(" › ")}</span>
                  {sourceLabel(p) && <span className="text-stone-500">· {sourceLabel(p)}</span>}
                  {(p.wrongCount ?? 0) > 0 && <span className="text-red-700">· 오답 {p.wrongCount}회</span>}
                </div>
                {withProblem && (
                  <div className="mb-2 rounded-sm bg-stone-50 p-3 print:border print:border-stone-300 print:bg-white" style={{ ["--sn-size" as string]: "9pt", maxWidth: "120mm" }}>
                    <ProblemView problem={p} number={i + 1} />
                  </div>
                )}
                <div className="sn-problem" style={{ ["--sn-size" as string]: "10pt" }}>
                  {p.explanation ? <MathText text={p.explanation} as="div" /> : <span className="text-stone-400">(저장된 해설이 없습니다)</span>}
                </div>
                {withMemo && (p.memo || p.handwriting) && (
                  <div className="mt-2 border-l-2 border-stone-500 pl-3 text-[9pt]">
                    {p.memo && (
                      <div>
                        <b>내 메모</b> · <MathText text={p.memo} />
                      </div>
                    )}
                    {p.handwriting && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.handwriting} alt="손글씨 풀이" className="mt-1 max-h-[70mm] grayscale" />
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
