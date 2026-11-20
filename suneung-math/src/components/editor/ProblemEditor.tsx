"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ProblemView, resolveLayout } from "../ProblemView";
import { CropTool } from "./CropTool";
import { MathText } from "../MathText";
import { Stars } from "../Stars";
import { FitWidth } from "../FitWidth";
import { TagInput } from "./TagInput";
import { UnitSelect } from "./UnitSelect";
import { api, downscale, fileToDataUrl, uploadDataUrl, urlToDataUrl } from "@/lib/client";
import { BOGI_LABELS, CIRCLED, EMPTY_PROBLEM, type ProblemData } from "@/lib/types";
import { bucketOf, SHORT_ANSWER_FROM, SOURCE_ORGS } from "@/lib/units";
import { useCart } from "@/lib/cart";

const SNIPPETS: [string, string][] = [
  ["분수", "$\\dfrac{a}{b}$"],
  ["극한", "$\\displaystyle\\lim_{x \\to a} f(x)$"],
  ["적분", "$\\displaystyle\\int_{a}^{b} f(x)\\,dx$"],
  ["시그마", "$\\displaystyle\\sum_{k=1}^{n} a_k$"],
  ["로그", "$\\log_{2} x$"],
  ["삼각", "$\\sin \\dfrac{\\pi}{3}$"],
  ["조건박스", "[box]\n(가) \n(나) \n[/box]"],
  ["〈보기〉", "옳은 것만을 〈보기〉에서 있는 대로 고른 것은?"],
  ["구하시오", "의 값을 구하시오."],
];

type Notice = { kind: "info" | "error" | "ok"; text: string };

