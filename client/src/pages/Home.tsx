/**
 * Home.tsx — Solid Geometry Calculator
 *
 * Design: Deep Tech Dark
 * - Background: #0a0e1a (deepest navy)
 * - Panels: #0f1629
 * - Accent: #00d4ff (cyan)
 * - Values: #ffb800 (amber)
 * - Success: #00ff9d (green)
 * - Fonts: Space Grotesk + JetBrains Mono
 *
 * Workflow:
 *   Step 1: Name vertices → input sides & angles → auto-solve with LaTeX steps → 2D diagram
 *   Step 2: Build 3D solid → 3D viewer + volume + dihedral angles (click to select)
 */

import { useState, useCallback, useMemo, useRef } from "react";
import { useLang } from "@/contexts/LangContext";
import BaseCanvas2D, { type CenterVisibility } from "@/components/BaseCanvas2D";
import SolidViewer from "@/components/SolidViewer";
import KaTeXRenderer from "@/components/KaTeXRenderer";
import {
  computeBase,
  computeSolid,
  computeCenters,
  getFaceColor,
  CENTER_COLORS,
  type NamedPoint,
  type SolidType,
} from "@/lib/geometry";
import { solvePolygon, type SolverResult } from "@/lib/solver";
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
import {
  Plus, RotateCcw, Trash2, ArrowRight, ArrowLeft,
  MousePointerClick, ChevronDown, ChevronUp, CheckCircle2, AlertCircle
} from "lucide-react";

// ── Presets ───────────────────────────────────────────────────────────────────
const PRESETS: Record<string, NamedPoint[]> = {
  "3": [{ label: "A", x: 0, y: 0 }, { label: "B", x: 4, y: 0 }, { label: "C", x: 2, y: 3 }],
  "4": [{ label: "A", x: 0, y: 0 }, { label: "B", x: 4, y: 0 }, { label: "C", x: 4, y: 3 }, { label: "D", x: 0, y: 3 }],
  "5": [{ label: "A", x: 0, y: 0 }, { label: "B", x: 4, y: 0 }, { label: "C", x: 5, y: 3 }, { label: "D", x: 2, y: 5 }, { label: "E", x: -1, y: 3 }],
  "6": [{ label: "A", x: 2, y: 0 }, { label: "B", x: 4, y: 1 }, { label: "C", x: 4, y: 3 }, { label: "D", x: 2, y: 4 }, { label: "E", x: 0, y: 3 }, { label: "F", x: 0, y: 1 }],
};

const CENTER_KEYS = ["centroid", "circumcenter", "incenter", "orthocenter"] as const;
type CenterKey = (typeof CENTER_KEYS)[number];
const CENTER_SYMBOL: Record<CenterKey, string> = { centroid: "G", circumcenter: "O", incenter: "I", orthocenter: "H" };

// ── Tokens ────────────────────────────────────────────────────────────────────
const T = {
  bg: "#0a0e1a", panel: "#0f1629", card: "#141d35", input: "#1a2540",
  borderDim: "#1e2d4a", borderMid: "#263554", borderHi: "#2e4070",
  textHi: "#e8f0ff", textMid: "#8899bb", textDim: "#3d5070",
  cyan: "#00d4ff", cyanDim: "#0099bb", cyanGlow: "rgba(0,212,255,0.12)",
  green: "#00ff9d", amber: "#ffb800", rose: "#ff4466", violet: "#8b5cf6",
  mono: "'JetBrains Mono', monospace", sans: "'Space Grotesk', sans-serif",
};

const fmt = (n: number, dp = 4) => n.toFixed(dp);

