"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { useCart } from "@/lib/cart";
import type { ExamData, ProblemData } from "@/lib/types";
import { ProblemView } from "@/components/ProblemView";

type ExamSummary = { id: string; title: string; count: number };

export default function CartPage() {
  const cart = useCart();
  const router = useRouter();
  const [probs, setProbs] = useState<Record<string, ProblemData>>({});
  const [title, setTitle] = useState("2028학년도 대비 나만의 모의고사");
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const key = cart.ids.join(",");

  useEffect(() => {
    if (!key) return setProbs({});
    api<{ items: ProblemData[] }>(`/api/problems?ids=${key}&limit=1000`).then((r) =>
      setProbs(Object.fromEntries(r.items.map((p) => [p.id!, p]))),
    );
  }, [key]);
  useEffect(() => {
    api<ExamSummary[]>("/api/exams").then(setExams).catch(() => {});
  }, []);

  const list = cart.ids.map((id) => probs[id]).filter(Boolean);
  const total = list.reduce((s, p) => s + p.points, 0);

  const create = async () => {
    setBusy(true);
    try {
      const r = await api<{ id: string }>("/api/exams", { method: "POST", json: { problemIds: cart.ids, title } });
      cart.clear();
      router.push(`/exams/${r.id}`);
    } finally {
      setBusy(false);
    }
  };

  const appendTo = async () => {
    if (!target) return;
    setBusy(true);
    try {
      const ex = await api<ExamData>(`/api/exams/${target}`);
      const have = new Set(ex.items.map((i) => i.problemId));
      const items = [
        ...ex.items.map((i) => ({ problemId: i.problemId, spacing: i.spacing, breakBefore: i.breakBefore })),
        ...cart.ids.filter((id) => !have.has(id)).map((id) => ({ problemId: id, spacing: (probs[id]?.points ?? 3) >= 4 ? 70 : 45, breakBefore: "none" })),
      ];
      await api(`/api/exams/${target}`, { method: "PUT", json: { ...ex, items } });
      cart.clear();
      router.push(`/exams/${target}`);
    } finally {
      setBusy(false);
    }
  };

  const move = (i: number, d: number) => {
    const next = [...cart.ids];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    cart.set(next);
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex items-center gap-2">
        <h1 className="text-lg font-semibold">시험지 장바구니</h1>
        <span className="text-sm text-ink-faint">
          {cart.ids.length}문항 · {total}점
        </span>
        {cart.ids.length > 0 && (
          <button className="btn btn-ghost btn-sm ml-auto" onClick={() => confirm("장바구니를 비울까요?") && cart.clear()}>
            비우기
          </button>
        )}
      </div>

      {cart.ids.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-soft">
          장바구니가 비었습니다. <Link className="text-accent underline" href="/problems">아카이브</Link>에서 `+ 시험지에 담기`를 누르거나{" "}
          <Link className="text-accent underline" href="/random">랜덤 모의고사</Link>를 생성하세요.
        </div>
      ) : (
        <>
          <div className="card mb-4 grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
            <div>
              <label className="label">새 시험지 제목</label>
              <div className="flex gap-2">
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
                <button className="btn btn-primary whitespace-nowrap" disabled={busy} onClick={create}>
                  시험지 만들기 →
                </button>
              </div>
            </div>
            <div>
              <label className="label">또는 기존 시험지에 추가</label>
              <div className="flex gap-2">
                <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
                  <option value="">시험지 선택</option>
                  {exams.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title} ({e.count}문항)
                    </option>
                  ))}
                </select>
                <button className="btn whitespace-nowrap" disabled={!target || busy} onClick={appendTo}>
                  추가
                </button>
              </div>
            </div>
          </div>
          <ol className="space-y-2">
            {cart.ids.map((id, i) => {
              const p = probs[id];
              return (
                <li key={id} className="card flex gap-3 p-3">
                  <div className="flex w-10 flex-none flex-col items-center gap-1">
                    <span className="text-lg font-bold">{i + 1}</span>
                    <button className="btn btn-ghost btn-sm px-1" onClick={() => move(i, -1)}>
                      ▲
                    </button>
                    <button className="btn btn-ghost btn-sm px-1" onClick={() => move(i, 1)}>
                      ▼
                    </button>
                  </div>
                  <div className="min-w-0 flex-1">
                    {p ? (
                      <>
                        <div className="mb-1 text-[11px] text-ink-faint">
                          원 {p.sourceNumber ?? "-"}번 · {p.points}점 · {p.unitMiddle || "미분류"}
                        </div>
                        <div style={{ maxWidth: "110mm", ["--sn-size" as string]: "9.5pt" }}>
                          <ProblemView problem={p} number={i + 1} />
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-ink-faint">삭제되었거나 불러오는 중인 문항</span>
                    )}
                  </div>
                  <button className="btn btn-ghost btn-sm self-start" onClick={() => cart.remove(id)}>
                    ✕
                  </button>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}