export function ProblemEditor({ initial }: { initial?: ProblemData }) {
  const router = useRouter();
  const cart = useCart();
  const [p, setP] = useState<ProblemData>(initial ?? EMPTY_PROBLEM);
  const [imageData, setImageData] = useState<string | null>(null); // AI 전송용 dataURL
  const [rawText, setRawText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [crop, setCrop] = useState(false);
  const [provider, setProvider] = useState<string>("");
  const [dirty, setDirty] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const set = useCallback(<K extends keyof ProblemData>(k: K, v: ProblemData[K]) => {
    setP((prev) => ({ ...prev, [k]: v }));
    setDirty(true);
  }, []);

  useEffect(() => {
    api<{ provider: string }>("/api/parse").then((r) => setProvider(r.provider)).catch(() => {});
  }, []);

  const acceptImage = useCallback(async (file: Blob) => {
    if (!file.type.startsWith("image/")) {
      setNotice({ kind: "error", text: "PNG/JPG 이미지만 업로드할 수 있습니다. PDF는 해당 문항을 캡처(스크린샷)해 붙여넣으세요." });
      return;
    }
    setBusy("이미지 업로드 중…");
    try {
      const dataUrl = await downscale(await fileToDataUrl(file));
      setImageData(dataUrl);
      const url = await uploadDataUrl(dataUrl);
      set("originalImage", url);
      setNotice({ kind: "ok", text: "원본 이미지를 불러왔습니다. 'AI 자동 변환'을 눌러 조판 데이터를 추출하세요." });
    } catch (e) {
      setNotice({ kind: "error", text: String(e instanceof Error ? e.message : e) });
    } finally {
      setBusy(null);
    }
  }, [set]);

  // 클립보드 붙여넣기 (Ctrl+V) – 이미지가 있을 때만 가로챔
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith("image/"));
      if (!item) return;
      const f = item.getAsFile();
      if (f) {
        e.preventDefault();
        acceptImage(f);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [acceptImage]);

  // 저장 안 된 변경사항 경고
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const applyParsed = (r: Partial<ProblemData> & { hasFigure?: boolean }) => {
    setP((prev) => ({
      ...prev,
      ...Object.fromEntries(Object.entries(r).filter(([k, v]) => k !== "hasFigure" && v !== undefined && v !== null && v !== "")),
      tags: Array.from(new Set([...(prev.tags ?? []), ...(r.tags ?? [])])),
    }));
    setDirty(true);
    if (r.hasFigure) setNotice({ kind: "info", text: "도형/그래프가 감지되었습니다. '도형 크롭'으로 그림 영역을 첨부하세요." });
  };

  const runParse = async (mode: "ai" | "text") => {
    setBusy(mode === "ai" ? "AI가 문제를 읽는 중…" : "텍스트 파싱 중…");
    setNotice(null);
    try {
      let img = imageData;
      if (mode === "ai" && !img && p.originalImage) img = await urlToDataUrl(p.originalImage);
      const r = await api<{ result: Partial<ProblemData> & { hasFigure?: boolean }; notice?: string }>("/api/parse", {
        method: "POST",
        json: { imageDataUrl: mode === "ai" ? img : undefined, text: rawText || undefined, mode },
      });
      applyParsed(r.result);
      setNotice((n) => (n?.kind === "info" && r.result.hasFigure ? n : { kind: "ok", text: r.notice ?? "변환 완료" }));
    } catch (e) {
      setNotice({ kind: "error", text: String(e instanceof Error ? e.message : e) });
    } finally {
      setBusy(null);
    }
  };

  const insert = (snippet: string) => {
    const ta = bodyRef.current;
    if (!ta) return set("body", p.body + snippet);
    const { selectionStart: s, selectionEnd: e } = ta;
    const next = p.body.slice(0, s) + snippet + p.body.slice(e);
    set("body", next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + snippet.length, s + snippet.length);
    });
  };

  const save = async (andNew = false) => {
    setBusy("저장 중…");
    try {
      const saved = p.id
        ? await api<ProblemData>(`/api/problems/${p.id}`, { method: "PUT", json: p })
        : await api<ProblemData>("/api/problems", { method: "POST", json: p });
      setDirty(false);
      if (andNew) {
        setP({ ...EMPTY_PROBLEM, sourceOrg: p.sourceOrg, sourceYear: p.sourceYear, sourceMonth: p.sourceMonth, sourceName: p.sourceName, curriculum: p.curriculum });
        setImageData(null);
        setRawText("");
        setNotice({ kind: "ok", text: `저장했습니다. 다음 문제를 업로드하세요. (방금 저장: ${saved.sourceNumber ?? ""}번)` });
        window.scrollTo({ top: 0 });
      } else {
        setP(saved);
        setNotice({ kind: "ok", text: "저장했습니다." });
        if (!p.id) router.replace(`/problems/${saved.id}`);
        else router.refresh();
      }
    } catch (e) {
      setNotice({ kind: "error", text: String(e instanceof Error ? e.message : e) });
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!p.id || !confirm("이 문제를 삭제할까요? 시험지에서도 빠집니다.")) return;
    await api(`/api/problems/${p.id}`, { method: "DELETE" });
    cart.remove(p.id);
    setDirty(false);
    router.push("/problems");
  };

  const bucket = bucketOf(p.sourceNumber, p.curriculum);
  const layout = resolveLayout(p.choices, p.choiceLayout);

  return (
    <div className="space-y-4">
      {/* 상단 액션바 */}
      <div className="sticky top-0 z-20 -mx-6 flex flex-wrap items-center gap-2 border-b border-stone-200 bg-[#f4f3ef]/95 px-6 py-3 backdrop-blur">
        <h1 className="mr-auto text-lg font-semibold">{p.id ? "문제 편집" : "문제 업로드 · 수능 스타일 변환"}</h1>
        {busy && <span className="text-sm text-accent">{busy}</span>}
        {p.id && (
          <>
            <button className="btn" onClick={() => cart.toggle(p.id!)}>
              {cart.has(p.id) ? "✓ 시험지에 담김" : "+ 시험지에 담기"}
            </button>
            <button className="btn text-red-600" onClick={remove}>
              삭제
            </button>
          </>
        )}
        {!p.id && (
          <button className="btn" disabled={!!busy || !p.body.trim()} onClick={() => save(true)}>
            저장 후 새 문제
          </button>
        )}
        <button className="btn btn-primary" disabled={!!busy || !p.body.trim()} onClick={() => save(false)}>
          저장{dirty ? " •" : ""}
        </button>
      </div>

      {notice && (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            notice.kind === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : notice.kind === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {notice.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* ① 원본 */}
        <section className="space-y-3">
          <div className="card p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">① 원본 (변환 전)</h2>
              <span className="text-[11px] text-ink-faint">
                AI: {provider === "anthropic" ? "Claude Vision" : provider === "openai" ? "OpenAI Vision" : "데모 모드"}
              </span>
            </div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) acceptImage(f);
              }}
              onClick={() => !p.originalImage && fileRef.current?.click()}
              className={`relative flex min-h-48 items-center justify-center overflow-hidden rounded-md border-2 border-dashed transition ${
                dragOver ? "border-accent bg-accent-soft" : "border-stone-300 bg-stone-50"
              } ${p.originalImage ? "" : "cursor-pointer"}`}
            >
              {p.originalImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.originalImage} alt="원본 문제" className="max-h-[60vh] w-full object-contain" />
              ) : (
                <div className="p-6 text-center text-sm text-ink-soft">
                  <div className="mb-1 text-2xl">⇪</div>
                  이미지를 끌어다 놓거나 <b>클릭</b>해서 선택
                  <br />
                  또는 <kbd className="rounded border bg-white px-1">Ctrl</kbd>+<kbd className="rounded border bg-white px-1">V</kbd> 로 캡처 붙여넣기
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) acceptImage(f);
                e.target.value = "";
              }}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button className="btn btn-primary btn-sm" disabled={!!busy || (!p.originalImage && !rawText.trim())} onClick={() => runParse("ai")}>
                ✦ AI 자동 변환
              </button>
              <button className="btn btn-sm" disabled={!p.originalImage} onClick={() => setCrop(true)}>
                ✂ 도형 크롭
              </button>
              <button className="btn btn-sm" onClick={() => fileRef.current?.click()}>
                이미지 교체
              </button>
              {p.originalImage && (
                <button className="btn btn-ghost btn-sm" onClick={() => { set("originalImage", null); setImageData(null); }}>
                  원본 제거
                </button>
              )}
            </div>
          </div>

          <div className="card p-3">
            <h2 className="mb-1 text-sm font-semibold">텍스트 / LaTeX 붙여넣기</h2>
            <p className="mb-2 text-[11px] text-ink-faint">
              문제 텍스트를 통째로 붙여넣으면 번호·배점·〈보기〉·①~⑤ 선지를 자동 분리합니다.
            </p>
            <textarea
              className="input h-32 font-mono text-xs"
              placeholder={"예) 15. 함수 $f(x)=x^3-3x$ 에 대하여 ... 의 값은? [4점]\n① 1 ② 2 ③ 3 ④ 4 ⑤ 5"}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />
            <div className="mt-2 flex gap-2">
              <button className="btn btn-sm" disabled={!rawText.trim() || !!busy} onClick={() => runParse("text")}>
                텍스트 파싱 (규칙 기반)
              </button>
              {provider !== "demo" && (
                <button className="btn btn-sm" disabled={!rawText.trim() || !!busy} onClick={() => runParse("ai")}>
                  AI로 정리
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ② 편집 폼 */}
        <section className="card space-y-4 p-4">
          <h2 className="text-sm font-semibold">② 조판 데이터 편집</h2>

          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="label">원 출처 번호</label>
              <input className="input" type="number" min={1} max={30} value={p.sourceNumber ?? ""} onChange={(e) => {
                  const n = e.target.value ? +e.target.value : null;
                  set("sourceNumber", n);
                  // 2028 체제: 1~21 객관식, 22~30 단답형으로 유형 자동 지정 (수동 변경 가능)
                  if (n && p.curriculum === "2028") set("type", n >= SHORT_ANSWER_FROM ? "short" : "multiple");
                }} />
            </div>
            <div>
              <label className="label">배점</label>
              <select className="input" value={p.points} onChange={(e) => set("points", +e.target.value)}>
                {[2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}점
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">유형</label>
              <div className="flex gap-1">
                {(["multiple", "short"] as const).map((t) => (
                  <button key={t} className={`btn btn-sm flex-1 ${p.type === t ? "btn-primary" : ""}`} onClick={() => set("type", t)}>
                    {t === "multiple" ? "5지선다" : "단답형"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {bucket && <div className="-mt-2 text-[11px] text-ink-faint">번호 구간: {bucket.label} ({bucket.min}~{bucket.max}번)</div>}

          <div>
            <div className="mb-1 flex items-end justify-between">
              <label className="label mb-0">문제 본문 (인라인 $…$, 블록 $$…$$)</label>
            </div>
            <div className="mb-1 flex flex-wrap gap-1">
              {SNIPPETS.map(([l, s]) => (
                <button key={l} className="btn btn-sm px-1.5 py-0.5 text-[11px]" onClick={() => insert(s)}>
                  {l}
                </button>
              ))}
            </div>
            <textarea ref={bodyRef} className="input h-40 font-mono text-xs leading-relaxed" value={p.body} onChange={(e) => set("body", e.target.value)} />
          </div>

          {/* 보기 */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="label mb-0">〈보기〉 항목</label>
              <button className="btn btn-sm" disabled={p.bogi.length >= 5} onClick={() => set("bogi", [...p.bogi, ""])}>
                + 항목
              </button>
            </div>
            {p.bogi.length === 0 && <div className="text-[11px] text-ink-faint">〈보기〉가 없는 문항입니다.</div>}
            <div className="space-y-1">
              {p.bogi.map((b, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="w-5 text-center text-sm">{BOGI_LABELS[i]}.</span>
                  <input className="input font-mono text-xs" value={b} onChange={(e) => set("bogi", p.bogi.map((x, j) => (j === i ? e.target.value : x)))} />
                  <button className="btn btn-ghost btn-sm" onClick={() => set("bogi", p.bogi.filter((_, j) => j !== i))}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 선지 */}
          {p.type === "multiple" && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="label mb-0">선택지</label>
                <div className="flex items-center gap-1 text-[11px]">
                  {(["auto", "row", "grid", "column"] as const).map((l) => (
                    <button key={l} className={`chip ${p.choiceLayout === l ? "chip-on" : ""}`} onClick={() => set("choiceLayout", l)}>
                      {{ auto: `자동(${{ row: "1행", grid: "3+2", column: "세로" }[layout]})`, row: "1행 5개", grid: "3+2", column: "세로 5줄" }[l]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="w-5 text-center">{CIRCLED[i]}</span>
                    <input
                      className="input font-mono text-xs"
                      value={p.choices[i] ?? ""}
                      onChange={(e) => {
                        const c = [0, 1, 2, 3, 4].map((j) => p.choices[j] ?? "");
                        c[i] = e.target.value;
                        set("choices", c);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 도형 */}
          {p.figureImage && (
            <div className="rounded-md border border-stone-200 p-2">
              <div className="mb-1 flex items-center justify-between">
                <label className="label mb-0">첨부 도형</label>
                <button className="btn btn-ghost btn-sm text-red-600" onClick={() => set("figureImage", null)}>
                  제거
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-20 text-ink-soft">폭 {p.figureWidth}%</span>
                <input type="range" min={15} max={100} value={p.figureWidth} onChange={(e) => set("figureWidth", +e.target.value)} className="flex-1" />
                <select className="input w-24" value={p.figureAlign} onChange={(e) => set("figureAlign", e.target.value as "center" | "right")}>
                  <option value="center">가운데</option>
                  <option value="right">오른쪽</option>
                </select>
              </div>
            </div>
          )}

          {/* 단원 */}
          <UnitSelect value={p} onChange={(patch) => { setP((prev) => ({ ...prev, ...patch })); setDirty(true); }} />

          <div>
            <label className="label">개념 태그</label>
            <TagInput value={p.tags} onChange={(t) => set("tags", t)} />
          </div>

          {/* 출처 */}
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="label">출처</label>
              <select className="input" value={p.sourceOrg} onChange={(e) => set("sourceOrg", e.target.value)}>
                {SOURCE_ORGS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">연도(학년도)</label>
              <input className="input" type="number" value={p.sourceYear ?? ""} onChange={(e) => set("sourceYear", e.target.value ? +e.target.value : null)} placeholder="2028" />
            </div>
            <div>
              <label className="label">시행월</label>
              <input className="input" type="number" min={1} max={12} value={p.sourceMonth ?? ""} onChange={(e) => set("sourceMonth", e.target.value ? +e.target.value : null)} placeholder="11" />
            </div>
            <div>
              <label className="label">시험명</label>
              <input className="input" value={p.sourceName ?? ""} onChange={(e) => set("sourceName", e.target.value)} placeholder="예시문항" />
            </div>
          </div>

          {/* 정답·해설 */}
          <div className="grid grid-cols-[100px_1fr] gap-2">
            <div>
              <label className="label">정답</label>
              <input className="input" value={p.answer ?? ""} onChange={(e) => set("answer", e.target.value)} placeholder={p.type === "multiple" ? "1~5" : "예: 90"} />
            </div>
            <div>
              <label className="label">난이도 / 중요도</label>
              <div className="flex items-center gap-3">
                <Stars value={p.difficulty} onChange={(v) => set("difficulty", v)} label="난이도" />
                <Stars value={p.importance} onChange={(v) => set("importance", v)} label="중요도" />
              </div>
            </div>
          </div>
          <div>
            <label className="label">공식 해설 (LaTeX 가능)</label>
            <textarea className="input h-24 font-mono text-xs" value={p.explanation ?? ""} onChange={(e) => set("explanation", e.target.value)} />
          </div>
          <div>
            <label className="label">내 메모</label>
            <textarea className="input h-16 text-xs" value={p.memo ?? ""} onChange={(e) => set("memo", e.target.value)} placeholder="실수 포인트, 핵심 아이디어 등" />
          </div>
        </section>

        {/* ③ 프리뷰 */}
        <section className="space-y-3">
          <div className="card sticky top-20 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">③ 수능 스타일 조판 (변환 후)</h2>
              <span className="text-[11px] text-ink-faint">B4 2단 · 1단 폭 106.5mm</span>
            </div>
            <div className="rounded border border-stone-200 bg-white p-4 shadow-inner">
              <FitWidth widthMm={106.5}>
              <div style={{ ["--sn-size" as string]: "10.5pt" }}>
                {p.body.trim() ? (
                  <ProblemView problem={p} number={p.sourceNumber ?? 1} />
                ) : (
                  <div className="py-16 text-center font-sans text-sm text-ink-faint">본문을 입력하면 실시간으로 조판됩니다.</div>
                )}
              </div>
              </FitWidth>
            </div>
            {p.explanation && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-ink-soft">해설 미리보기</summary>
                <div className="sn-problem mt-2 rounded border bg-white p-3" style={{ ["--sn-size" as string]: "10pt" }}>
                  <MathBlock text={p.explanation} />
                </div>
              </details>
            )}
          </div>
        </section>
      </div>

      {crop && p.originalImage && (
        <CropTool
          src={imageData ?? p.originalImage}
          onClose={() => setCrop(false)}
          onDone={async (dataUrl) => {
            setCrop(false);
            setBusy("도형 업로드 중…");
            try {
              set("figureImage", await uploadDataUrl(dataUrl));
            } finally {
              setBusy(null);
            }
          }}
        />
      )}
    </div>
  );
}

function MathBlock({ text }: { text: string }) {
  return <MathText text={text} as="div" />;
}

export { Stars } from "../Stars";
