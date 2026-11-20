"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

type ExamSummary = { id: string; title: string; paperSize: string; count: number; totalPoints: number; updatedAt: string };

export default function ExamsPage() {
  const [list, setList] = useState<ExamSummary[] | null>(null);
  const load = () => api<ExamSummary[]>("/api/exams").then(setList);
  useEffect(() => {
    load();
  }, []);
  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex items-center gap-2">
        <h1 className="text-lg font-semibold">내 시험지</h1>
        <Link href="/cart" className="btn btn-primary btn-sm ml-auto">
          장바구니에서 새로 만들기
        </Link>
      </div>
      {list?.length === 0 && <div className="card p-10 text-center text-sm text-ink-soft">아직 만든 시험지가 없습니다.</div>}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {list?.map((e) => (
          <div key={e.id} className="card flex flex-col gap-3 p-4">
            <Link href={`/exams/${e.id}`} className="font-serif text-base font-semibold hover:text-accent">
              {e.title}
            </Link>
            <div className="text-xs text-ink-faint">
              {e.paperSize} · {e.count}문항 · {e.totalPoints}점 · {new Date(e.updatedAt).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" })}
            </div>
            <div className="flex gap-2">
              <Link className="btn btn-sm btn-primary" href={`/exams/${e.id}`}>
                편집
              </Link>
              <a className="btn btn-sm" href={`/print/exam/${e.id}`} target="_blank">
                문제지 인쇄
              </a>
              <a className="btn btn-sm" href={`/print/answers/${e.id}`} target="_blank">
                정답·해설지
              </a>
              <button
                className="btn btn-ghost btn-sm ml-auto text-red-600"
                onClick={async () => {
                  if (!confirm(`'${e.title}' 시험지를 삭제할까요? (문제는 유지됩니다)`)) return;
                  await api(`/api/exams/${e.id}`, { method: "DELETE" });
                  load();
                }}
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
