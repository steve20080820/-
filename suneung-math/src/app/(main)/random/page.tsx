"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { useCart } from "@/lib/cart";
import { NUMBER_BUCKETS, UNITS_2028 } from "@/lib/units";
import type { ProblemData } from "@/lib/types";
import { ProblemView } from "@/components/ProblemView";

type Cond = {
  unitMajor: string;
  unitMiddle: string;
  numMin: string;
  numMax: string;
  points: string;
  type: "" | "multiple" | "short";
  wrongOnly: boolean;
  count: number;
};
const blank = (): Cond => ({ unitMajor: "", unitMiddle: "", numMin: "", numMax: "", points: "", type: "", wrongOnly: false, count: 3 });

const PRESETS: { label: string; conds: Partial<Cond>[] }[] = [
  {
    label: "미적분Ⅰ 4점 5개 + 대수 준킬러(16~20번) 2개",
    conds: [
      { unitMajor: "미적분Ⅰ", points: "4", count: 5 },
      { unitMajor: "대수", numMin: "16", numMax: "20", count: 2 },
    ],
  },
  {
    label: "킬러 세트 (21·30번 + 준킬러)",
    conds: [
      { numMin: "21", numMax: "21", count: 1 },
      { numMin: "30", numMax: "30", count: 1 },
      { numMin: "16", numMax: "20", count: 2 },
      { numMin: "27", numMax: "29", count: 2 },
    ],
  },
  { label: "오답 복습 10문항", conds: [{ wrongOnly: true, count: 10 }] },
  {
    label: "단원 골고루 (각 3문항)",
    conds: UNITS_2028.map((u) => ({ unitMajor: u.name, count: 3 })),
  },
];

