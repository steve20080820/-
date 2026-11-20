"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, downscale, fileToDataUrl, uploadDataUrl } from "@/lib/client";
import type { ProblemData } from "@/lib/types";
import { ProblemView } from "./ProblemView";

type Log = { id: string; correct: boolean; timeSec: number | null; note: string | null; solvedAt: string };

/** 오답 관리 & 회독 트래킹 + 손글씨 풀이 + 유사 문항 */
export function StudyPanel({ problem }: { problem: ProblemData }) {
  const router = useRouter();
  const [logs, setLogs] = useState<Log[]>([]);
  const [similar, setSimilar] = useState<(ProblemData & { score: number })[]>([]);
  const [note, setNote] = useState("");
  const [minutes, setMinutes] = useState("");
  const [hw, setHw] = useState(problem.handwriting ?? null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const r = await api<{ solveLogs: Log[] }>(`/api/problems/${problem.id}`);
    setLogs(r.solveLogs);
  }, [problem.id]);

  useEffect(() => {
    load();
    api<(ProblemData & { score: number })[]>(`/api/problems/${problem.id}/similar`).then(setSimilar).catch(() => {});
  }, [load, problem.id]);

  const record = async (correct: boolean) => {
    await api(`/api/problems/${problem.id}/solve`, {
      method: "POST",
      json: { correct, note, timeSec: minutes ? Math.round(parseFloat(minutes) * 60) : undefined },
    });
    setNote("");
    setMinutes("");
    await load();
    router.refresh();
  };

  const delLog = async (id: string) => {
    await api(`/api/problems/${problem.id}/solve?logId=${id}`, { method: "DELETE" });
    await load();
    router.refresh();
  };

  const uploadHw = async (f: File) => {
    const url = await uploadDataUrl(await downscale(await fileToDataUrl(f), 2400));
    await api(`/api/problems/${problem.id}`, { method: "PATCH", json: { handwriting: url } });
    setHw(url);
  };

  const wrong = logs.filter((l) => !l.correct).length;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <section className="card p-4">
        <h2 className="mb-3 text-sm font-semibold">회독 · 오답 기록</h2>
        <div className="mb-3 grid grid-cols-3 gap-2 text-center">
          <Stat label="풀이" value={logs.length} />
          <Stat label="틀림" value={wrong} tone={wrong ? "red" : undefined} />
          <Stat label="마지막" value={logs[0] ? new Date(logs[0].solvedAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }) : "-"} />
        </div>
        <div className="mb-2 flex gap-2">
          <input className="input w-24" placeholder="소요(분)" value={minutes} onChange={(e) => setMinutes(e.target.value)} inputMode="decimal" />
          <input className="input flex-1" placeholder="메모 (선택)" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button className="btn flex-1 border-emerald-300 text-emerald-700" onClick={() => record(true)}>
            ○ 맞음
          </button>
          <button className="btn flex-1 border-red-300 text-red-600" onClick={() => record(false)}>
            ✕ 틀림
          </button>
        </div>
        <ul className="mt-3 max-h-56 space-y-1 overflow-auto text-xs">
          {logs.map((l) => (
            <li key={l.id} className="group flex items-center gap-2 rounded px-1 py-0.5 hover:bg-stone-50">
              <span className={l.correct ? "text-emerald-600" : "text-red-600"}>{l.correct ? "○" : "✕"}</span>
              <span className="text-ink-faint">{new Date(l.solvedAt).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" })}</span>
              {l.timeSec != null && <span className="text-ink-soft">{Math.round(l.timeSec / 6) / 10}분</span>}
              <span className="flex-1 truncate">{l.note}</span>
              <button className="invisible text-ink-faint group-hover:visible" onClick={() => delLog(l.id)}>
                ✕
              </button>
            </li>
          ))}
          {logs.length === 0 && <li className="text-ink-faint">아직 풀이 기록이 없습니다.</li>}
        </ul>
      </section>

      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">내 손글씨 풀이</h2>
          <div className="flex gap-1">
            <button className="btn btn-sm" onClick={() => fileRef.current?.click()}>
              {hw ? "교체" : "이미지 첨부"}
            </button>
            {hw && (
              <button
                className="btn btn-ghost btn-sm text-red-600"
                onClick={async () => {
                  await api(`/api/problems/${problem.id}`, { method: "PATCH", json: { handwriting: null } });
                  setHw(null);
                }}
              >
                제거
              </button>
            )}
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadHw(e.target.files[0])} />
        {hw ? (
          // eslint-disable-next-line @next/next/no-img-element
          <a href={hw} target="_blank" rel="noreferrer"><img src={hw} alt="손글씨 풀이" className="max-h-80 w-full rounded border object-contain" /></a>
        ) : (
          <div className="rounded border border-dashed p-8 text-center text-xs text-ink-faint">풀이 노트 사진을 첨부해 두면 해설지에 함께 정리할 수 있습니다.</div>
        )}
      </section>

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-semibold">유사 문항 (태그·세부유형 기반)</h2>
        <ul className="space-y-2">
          {similar.map((s) => (
            <li key={s.id}>
              <Link href={`/problems/${s.id}`} className="block rounded border border-stone-200 p-2 hover:border-accent">
                <div className="mb-1 flex items-center gap-1 text-[11px] text-ink-faint">
                  <span>{s.unitMiddle}</span>
                  {s.sourceNumber && <span>· {s.sourceNumber}번</span>}
                  <span>· {s.points}점</span>
                  <span className="ml-auto">유사도 {s.score}</span>
                </div>
                <div className="pointer-events-none max-h-24 overflow-hidden text-[0.8em]" style={{ ["--sn-size" as string]: "9pt" }}>
                  <ProblemView problem={{ ...s, choices: [], bogi: [], figureImage: null }} number={null} />
                </div>
              </Link>
            </li>
          ))}
          {similar.length === 0 && <li className="text-xs text-ink-faint">공통 태그를 가진 문항이 아직 없습니다.</li>}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "red" }) {
  return (
    <div className="rounded-md bg-stone-50 py-2">
      <div className={`text-lg font-semibold ${tone === "red" ? "text-red-600" : ""}`}>{value}</div>
      <div className="text-[11px] text-ink-faint">{label}</div>
    </div>
  );
}
