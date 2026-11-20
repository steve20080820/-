"use client";
import { MathText } from "./MathText";
import { visualLength } from "@/lib/math";
import { BOGI_LABELS, CIRCLED, type ChoiceLayout, type ProblemData } from "@/lib/types";

export function resolveLayout(choices: string[], layout: ChoiceLayout): Exclude<ChoiceLayout, "auto"> {
  if (layout !== "auto") return layout;
  const max = Math.max(0, ...choices.map(visualLength));
  if (max <= 10) return "row";
  if (max <= 20) return "grid";
  return "column";
}

export function sourceLabel(p: Pick<ProblemData, "sourceYear" | "sourceMonth" | "sourceOrg" | "sourceName" | "sourceNumber">) {
  const parts: string[] = [];
  if (p.sourceYear) parts.push(`${p.sourceYear}`);
  if (p.sourceMonth) parts.push(`${p.sourceMonth}월`);
  if (p.sourceOrg) parts.push(p.sourceOrg);
  if (p.sourceName) parts.push(p.sourceName);
  if (p.sourceNumber) parts.push(`${p.sourceNumber}번`);
  return parts.join(" ");
}

/** 2028 수능 예시문항 스타일 한 문항 조판 */
export function ProblemView({
  problem: p,
  number,
  showSource = false,
  className = "",
}: {
  problem: ProblemData;
  number?: number | string | null;
  showSource?: boolean;
  className?: string;
}) {
  const layout = resolveLayout(p.choices, p.choiceLayout);
  const num = number ?? p.sourceNumber;
  const pointsTag = p.points ? `[${p.points}점]` : "";

  return (
    <div className={`sn-problem ${className}`}>
      <div className="sn-body">
        {num != null && num !== "" && <span className="sn-num">{num}.</span>}
        <MathText text={p.body || " "} className="sn-text" />
        {pointsTag && <span className="sn-points">{pointsTag}</span>}
      </div>

      {p.figureImage && (
        <div className={`sn-figure ${p.figureAlign === "right" ? "sn-figure-right" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.figureImage} alt="도형" style={{ width: `${p.figureWidth}%` }} />
        </div>
      )}

      {p.bogi.length > 0 && (
        <div className="sn-bogi">
          <span className="sn-bogi-label">〈보 기〉</span>
          {p.bogi.map((b, i) => (
            <div key={i} className="sn-bogi-item">
              <span className="sn-bogi-key">{BOGI_LABELS[i] ?? "·"}.</span>
              <MathText text={b} />
            </div>
          ))}
        </div>
      )}

      {p.type === "multiple" && p.choices.some((c) => c.trim() !== "") && (
        <div className={`sn-choices sn-choices-${layout}`}>
          {p.choices.map((c, i) => (
            <div key={i} className="sn-choice">
              <span className="sn-circle">{CIRCLED[i]}</span>
              <MathText text={c} />
            </div>
          ))}
        </div>
      )}

      {showSource && sourceLabel(p) && <div className="sn-source">[{sourceLabel(p)}]</div>}
    </div>
  );
}
