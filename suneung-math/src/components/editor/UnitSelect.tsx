"use client";
import { detailsOf, middlesOf, unitTree } from "@/lib/units";
import type { ProblemData } from "@/lib/types";

type V = Pick<ProblemData, "curriculum" | "unitMajor" | "unitMiddle" | "unitDetail">;

export function UnitSelect({ value: v, onChange }: { value: V; onChange: (patch: Partial<V>) => void }) {
  const majors = unitTree(v.curriculum);
  const middles = middlesOf(v.curriculum, v.unitMajor);
  const details = detailsOf(v.curriculum, v.unitMajor, v.unitMiddle);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="label mb-0">단원 (대단원 › 중단원 › 세부유형)</label>
        <select
          className="rounded border border-stone-300 bg-white px-1 py-0.5 text-[11px]"
          value={v.curriculum}
          onChange={(e) => onChange({ curriculum: e.target.value, unitMajor: "", unitMiddle: "", unitDetail: "" })}
        >
          <option value="2028">2028 수능 체제</option>
          <option value="2015">2015 개정(호환)</option>
        </select>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <select className="input" value={v.unitMajor} onChange={(e) => onChange({ unitMajor: e.target.value, unitMiddle: "", unitDetail: "" })}>
          <option value="">대단원</option>
          {majors.map((m) => (
            <option key={m.name}>{m.name}</option>
          ))}
          {v.unitMajor && !majors.some((m) => m.name === v.unitMajor) && <option>{v.unitMajor}</option>}
        </select>
        <select className="input" value={v.unitMiddle} onChange={(e) => onChange({ unitMiddle: e.target.value, unitDetail: "" })}>
          <option value="">중단원</option>
          {middles.map((m) => (
            <option key={m.name}>{m.name}</option>
          ))}
          {v.unitMiddle && !middles.some((m) => m.name === v.unitMiddle) && <option>{v.unitMiddle}</option>}
        </select>
        <input
          className="input"
          list="unit-detail-list"
          placeholder="세부유형"
          value={v.unitDetail}
          onChange={(e) => onChange({ unitDetail: e.target.value })}
        />
        <datalist id="unit-detail-list">
          {details.map((d) => (
            <option key={d.name} value={d.name} />
          ))}
        </datalist>
      </div>
    </div>
  );
}
