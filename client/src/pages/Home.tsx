/**
 * Home.tsx — Main page for Solid Geometry Calculator
 *
 * Design: Elegant White Tech
 * - Background: #f8fafc (near-white slate)
 * - Primary accent: #6366f1 (indigo)
 * - Secondary: #14b8a6 (teal)
 * - Highlight values: #f59e0b (amber)
 * - Typography: Space Grotesk (labels) + JetBrains Mono (numbers)
 *
 * Two-step workflow:
 *   Step 1: Set up named vertices → 2D diagram + calculations (edges, angles, area, four centers)
 *   Step 2: Build 3D solid → 3D viewer + calculations (volume, faces, dihedral angles)
 *
 * Features:
 * - Click 3D faces to select dihedral pair
 * - Dihedral helper: shared edge, normal arrows, angle arc
 * - Four centers: centroid G, circumcenter O, incenter I, orthocenter H (toggle each)
 */

import { useState, useCallback, useMemo } from "react";
import { useLang } from "@/contexts/LangContext";
import BaseCanvas2D, { type CenterVisibility } from "@/components/BaseCanvas2D";
import SolidViewer from "@/components/SolidViewer";
import {
  computeBase,
  computeSolid,
  computeCenters,
  getFaceColor,
  CENTER_COLORS,
  type NamedPoint,
  type SolidType,
} from "@/lib/geometry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, RotateCcw, Trash2, ArrowRight, ArrowLeft, MousePointerClick } from "lucide-react";

// ── Default presets ──────────────────────────────────────────────────────────
const PRESETS: Record<string, NamedPoint[]> = {
  "3": [
    { label: "A", x: 0, y: 0 },
    { label: "B", x: 4, y: 0 },
    { label: "C", x: 2, y: 3 },
  ],
  "4": [
    { label: "A", x: 0, y: 0 },
    { label: "B", x: 4, y: 0 },
    { label: "C", x: 4, y: 3 },
    { label: "D", x: 0, y: 3 },
  ],
  "5": [
    { label: "A", x: 0, y: 0 },
    { label: "B", x: 4, y: 0 },
    { label: "C", x: 5, y: 3 },
    { label: "D", x: 2, y: 5 },
    { label: "E", x: -1, y: 3 },
  ],
  "6": [
    { label: "A", x: 2, y: 0 },
    { label: "B", x: 4, y: 1 },
    { label: "C", x: 4, y: 3 },
    { label: "D", x: 2, y: 4 },
    { label: "E", x: 0, y: 3 },
    { label: "F", x: 0, y: 1 },
  ],
};

// ── Style tokens ─────────────────────────────────────────────────────────────
const S = {
  bg: "#f8fafc",
  panel: "#ffffff",
  panelBorder: "#e2e8f0",
  panelBorder2: "#f1f5f9",
  text: "#0f172a",
  textMuted: "#64748b",
  textFaint: "#94a3b8",
  accent: "#6366f1",
  accentLight: "#eef2ff",
  accentMid: "#818cf8",
  teal: "#14b8a6",
  tealLight: "#f0fdfa",
  amber: "#f59e0b",
  amberLight: "#fffbeb",
  rose: "#f43f5e",
  headerBg: "#ffffff",
  headerBorder: "#e2e8f0",
  cardBg: "#f8fafc",
  cardBorder: "#e2e8f0",
  mono: "'JetBrains Mono', monospace",
  sans: "'Space Grotesk', sans-serif",
};

const fmt = (n: number, dp = 4) => n.toFixed(dp);
const fmtShort = (n: number) => n.toFixed(2);

// ── Center config ─────────────────────────────────────────────────────────────
const CENTER_KEYS = ["centroid", "circumcenter", "incenter", "orthocenter"] as const;
type CenterKey = (typeof CENTER_KEYS)[number];

const CENTER_SYMBOL: Record<CenterKey, string> = {
  centroid: "G",
  circumcenter: "O",
  incenter: "I",
  orthocenter: "H",
};

