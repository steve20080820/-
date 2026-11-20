import Link from "next/link";
import { prisma } from "@/lib/db";
import { NUMBER_BUCKETS, UNITS_2028 } from "@/lib/units";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [total, wrong, unsolved, byMajor, byNumber, exams, recentLogs, logsTotal, logsCorrect] = await Promise.all([
    prisma.problem.count(),
    prisma.problem.count({ where: { wrongCount: { gt: 0 } } }),
    prisma.problem.count({ where: { solveCount: 0 } }),
    prisma.problem.groupBy({ by: ["unitMajor", "unitMiddle"], _count: { _all: true } }),
    prisma.problem.groupBy({ by: ["sourceNumber"], _count: { _all: true } }),
    prisma.examPaper.findMany({ orderBy: { updatedAt: "desc" }, take: 4, include: { _count: { select: { items: true } } } }),
    prisma.solveLog.findMany({ orderBy: { solvedAt: "desc" }, take: 8, include: { problem: { select: { id: true, sourceNumber: true, unitMiddle: true, body: true } } } }),
    prisma.solveLog.count(),
    prisma.solveLog.count({ where: { correct: true } }),
  ]);

  const majorCount = (m: string) => byMajor.filter((b) => b.unitMajor === m).reduce((s, b) => s + b._count._all, 0);
  const middleCount = (m: string, c: string) => byMajor.find((b) => b.unitMajor === m && b.unitMiddle === c)?._count._all ?? 0;
  const bucketCount = (min: number, max: number) =>
    byNumber.filter((b) => b.sourceNumber != null && b.sourceNumber >= min && b.sourceNumber <= max).reduce((s, b) => s + b._count._all, 0);
  const maxMiddle = Math.max(1, ...byMajor.map((b) => b._count._all));

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-end gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold">수능 수학 아카이브</h1>
          <p className="text-sm text-ink-soft">2028 수능 예시문항 스타일로 조판된 나만의 문제 은행</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Link href="/problems/new" className="btn btn-primary">
            + 문제 업로드
          </Link>
          <Link href="/random" className="btn">
            랜덤 모의고사
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="전체 문항" value={total} href="/problems" />
        <StatCard label="틀린 문제" value={wrong} href="/problems?wrongOnly=1" tone="red" />
        <StatCard label="안 푼 문제" value={unsolved} href="/problems?unsolved=1" />
        <StatCard label="누적 정답률" value={logsTotal ? `${Math.round((logsCorrect / logsTotal) * 100)}%` : "-"} sub={`${logsTotal}회 풀이`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-3 font-semibold">단원별 보유 현황 (2028 체제)</h2>
          <div className="space-y-4">
            {UNITS_2028.map((m) => (
              <div key={m.name}>
                <Link href={`/problems?unitMajor=${encodeURIComponent(m.name)}`} className="mb-1 flex items-baseline gap-2 text-sm font-medium hover:text-accent">
                  {m.name} <span className="text-xs text-ink-faint">{majorCount(m.name)}문항</span>
                </Link>
                <div className="space-y-1">
                  {(m.children ?? []).map((c) => {
                    const n = middleCount(m.name, c.name);
                    return (
                      <Link
                        key={c.name}
                        href={`/problems?unitMajor=${encodeURIComponent(m.name)}&unitMiddle=${encodeURIComponent(c.name)}`}
                        className="flex items-center gap-2 text-xs text-ink-soft hover:text-accent"
                      >
                        <span className="w-36 truncate">{c.name}</span>
                        <span className="h-2 flex-1 overflow-hidden rounded bg-stone-100">
                          <span className="block h-full rounded bg-accent/70" style={{ width: `${(n / maxMiddle) * 100}%` }} />
                        </span>
                        <span className="w-6 text-right">{n}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 font-semibold">번호 구간</h2>
          <ul className="space-y-1.5 text-sm">
            {NUMBER_BUCKETS.map((b) => (
              <li key={b.key}>
                <Link href={`/problems?numMin=${b.min}&numMax=${b.max}`} className="flex items-center rounded px-2 py-1 hover:bg-stone-50">
                  <span className="w-14 text-xs text-ink-faint">
                    {b.min}~{b.max}
                  </span>
                  <span className="flex-1">{b.label}</span>
                  <span className="text-xs">{bucketCount(b.min, b.max)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <div className="mb-3 flex items-center">
            <h2 className="font-semibold">최근 시험지</h2>
            <Link href="/exams" className="ml-auto text-xs text-accent">
              전체 보기
            </Link>
          </div>
          <ul className="space-y-2 text-sm">
            {exams.map((e) => (
              <li key={e.id}>
                <Link href={`/exams/${e.id}`} className="flex items-center rounded border border-stone-200 px-3 py-2 hover:border-accent">
                  <span className="flex-1 font-serif">{e.title}</span>
                  <span className="text-xs text-ink-faint">
                    {e.paperSize} · {e._count.items}문항
                  </span>
                </Link>
              </li>
            ))}
            {exams.length === 0 && <li className="text-xs text-ink-faint">아직 시험지가 없습니다.</li>}
          </ul>
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-semibold">최근 풀이 기록</h2>
          <ul className="space-y-1 text-sm">
            {recentLogs.map((l) => (
              <li key={l.id}>
                <Link href={`/problems/${l.problem.id}`} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-stone-50">
                  <span className={l.correct ? "text-emerald-600" : "text-red-600"}>{l.correct ? "○" : "✕"}</span>
                  <span className="w-10 text-xs text-ink-faint">{l.problem.sourceNumber ?? "-"}번</span>
                  <span className="flex-1 truncate text-xs">{l.problem.unitMiddle}</span>
                  <span className="text-[11px] text-ink-faint">{l.solvedAt.toLocaleDateString("ko-KR")}</span>
                </Link>
              </li>
            ))}
            {recentLogs.length === 0 && <li className="text-xs text-ink-faint">문제 카드의 ○/✕ 버튼으로 풀이를 기록하세요.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, href, tone, sub }: { label: string; value: number | string; href?: string; tone?: "red"; sub?: string }) {
  const inner = (
    <div className="card p-4 transition hover:border-accent">
      <div className="text-xs text-ink-faint">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${tone === "red" ? "text-red-600" : ""}`}>{value}</div>
      {sub && <div className="text-[11px] text-ink-faint">{sub}</div>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