export default function Home() {
  const { t, lang, setLang } = useLang();

  // ── State ─────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2>(1);
  const [points, setPoints] = useState<NamedPoint[]>(PRESETS["3"]);
  const [solidType, setSolidType] = useState<SolidType>("prism");
  const [height, setHeight] = useState<number>(5);
  const [apexLabel, setApexLabel] = useState<string>("A'");
  const [showGrid, setShowGrid] = useState(true);

  // Solver inputs: sides and angles (null = unknown)
  const [inputSides, setInputSides] = useState<(number | null)[]>([3, 4, 5]);
  const [inputAngles, setInputAngles] = useState<(number | null)[]>([null, null, null]);

  // Centers
  const [centerVis, setCenterVis] = useState<CenterVisibility>({
    centroid: false, circumcenter: false, incenter: false, orthocenter: false,
    circumcircle: false, incircle: false,
  });

  // Dihedral
  const [faceAIdx, setFaceAIdx] = useState<number>(0);
  const [faceBIdx, setFaceBIdx] = useState<number>(1);
  const [clickSelectStep, setClickSelectStep] = useState<0 | 1>(0);

  // Steps expanded
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  // ── Sync points count with solver inputs ──────────────────────────────────
  const syncInputArrays = (n: number) => {
    setInputSides((prev) => {
      const next = [...prev];
      while (next.length < n) next.push(null);
      return next.slice(0, n);
    });
    setInputAngles((prev) => {
      const next = [...prev];
      while (next.length < n) next.push(null);
      return next.slice(0, n);
    });
  };

  // ── Solver ────────────────────────────────────────────────────────────────
  const solverResult: SolverResult | null = useMemo(() => {
    if (points.length < 3) return null;
    const n = points.length;
    const sides = inputSides.slice(0, n);
    const angles = inputAngles.slice(0, n);
    return solvePolygon(points.map((p) => p.label), sides, angles);
  }, [points, inputSides, inputAngles]);

  // Sync solved coordinates back to points for 2D display
  const displayPoints: NamedPoint[] = useMemo(() => {
    if (solverResult?.success && solverResult.vertices.length === points.length) {
      return points.map((p, i) => ({
        ...p,
        x: solverResult.vertices[i].x,
        y: solverResult.vertices[i].y,
      }));
    }
    return points;
  }, [solverResult, points]);

  // ── Geometry from solved/display points ──────────────────────────────────
  const baseResult = useMemo(() => {
    if (displayPoints.length < 3) return null;
    return computeBase(displayPoints);
  }, [displayPoints]);

  const centersResult = useMemo(() => {
    if (displayPoints.length < 3) return null;
    return computeCenters(displayPoints);
  }, [displayPoints]);

  const solidResult = useMemo(() => {
    if (displayPoints.length < 3) return null;
    return computeSolid(displayPoints, solidType, height, apexLabel);
  }, [displayPoints, solidType, height, apexLabel]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const updateLabel = useCallback((i: number, label: string) => {
    setPoints((prev) => { const n = [...prev]; n[i] = { ...n[i], label }; return n; });
  }, []);

  const movePoint = useCallback((i: number, x: number, y: number) => {
    setPoints((prev) => { const n = [...prev]; n[i] = { ...n[i], x, y }; return n; });
  }, []);

  const addPoint = () => {
    if (points.length >= 6) return;
    const used = new Set(points.map((p) => p.label));
    let lbl = "";
    for (const c of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") { if (!used.has(c)) { lbl = c; break; } }
    if (!lbl) lbl = `P${points.length + 1}`;
    const n = points.length + 1;
    setPoints((prev) => [...prev, { label: lbl, x: 0, y: 0 }]);
    syncInputArrays(n);
  };

  const removePoint = (i: number) => {
    if (points.length <= 3) return;
    const n = points.length - 1;
    setPoints((prev) => prev.filter((_, idx) => idx !== i));
    setInputSides((prev) => prev.filter((_, idx) => idx !== i).slice(0, n));
    setInputAngles((prev) => prev.filter((_, idx) => idx !== i).slice(0, n));
  };

  const applyPreset = (n: string) => {
    setPoints(PRESETS[n]);
    const count = Number(n);
    setInputSides(new Array(count).fill(null));
    setInputAngles(new Array(count).fill(null));
  };

  const toggleCenter = (key: keyof CenterVisibility) => {
    setCenterVis((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFaceClick = useCallback((faceIdx: number) => {
    if (clickSelectStep === 0) { setFaceAIdx(faceIdx); setClickSelectStep(1); }
    else { if (faceIdx !== faceAIdx) setFaceBIdx(faceIdx); setClickSelectStep(0); }
  }, [clickSelectStep, faceAIdx]);

  // ── Dihedral ──────────────────────────────────────────────────────────────
  const faces = solidResult?.faces ?? [];
  const dihedralDeg = solidResult && faces.length > 1 && faceAIdx !== faceBIdx
    ? (solidResult.dihedralMatrix[faceAIdx]?.[faceBIdx] ?? 0) : 0;
  const dihedralRad = (dihedralDeg * Math.PI) / 180;

  // ── Side/angle input helpers ──────────────────────────────────────────────
  const n = points.length;
  const sideLabel = (i: number) => `${points[i].label}${points[(i + 1) % n].label}`;
  const angleLabel = (i: number) => points[i].label;

  const setSide = (i: number, v: string) => {
    const num = v === "" ? null : parseFloat(v);
    setInputSides((prev) => { const next = [...prev]; next[i] = isNaN(num as number) ? null : num; return next; });
  };
  const setAngle = (i: number, v: string) => {
    const num = v === "" ? null : parseFloat(v);
    setInputAngles((prev) => { const next = [...prev]; next[i] = isNaN(num as number) ? null : num; return next; });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.textHi, fontFamily: T.sans }}>

      {/* ── Header ── */}
      <header style={{ background: T.panel, borderBottom: `1px solid ${T.borderDim}`, boxShadow: "0 1px 12px rgba(0,0,0,0.4)" }}
        className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: "linear-gradient(135deg, #00b8d9 0%, #0050aa 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 900, fontSize: 16, color: "#fff",
            boxShadow: "0 0 16px rgba(0,212,255,0.3)",
          }}>Σ</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: T.textHi, letterSpacing: "0.02em" }}>
              {t.appTitle}
            </div>
            <div style={{ fontSize: 10, color: T.textDim, fontFamily: T.mono }}>
              Solid Geometry Calculator
            </div>
          </div>
        </div>

        {/* Step tabs */}
        <div className="flex items-center gap-2" style={{ fontSize: 12 }}>
          {[1, 2].map((s) => (
            <button key={s} onClick={() => { if (s === 2 && points.length < 3) return; setStep(s as 1 | 2); }}
              style={{
                padding: "5px 14px", borderRadius: 20, fontWeight: 700,
                background: step === s ? (s === 1 ? T.cyan : T.amber) : T.card,
                color: step === s ? "#000d1a" : T.textMid,
                border: `1px solid ${step === s ? (s === 1 ? T.cyan : T.amber) : T.borderMid}`,
                boxShadow: step === s ? `0 0 12px ${s === 1 ? "rgba(0,212,255,0.3)" : "rgba(255,184,0,0.3)"}` : "none",
                transition: "all 0.2s",
              }}>
              {s === 1 ? t.step1Label : t.step2Label}
            </button>
          ))}
        </div>

        <button onClick={() => setLang(lang === "zh" ? "en" : "zh")}
          style={{
            fontSize: 11, padding: "4px 12px", borderRadius: 6,
            border: `1px solid ${T.borderMid}`, color: T.cyan,
            background: "transparent", fontWeight: 600,
          }}>
          {t.langSwitch}
        </button>
      </header>

      {/* ── Main ── */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>

        {/* ── Left panel ── */}
        <aside className="flex flex-col gap-2 overflow-y-auto p-3"
          style={{ width: 264, minWidth: 200, background: T.panel, borderRight: `1px solid ${T.borderDim}` }}>

          {/* Vertex labels */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: T.cyan, textTransform: "uppercase" }}>
                {t.sectionVertices}
              </span>
              <div className="flex gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={() => applyPreset(String(points.length))}
                      className="p-1 rounded transition-colors hover:bg-slate-800">
                      <RotateCcw size={12} style={{ color: T.textMid }} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{t.tooltipReset}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={addPoint} disabled={points.length >= 6}
                      className="p-1 rounded transition-colors hover:bg-slate-800 disabled:opacity-30">
                      <Plus size={12} style={{ color: T.cyan }} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{t.tooltipAddPoint}</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Preset buttons */}
            <div className="flex gap-1 mb-2">
              {(["3", "4", "5", "6"] as const).map((n) => (
                <button key={n} onClick={() => applyPreset(n)}
                  style={{
                    flex: 1, padding: "3px 0", fontSize: 11, borderRadius: 5, fontWeight: 600,
                    background: points.length === Number(n) ? T.cyan : T.card,
                    color: points.length === Number(n) ? "#000d1a" : T.textMid,
                    border: `1px solid ${points.length === Number(n) ? T.cyan : T.borderMid}`,
                  }}>
                  {n === "3" ? t.presetTriangle : n === "4" ? t.presetSquare : n === "5" ? t.presetPentagon : t.presetHexagon}
                </button>
              ))}
            </div>

            {/* Vertex name rows */}
            {points.map((pt, i) => (
              <div key={i} className="flex items-center gap-1 mb-1">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: getFaceColor(i + 2) }} />
                <Input value={pt.label} onChange={(e) => updateLabel(i, e.target.value)}
                  className="tech-input h-6 px-1 font-bold text-center"
                  style={{ width: 32, minWidth: 0, color: getFaceColor(i + 2), fontSize: 12 }}
                  maxLength={4} />
                <span style={{ fontSize: 10, color: T.textDim, flex: 1, textAlign: "center" }}>
                  {lang === "zh" ? "頂點" : "vertex"} {i + 1}
                </span>
                <button onClick={() => removePoint(i)} disabled={points.length <= 3}
                  className="p-0.5 rounded hover:bg-rose-900/30 transition-colors disabled:opacity-20">
                  <Trash2 size={11} style={{ color: T.rose }} />
                </button>
              </div>
            ))}
          </section>

          {/* ── Input: sides & angles ── */}
          <section style={{ background: T.card, border: `1px solid ${T.borderDim}`, borderRadius: 8, padding: "10px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: T.amber, textTransform: "uppercase", marginBottom: 8 }}>
              {lang === "zh" ? "輸入已知數據" : "Known Values"}
            </div>

            {/* Column headers */}
            <div className="flex gap-1 mb-1" style={{ fontSize: 9, color: T.textDim }}>
              <div style={{ width: 28 }} />
              <div style={{ flex: 1, textAlign: "center" }}>{lang === "zh" ? "邊長" : "Side"}</div>
              <div style={{ flex: 1, textAlign: "center" }}>{lang === "zh" ? "角度°" : "Angle°"}</div>
            </div>

            {points.map((_, i) => {
              const sLbl = sideLabel(i);
              const aLbl = angleLabel(i);
              const sVal = inputSides[i];
              const aVal = inputAngles[i];
              const sSolved = solverResult?.sides[i];
              const aSolved = solverResult?.angles[i];

              return (
                <div key={i} className="flex items-center gap-1 mb-1">
                  <div style={{ width: 28, fontSize: 10, color: T.textMid, fontFamily: T.mono, textAlign: "right" }}>
                    <span style={{ color: getFaceColor(i + 2) }}>{aLbl}</span>
                  </div>

                  {/* Side input */}
                  <div style={{ flex: 1, position: "relative" }}>
                    <Input
                      type="number"
                      placeholder={sLbl}
                      value={sVal ?? ""}
                      onChange={(e) => setSide(i, e.target.value)}
                      className="tech-input h-6 px-1 text-center"
                      style={{ fontSize: 11, width: "100%", color: sVal !== null ? T.cyan : T.textDim }}
                      min={0} step={0.1}
                    />
                    {sVal === null && sSolved?.state === "solved" && sSolved.value !== null && (
                      <div style={{
                        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, color: T.green, fontFamily: T.mono, pointerEvents: "none",
                        background: "rgba(0,255,157,0.06)", borderRadius: 4,
                      }}>
                        {fmt(sSolved.value, 3)}
                      </div>
                    )}
                  </div>

                  {/* Angle input */}
                  <div style={{ flex: 1, position: "relative" }}>
                    <Input
                      type="number"
                      placeholder={`∠${aLbl}`}
                      value={aVal ?? ""}
                      onChange={(e) => setAngle(i, e.target.value)}
                      className="tech-input h-6 px-1 text-center"
                      style={{ fontSize: 11, width: "100%", color: aVal !== null ? T.amber : T.textDim }}
                      min={0} max={180} step={0.1}
                    />
                    {aVal === null && aSolved?.state === "solved" && aSolved.value !== null && (
                      <div style={{
                        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, color: T.green, fontFamily: T.mono, pointerEvents: "none",
                        background: "rgba(0,255,157,0.06)", borderRadius: 4,
                      }}>
                        {fmt(aSolved.value, 2)}°
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Solver status */}
            {solverResult && (
              <div className="flex items-center gap-1.5 mt-2 px-2 py-1.5 rounded"
                style={{
                  background: solverResult.success ? "rgba(0,255,157,0.08)" : "rgba(255,68,102,0.08)",
                  border: `1px solid ${solverResult.success ? T.green + "44" : T.rose + "44"}`,
                }}>
                {solverResult.success
                  ? <CheckCircle2 size={12} style={{ color: T.green }} />
                  : <AlertCircle size={12} style={{ color: T.rose }} />}
                <span style={{ fontSize: 10, color: solverResult.success ? T.green : T.rose }}>
                  {solverResult.success
                    ? (lang === "zh" ? "✓ 已完全求解" : "✓ Fully solved")
                    : (solverResult.error ?? (lang === "zh" ? "資料不足" : "Insufficient data"))}
                </span>
              </div>
            )}
          </section>

          {/* ── Step 2: Solid settings ── */}
          {step === 2 && (
            <section style={{ background: "rgba(255,184,0,0.06)", border: `1px solid rgba(255,184,0,0.2)`, borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: T.amber, textTransform: "uppercase", marginBottom: 8 }}>
                {t.sectionSolidType}
              </div>
              <div className="flex gap-2 mb-2">
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: T.textMid, marginBottom: 3 }}>{t.labelType}</div>
                  <Select value={solidType} onValueChange={(v) => setSolidType(v as SolidType)}>
                    <SelectTrigger className="h-7 text-xs tech-input" style={{ color: T.amber }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prism">{t.optPrism}</SelectItem>
                      <SelectItem value="pyramid">{t.optPyramid}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: T.textMid, marginBottom: 3 }}>{t.labelHeight}</div>
                  <Input type="number" value={height}
                    onChange={(e) => setHeight(parseFloat(e.target.value) || 1)}
                    className="h-7 tech-input" style={{ color: T.amber }} min={0.1} step={0.5} />
                </div>
              </div>
              {solidType === "pyramid" && (
                <div>
                  <div style={{ fontSize: 10, color: T.textMid, marginBottom: 3 }}>{t.labelApexLabel}</div>
                  <Input value={apexLabel} onChange={(e) => setApexLabel(e.target.value)}
                    className="h-7 tech-input" style={{ color: T.amber }} maxLength={4} />
                </div>
              )}
            </section>
          )}

          {/* ── Step 2: Dihedral selector ── */}
          {step === 2 && solidResult && faces.length > 1 && (
            <section style={{ background: "rgba(0,212,255,0.05)", border: `1px solid rgba(0,212,255,0.15)`, borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: T.cyan, textTransform: "uppercase", marginBottom: 8 }}>
                {t.sectionDihedral}
              </div>
              <div className="flex items-center gap-1.5 mb-2 px-2 py-1.5 rounded"
                style={{
                  background: clickSelectStep === 1 ? "rgba(255,184,0,0.1)" : "rgba(0,255,157,0.08)",
                  border: `1px solid ${clickSelectStep === 1 ? "rgba(255,184,0,0.3)" : "rgba(0,255,157,0.2)"}`,
                  fontSize: 10, color: clickSelectStep === 1 ? T.amber : T.green,
                }}>
                <MousePointerClick size={11} />
                {clickSelectStep === 0 ? t.viewerClickFaceHint : t.viewerClickFace2Hint}
              </div>
              <div className="flex gap-2 mb-2">
                {[{ label: t.labelPlaneA, idx: faceAIdx, setIdx: setFaceAIdx },
                  { label: t.labelPlaneB, idx: faceBIdx, setIdx: setFaceBIdx }].map(({ label, idx, setIdx }) => (
                  <div key={label} style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: T.textMid, marginBottom: 3 }}>{label}</div>
                    <Select value={String(idx)} onValueChange={(v) => setIdx(Number(v))}>
                      <SelectTrigger className="h-7 text-xs tech-input"
                        style={{ borderColor: getFaceColor(idx), color: getFaceColor(idx), fontWeight: 700 }}>
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
                ))}
              </div>
              {faceAIdx !== faceBIdx ? (
                <div className="rounded-lg p-3 text-center"
                  style={{ background: T.card, border: `1px solid ${T.borderMid}` }}>
                  <div style={{ fontSize: 10, color: T.textMid, marginBottom: 4 }}>
                    <span style={{ color: getFaceColor(faceAIdx) }}>{faces[faceAIdx]?.name}</span>
                    {" ∩ "}
                    <span style={{ color: getFaceColor(faceBIdx) }}>{faces[faceBIdx]?.name}</span>
                  </div>
                  <div style={{ fontSize: 30, fontWeight: 900, color: T.amber, fontFamily: T.mono, lineHeight: 1 }}>
                    {fmt(dihedralDeg, 2)}°
                  </div>
                  <div style={{ fontSize: 10, color: T.textDim, marginTop: 4, fontFamily: T.mono }}>
                    ≈ {fmt(dihedralRad, 4)} rad
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: 10, textAlign: "center", color: T.textDim }}>{t.dihedralHint}</p>
              )}
            </section>
          )}

          {/* Step transition */}
          <div className="mt-auto pt-2">
            {step === 1 ? (
              <button onClick={() => setStep(2)} disabled={points.length < 3}
                className="w-full btn-cyan py-2 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-40">
                {t.btnToStep2} <ArrowRight size={14} />
              </button>
            ) : (
              <button onClick={() => setStep(1)}
                className="w-full py-2 rounded-lg text-sm flex items-center justify-center gap-2"
                style={{ border: `1px solid ${T.cyan}`, color: T.cyan, background: "transparent" }}>
                <ArrowLeft size={14} /> {t.btnBackStep1}
              </button>
            )}
          </div>
        </aside>

        {/* ── Centre: diagram / viewer ── */}
        <main className="flex-1 flex flex-col overflow-hidden" style={{ minWidth: 0, background: T.bg }}>
          {step === 1 ? (
            <div className="flex-1 relative" style={{ minHeight: 0 }}>
              <div className="absolute inset-0">
                <BaseCanvas2D
                  points={displayPoints}
                  onPointMove={movePoint}
                  showGrid={showGrid}
                  centers={centersResult}
                  centerVisibility={centerVis}
                />
              </div>
              <div className="absolute bottom-3 left-3 flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer"
                  style={{ fontSize: 11, color: T.textMid }}>
                  <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} className="w-3 h-3" />
                  {t.canvas2DGrid}
                </label>
              </div>
              <div className="absolute bottom-3 right-3 px-2 py-1 rounded"
                style={{ fontSize: 10, color: T.textDim, background: "rgba(10,14,26,0.7)" }}>
                {t.canvas2DHint}
              </div>
            </div>
          ) : (
            <div className="flex-1" style={{ minHeight: 0 }}>
              {solidResult ? (
                <SolidViewer
                  points={displayPoints}
                  solidType={solidType}
                  height={height}
                  apexLabel={apexLabel}
                  faces={solidResult.faces}
                  highlightFaceIndices={faceAIdx !== faceBIdx ? [faceAIdx, faceBIdx] : []}
                  onFaceClick={handleFaceClick}
                />
              ) : (
                <div className="flex items-center justify-center h-full"
                  style={{ fontSize: 13, color: T.textDim }}>{t.viewerNeedPoints}</div>
              )}
            </div>
          )}
          {step === 2 && (
            <div className="text-center py-1.5" style={{ fontSize: 10, color: T.textDim, borderTop: `1px solid ${T.borderDim}`, background: T.panel }}>
              {t.viewerHint}
            </div>
          )}
        </main>

        {/* ── Right panel: results ── */}
        <aside className="flex flex-col overflow-y-auto"
          style={{ width: 340, minWidth: 280, background: T.panel, borderLeft: `1px solid ${T.borderDim}` }}>

          {step === 1 ? (
            <Tabs defaultValue="steps" className="flex-1 flex flex-col">
              <TabsList className="grid grid-cols-4 m-2 mb-0"
                style={{ background: T.card, border: `1px solid ${T.borderDim}` }}>
                <TabsTrigger value="steps" className="text-xs">{lang === "zh" ? "步驟" : "Steps"}</TabsTrigger>
                <TabsTrigger value="results" className="text-xs">{lang === "zh" ? "結果" : "Results"}</TabsTrigger>
                <TabsTrigger value="centers" className="text-xs">{t.tab2DCenters}</TabsTrigger>
                <TabsTrigger value="area" className="text-xs">{t.tab2DArea}</TabsTrigger>
              </TabsList>

              {/* ── Steps tab ── */}
              <TabsContent value="steps" className="flex-1 overflow-y-auto p-3">
                {!solverResult || solverResult.steps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 gap-2"
                    style={{ color: T.textDim, fontSize: 12 }}>
                    <div style={{ fontSize: 28, opacity: 0.3 }}>∑</div>
                    {lang === "zh" ? "輸入已知邊長或角度以開始求解" : "Enter known sides or angles to solve"}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {solverResult.steps.map((step, si) => (
                      <div key={si}
                        style={{
                          background: T.card, border: `1px solid ${T.borderDim}`,
                          borderRadius: 8, overflow: "hidden",
                        }}>
                        {/* Step header */}
                        <button
                          className="w-full flex items-center justify-between px-3 py-2 transition-colors hover:bg-slate-800/50"
                          onClick={() => setExpandedStep(expandedStep === si ? null : si)}
                        >
                          <div className="flex items-center gap-2">
                            <div style={{
                              width: 20, height: 20, borderRadius: "50%", fontSize: 10, fontWeight: 700,
                              background: step.law === "cosine" ? T.cyan : step.law === "sine" ? T.amber : T.green,
                              color: "#000d1a", display: "flex", alignItems: "center", justifyContent: "center",
                            }}>{si + 1}</div>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 600, color: T.textHi, textAlign: "left" }}>
                                {step.law === "cosine"
                                  ? (lang === "zh" ? "餘弦定理" : "Cosine Rule")
                                  : step.law === "sine"
                                  ? (lang === "zh" ? "正弦定理" : "Sine Rule")
                                  : step.law === "angle_sum" || step.law === "polygon_angle_sum"
                                  ? (lang === "zh" ? "角度和" : "Angle Sum")
                                  : (lang === "zh" ? "已知" : "Given")}
                              </div>
                              <div style={{ fontSize: 10, color: T.textMid, textAlign: "left" }}>{step.result}</div>
                            </div>
                          </div>
                          {expandedStep === si
                            ? <ChevronUp size={13} style={{ color: T.textDim }} />
                            : <ChevronDown size={13} style={{ color: T.textDim }} />}
                        </button>

                        {/* LaTeX expansion */}
                        {expandedStep === si && (
                          <div style={{
                            borderTop: `1px solid ${T.borderDim}`,
                            padding: "12px 12px",
                            background: "rgba(0,0,0,0.2)",
                            overflowX: "auto",
                          }}>
                            <KaTeXRenderer latex={step.latex} block />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ── Results tab ── */}
              <TabsContent value="results" className="flex-1 overflow-y-auto p-3">
                <TechCard title={lang === "zh" ? "邊長" : "Side Lengths"} color={T.cyan}>
                  {points.map((_, i) => {
                    const lbl = sideLabel(i);
                    const sv = solverResult?.sides[i];
                    return (
                      <TechRow key={i} label={lbl} color={getFaceColor(i + 2)}
                        value={sv?.value !== null && sv?.value !== undefined ? fmt(sv.value) : "—"}
                        state={sv?.state ?? "unknown"} />
                    );
                  })}
                  {baseResult && (
                    <>
                      <div style={{ borderTop: `1px solid ${T.borderDim}`, margin: "6px 0" }} />
                      <TechRow label={lang === "zh" ? "周長" : "Perimeter"} color={T.amber}
                        value={fmt(baseResult.perimeter)} state="solved" highlight />
                    </>
                  )}
                </TechCard>

                <div style={{ height: 8 }} />

                <TechCard title={lang === "zh" ? "角度" : "Angles"} color={T.amber}>
                  {points.map((p, i) => {
                    const av = solverResult?.angles[i];
                    return (
                      <TechRow key={i} label={`∠${p.label}`} color={getFaceColor(i + 2)}
                        value={av?.value !== null && av?.value !== undefined ? `${fmt(av.value, 2)}°` : "—"}
                        state={av?.state ?? "unknown"} />
                    );
                  })}
                </TechCard>
              </TabsContent>

              {/* ── Centers tab ── */}
              <TabsContent value="centers" className="flex-1 overflow-y-auto p-3">
                <div style={{ fontSize: 10, color: T.textDim, marginBottom: 8 }}>
                  {points.length === 3
                    ? (lang === "zh" ? "✓ 三角形精確計算" : "✓ Exact for triangle")
                    : (lang === "zh" ? "多邊形近似值" : "Approximate for polygon")}
                </div>

                {/* Toggle grid */}
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  {CENTER_KEYS.map((key) => {
                    const color = CENTER_COLORS[key];
                    const active = centerVis[key];
                    const names: Record<CenterKey, string> = {
                      centroid: t.centerCentroid, circumcenter: t.centerCircumcenter,
                      incenter: t.centerIncenter, orthocenter: t.centerOrthocenter,
                    };
                    return (
                      <button key={key} onClick={() => toggleCenter(key)}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-all"
                        style={{
                          background: active ? color + "15" : T.card,
                          border: `1.5px solid ${active ? color : T.borderMid}`,
                          color: active ? color : T.textMid, fontSize: 11, fontWeight: 600,
                        }}>
                        <span style={{
                          width: 18, height: 18, borderRadius: "50%", fontSize: 10, fontWeight: 700,
                          background: active ? color : T.borderHi, color: active ? "#000d1a" : T.textDim,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>{CENTER_SYMBOL[key]}</span>
                        {names[key]}
                      </button>
                    );
                  })}
                </div>

                {/* Circle toggles */}
                <div className="flex gap-2 mb-3">
                  {(["circumcircle", "incircle"] as const).map((key) => {
                    const color = key === "circumcircle" ? CENTER_COLORS.circumcenter : CENTER_COLORS.incenter;
                    const active = centerVis[key];
                    const lbl = key === "circumcircle" ? t.showCircumcircle : t.showIncircle;
                    return (
                      <button key={key} onClick={() => toggleCenter(key)}
                        className="flex-1 py-1.5 rounded-md transition-all text-xs"
                        style={{
                          background: active ? color + "15" : T.card,
                          border: `1px solid ${active ? color : T.borderMid}`,
                          color: active ? color : T.textMid,
                        }}>○ {lbl}</button>
                    );
                  })}
                </div>

                {/* Center data cards */}
                {centersResult && CENTER_KEYS.map((key) => {
                  const pt = centersResult[key];
                  const color = CENTER_COLORS[key];
                  const active = centerVis[key];
                  const names: Record<CenterKey, string> = {
                    centroid: t.centerCentroid, circumcenter: t.centerCircumcenter,
                    incenter: t.centerIncenter, orthocenter: t.centerOrthocenter,
                  };
                  const descs: Record<CenterKey, string> = {
                    centroid: t.centerCentroidDesc, circumcenter: t.centerCircumcenterDesc,
                    incenter: t.centerIncenterDesc, orthocenter: t.centerOrthocenterDesc,
                  };
                  const extra = key === "circumcenter" && centersResult.circumradius !== null
                    ? `R = ${centersResult.circumradius.toFixed(3)}`
                    : key === "incenter" && centersResult.inradius !== null
                    ? `r = ${centersResult.inradius.toFixed(3)}`
                    : null;
                  return (
                    <div key={key} onClick={() => toggleCenter(key)} className="mb-2 rounded-lg p-2.5 cursor-pointer transition-all"
                      style={{ background: active ? color + "0d" : T.card, border: `1.5px solid ${active ? color : T.borderDim}` }}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span style={{ width: 18, height: 18, borderRadius: "50%", fontSize: 10, fontWeight: 700,
                            background: active ? color : T.borderHi, color: active ? "#000d1a" : T.textDim,
                            display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                            {CENTER_SYMBOL[key]}
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: active ? color : T.textHi }}>{names[key]}</span>
                        </div>
                        <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${active ? color : T.borderMid}`,
                          display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {active && <div style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />}
                        </div>
                      </div>
                      <div style={{ fontSize: 10, color: T.textDim, marginBottom: 4 }}>{descs[key]}</div>
                      {pt && (
                        <div style={{ fontSize: 11, color: active ? color : T.textMid, fontFamily: T.mono }}>
                          ({pt.x.toFixed(3)}, {pt.y.toFixed(3)})
                        </div>
                      )}
                      {extra && <div style={{ fontSize: 10, color: active ? color + "cc" : T.textDim, marginTop: 2 }}>{extra}</div>}
                    </div>
                  );
                })}
              </TabsContent>

              {/* ── Area tab ── */}
              <TabsContent value="area" className="flex-1 overflow-y-auto p-3">
                <TechCard title={t.tab2DArea} color={T.amber}>
                  {baseResult ? (
                    <div className="text-center py-4">
                      <div style={{ fontSize: 42, fontWeight: 900, color: T.amber, fontFamily: T.mono, lineHeight: 1 }}>
                        {fmt(baseResult.area)}
                      </div>
                      <div style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>{t.unitAreaSq}</div>
                      <div style={{ fontSize: 10, color: T.textDim, marginTop: 6 }}>{t.formulaArea}</div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: T.textDim, textAlign: "center", padding: "16px 0" }}>
                      {lang === "zh" ? "需先求解多邊形" : "Solve polygon first"}
                    </div>
                  )}
                </TechCard>
              </TabsContent>
            </Tabs>

          ) : step === 2 && solidResult ? (
            <Tabs defaultValue="volume" className="flex-1 flex flex-col">
              <TabsList className="grid grid-cols-3 m-2 mb-0"
                style={{ background: T.card, border: `1px solid ${T.borderDim}` }}>
                <TabsTrigger value="volume" className="text-xs">{t.tabVolume}</TabsTrigger>
                <TabsTrigger value="faces" className="text-xs">{t.tabFaces}</TabsTrigger>
                <TabsTrigger value="matrix" className="text-xs">{t.tabDihedralMatrix}</TabsTrigger>
              </TabsList>

              <TabsContent value="volume" className="flex-1 overflow-y-auto p-3">
                <TechCard title={t.tabVolume} color={T.amber}>
                  <div className="text-center py-4">
                    <div style={{ fontSize: 42, fontWeight: 900, color: T.amber, fontFamily: T.mono, lineHeight: 1 }}>
                      {fmt(solidResult.volume)}
                    </div>
                    <div style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>{t.unitVolCube}</div>
                    <div style={{ fontSize: 10, color: T.textDim, marginTop: 6 }}>
                      {solidType === "prism" ? t.formulaPrism : t.formulaPyramid}
                    </div>
                  </div>
                  <div style={{ borderTop: `1px solid ${T.borderDim}`, margin: "8px 0" }} />
                  <TechRow label={t.labelBaseArea} value={fmt(baseResult?.area ?? 0)} state="solved" />
                  <TechRow label={t.labelHeightH} value={fmt(height)} state="given" />
                  <div style={{ borderTop: `1px solid ${T.borderDim}`, margin: "8px 0" }} />
                  <div style={{ fontSize: 10, color: T.textMid, marginBottom: 4 }}>{t.labelLateralEdges}</div>
                  {solidResult.lateralEdgeLengths.map((len, i) => (
                    <TechRow key={i} label={solidResult.lateralEdgeLabels[i]} value={fmt(len)} state="solved" />
                  ))}
                </TechCard>
              </TabsContent>

              <TabsContent value="faces" className="flex-1 overflow-y-auto p-3">
                <TechCard title={t.tabFaces} color={T.cyan}>
                  {solidResult.faces.map((face, i) => {
                    const isHL = faceAIdx === i || faceBIdx === i;
                    return (
                      <div key={i} onClick={() => handleFaceClick(i)}
                        className="flex items-center justify-between py-1.5 px-2 rounded-md mb-1 cursor-pointer transition-all"
                        style={{
                          background: isHL ? getFaceColor(i) + "18" : T.card,
                          border: `1.5px solid ${isHL ? getFaceColor(i) : T.borderDim}`,
                        }}>
                        <div className="flex items-center gap-2">
                          <div style={{ width: 10, height: 10, borderRadius: 2, background: getFaceColor(i) }} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: getFaceColor(i) }}>{face.name}</span>
                          <span style={{ fontSize: 10, color: T.textDim }}>
                            ({face.type === "base" ? (lang === "zh" ? "底" : "base")
                              : face.type === "top" ? (lang === "zh" ? "頂" : "top")
                              : (lang === "zh" ? "側" : "side")})
                          </span>
                        </div>
                        <span style={{ fontSize: 11, color: T.amber, fontFamily: T.mono }}>
                          {solidResult.faceAreas[i].toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </TechCard>
              </TabsContent>

              <TabsContent value="matrix" className="flex-1 overflow-y-auto p-3">
                <TechCard title={t.tabDihedralMatrix} color={T.violet}>
                  <p style={{ fontSize: 10, color: T.textDim, marginBottom: 8 }}>{t.dihedralMatrixHint}</p>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                      <thead>
                        <tr>
                          <th style={{ padding: "4px 6px", color: T.textDim, borderBottom: `1px solid ${T.borderDim}`, textAlign: "left" }}>
                            {t.colFace}
                          </th>
                          {solidResult.faces.map((f, i) => (
                            <th key={i} style={{
                              padding: "4px 6px", color: getFaceColor(i), textAlign: "center",
                              borderBottom: `1px solid ${T.borderDim}`, fontFamily: T.mono, minWidth: 44,
                            }}>{f.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {solidResult.faces.map((rowFace, ri) => (
                          <tr key={ri}>
                            <td style={{ padding: "3px 6px", fontWeight: 700, color: getFaceColor(ri) }}>{rowFace.name}</td>
                            {solidResult.faces.map((_, ci) => {
                              const val = solidResult.dihedralMatrix[ri][ci];
                              const isSel = (ri === faceAIdx && ci === faceBIdx) || (ri === faceBIdx && ci === faceAIdx);
                              return (
                                <td key={ci}
                                  onClick={() => { if (ri !== ci) { setFaceAIdx(ri); setFaceBIdx(ci); } }}
                                  style={{
                                    padding: "3px 6px", textAlign: "center", cursor: ri !== ci ? "pointer" : "default",
                                    color: ri === ci ? T.textDim : isSel ? "#000d1a" : T.textHi,
                                    background: isSel ? T.amber : "transparent",
                                    fontFamily: T.mono, fontWeight: isSel ? 700 : 400,
                                    borderRadius: 3,
                                  }}>
                                  {ri === ci ? "—" : `${val.toFixed(1)}°`}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TechCard>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex items-center justify-center h-full" style={{ fontSize: 13, color: T.textDim }}>
              {t.viewerNeedPoints}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TechCard({ title, children, color = "#00d4ff" }: { title: string; children: React.ReactNode; color?: string }) {
  return (
    <div style={{ background: "#141d35", border: "1px solid #1e2d4a", borderRadius: 10, padding: 12 }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
        color, borderBottom: "1px solid #1e2d4a", paddingBottom: 6, marginBottom: 8,
      }}>{title}</div>
      {children}
    </div>
  );
}

function TechRow({
  label, value, state = "unknown", color, highlight = false,
}: {
  label: string; value: string; state?: "given" | "solved" | "unknown";
  color?: string; highlight?: boolean;
}) {
  const stateColor = state === "given" ? "#00d4ff" : state === "solved" ? "#00ff9d" : "#3d5070";
  return (
    <div className="flex items-center justify-between py-0.5">
      <span style={{ fontSize: 11, color: color ?? "#8899bb" }}>{label}</span>
      <div className="flex items-center gap-1.5">
        <span style={{
          fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
          color: highlight ? "#ffb800" : state === "unknown" ? "#3d5070" : "#e8f0ff",
          fontWeight: highlight ? 700 : 400,
        }}>{value}</span>
        {state !== "unknown" && (
          <span style={{
            fontSize: 9, padding: "1px 5px", borderRadius: 3,
            background: state === "given" ? "rgba(0,212,255,0.1)" : "rgba(0,255,157,0.1)",
            border: `1px solid ${stateColor}44`, color: stateColor,
            fontFamily: "'JetBrains Mono', monospace",
          }}>{state === "given" ? "given" : "solved"}</span>
        )}
      </div>
    </div>
  );
}