export default function Home() {
  const { t, lang, setLang } = useLang();

  // ── State ─────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2>(1);
  const [points, setPoints] = useState<NamedPoint[]>(PRESETS["4"]);
  const [solidType, setSolidType] = useState<SolidType>("prism");
  const [height, setHeight] = useState<number>(5);
  const [apexLabel, setApexLabel] = useState<string>("A'");
  const [showGrid, setShowGrid] = useState(true);

  // Centers visibility
  const [centerVis, setCenterVis] = useState<CenterVisibility>({
    centroid: false,
    circumcenter: false,
    incenter: false,
    orthocenter: false,
    circumcircle: false,
    incircle: false,
  });

  // Dihedral selection
  const [faceAIdx, setFaceAIdx] = useState<number>(0);
  const [faceBIdx, setFaceBIdx] = useState<number>(1);
  // Click-to-select state: 0 = waiting for face A, 1 = waiting for face B
  const [clickSelectStep, setClickSelectStep] = useState<0 | 1>(0);

  // ── Computed geometry ─────────────────────────────────────────────────────
  const baseResult = useMemo(() => {
    if (points.length < 3) return null;
    return computeBase(points);
  }, [points]);

  const centersResult = useMemo(() => {
    if (points.length < 3) return null;
    return computeCenters(points);
  }, [points]);

  const solidResult = useMemo(() => {
    if (points.length < 3) return null;
    return computeSolid(points, solidType, height, apexLabel);
  }, [points, solidType, height, apexLabel]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const updatePoint = useCallback(
    (i: number, field: keyof NamedPoint, value: string | number) => {
      setPoints((prev) => {
        const next = [...prev];
        next[i] = { ...next[i], [field]: value };
        return next;
      });
    },
    []
  );

  const movePoint = useCallback((i: number, x: number, y: number) => {
    setPoints((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], x, y };
      return next;
    });
  }, []);

  const addPoint = () => {
    if (points.length >= 6) return;
    const labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const usedLabels = new Set(points.map((p) => p.label));
    let newLabel = "";
    for (const l of labels) {
      if (!usedLabels.has(l)) { newLabel = l; break; }
    }
    if (!newLabel) newLabel = `P${points.length + 1}`;
    setPoints((prev) => [...prev, { label: newLabel, x: 0, y: 0 }]);
  };

  const removePoint = (i: number) => {
    if (points.length <= 3) return;
    setPoints((prev) => prev.filter((_, idx) => idx !== i));
  };

  const applyPreset = (n: string) => setPoints(PRESETS[n]);
  const resetPoints = () => setPoints(PRESETS["4"]);

  const toggleCenter = (key: keyof CenterVisibility) => {
    setCenterVis((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 3D face click handler
  const handleFaceClick = useCallback(
    (faceIdx: number) => {
      if (clickSelectStep === 0) {
        setFaceAIdx(faceIdx);
        setClickSelectStep(1);
      } else {
        if (faceIdx !== faceAIdx) {
          setFaceBIdx(faceIdx);
        }
        setClickSelectStep(0);
      }
    },
    [clickSelectStep, faceAIdx]
  );

  // ── Dihedral ──────────────────────────────────────────────────────────────
  const faces = solidResult?.faces ?? [];
  const dihedralDeg =
    solidResult && faces.length > 1 && faceAIdx !== faceBIdx
      ? solidResult.dihedralMatrix[faceAIdx]?.[faceBIdx] ?? 0
      : 0;
  const dihedralRad = (dihedralDeg * Math.PI) / 180;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: S.bg, color: S.text, fontFamily: S.sans }}
    >
      {/* ── Header ── */}
      <header
        className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{
          background: S.headerBg,
          borderColor: S.headerBorder,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shadow-sm"
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#ffffff",
            }}
          >
            Σ
          </div>
          <div>
            <div className="font-bold text-sm" style={{ color: S.text }}>
              {t.appTitle}
            </div>
            <div className="text-xs" style={{ color: S.textFaint }}>
              {t.appSubtitle}
            </div>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setStep(1)}
            className="px-3 py-1.5 rounded-full font-semibold transition-all"
            style={{
              background: step === 1 ? S.accent : S.panelBorder2,
              color: step === 1 ? "#ffffff" : S.textMuted,
              boxShadow: step === 1 ? "0 2px 8px rgba(99,102,241,0.3)" : "none",
            }}
          >
            {t.step1Label}
          </button>
          <ArrowRight size={12} style={{ color: S.textFaint }} />
          <button
            onClick={() => { if (points.length >= 3) setStep(2); }}
            className="px-3 py-1.5 rounded-full font-semibold transition-all"
            style={{
              background: step === 2 ? S.amber : S.panelBorder2,
              color: step === 2 ? "#ffffff" : S.textMuted,
              boxShadow: step === 2 ? "0 2px 8px rgba(245,158,11,0.3)" : "none",
              opacity: points.length < 3 ? 0.5 : 1,
            }}
          >
            {t.step2Label}
          </button>
        </div>

        <button
          onClick={() => setLang(lang === "zh" ? "en" : "zh")}
          className="text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors hover:bg-slate-50"
          style={{ borderColor: S.panelBorder, color: S.accent }}
        >
          {t.langSwitch}
        </button>
      </header>

      {/* ── Main layout ── */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {/* ── Left panel ── */}
        <aside
          className="flex flex-col gap-3 overflow-y-auto p-3"
          style={{
            width: 272,
            minWidth: 220,
            background: S.panel,
            borderRight: `1px solid ${S.panelBorder}`,
          }}
        >
          {/* ── Vertex setup ── */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: S.accent }}
              >
                {t.sectionVertices}
              </span>
              <div className="flex gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={resetPoints}
                      className="p-1 rounded hover:bg-slate-100 transition-colors"
                    >
                      <RotateCcw size={13} style={{ color: S.textMuted }} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{t.tooltipReset}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={addPoint}
                      disabled={points.length >= 6}
                      className="p-1 rounded hover:bg-slate-100 transition-colors disabled:opacity-30"
                    >
                      <Plus size={13} style={{ color: S.accent }} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{t.tooltipAddPoint}</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Preset buttons */}
            <div className="flex gap-1 mb-2">
              {(["3", "4", "5", "6"] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => applyPreset(n)}
                  className="flex-1 py-1 text-xs rounded-md font-medium transition-all"
                  style={{
                    background: points.length === Number(n) ? S.accent : S.cardBg,
                    color: points.length === Number(n) ? "#ffffff" : S.textMuted,
                    border: `1px solid ${points.length === Number(n) ? S.accent : S.cardBorder}`,
                  }}
                >
                  {n === "3" ? t.presetTriangle : n === "4" ? t.presetSquare : n === "5" ? t.presetPentagon : t.presetHexagon}
                </button>
              ))}
            </div>

            {/* Column headers */}
            <div className="flex gap-1 mb-1 text-xs" style={{ color: S.textFaint }}>
              <div style={{ width: 42 }}>{t.labelVertexName}</div>
              <div className="flex-1 text-center">{t.labelX}</div>
              <div className="flex-1 text-center">{t.labelY}</div>
              <div style={{ width: 20 }} />
            </div>

            {/* Vertex rows */}
            {points.map((pt, i) => (
              <div key={i} className="flex gap-1 mb-1 items-center">
                <div className="flex items-center gap-1" style={{ width: 42 }}>
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: getFaceColor(i + 2) }}
                  />
                  <Input
                    value={pt.label}
                    onChange={(e) => updatePoint(i, "label", e.target.value)}
                    className="h-6 text-xs px-1 font-bold"
                    style={{
                      background: S.cardBg,
                      border: `1px solid ${S.cardBorder}`,
                      color: getFaceColor(i + 2),
                      width: 30,
                      minWidth: 0,
                    }}
                    maxLength={4}
                  />
                </div>
                <Input
                  type="number"
                  value={pt.x}
                  onChange={(e) => updatePoint(i, "x", parseFloat(e.target.value) || 0)}
                  className="flex-1 h-6 text-xs px-1"
                  style={{ background: S.cardBg, border: `1px solid ${S.cardBorder}`, color: S.text }}
                  step={0.5}
                />
                <Input
                  type="number"
                  value={pt.y}
                  onChange={(e) => updatePoint(i, "y", parseFloat(e.target.value) || 0)}
                  className="flex-1 h-6 text-xs px-1"
                  style={{ background: S.cardBg, border: `1px solid ${S.cardBorder}`, color: S.text }}
                  step={0.5}
                />
                <button
                  onClick={() => removePoint(i)}
                  disabled={points.length <= 3}
                  className="p-0.5 rounded hover:bg-rose-50 transition-colors disabled:opacity-20"
                >
                  <Trash2 size={11} style={{ color: S.rose }} />
                </button>
              </div>
            ))}

            <p className="text-xs mt-1" style={{ color: S.textFaint }}>
              ⊙ {t.hintBase}
            </p>
          </section>

          {/* ── STEP 2: Solid settings ── */}
          {step === 2 && (
            <section
              className="rounded-lg p-2.5"
              style={{ background: S.amberLight, border: `1px solid #fde68a` }}
            >
              <div
                className="text-xs font-bold uppercase tracking-widest mb-2"
                style={{ color: S.amber }}
              >
                {t.sectionSolidType}
              </div>
              <div className="flex gap-2 mb-2">
                <div className="flex-1">
                  <div className="text-xs mb-1" style={{ color: S.textMuted }}>{t.labelType}</div>
                  <Select value={solidType} onValueChange={(v) => setSolidType(v as SolidType)}>
                    <SelectTrigger
                      className="h-7 text-xs"
                      style={{ background: "#ffffff", border: `1px solid #fde68a`, color: S.text }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prism">{t.optPrism}</SelectItem>
                      <SelectItem value="pyramid">{t.optPyramid}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <div className="text-xs mb-1" style={{ color: S.textMuted }}>{t.labelHeight}</div>
                  <Input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(parseFloat(e.target.value) || 1)}
                    className="h-7 text-xs"
                    style={{ background: "#ffffff", border: `1px solid #fde68a`, color: S.amber, fontFamily: S.mono }}
                    min={0.1}
                    step={0.5}
                  />
                </div>
              </div>
              {solidType === "pyramid" && (
                <div>
                  <div className="text-xs mb-1" style={{ color: S.textMuted }}>{t.labelApexLabel}</div>
                  <Input
                    value={apexLabel}
                    onChange={(e) => setApexLabel(e.target.value)}
                    className="h-7 text-xs"
                    style={{ background: "#ffffff", border: `1px solid #fde68a`, color: S.amber }}
                    maxLength={4}
                  />
                </div>
              )}
            </section>
          )}

          {/* ── STEP 2: Dihedral selector ── */}
          {step === 2 && solidResult && faces.length > 1 && (
            <section
              className="rounded-lg p-2.5"
              style={{ background: S.accentLight, border: `1px solid #c7d2fe` }}
            >
              <div
                className="text-xs font-bold uppercase tracking-widest mb-2"
                style={{ color: S.accent }}
              >
                {t.sectionDihedral}
              </div>

              {/* Click-to-select status */}
              <div
                className="flex items-center gap-1.5 mb-2 px-2 py-1.5 rounded-md text-xs"
                style={{
                  background: clickSelectStep === 1 ? "#fef3c7" : "#f0fdf4",
                  border: `1px solid ${clickSelectStep === 1 ? "#fde68a" : "#bbf7d0"}`,
                  color: clickSelectStep === 1 ? "#92400e" : "#166534",
                }}
              >
                <MousePointerClick size={12} />
                {clickSelectStep === 0
                  ? t.viewerClickFaceHint
                  : t.viewerClickFace2Hint}
              </div>

              <div className="flex gap-2 mb-2">
                <div className="flex-1">
                  <div className="text-xs mb-1" style={{ color: S.textMuted }}>{t.labelPlaneA}</div>
                  <Select
                    value={String(faceAIdx)}
                    onValueChange={(v) => setFaceAIdx(Number(v))}
                  >
                    <SelectTrigger
                      className="h-7 text-xs"
                      style={{
                        background: "#ffffff",
                        border: `2px solid ${getFaceColor(faceAIdx)}`,
                        color: getFaceColor(faceAIdx),
                        fontWeight: 700,
                      }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {faces.map((f, i) => (
                        <SelectItem key={i} value={String(i)}>
                          <span style={{ color: getFaceColor(i) }}>{f.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <div className="text-xs mb-1" style={{ color: S.textMuted }}>{t.labelPlaneB}</div>
                  <Select
                    value={String(faceBIdx)}
                    onValueChange={(v) => setFaceBIdx(Number(v))}
                  >
                    <SelectTrigger
                      className="h-7 text-xs"
                      style={{
                        background: "#ffffff",
                        border: `2px solid ${getFaceColor(faceBIdx)}`,
                        color: getFaceColor(faceBIdx),
                        fontWeight: 700,
                      }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {faces.map((f, i) => (
                        <SelectItem key={i} value={String(i)}>
                          <span style={{ color: getFaceColor(i) }}>{f.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {faceAIdx !== faceBIdx ? (
                <div
                  className="rounded-lg p-3 text-center"
                  style={{ background: "#ffffff", border: `1px solid #c7d2fe` }}
                >
                  <div className="text-xs mb-1" style={{ color: S.textMuted }}>
                    <span style={{ color: getFaceColor(faceAIdx) }}>{faces[faceAIdx]?.name}</span>
                    {" ∩ "}
                    <span style={{ color: getFaceColor(faceBIdx) }}>{faces[faceBIdx]?.name}</span>
                  </div>
                  <div
                    className="text-3xl font-bold"
                    style={{ color: S.amber, fontFamily: S.mono }}
                  >
                    {fmt(dihedralDeg, 2)}°
                  </div>
                  <div className="text-xs mt-1" style={{ color: S.textFaint }}>
                    ≈ {fmt(dihedralRad, 4)} {t.dihedralRad}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-center" style={{ color: S.textFaint }}>
                  {t.dihedralHint}
                </p>
              )}
            </section>
          )}

          {/* ── Step transition ── */}
          <div className="mt-auto pt-2">
            {step === 1 ? (
              <Button
                onClick={() => setStep(2)}
                disabled={points.length < 3}
                className="w-full text-sm font-bold shadow-sm"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  color: "#ffffff",
                  border: "none",
                }}
              >
                {t.btnToStep2} <ArrowRight size={14} className="ml-1" />
              </Button>
            ) : (
              <Button
                onClick={() => setStep(1)}
                variant="outline"
                className="w-full text-sm"
                style={{ borderColor: S.accent, color: S.accent }}
              >
                <ArrowLeft size={14} className="mr-1" /> {t.btnBackStep1}
              </Button>
            )}
          </div>
        </aside>

        {/* ── Centre: diagram/viewer ── */}
        <main className="flex-1 flex flex-col overflow-hidden" style={{ minWidth: 0 }}>
          {step === 1 ? (
            <div className="flex-1 relative" style={{ minHeight: 0 }}>
              <div className="absolute inset-0">
                <BaseCanvas2D
                  points={points}
                  onPointMove={movePoint}
                  showGrid={showGrid}
                  centers={centersResult}
                  centerVisibility={centerVis}
                />
              </div>
              <div className="absolute bottom-3 left-3 flex items-center gap-3">
                <label
                  className="flex items-center gap-1.5 text-xs cursor-pointer"
                  style={{ color: S.textMuted }}
                >
                  <input
                    type="checkbox"
                    checked={showGrid}
                    onChange={(e) => setShowGrid(e.target.checked)}
                    className="w-3 h-3"
                  />
                  {t.canvas2DGrid}
                </label>
              </div>
              <div
                className="absolute bottom-3 right-3 text-xs px-2 py-1 rounded"
                style={{ background: "rgba(255,255,255,0.8)", color: S.textFaint }}
              >
                {t.canvas2DHint}
              </div>
            </div>
          ) : (
            <div className="flex-1" style={{ minHeight: 0 }}>
              {solidResult ? (
                <SolidViewer
                  points={points}
                  solidType={solidType}
                  height={height}
                  apexLabel={apexLabel}
                  faces={solidResult.faces}
                  highlightFaceIndices={
                    faceAIdx !== faceBIdx ? [faceAIdx, faceBIdx] : []
                  }
                  onFaceClick={handleFaceClick}
                />
              ) : (
                <div
                  className="flex items-center justify-center h-full text-sm"
                  style={{ color: S.textFaint }}
                >
                  {t.viewerNeedPoints}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div
              className="text-xs text-center py-1.5"
              style={{
                color: S.textFaint,
                borderTop: `1px solid ${S.panelBorder}`,
                background: S.panel,
              }}
            >
              {t.viewerHint}
            </div>
          )}
        </main>

        {/* ── Right panel: results ── */}
        <aside
          className="flex flex-col overflow-y-auto"
          style={{
            width: 320,
            minWidth: 260,
            background: S.panel,
            borderLeft: `1px solid ${S.panelBorder}`,
          }}
        >
          {step === 1 && baseResult ? (
            <Tabs defaultValue="edges" className="flex-1 flex flex-col">
              <TabsList className="grid grid-cols-4 m-2 mb-0">
                <TabsTrigger value="edges" className="text-xs">{t.tab2DEdges}</TabsTrigger>
                <TabsTrigger value="angles" className="text-xs">{t.tab2DAngles}</TabsTrigger>
                <TabsTrigger value="area" className="text-xs">{t.tab2DArea}</TabsTrigger>
                <TabsTrigger value="centers" className="text-xs">{t.tab2DCenters}</TabsTrigger>
              </TabsList>

              {/* Edges */}
              <TabsContent value="edges" className="flex-1 overflow-y-auto p-3">
                <ResultCard title={t.tab2DEdges} accent={S.accent}>
                  {baseResult.edgeLengths.map((len, i) => (
                    <ResultRow
                      key={i}
                      label={baseResult.edgeLabels[i]}
                      value={fmt(len)}
                      unit={t.unitLength}
                    />
                  ))}
                  <Divider />
                  <ResultRow
                    label={t.labelPerimeter}
                    value={fmt(baseResult.perimeter)}
                    unit={t.unitLength}
                    highlight
                  />
                </ResultCard>
              </TabsContent>

              {/* Angles */}
              <TabsContent value="angles" className="flex-1 overflow-y-auto p-3">
                <ResultCard title={t.tab2DAngles} accent={S.teal}>
                  {baseResult.angles.map((ang, i) => (
                    <ResultRow
                      key={i}
                      label={baseResult.angleLabels[i]}
                      value={fmt(ang, 2)}
                      unit={t.unitDeg}
                    />
                  ))}
                  <Divider />
                  <ResultRow
                    label={t.labelAngleSum}
                    value={fmt(baseResult.angles.reduce((s, a) => s + a, 0), 2)}
                    unit={t.unitDeg}
                    highlight
                  />
                </ResultCard>
              </TabsContent>

              {/* Area */}
              <TabsContent value="area" className="flex-1 overflow-y-auto p-3">
                <ResultCard title={t.tab2DArea} accent={S.amber}>
                  <div className="text-center py-4">
                    <div
                      className="text-4xl font-bold mb-1"
                      style={{ color: S.amber, fontFamily: S.mono }}
                    >
                      {fmt(baseResult.area)}
                    </div>
                    <div className="text-xs" style={{ color: S.textFaint }}>
                      {t.unitAreaSq}
                    </div>
                    <div className="text-xs mt-2" style={{ color: S.textFaint }}>
                      {t.formulaArea}
                    </div>
                  </div>
                </ResultCard>
              </TabsContent>

              {/* Four Centers */}
              <TabsContent value="centers" className="flex-1 overflow-y-auto p-3">
                <div className="space-y-2">
                  {/* Toggle buttons */}
                  <div
                    className="rounded-lg p-2.5"
                    style={{ background: S.cardBg, border: `1px solid ${S.cardBorder}` }}
                  >
                    <div
                      className="text-xs font-bold uppercase tracking-widest mb-2"
                      style={{ color: S.textMuted }}
                    >
                      {t.sectionCenters}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {CENTER_KEYS.map((key) => {
                        const color = CENTER_COLORS[key];
                        const active = centerVis[key];
                        const labels: Record<CenterKey, string> = {
                          centroid: t.centerCentroid,
                          circumcenter: t.centerCircumcenter,
                          incenter: t.centerIncenter,
                          orthocenter: t.centerOrthocenter,
                        };
                        return (
                          <button
                            key={key}
                            onClick={() => toggleCenter(key)}
                            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all"
                            style={{
                              background: active ? color + "18" : S.cardBg,
                              border: `1.5px solid ${active ? color : S.cardBorder}`,
                              color: active ? color : S.textMuted,
                            }}
                          >
                            <span
                              className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={{
                                background: active ? color : S.panelBorder2,
                                color: active ? "#fff" : S.textFaint,
                              }}
                            >
                              {CENTER_SYMBOL[key]}
                            </span>
                            {labels[key]}
                          </button>
                        );
                      })}
                    </div>

                    {/* Circle toggles */}
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => toggleCenter("circumcircle")}
                        className="flex-1 text-xs py-1 rounded-md transition-all"
                        style={{
                          background: centerVis.circumcircle ? CENTER_COLORS.circumcenter + "18" : S.cardBg,
                          border: `1px solid ${centerVis.circumcircle ? CENTER_COLORS.circumcenter : S.cardBorder}`,
                          color: centerVis.circumcircle ? CENTER_COLORS.circumcenter : S.textMuted,
                        }}
                      >
                        ○ {t.showCircumcircle}
                      </button>
                      <button
                        onClick={() => toggleCenter("incircle")}
                        className="flex-1 text-xs py-1 rounded-md transition-all"
                        style={{
                          background: centerVis.incircle ? CENTER_COLORS.incenter + "18" : S.cardBg,
                          border: `1px solid ${centerVis.incircle ? CENTER_COLORS.incenter : S.cardBorder}`,
                          color: centerVis.incircle ? CENTER_COLORS.incenter : S.textMuted,
                        }}
                      >
                        ○ {t.showIncircle}
                      </button>
                    </div>
                  </div>

                  {/* Center data */}
                  {centersResult && (
                    <>
                      {points.length > 3 && (
                        <p className="text-xs px-1" style={{ color: S.textFaint }}>
                          {t.centerNote}
                        </p>
                      )}
                      {points.length === 3 && (
                        <p className="text-xs px-1" style={{ color: S.teal }}>
                          ✓ {t.centerNoteTriangle}
                        </p>
                      )}

                      {/* Centroid */}
                      <CenterCard
                        symbol="G"
                        name={t.centerCentroid}
                        desc={t.centerCentroidDesc}
                        color={CENTER_COLORS.centroid}
                        pt={centersResult.centroid}
                        active={centerVis.centroid}
                        onToggle={() => toggleCenter("centroid")}
                      />

                      {/* Circumcenter */}
                      <CenterCard
                        symbol="O"
                        name={t.centerCircumcenter}
                        desc={t.centerCircumcenterDesc}
                        color={CENTER_COLORS.circumcenter}
                        pt={centersResult.circumcenter}
                        active={centerVis.circumcenter}
                        onToggle={() => toggleCenter("circumcenter")}
                        extra={
                          centersResult.circumradius !== null
                            ? `${t.circumradius}: ${fmtShort(centersResult.circumradius)}`
                            : undefined
                        }
                      />

                      {/* Incenter */}
                      <CenterCard
                        symbol="I"
                        name={t.centerIncenter}
                        desc={t.centerIncenterDesc}
                        color={CENTER_COLORS.incenter}
                        pt={centersResult.incenter}
                        active={centerVis.incenter}
                        onToggle={() => toggleCenter("incenter")}
                        extra={
                          centersResult.inradius !== null
                            ? `${t.inradius}: ${fmtShort(centersResult.inradius)}`
                            : undefined
                        }
                      />

                      {/* Orthocenter */}
                      <CenterCard
                        symbol="H"
                        name={t.centerOrthocenter}
                        desc={t.centerOrthocenterDesc}
                        color={CENTER_COLORS.orthocenter}
                        pt={centersResult.orthocenter}
                        active={centerVis.orthocenter}
                        onToggle={() => toggleCenter("orthocenter")}
                      />
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          ) : step === 2 && solidResult ? (
            <Tabs defaultValue="volume" className="flex-1 flex flex-col">
              <TabsList className="grid grid-cols-3 m-2 mb-0">
                <TabsTrigger value="volume" className="text-xs">{t.tabVolume}</TabsTrigger>
                <TabsTrigger value="faces" className="text-xs">{t.tabFaces}</TabsTrigger>
                <TabsTrigger value="matrix" className="text-xs">{t.tabDihedralMatrix}</TabsTrigger>
              </TabsList>

              {/* Volume */}
              <TabsContent value="volume" className="flex-1 overflow-y-auto p-3">
                <ResultCard title={t.tabVolume} accent={S.amber}>
                  <div className="text-center py-4">
                    <div
                      className="text-4xl font-bold mb-1"
                      style={{ color: S.amber, fontFamily: S.mono }}
                    >
                      {fmt(solidResult.volume)}
                    </div>
                    <div className="text-xs" style={{ color: S.textFaint }}>
                      {t.unitVolCube}
                    </div>
                    <div className="text-xs mt-2" style={{ color: S.textFaint }}>
                      {solidType === "prism" ? t.formulaPrism : t.formulaPyramid}
                    </div>
                  </div>
                  <Divider />
                  <ResultRow
                    label={t.labelBaseArea}
                    value={fmt(baseResult?.area ?? 0)}
                    unit={t.unitAreaSq}
                  />
                  <ResultRow label={t.labelHeightH} value={fmt(height)} unit={t.unitLength} />
                  <Divider />
                  <div className="text-xs mb-1" style={{ color: S.textMuted }}>
                    {t.labelLateralEdges}
                  </div>
                  {solidResult.lateralEdgeLengths.map((len, i) => (
                    <ResultRow
                      key={i}
                      label={solidResult.lateralEdgeLabels[i]}
                      value={fmt(len)}
                      unit={t.unitLength}
                    />
                  ))}
                </ResultCard>
              </TabsContent>

              {/* Faces */}
              <TabsContent value="faces" className="flex-1 overflow-y-auto p-3">
                <ResultCard title={t.tabFaces} accent={S.teal}>
                  {solidResult.faces.map((face, i) => {
                    const isHL = faceAIdx === i || faceBIdx === i;
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between py-1.5 px-2 rounded-md mb-1 cursor-pointer transition-all"
                        onClick={() => handleFaceClick(i)}
                        style={{
                          background: isHL ? getFaceColor(i) + "14" : S.cardBg,
                          border: `1.5px solid ${isHL ? getFaceColor(i) : S.cardBorder}`,
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-sm flex-shrink-0"
                            style={{ background: getFaceColor(i) }}
                          />
                          <span
                            className="text-xs font-bold"
                            style={{ color: getFaceColor(i) }}
                          >
                            {face.name}
                          </span>
                          <span className="text-xs" style={{ color: S.textFaint }}>
                            ({face.type === "base"
                              ? (lang === "zh" ? "底" : "base")
                              : face.type === "top"
                              ? (lang === "zh" ? "頂" : "top")
                              : (lang === "zh" ? "側" : "side")})
                          </span>
                        </div>
                        <span
                          className="text-xs"
                          style={{ color: S.amber, fontFamily: S.mono }}
                        >
                          {fmtShort(solidResult.faceAreas[i])} {t.unitAreaSq}
                        </span>
                      </div>
                    );
                  })}
                </ResultCard>
              </TabsContent>

              {/* Dihedral matrix */}
              <TabsContent value="matrix" className="flex-1 overflow-y-auto p-3">
                <ResultCard title={t.tabDihedralMatrix} accent={S.accent}>
                  <p className="text-xs mb-2" style={{ color: S.textFaint }}>
                    {t.dihedralMatrixHint}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="text-xs w-full border-collapse">
                      <thead>
                        <tr>
                          <th
                            className="p-1 text-left"
                            style={{ color: S.textFaint, borderBottom: `1px solid ${S.cardBorder}` }}
                          >
                            {t.colFace}
                          </th>
                          {solidResult.faces.map((f, i) => (
                            <th
                              key={i}
                              className="p-1 text-center"
                              style={{
                                color: getFaceColor(i),
                                borderBottom: `1px solid ${S.cardBorder}`,
                                minWidth: 40,
                                fontFamily: S.mono,
                              }}
                            >
                              {f.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {solidResult.faces.map((rowFace, ri) => (
                          <tr key={ri}>
                            <td
                              className="p-1 font-bold"
                              style={{ color: getFaceColor(ri) }}
                            >
                              {rowFace.name}
                            </td>
                            {solidResult.faces.map((_, ci) => {
                              const val = solidResult.dihedralMatrix[ri][ci];
                              const isSelected =
                                (ri === faceAIdx && ci === faceBIdx) ||
                                (ri === faceBIdx && ci === faceAIdx);
                              return (
                                <td
                                  key={ci}
                                  className="p-1 text-center rounded cursor-pointer transition-all"
                                  onClick={() => {
                                    if (ri !== ci) {
                                      setFaceAIdx(ri);
                                      setFaceBIdx(ci);
                                    }
                                  }}
                                  style={{
                                    color: ri === ci ? S.textFaint : isSelected ? "#ffffff" : S.text,
                                    background: isSelected ? S.amber : ri === ci ? "transparent" : "transparent",
                                    fontFamily: S.mono,
                                    fontWeight: isSelected ? 700 : 400,
                                  }}
                                >
                                  {ri === ci ? "—" : `${fmtShort(val)}°`}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ResultCard>
              </TabsContent>
            </Tabs>
          ) : (
            <div
              className="flex items-center justify-center h-full text-sm"
              style={{ color: S.textFaint }}
            >
              {t.viewerNeedPoints}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ResultCard({
  title,
  children,
  accent = "#6366f1",
}: {
  title: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div
        className="text-xs font-bold uppercase tracking-widest mb-2 pb-1.5 border-b"
        style={{ color: accent, borderColor: "#e2e8f0" }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function ResultRow({
  label,
  value,
  unit,
  highlight = false,
}: {
  label: string;
  value: string;
  unit: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-xs" style={{ color: highlight ? "#0f172a" : "#64748b" }}>
        {label}
      </span>
      <span
        className="text-xs"
        style={{
          color: highlight ? "#f59e0b" : "#0f172a",
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: highlight ? 700 : 400,
        }}
      >
        {value}
        {unit && (
          <span style={{ color: "#94a3b8", marginLeft: 2, fontFamily: "inherit" }}>
            {unit}
          </span>
        )}
      </span>
    </div>
  );
}

function Divider() {
  return (
    <div className="border-t my-2" style={{ borderColor: "#e2e8f0" }} />
  );
}

function CenterCard({
  symbol,
  name,
  desc,
  color,
  pt,
  active,
  onToggle,
  extra,
}: {
  symbol: string;
  name: string;
  desc: string;
  color: string;
  pt: { x: number; y: number } | null | undefined;
  active: boolean;
  onToggle: () => void;
  extra?: string;
}) {
  return (
    <div
      className="rounded-lg p-2.5 cursor-pointer transition-all"
      onClick={onToggle}
      style={{
        background: active ? color + "0e" : "#f8fafc",
        border: `1.5px solid ${active ? color : "#e2e8f0"}`,
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: active ? color : "#e2e8f0", color: active ? "#fff" : "#94a3b8" }}
          >
            {symbol}
          </span>
          <span className="text-xs font-bold" style={{ color: active ? color : "#334155" }}>
            {name}
          </span>
        </div>
        <div
          className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
          style={{ borderColor: active ? color : "#cbd5e1" }}
        >
          {active && (
            <div className="w-2 h-2 rounded-full" style={{ background: color }} />
          )}
        </div>
      </div>
      <div className="text-xs mb-1" style={{ color: "#94a3b8" }}>
        {desc}
      </div>
      {pt && (
        <div
          className="text-xs font-mono"
          style={{ color: active ? color : "#64748b", fontFamily: "'JetBrains Mono', monospace" }}
        >
          ({pt.x.toFixed(3)}, {pt.y.toFixed(3)})
        </div>
      )}
      {extra && (
        <div className="text-xs mt-0.5" style={{ color: active ? color + "cc" : "#94a3b8" }}>
          {extra}
        </div>
      )}
    </div>
  );
}