export default function RandomPage() {
  const router = useRouter();
  const cart = useCart();
  const [conds, setConds] = useState<Cond[]>([blank()]);
  const [sortBy, setSortBy] = useState("number");
  const [title, setTitle] = useState("랜덤 모의고사");
  const [result, setResult] = useState<{ items: ProblemData[]; groups: { requested: number; picked: number; available: number }[] } | null>(null);
  const [busy, setBusy] = useState(false);

  const patch = (i: number, p: Partial<Cond>) => setConds((c) => c.map((x, j) => (j === i ? { ...x, ...p } : x)));

  const generate = async () => {
    setBusy(true);
    try {
      const r = await api<{ ids: string[]; groups: { requested: number; picked: number; available: number }[] }>("/api/random", {
        method: "POST",
        json: {
          sortBy,
          conditions: conds.map((c) => ({
            unitMajor: c.unitMajor,
            unitMiddle: c.unitMiddle,
            numMin: c.numMin ? +c.numMin : null,
            numMax: c.numMax ? +c.numMax : null,
            points: c.points ? +c.points : null,
            type: c.type,
            wrongOnly: c.wrongOnly,
            count: c.count,
          })),
        },
      });
      const list = r.ids.length ? (await api<{ items: ProblemData[] }>(`/api/problems?ids=${r.ids.join(",")}&limit=1000`)).items : [];
      const byId = new Map(list.map((p) => [p.id, p]));
      setResult({ items: r.ids.map((id) => byId.get(id)!).filter(Boolean), groups: r.groups });
    } finally {
      setBusy(false);
    }
  };

  const toExam = async () => {
    if (!result?.items.length) return;
    const r = await api<{ id: string }>("/api/exams", { method: "POST", json: { problemIds: result.items.map((p) => p.id), title } });
    router.push(`/exams/${r.id}`);
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="mb-1 text-lg font-semibold">조건부 랜덤 모의고사 생성기</h1>
      <p className="mb-4 text-sm text-ink-soft">단원·번호·배점 조건을 줄 단위로 조합하면 중복 없이 문항을 뽑아 시험지로 만들어 줍니다.</p>

      <div className="mb-3 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button key={p.label} className="chip" onClick={() => setConds(p.conds.map((c) => ({ ...blank(), ...c })))}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="card divide-y">
        {conds.map((c, i) => {
          const middles = UNITS_2028.find((u) => u.name === c.unitMajor)?.children ?? [];
          return (
            <div key={i} className="flex flex-wrap items-end gap-2 p-3 text-sm">
              <span className="pb-2 text-xs font-semibold text-ink-faint">조건 {i + 1}</span>
              <div>
                <label className="label">대단원</label>
                <select className="input w-32" value={c.unitMajor} onChange={(e) => patch(i, { unitMajor: e.target.value, unitMiddle: "" })}>
                  <option value="">전체</option>
                  {UNITS_2028.map((u) => (
                    <option key={u.name}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">중단원</label>
                <select className="input w-44" value={c.unitMiddle} onChange={(e) => patch(i, { unitMiddle: e.target.value })} disabled={!c.unitMajor}>
                  <option value="">전체</option>
                  {middles.map((m) => (
                    <option key={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">번호 구간</label>
                <div className="flex items-center gap-1">
                  <input className="input w-14" placeholder="1" value={c.numMin} onChange={(e) => patch(i, { numMin: e.target.value })} />~
                  <input className="input w-14" placeholder="30" value={c.numMax} onChange={(e) => patch(i, { numMax: e.target.value })} />
                  <select
                    className="input w-28 text-xs"
                    value=""
                    onChange={(e) => {
                      const b = NUMBER_BUCKETS.find((x) => x.key === e.target.value);
                      if (b) patch(i, { numMin: String(b.min), numMax: String(b.max) });
                    }}
                  >
                    <option value="">구간 프리셋</option>
                    {NUMBER_BUCKETS.map((b) => (
                      <option key={b.key} value={b.key}>
                        {b.min === b.max ? `${b.min}번` : `${b.min}~${b.max}`} {b.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">배점</label>
                <select className="input w-20" value={c.points} onChange={(e) => patch(i, { points: e.target.value })}>
                  <option value="">전체</option>
                  <option value="2">2점</option>
                  <option value="3">3점</option>
                  <option value="4">4점</option>
                </select>
              </div>
              <div>
                <label className="label">유형</label>
                <select className="input w-24" value={c.type} onChange={(e) => patch(i, { type: e.target.value as Cond["type"] })}>
                  <option value="">전체</option>
                  <option value="multiple">객관식</option>
                  <option value="short">단답형</option>
                </select>
              </div>
              <label className="flex items-center gap-1 pb-2 text-xs">
                <input type="checkbox" checked={c.wrongOnly} onChange={(e) => patch(i, { wrongOnly: e.target.checked })} />
                틀린 문제만
              </label>
              <div>
                <label className="label">개수</label>
                <input className="input w-16" type="number" min={1} max={30} value={c.count} onChange={(e) => patch(i, { count: +e.target.value })} />
              </div>
              <button className="btn btn-ghost btn-sm mb-1" onClick={() => setConds((cs) => cs.filter((_, j) => j !== i))} disabled={conds.length === 1}>
                ✕
              </button>
              {result?.groups[i] && result.groups[i].picked < result.groups[i].requested && (
                <span className="w-full text-xs text-amber-700">
                  ⚠ 조건에 맞는 문항이 {result.groups[i].available}개뿐이라 {result.groups[i].picked}개만 뽑았습니다.
                </span>
              )}
            </div>
          );
        })}
        <div className="flex flex-wrap items-center gap-2 p-3">
          <button className="btn btn-sm" onClick={() => setConds((c) => [...c, blank()])}>
            + 조건 추가
          </button>
          <span className="ml-auto text-xs text-ink-soft">정렬</span>
          <select className="input w-36 py-1 text-xs" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="number">원 번호순(쉬운→어려운)</option>
            <option value="points">배점순</option>
            <option value="random">무작위</option>
          </select>
          <button className="btn btn-primary" disabled={busy} onClick={generate}>
            ⚄ 생성
          </button>
        </div>
      </div>

      {result && (
        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">결과 {result.items.length}문항 · {result.items.reduce((s, p) => s + p.points, 0)}점</h2>
            <input className="input ml-auto w-64" value={title} onChange={(e) => setTitle(e.target.value)} />
            <button className="btn" onClick={generate}>
              다시 뽑기
            </button>
            <button className="btn" onClick={() => cart.add(result.items.map((p) => p.id!))} disabled={!result.items.length}>
              장바구니에 담기
            </button>
            <button className="btn btn-primary" onClick={toExam} disabled={!result.items.length}>
              시험지로 만들기 →
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {result.items.map((p, i) => (
              <div key={p.id} className="card p-4">
                <div className="mb-1 text-[11px] text-ink-faint">
                  원 {p.sourceNumber ?? "-"}번 · {p.unitMiddle} · {p.points}점
                </div>
                <div style={{ ["--sn-size" as string]: "9.5pt" }}>
                  <ProblemView problem={p} number={i + 1} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
