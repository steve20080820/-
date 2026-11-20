"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { applyFonts, BUILTIN_FONTS, type FontInfo } from "@/components/FontLoader";
import { ProblemView } from "@/components/ProblemView";
import { EMPTY_PROBLEM } from "@/lib/types";

const SAMPLE = {
  ...EMPTY_PROBLEM,
  body: "함수 $f(x)=x^3-3x^2+a$ 의 극솟값이 $-2$ 일 때, $\\displaystyle\\int_{0}^{2} f(x)\\,dx$ 의 값은? (단, $a$는 상수이다.)",
  choices: ["$-1$", "$0$", "$1$", "$2$", "$3$"],
  points: 3,
};

export default function SettingsPage() {
  const [fonts, setFonts] = useState<FontInfo[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [family, setFamily] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const fontFile = useRef<HTMLInputElement>(null);
  const backupFile = useRef<HTMLInputElement>(null);

  const load = async () => {
    setFonts(await api<FontInfo[]>("/api/fonts"));
    setSettings(await api<Record<string, string>>("/api/settings"));
  };
  useEffect(() => {
    load();
  }, []);

  const choose = async (f: string) => {
    await api("/api/settings", { method: "PUT", json: { paperFont: f } });
    setSettings((s) => ({ ...s, paperFont: f }));
    await applyFonts();
  };

  const uploadFont = async () => {
    const f = fontFile.current?.files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.append("file", f);
    if (family) fd.append("family", family);
    try {
      const font = await api<FontInfo>("/api/fonts", { method: "POST", body: fd });
      setFamily("");
      if (fontFile.current) fontFile.current.value = "";
      await load();
      await choose(font.family);
      setMsg(`'${font.family}' 폰트를 업로드하고 시험지 폰트로 적용했습니다.`);
    } catch (e) {
      setMsg(String(e instanceof Error ? e.message : e));
    }
  };

  const restore = async () => {
    const f = backupFile.current?.files?.[0];
    if (!f) return;
    if (mode === "replace" && !confirm("현재 DB의 문제·시험지를 모두 지우고 백업으로 교체합니다. 계속할까요?")) return;
    const fd = new FormData();
    fd.append("file", f);
    fd.append("mode", mode);
    try {
      const r = await api<{ problems: number; exams: number; files: number }>("/api/backup", { method: "POST", body: fd });
      setMsg(`복원 완료: 문제 ${r.problems}개, 시험지 ${r.exams}개, 파일 ${r.files}개`);
      await load();
      await applyFonts();
    } catch (e) {
      setMsg(String(e instanceof Error ? e.message : e));
    }
  };

  const provider = settings._aiProvider;
  const current = settings.paperFont ?? "";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-lg font-semibold">설정 · 폰트 · 백업</h1>
      {msg && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{msg}</div>}

      <section className="card p-5">
        <h2 className="mb-2 font-semibold">AI OCR · 자동 태깅</h2>
        <p className="text-sm text-ink-soft">
          현재 모드:{" "}
          <b className={provider === "demo" ? "text-amber-700" : "text-emerald-700"}>
            {provider === "anthropic" ? "Anthropic Claude Vision" : provider === "openai" ? "OpenAI Vision" : "데모 모드 (규칙 기반 텍스트 파서)"}
          </b>
        </p>
        <p className="mt-1 text-xs text-ink-faint">
          프로젝트 루트의 <code>.env</code> 에 <code>ANTHROPIC_API_KEY</code> 또는 <code>OPENAI_API_KEY</code> 를 넣고 서버를 재시작하면 이미지 OCR이
          활성화됩니다. 모델은 <code>ANTHROPIC_MODEL</code> / <code>OPENAI_MODEL</code> 로 바꿀 수 있습니다.
        </p>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-semibold">시험지 폰트</h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="space-y-2">
            {[...BUILTIN_FONTS.map((b) => ({ family: b.family, label: b.label, id: "" })), ...fonts.map((f) => ({ family: f.family, label: `${f.family} (업로드)`, id: f.id }))].map((f) => (
              <label key={f.family} className="flex items-center gap-2 rounded border border-stone-200 px-3 py-2 text-sm hover:bg-stone-50">
                <input type="radio" name="font" checked={(current || "KoPubWorldBatang") === f.family} onChange={() => choose(f.family)} />
                <span className="flex-1" style={{ fontFamily: `"${f.family}", serif` }}>
                  {f.label} — 가나다 수학 영역 123
                </span>
                {f.id && (
                  <button
                    className="text-xs text-red-600"
                    onClick={async (e) => {
                      e.preventDefault();
                      await api(`/api/fonts?id=${f.id}`, { method: "DELETE" });
                      await load();
                      await applyFonts();
                    }}
                  >
                    삭제
                  </button>
                )}
              </label>
            ))}
            <div className="rounded border border-dashed border-stone-300 p-3">
              <div className="label">커스텀 폰트 업로드 (.ttf / .otf / .woff / .woff2)</div>
              <input ref={fontFile} type="file" accept=".ttf,.otf,.woff,.woff2" className="mb-2 block text-xs" />
              <div className="flex gap-2">
                <input className="input" placeholder="폰트 이름 (예: 신명중명조)" value={family} onChange={(e) => setFamily(e.target.value)} />
                <button className="btn btn-primary" onClick={uploadFont}>
                  업로드·적용
                </button>
              </div>
              <p className="mt-2 text-[11px] text-ink-faint">본인이 사용 권한을 가진 폰트만 업로드하세요. 파일은 로컬 data/fonts 에만 저장됩니다.</p>
            </div>
          </div>
          <div>
            <div className="label">미리보기</div>
            <div className="rounded border bg-white p-5" style={{ ["--sn-size" as string]: "10.5pt" }}>
              <ProblemView problem={SAMPLE} number={7} />
            </div>
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-semibold">백업 & 복원</h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm text-ink-soft">문제 DB · 시험지 · 풀이 기록 · 이미지 · 폰트를 한 파일로 내보냅니다.</p>
            <div className="flex gap-2">
              <a className="btn btn-primary" href="/api/backup">
                ZIP 백업 (이미지 포함)
              </a>
              <a className="btn" href="/api/backup?format=json">
                JSON만
              </a>
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm text-ink-soft">백업 파일(.zip / .json)을 가져옵니다.</p>
            <input ref={backupFile} type="file" accept=".zip,.json" className="mb-2 block text-xs" />
            <div className="flex items-center gap-3 text-sm">
              <label className="flex items-center gap-1">
                <input type="radio" checked={mode === "merge"} onChange={() => setMode("merge")} /> 병합 (같은 ID는 덮어쓰기)
              </label>
              <label className="flex items-center gap-1">
                <input type="radio" checked={mode === "replace"} onChange={() => setMode("replace")} /> 전체 교체
              </label>
              <button className="btn ml-auto" onClick={restore}>
                복원
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
