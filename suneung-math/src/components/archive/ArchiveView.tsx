"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { useCart } from "@/lib/cart";
import type { ProblemData } from "@/lib/types";
import { bucketOf, NUMBER_BUCKETS, SOURCE_ORGS, UNITS_2015, UNITS_2028 } from "@/lib/units";
import { ProblemView, sourceLabel } from "../ProblemView";
import { Stars } from "../Stars";

type Facets = {
  units: { curriculum: string; major: string; middle: string; count: number }[];
  numbers: Record<string, number>;
  years: { year: number; count: number }[];
  points: Record<string, number>;
  wrong: number;
};

const csv = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);

export function ArchiveView() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const cart = useCart();
  const [items, setItems] = useState<ProblemData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [tags, setTags] = useState<{ name: string; count: number }[]>([]);
  const [compact, setCompact] = useState(false);
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [show2015, setShow2015] = useState(sp.get("curriculum") === "2015");

  const query = sp.toString();

  const update = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [sp, router, pathname],
  );

  const toggleCsv = (key: string, val: string) => {
    const cur = csv(sp.get(key));
    update({ [key]: (cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val]).join(",") });
  };

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ total: number; items: ProblemData[] }>(`/api/problems?${query}`);
      setItems(r.items);
      setTotal(r.total);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    api<Facets>("/api/problems/facets").then(setFacets).catch(() => {});
    api<{ name: string; count: number }[]>("/api/tags").then(setTags).catch(() => {});
  }, []);

  // 검색어 디바운스
  useEffect(() => {
    const t = setTimeout(() => {
      if ((sp.get("q") ?? "") !== q) update({ q });
    }, 300);
    return () => clearTimeout(t);
  }, [q, sp, update]);

  const unitCount = useMemo(() => {
    const m = new Map<string, number>();
    facets?.units.forEach((u) => {
      m.set(u.major, (m.get(u.major) ?? 0) + u.count);
      m.set(`${u.major}/${u.middle}`, (m.get(`${u.major}/${u.middle}`) ?? 0) + u.count);
    });
    return m;
  }, [facets]);

  const numbers = csv(sp.get("numbers"));
  const points = csv(sp.get("points"));
  const orgs = csv(sp.get("sourceOrg"));
  const selTags = csv(sp.get("tags"));
  const curTree = show2015 ? UNITS_2015 : UNITS_2028;
  const activeFilters = Array.from(sp.keys()).filter((k) => k !== "sort").length;

  const quickSolve = async (id: string, correct: boolean) => {
    await api(`/api/problems/${id}/solve`, { method: "POST", json: { correct } });
    reload();
  };

  return (
    <div className="flex min-h-screen">
      {/* 필터 사이드바 */}
      <aside className="sticky top-0 h-screen w-72 flex-none space-y-5 overflow-y-auto border-r border-stone-200 bg-white/60 p-4 text-sm">
        <div>
          <input className="input" placeholder="키워드·태그·LaTeX 검색 (예: \int, 극값)" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <FilterGroup
          title="단원"
          right={
            <label className="flex items-center gap-1 text-[11px] font-normal text-ink-faint">
              <input
                type="checkbox"
                checked={show2015}
                onChange={(e) => {
                  setShow2015(e.target.checked);
                  update({ curriculum: e.target.checked ? "2015" : null, unitMajor: null, unitMiddle: null, unitDetail: null });
                }}
              />
              2015 개정
            </label>
          }
        >
          <ul className="space-y-0.5">
            {curTree.map((m) => {
              const on = sp.get("unitMajor") === m.name;
              return (
                <li key={m.name}>
                  <button
                    className={`flex w-full items-center rounded px-2 py-1 text-left hover:bg-stone-100 ${on && !sp.get("unitMiddle") ? "bg-accent-soft font-medium text-accent" : ""}`}
                    onClick={() => update({ unitMajor: on && !sp.get("unitMiddle") ? null : m.name, unitMiddle: null, unitDetail: null })}
                  >
                    <span className="mr-1 text-[10px] text-ink-faint">{on ? "▾" : "▸"}</span>
                    <span className="flex-1">{m.name}</span>
                    <span className="text-[11px] text-ink-faint">{unitCount.get(m.name) ?? 0}</span>
                  </button>
                  {on && (
                    <ul className="ml-4 border-l border-stone-200 pl-1">
                      {(m.children ?? []).map((c) => {
                        const con = sp.get("unitMiddle") === c.name;
                        return (
                          <li key={c.name}>
                            <button
                              className={`flex w-full items-center rounded px-2 py-0.5 text-left text-[13px] hover:bg-stone-100 ${con ? "bg-accent-soft text-accent" : "text-ink-soft"}`}
                              onClick={() => update({ unitMiddle: con ? null : c.name, unitDetail: null })}
                            >
                              <span className="flex-1">{c.name}</span>
                              <span className="text-[11px] text-ink-faint">{unitCount.get(`${m.name}/${c.name}`) ?? 0}</span>
                            </button>
                            {con && c.children && (
                              <div className="ml-2 flex flex-wrap gap-1 py-1">
                                {c.children.map((d) => (
                                  <button
                                    key={d.name}
                                    className={`chip ${sp.get("unitDetail") === d.name ? "chip-on" : ""}`}
                                    onClick={() => update({ unitDetail: sp.get("unitDetail") === d.name ? null : d.name })}
                                  >
                                    {d.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </FilterGroup>

        <FilterGroup title="문항 번호">
          <div className="grid grid-cols-6 gap-1">
            {Array.from({ length: 30 }, (_, i) => String(i + 1)).map((n) => {
              const c = facets?.numbers[n] ?? 0;
              return (
                <button
                  key={n}
                  title={`${n}번 · ${c}문항`}
                  className={`relative rounded border py-1 text-xs ${numbers.includes(n) ? "border-accent bg-accent text-white" : c ? "border-stone-300 bg-white hover:border-accent" : "border-stone-200 bg-stone-50 text-ink-faint"}`}
                  onClick={() => toggleCsv("numbers", n)}
                >
                  {n}
                  {c > 0 && !numbers.includes(n) && <span className="absolute right-0.5 top-0 text-[8px] text-accent">{c}</span>}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {NUMBER_BUCKETS.map((b) => {
              const on = sp.get("numMin") === String(b.min) && sp.get("numMax") === String(b.max);
              return (
                <button
                  key={b.key}
                  className={`chip ${on ? "chip-on" : ""}`}
                  onClick={() => update(on ? { numMin: null, numMax: null } : { numMin: String(b.min), numMax: String(b.max), numbers: null })}
                >
                  {b.min}~{b.max} {b.label}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs">
            <input className="input w-16 py-1" placeholder="부터" value={sp.get("numMin") ?? ""} onChange={(e) => update({ numMin: e.target.value })} />
            ~
            <input className="input w-16 py-1" placeholder="까지" value={sp.get("numMax") ?? ""} onChange={(e) => update({ numMax: e.target.value })} />
            <span className="text-ink-faint">번</span>
          </div>
        </FilterGroup>

        <FilterGroup title="배점 · 유형">
          <div className="flex flex-wrap gap-1">
            {["2", "3", "4"].map((n) => (
              <button key={n} className={`chip ${points.includes(n) ? "chip-on" : ""}`} onClick={() => toggleCsv("points", n)}>
                {n}점 <span className="ml-1 text-ink-faint">{facets?.points[n] ?? 0}</span>
              </button>
            ))}
            <span className="mx-1 text-stone-300">|</span>
            {[
              ["multiple", "객관식"],
              ["short", "단답형"],
            ].map(([v, l]) => (
              <button key={v} className={`chip ${sp.get("type") === v ? "chip-on" : ""}`} onClick={() => update({ type: sp.get("type") === v ? null : v })}>
                {l}
              </button>
            ))}
            <button className={`chip ${sp.get("hasBogi") === "1" ? "chip-on" : ""}`} onClick={() => update({ hasBogi: sp.get("hasBogi") === "1" ? null : "1" })}>
              〈보기〉
            </button>
          </div>
        </FilterGroup>

        <FilterGroup title="출처">
          <div className="flex flex-wrap gap-1">
            {SOURCE_ORGS.map((o) => (
              <button key={o} className={`chip ${orgs.includes(o) ? "chip-on" : ""}`} onClick={() => toggleCsv("sourceOrg", o)}>
                {o}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-1">
            <select className="input py-1 text-xs" value={sp.get("year") ?? ""} onChange={(e) => update({ year: e.target.value })}>
              <option value="">전체 연도</option>
              {facets?.years.map((y) => (
                <option key={y.year} value={y.year}>
                  {y.year} ({y.count})
                </option>
              ))}
            </select>
            <select className="input py-1 text-xs" value={sp.get("month") ?? ""} onChange={(e) => update({ month: e.target.value })}>
              <option value="">전체 월</option>
              {[3, 4, 5, 6, 7, 9, 10, 11].map((m) => (
                <option key={m} value={m}>
                  {m}월
                </option>
              ))}
            </select>
          </div>
        </FilterGroup>

        <FilterGroup title="오답 관리">
          <div className="flex flex-wrap gap-1">
            <button className={`chip ${sp.get("wrongOnly") === "1" ? "chip-on" : ""}`} onClick={() => update({ wrongOnly: sp.get("wrongOnly") === "1" ? null : "1" })}>
              ✕ 틀린 문제만 <span className="ml-1 text-ink-faint">{facets?.wrong ?? 0}</span>
            </button>
            <button className={`chip ${sp.get("unsolved") === "1" ? "chip-on" : ""}`} onClick={() => update({ unsolved: sp.get("unsolved") === "1" ? null : "1" })}>
              안 푼 문제
            </button>
            <button className={`chip ${sp.get("minDifficulty") === "4" ? "chip-on" : ""}`} onClick={() => update({ minDifficulty: sp.get("minDifficulty") === "4" ? null : "4" })}>
              난이도 ★4+
            </button>
          </div>
        </FilterGroup>

        <FilterGroup title="개념 태그">
          <div className="flex flex-wrap gap-1">
            {tags.map((t) => (
              <button key={t.name} className={`chip ${selTags.includes(t.name) ? "chip-on" : ""}`} onClick={() => toggleCsv("tags", t.name)}>
                #{t.name} <span className="ml-1 text-ink-faint">{t.count}</span>
              </button>
            ))}
            {tags.length === 0 && <span className="text-xs text-ink-faint">태그 없음</span>}
          </div>
        </FilterGroup>
      </aside>

      {/* 목록 */}
      <div className="min-w-0 flex-1 p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold">문제 아카이브</h1>
          <span className="text-sm text-ink-faint">{loading ? "불러오는 중…" : `${total}문항`}</span>
          {activeFilters > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setQ(""); router.replace(pathname); }}>
              필터 초기화 ({activeFilters})
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <select className="input w-auto py-1 text-xs" value={sp.get("sort") ?? ""} onChange={(e) => update({ sort: e.target.value })}>
              <option value="">최근 등록순</option>
              <option value="number">문항 번호순</option>
              <option value="wrong">많이 틀린 순</option>
              <option value="difficulty">난이도 높은 순</option>
              <option value="stale">오래 안 푼 순</option>
            </select>
            <button className="btn btn-sm" onClick={() => setCompact((c) => !c)}>
              {compact ? "조판 보기" : "간단 목록"}
            </button>
            <button className="btn btn-sm" disabled={!items.length} onClick={() => cart.add(items.map((i) => i.id!))}>
              결과 전체 담기
            </button>
            <Link href="/problems/new" className="btn btn-primary btn-sm">
              + 문제 추가
            </Link>
          </div>
        </div>

        {!loading && items.length === 0 && (
          <div className="card p-10 text-center text-sm text-ink-soft">
            조건에 맞는 문제가 없습니다. <Link href="/problems/new" className="text-accent underline">새 문제를 업로드</Link>해 보세요.
          </div>
        )}

        <div className={compact ? "card divide-y" : "grid grid-cols-1 gap-4 2xl:grid-cols-2"}>
          {items.map((p) =>
            compact ? (
              <div key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="w-8 text-right font-semibold">{p.sourceNumber ?? "-"}</span>
                <Link href={`/problems/${p.id}`} className="min-w-0 flex-1 truncate hover:text-accent">
                  {p.title || p.body.replace(/\$[^$]*\$/g, "▢").slice(0, 80)}
                </Link>
                <span className="tag">{p.unitMiddle || "미분류"}</span>
                <span className="tag">{p.points}점</span>
                {(p.wrongCount ?? 0) > 0 && <span className="tag bg-red-50 text-red-600">✕{p.wrongCount}</span>}
                <button className={`btn btn-sm ${cart.has(p.id!) ? "btn-primary" : ""}`} onClick={() => cart.toggle(p.id!)}>
                  {cart.has(p.id!) ? "✓" : "+"}
                </button>
              </div>
            ) : (
              <article key={p.id} className="card flex flex-col overflow-hidden">
                <div className="flex flex-wrap items-center gap-1 border-b border-stone-100 bg-stone-50/60 px-3 py-2 text-[11px]">
                  {p.sourceNumber && (
                    <span className="tag bg-white font-semibold text-ink">
                      {p.sourceNumber}번 · {bucketOf(p.sourceNumber)?.label}
                    </span>
                  )}
                  <span className="tag">{p.points}점</span>
                  <span className="tag">{[p.unitMajor, p.unitMiddle].filter(Boolean).join(" › ") || "미분류"}</span>
                  {p.unitDetail && <span className="tag">{p.unitDetail}</span>}
                  {p.curriculum === "2015" && <span className="tag bg-amber-50 text-amber-700">2015</span>}
                  {(p.wrongCount ?? 0) > 0 && <span className="tag bg-red-50 text-red-600">틀림 {p.wrongCount}/{p.solveCount}</span>}
                  <span className="ml-auto text-ink-faint">{sourceLabel(p)}</span>
                </div>
                <Link href={`/problems/${p.id}`} className="block flex-1 bg-white px-5 py-4 hover:bg-stone-50/40">
                  <div style={{ maxWidth: "120mm" }}>
                    <ProblemView problem={p} />
                  </div>
                </Link>
                <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {p.tags.map((t) => (
                      <button key={t} className="text-[11px] text-accent hover:underline" onClick={() => toggleCsv("tags", t)}>
                        #{t}
                      </button>
                    ))}
                  </div>
                  <div className="ml-auto flex items-center gap-1">
                    <Stars value={p.difficulty} />
                    <button className="btn btn-ghost btn-sm text-emerald-700" title="맞음 기록" onClick={() => quickSolve(p.id!, true)}>
                      ○
                    </button>
                    <button className="btn btn-ghost btn-sm text-red-600" title="틀림 기록" onClick={() => quickSolve(p.id!, false)}>
                      ✕
                    </button>
                    <button className={`btn btn-sm ${cart.has(p.id!) ? "btn-primary" : ""}`} onClick={() => cart.toggle(p.id!)}>
                      {cart.has(p.id!) ? "✓ 담김" : "+ 시험지에 담기"}
                    </button>
                  </div>
                </div>
              </article>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-ink-soft">
        <span>{title}</span>
        {right}
      </div>
      {children}
    </section>
  );
}
