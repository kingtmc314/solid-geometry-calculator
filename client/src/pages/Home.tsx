/**
 * 立體幾何計算器 — Main Page
 * Design: Blueprint / Technical Drawing
 * - Deep navy background, cyan accents, orange highlights
 * - JetBrains Mono for numbers, Space Grotesk for headings
 * - Full i18n: 中文 / English
 */
import { useState, useMemo, useCallback } from "react";
import "katex/dist/katex.min.css";
import { Plus, Trash2, RotateCcw, Calculator, Info, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import SolidViewer from "@/components/SolidViewer";
import type { Face, Point2D, SolidType } from "@/lib/geometry";
import { computeAll } from "@/lib/geometry";
import { useLang } from "@/contexts/LangContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, dp = 4): string {
  return n.toFixed(dp);
}

const VERTEX_COLORS = [
  "#f5a623", "#4dd9f5", "#a8e6cf", "#ff8b94", "#c3a6ff", "#ffd3b6",
];

const DEFAULT_BASES: Record<number, Point2D[]> = {
  3: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 2, y: 3 }],
  4: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }],
  5: [
    { x: 2, y: 0 }, { x: 4, y: 1.5 }, { x: 3.2, y: 3.8 },
    { x: 0.8, y: 3.8 }, { x: 0, y: 1.5 },
  ],
  6: [
    { x: 2, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 1.7 },
    { x: 4, y: 3.4 }, { x: 2, y: 3.4 }, { x: 1, y: 1.7 },
  ],
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const { t, toggleLang, lang } = useLang();

  const [solidType, setSolidType] = useState<SolidType>("prism");
  const [height, setHeight] = useState<number>(5);
  const [heightInput, setHeightInput] = useState("5");
  const [base, setBase] = useState<Point2D[]>(DEFAULT_BASES[4]);
  const [highlightFaces, setHighlightFaces] = useState<number[]>([]);
  const [dihedralA, setDihedralA] = useState<string>("0");
  const [dihedralB, setDihedralB] = useState<string>("1");

  // ── Face label resolver (i18n) ──────────────────────────────────────────
  const getFaceLabel = useCallback(
    (face: Face): string => {
      if (face.labelKey === "faceBase") return t.faceBase;
      if (face.labelKey === "faceTop") return t.faceTop;
      if (face.labelKey === "faceSide")
        return `${t.faceSide} ${face.labelIndex}`;
      return face.labelKey;
    },
    [t]
  );

  // ── Computed results ────────────────────────────────────────────────────
  const result = useMemo(() => {
    if (base.length < 3) return null;
    try {
      return computeAll(base, solidType, height);
    } catch {
      return null;
    }
  }, [base, solidType, height]);

  // ── Base point editing ──────────────────────────────────────────────────
  const updatePoint = useCallback(
    (i: number, axis: "x" | "y", val: string) => {
      const num = parseFloat(val);
      if (isNaN(num)) return;
      setBase((prev) => {
        const next = [...prev];
        next[i] = { ...next[i], [axis]: num };
        return next;
      });
    },
    []
  );

  const addPoint = useCallback(() => {
    setBase((prev) => {
      if (prev.length >= 6) return prev;
      const last = prev[prev.length - 1];
      return [...prev, { x: last.x + 1, y: last.y + 1 }];
    });
  }, []);

  const removePoint = useCallback((i: number) => {
    setBase((prev) => {
      if (prev.length <= 3) return prev;
      return prev.filter((_, idx) => idx !== i);
    });
  }, []);

  const resetToDefault = useCallback(() => {
    setBase(DEFAULT_BASES[base.length] ?? DEFAULT_BASES[4]);
  }, [base.length]);

  const setPointCount = useCallback((n: number) => {
    setBase(DEFAULT_BASES[n] ?? DEFAULT_BASES[4]);
  }, []);

  // ── Dihedral angle ──────────────────────────────────────────────────────
  const selectedDihedral = useMemo(() => {
    if (!result) return null;
    const a = parseInt(dihedralA);
    const b = parseInt(dihedralB);
    if (isNaN(a) || isNaN(b) || a === b) return null;
    return result.dihedralMatrix[a][b];
  }, [result, dihedralA, dihedralB]);

  const faceOptions = useMemo(() => {
    if (!result) return [];
    return result.faces.map((f, i) => ({
      label: getFaceLabel(f),
      value: String(i),
    }));
  }, [result, getFaceLabel]);

  const handleHeightChange = (val: string) => {
    setHeightInput(val);
    const n = parseFloat(val);
    if (!isNaN(n) && n > 0) setHeight(n);
  };

  // ── Styles (blueprint palette) ──────────────────────────────────────────
  const S = {
    bg: "#060e1a",
    panel: "#080f1e",
    card: "#0d1f3c",
    border: "#1a3a5c",
    cyan: "#4dd9f5",
    orange: "#f5a623",
    textMuted: "#6a8aaa",
    textDim: "#4a6a8a",
    textBase: "#a8d8ea",
    textBright: "#e0f0ff",
  } as const;

  return (
    <div
      className="min-h-screen flex flex-col overflow-hidden"
      style={{ background: `linear-gradient(160deg, ${S.bg} 0%, #0d1f3c 100%)` }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header
        className="flex-shrink-0 border-b px-4 py-2 flex items-center gap-3"
        style={{ borderColor: S.border, background: S.bg }}
      >
        <div
          className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
          style={{ background: "#1a4a7a" }}
        >
          <Calculator size={16} style={{ color: S.cyan }} />
        </div>
        <div className="flex-1 min-w-0">
          <h1
            className="text-base font-bold tracking-wide leading-tight"
            style={{ color: S.textBase, fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {t.appTitle}
          </h1>
          <p className="text-xs leading-tight" style={{ color: S.textDim }}>
            {t.appSubtitle}
          </p>
        </div>

        {/* Status badge */}
        <span
          className="text-xs px-2 py-1 rounded font-mono hidden sm:inline"
          style={{ background: "#1a3a5c", color: S.cyan }}
        >
          {base.length} {t.statusPoints} ·{" "}
          {solidType === "prism" ? t.statusPrism : t.statusPyramid}
        </span>

        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all"
          style={{
            background: "#1a3a5c",
            color: S.cyan,
            border: `1px solid ${S.border}`,
            fontFamily: "'Space Grotesk', sans-serif",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#1a4a7a";
            (e.currentTarget as HTMLButtonElement).style.borderColor = S.cyan;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#1a3a5c";
            (e.currentTarget as HTMLButtonElement).style.borderColor = S.border;
          }}
        >
          <Languages size={14} />
          {t.langSwitch}
        </button>
      </header>

      {/* ── Main layout ────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>

        {/* ── Left control panel ─────────────────────────────────────────── */}
        <aside
          className="w-72 flex-shrink-0 flex flex-col overflow-y-auto border-r"
          style={{ borderColor: S.border, background: S.panel }}
        >
          {/* Solid type & height */}
          <section className="p-4 border-b" style={{ borderColor: S.border }}>
            <SectionTitle color={S.cyan}>{t.sectionSolidType}</SectionTitle>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div>
                <Label className="text-xs mb-1 block" style={{ color: S.textMuted }}>
                  {t.labelType}
                </Label>
                <Select
                  value={solidType}
                  onValueChange={(v) => setSolidType(v as SolidType)}
                >
                  <SelectTrigger
                    className="h-8 text-sm"
                    style={{ background: S.card, borderColor: S.border, color: S.textBase }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: S.card, borderColor: S.border }}>
                    <SelectItem value="prism" style={{ color: S.textBase }}>
                      {t.optPrism}
                    </SelectItem>
                    <SelectItem value="pyramid" style={{ color: S.textBase }}>
                      {t.optPyramid}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block" style={{ color: S.textMuted }}>
                  {t.labelHeight}
                </Label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={heightInput}
                  onChange={(e) => handleHeightChange(e.target.value)}
                  className="h-8 text-sm font-mono"
                  style={{ background: S.card, borderColor: S.border, color: S.orange }}
                />
              </div>
            </div>
          </section>

          {/* Base vertices */}
          <section className="p-4 flex-1">
            <div className="flex items-center justify-between mb-2">
              <SectionTitle color={S.cyan}>{t.sectionBaseVerts}</SectionTitle>
              <div className="flex gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={resetToDefault}
                      style={{ color: S.textDim }}
                    >
                      <RotateCcw size={11} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t.tooltipReset}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={addPoint}
                      disabled={base.length >= 6}
                      style={{ color: base.length >= 6 ? "#2a4a6a" : S.cyan }}
                    >
                      <Plus size={11} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t.tooltipAddPoint}</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Quick preset buttons */}
            <div className="flex gap-1 mb-3">
              {[3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  onClick={() => setPointCount(n)}
                  className="flex-1 text-xs py-1 rounded transition-all"
                  style={{
                    background: base.length === n ? "#1a4a7a" : S.card,
                    color: base.length === n ? S.cyan : S.textDim,
                    border: `1px solid ${base.length === n ? S.cyan : S.border}`,
                  }}
                >
                  {n}
                </button>
              ))}
            </div>

            {/* Column headers */}
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6" />
              <div className="flex gap-1 flex-1">
                <span className="flex-1 text-center text-xs" style={{ color: S.textDim }}>x</span>
                <span className="flex-1 text-center text-xs" style={{ color: S.textDim }}>y</span>
              </div>
              <span className="w-4" />
            </div>

            {/* Vertex rows */}
            <div className="space-y-1.5">
              {base.map((pt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span
                    className="text-xs font-bold w-6 text-center flex-shrink-0 font-mono"
                    style={{ color: VERTEX_COLORS[i] }}
                  >
                    P{i + 1}
                  </span>
                  <div className="flex gap-1 flex-1">
                    <Input
                      type="number"
                      step="0.1"
                      value={pt.x}
                      onChange={(e) => updatePoint(i, "x", e.target.value)}
                      className="h-7 text-xs font-mono text-center flex-1"
                      style={{ background: S.card, borderColor: S.border, color: S.textBright }}
                      aria-label={`P${i + 1} ${t.labelX}`}
                    />
                    <Input
                      type="number"
                      step="0.1"
                      value={pt.y}
                      onChange={(e) => updatePoint(i, "y", e.target.value)}
                      className="h-7 text-xs font-mono text-center flex-1"
                      style={{ background: S.card, borderColor: S.border, color: S.textBright }}
                      aria-label={`P${i + 1} ${t.labelY}`}
                    />
                  </div>
                  <button
                    onClick={() => removePoint(i)}
                    disabled={base.length <= 3}
                    className="flex-shrink-0 transition-colors w-4"
                    style={{ color: base.length <= 3 ? "#1a3a5c" : S.textDim }}
                    aria-label={`Remove P${i + 1}`}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>

            <p className="text-xs mt-3 flex items-center gap-1" style={{ color: "#2a4a6a" }}>
              <Info size={10} />
              {t.hintBase}
            </p>
          </section>

          {/* Dihedral angle selector */}
          {result && (
            <section className="p-4 border-t" style={{ borderColor: S.border }}>
              <SectionTitle color={S.cyan}>{t.sectionDihedral}</SectionTitle>
              <div className="space-y-2 mt-3">
                <div>
                  <Label className="text-xs mb-1 block" style={{ color: S.textMuted }}>
                    {t.labelPlaneA}
                  </Label>
                  <Select
                    value={dihedralA}
                    onValueChange={(v) => {
                      setDihedralA(v);
                      setHighlightFaces([parseInt(v), parseInt(dihedralB)]);
                    }}
                  >
                    <SelectTrigger
                      className="h-8 text-xs"
                      style={{ background: S.card, borderColor: S.border, color: S.textBase }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent style={{ background: S.card, borderColor: S.border }}>
                      {faceOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}
                          style={{ color: S.textBase, fontSize: "0.75rem" }}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs mb-1 block" style={{ color: S.textMuted }}>
                    {t.labelPlaneB}
                  </Label>
                  <Select
                    value={dihedralB}
                    onValueChange={(v) => {
                      setDihedralB(v);
                      setHighlightFaces([parseInt(dihedralA), parseInt(v)]);
                    }}
                  >
                    <SelectTrigger
                      className="h-8 text-xs"
                      style={{ background: S.card, borderColor: S.border, color: S.textBase }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent style={{ background: S.card, borderColor: S.border }}>
                      {faceOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}
                          style={{ color: S.textBase, fontSize: "0.75rem" }}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedDihedral !== null && dihedralA !== dihedralB ? (
                  <div
                    className="mt-2 p-3 rounded text-center"
                    style={{ background: "#1a3a5c", border: `1px solid ${S.border}` }}
                  >
                    <div className="text-xs mb-1" style={{ color: S.textMuted }}>
                      {t.dihedralAngle}
                    </div>
                    <div
                      className="text-3xl font-bold font-mono"
                      style={{ color: S.orange }}
                    >
                      {fmt(selectedDihedral, 2)}°
                    </div>
                    <div className="text-xs mt-1" style={{ color: S.textDim }}>
                      ≈ {fmt((selectedDihedral * Math.PI) / 180, 4)} {t.dihedralRad}
                    </div>
                  </div>
                ) : (
                  <div
                    className="mt-2 p-3 rounded text-center text-xs"
                    style={{ background: S.card, color: "#2a4a6a" }}
                  >
                    {t.dihedralHint}
                  </div>
                )}
              </div>
            </section>
          )}
        </aside>

        {/* ── Right: 3D viewer + results ──────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* 3D Viewer */}
          <div className="flex-1 relative overflow-hidden" style={{ minHeight: 280 }}>
            {base.length >= 3 ? (
              <SolidViewer
                base={base}
                solidType={solidType}
                height={height}
                highlightFaces={highlightFaces}
                faces={result?.faces ?? []}
                getFaceLabel={getFaceLabel}
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-sm"
                style={{ color: "#2a4a6a" }}
              >
                {t.viewerNeedPoints}
              </div>
            )}
            <div
              className="absolute bottom-3 left-3 text-xs px-2 py-1 rounded pointer-events-none"
              style={{ background: "rgba(6,14,26,0.85)", color: "#2a4a6a" }}
            >
              {t.viewerHint}
            </div>
          </div>

          {/* Results panel */}
          {result && (
            <div
              className="border-t flex-shrink-0 overflow-y-auto"
              style={{ borderColor: S.border, maxHeight: "46vh" }}
            >
              <Tabs defaultValue="base" className="w-full">
                <TabsList
                  className="w-full rounded-none border-b grid grid-cols-4"
                  style={{ background: S.bg, borderColor: S.border, height: "auto" }}
                >
                  {[
                    { value: "base", label: t.tabBase },
                    { value: "solid", label: t.tabSolid },
                    { value: "faces", label: t.tabFaces },
                    { value: "dihedral", label: t.tabDihedralMatrix },
                  ].map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="text-xs py-2 rounded-none"
                      style={{ color: S.textDim }}
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {/* ── Base tab ─────────────────────────────────────────── */}
                <TabsContent value="base" className="p-4 m-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ResultCard title={t.cardEdgeLengths} S={S}>
                      {result.baseEdges.map((e, i) => (
                        <ResultRow
                          key={i}
                          label={`P${i + 1}→P${(i + 1) % base.length + 1}`}
                          value={fmt(e)}
                          unit={t.unitLength}
                          S={S}
                        />
                      ))}
                      <ResultRow
                        label={t.labelPerimeter}
                        value={fmt(result.basePerimeterVal)}
                        unit={t.unitLength}
                        highlight
                        S={S}
                      />
                    </ResultCard>

                    <ResultCard title={t.cardAngles} S={S}>
                      {result.baseAngles.map((a, i) => (
                        <ResultRow
                          key={i}
                          label={`∠P${i + 1}`}
                          value={fmt(a, 2)}
                          unit={t.unitDeg}
                          S={S}
                        />
                      ))}
                      <ResultRow
                        label={t.labelAngleSum}
                        value={fmt(result.baseAngles.reduce((s, a) => s + a, 0), 1)}
                        unit={t.unitDeg}
                        highlight
                        S={S}
                      />
                    </ResultCard>

                    <ResultCard title={t.cardArea} S={S}>
                      <div
                        className="text-3xl font-bold font-mono text-center py-3"
                        style={{ color: S.orange }}
                      >
                        {fmt(result.baseAreaVal, 4)}
                      </div>
                      <div className="text-center text-xs" style={{ color: S.textDim }}>
                        {t.unitAreaSq}
                      </div>
                      <div className="text-center text-xs mt-1" style={{ color: "#2a4a6a" }}>
                        {t.formulaArea}
                      </div>
                    </ResultCard>
                  </div>
                </TabsContent>

                {/* ── Solid tab ────────────────────────────────────────── */}
                <TabsContent value="solid" className="p-4 m-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ResultCard title={t.cardVolume} S={S}>
                      <div
                        className="text-3xl font-bold font-mono text-center py-3"
                        style={{ color: S.orange }}
                      >
                        {fmt(result.solidVolume, 4)}
                      </div>
                      <div className="text-center text-xs" style={{ color: S.textDim }}>
                        {t.unitVolCube} ·{" "}
                        {solidType === "prism" ? t.formulaPrism : t.formulaPyramid}
                      </div>
                      <div
                        className="mt-3 p-2 rounded text-xs font-mono space-y-0.5"
                        style={{ background: S.bg, color: S.cyan }}
                      >
                        <div>{t.labelBaseArea} = {fmt(result.baseAreaVal, 4)}</div>
                        <div>{t.labelHeightH} = {fmt(height, 4)}</div>
                        <div style={{ color: S.orange }}>
                          {solidType === "prism"
                            ? `V = ${fmt(result.baseAreaVal, 4)} × ${fmt(height, 4)} = ${fmt(result.solidVolume, 4)}`
                            : `V = ⅓ × ${fmt(result.baseAreaVal, 4)} × ${fmt(height, 4)} = ${fmt(result.solidVolume, 4)}`}
                        </div>
                      </div>
                    </ResultCard>

                    <ResultCard title={t.cardLateralEdges} S={S}>
                      {result.lateralEdges.map((e, i) => (
                        <ResultRow
                          key={i}
                          label={
                            solidType === "prism"
                              ? `P${i + 1}→P${i + 1}' (${t.labelLateralEdgePrism})`
                              : `P${i + 1}→A (${t.labelLateralEdgePyramid})`
                          }
                          value={fmt(e)}
                          unit={t.unitLength}
                          S={S}
                        />
                      ))}
                    </ResultCard>
                  </div>
                </TabsContent>

                {/* ── Faces tab ────────────────────────────────────────── */}
                <TabsContent value="faces" className="p-4 m-0">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {result.faces.map((face, i) => (
                      <div
                        key={i}
                        className="p-3 rounded border transition-all"
                        style={{
                          background: S.card,
                          borderColor: highlightFaces.includes(i) ? S.orange : S.border,
                          boxShadow: highlightFaces.includes(i)
                            ? `0 0 8px ${S.orange}44`
                            : "none",
                        }}
                      >
                        <div className="text-xs font-bold mb-1 truncate" style={{ color: S.cyan }}>
                          {getFaceLabel(face)}
                        </div>
                        <div className="text-xl font-mono font-bold" style={{ color: S.orange }}>
                          {fmt(result.faceAreas[i], 4)}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: S.textDim }}>
                          {t.unitAreaSq} · {face.vertices.length} {t.unitFaceVerts}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* ── Dihedral matrix tab ──────────────────────────────── */}
                <TabsContent value="dihedral" className="p-4 m-0">
                  <p className="text-xs mb-3" style={{ color: S.textDim }}>
                    {t.dihedralMatrixHint}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="text-xs font-mono border-collapse">
                      <thead>
                        <tr>
                          <th
                            className="p-2 text-left border"
                            style={{ color: S.textDim, borderColor: S.border, minWidth: 80 }}
                          >
                            {t.colFace}
                          </th>
                          {result.faces.map((f, i) => (
                            <th
                              key={i}
                              className="p-2 text-center border"
                              style={{
                                color: S.cyan,
                                borderColor: S.border,
                                minWidth: 72,
                                background:
                                  parseInt(dihedralA) === i || parseInt(dihedralB) === i
                                    ? "#1a3a5c"
                                    : "transparent",
                              }}
                            >
                              {getFaceLabel(f)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.faces.map((fRow, i) => (
                          <tr key={i}>
                            <td
                              className="p-2 font-bold border"
                              style={{
                                color: S.cyan,
                                borderColor: S.border,
                                background:
                                  parseInt(dihedralA) === i || parseInt(dihedralB) === i
                                    ? "#1a3a5c"
                                    : "transparent",
                              }}
                            >
                              {getFaceLabel(fRow)}
                            </td>
                            {result.dihedralMatrix[i].map((angle, j) => {
                              const isSelected =
                                (parseInt(dihedralA) === i && parseInt(dihedralB) === j) ||
                                (parseInt(dihedralA) === j && parseInt(dihedralB) === i);
                              return (
                                <td
                                  key={j}
                                  className="p-2 text-center border cursor-pointer transition-colors"
                                  style={{
                                    borderColor: S.border,
                                    color: i === j ? "#2a4a6a" : isSelected ? S.orange : S.textBase,
                                    background: isSelected ? "#1a3a5c" : "transparent",
                                    fontWeight: isSelected ? "bold" : "normal",
                                  }}
                                  onClick={() => {
                                    if (i !== j) {
                                      setDihedralA(String(i));
                                      setDihedralB(String(j));
                                      setHighlightFaces([i, j]);
                                    }
                                  }}
                                  title={i !== j ? `${getFaceLabel(fRow)} ↔ ${getFaceLabel(result.faces[j])}` : ""}
                                >
                                  {i === j ? "—" : `${fmt(angle, 2)}°`}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs mt-2" style={{ color: "#2a4a6a" }}>
                    ↑ {/* click hint */}
                    {lang === "zh" ? "點擊表格中的格子可直接選取對應的兩個平面" : "Click any cell to select the two corresponding faces"}
                  </p>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({
  children,
  color,
}: {
  children: React.ReactNode;
  color: string;
}) {
  return (
    <h2
      className="text-xs font-bold uppercase tracking-widest"
      style={{ color, fontFamily: "'Space Grotesk', sans-serif" }}
    >
      {children}
    </h2>
  );
}

const S_DEFAULT = {
  card: "#0d1f3c",
  border: "#1a3a5c",
  cyan: "#4dd9f5",
  textDim: "#4a6a8a",
  textBase: "#a8d8ea",
  orange: "#f5a623",
};

function ResultCard({
  title,
  children,
  S = S_DEFAULT,
}: {
  title: string;
  children: React.ReactNode;
  S?: typeof S_DEFAULT;
}) {
  return (
    <div
      className="p-4 rounded border"
      style={{ background: S.card, borderColor: S.border }}
    >
      <h3
        className="text-xs font-bold uppercase tracking-wider mb-3"
        style={{ color: S.cyan }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function ResultRow({
  label,
  value,
  unit,
  highlight = false,
  S = S_DEFAULT,
}: {
  label: string;
  value: string;
  unit: string;
  highlight?: boolean;
  S?: typeof S_DEFAULT;
}) {
  return (
    <div
      className="flex items-center justify-between py-1 border-b last:border-b-0"
      style={{ borderColor: S.border }}
    >
      <span className="text-xs truncate mr-2" style={{ color: "#6a8aaa" }}>
        {label}
      </span>
      <span
        className="text-sm font-mono font-bold flex-shrink-0"
        style={{ color: highlight ? S.orange : S.textBase }}
      >
        {value}{" "}
        <span className="text-xs font-normal" style={{ color: S.textDim }}>
          {unit}
        </span>
      </span>
    </div>
  );
}
