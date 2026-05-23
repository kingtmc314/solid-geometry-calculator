/**
 * BaseCanvas2D — Interactive 2D canvas for the base polygon
 * Elegant white tech theme (light background, coloured vertices)
 * Supports:
 * - Draggable named vertices
 * - Edge labels, interior angle arcs
 * - Optional display of four special centers:
 *   centroid (形心), circumcenter (外心), incenter (內心), orthocenter (垂心)
 * - Circumcircle and incircle overlays
 */
import { useRef, useEffect, useCallback } from "react";
import type { NamedPoint, Point2D, CentersResult } from "@/lib/geometry";
import { getFaceColor, CENTER_COLORS } from "@/lib/geometry";

export interface CenterVisibility {
  centroid: boolean;
  circumcenter: boolean;
  incenter: boolean;
  orthocenter: boolean;
  circumcircle: boolean;
  incircle: boolean;
}

interface BaseCanvas2DProps {
  points: NamedPoint[];
  onPointMove?: (index: number, x: number, y: number) => void;
  showGrid?: boolean;
  centers?: CentersResult | null;
  centerVisibility?: CenterVisibility;
  width?: number;
  height?: number;
}

const VERTEX_RADIUS = 7;
const DRAG_HIT = 14;

function worldToCanvas(
  wx: number, wy: number, scale: number, ox: number, oy: number
): [number, number] {
  return [ox + wx * scale, oy - wy * scale];
}

function canvasToWorld(
  cx: number, cy: number, scale: number, ox: number, oy: number
): [number, number] {
  return [(cx - ox) / scale, (oy - cy) / scale];
}

// Draw a small cross marker
function drawCross(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  size: number, color: string, lineWidth = 2
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(cx - size, cy);
  ctx.lineTo(cx + size, cy);
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx, cy + size);
  ctx.stroke();
}

export default function BaseCanvas2D({
  points,
  onPointMove,
  showGrid = true,
  centers,
  centerVisibility,
  width = 600,
  height = 480,
}: BaseCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragIdx = useRef<number>(-1);
  const scaleRef = useRef<number>(50);
  const originRef = useRef<[number, number]>([width / 2, height / 2]);

  const computeTransform = useCallback(() => {
    if (points.length === 0) return;
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const rangeX = maxX - minX || 2;
    const rangeY = maxY - minY || 2;
    const pad = 70;
    const scale = Math.min(
      (width - pad * 2) / rangeX,
      (height - pad * 2) / rangeY,
      90
    );
    scaleRef.current = scale;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    originRef.current = [width / 2 - cx * scale, height / 2 + cy * scale];
  }, [points, width, height]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = scaleRef.current;
    const [ox, oy] = originRef.current;
    const n = points.length;

    // ── Background ────────────────────────────────────────────────────────
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, width, height);

    // ── Grid ──────────────────────────────────────────────────────────────
    if (showGrid) {
      const step = scale;
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      const startX = Math.floor((0 - ox) / step) * step + ox;
      for (let x = startX; x < width; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      const startY = Math.floor((0 - oy) / step) * step + oy;
      for (let y = startY; y < height; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }

      // Axes
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(ox, 0); ctx.lineTo(ox, height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, oy); ctx.lineTo(width, oy); ctx.stroke();

      // Axis labels
      ctx.fillStyle = "#94a3b8";
      ctx.font = "12px 'Space Grotesk', sans-serif";
      ctx.fillText("x", width - 16, oy - 8);
      ctx.fillText("y", ox + 8, 16);
      ctx.fillText("O", ox + 6, oy + 16);

      // Tick marks with values
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#94a3b8";
      for (let x = startX; x < width; x += step) {
        const wx = Math.round((x - ox) / scale * 10) / 10;
        if (wx !== 0) ctx.fillText(String(wx), x - 6, oy + 14);
      }
      for (let y = startY; y < height; y += step) {
        const wy = Math.round((oy - y) / scale * 10) / 10;
        if (wy !== 0) ctx.fillText(String(wy), ox + 6, y + 4);
      }
    }

    if (n < 2) return;

    // ── Circumcircle ──────────────────────────────────────────────────────
    if (
      centerVisibility?.circumcircle &&
      centers?.circumcenter &&
      centers.circumradius !== null
    ) {
      const [ccx, ccy] = worldToCanvas(
        centers.circumcenter.x, centers.circumcenter.y, scale, ox, oy
      );
      const cr = centers.circumradius * scale;
      ctx.beginPath();
      ctx.arc(ccx, ccy, cr, 0, Math.PI * 2);
      ctx.strokeStyle = CENTER_COLORS.circumcenter + "88";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ── Incircle ──────────────────────────────────────────────────────────
    if (
      centerVisibility?.incircle &&
      centers?.incenter &&
      centers.inradius !== null
    ) {
      const [icx, icy] = worldToCanvas(
        centers.incenter.x, centers.incenter.y, scale, ox, oy
      );
      const ir = centers.inradius * scale;
      ctx.beginPath();
      ctx.arc(icx, icy, ir, 0, Math.PI * 2);
      ctx.strokeStyle = CENTER_COLORS.incenter + "88";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ── Polygon fill ──────────────────────────────────────────────────────
    ctx.beginPath();
    const [fx, fy] = worldToCanvas(points[0].x, points[0].y, scale, ox, oy);
    ctx.moveTo(fx, fy);
    for (let i = 1; i < n; i++) {
      const [px, py] = worldToCanvas(points[i].x, points[i].y, scale, ox, oy);
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(99, 102, 241, 0.07)";
    ctx.fill();

    // ── Edges ─────────────────────────────────────────────────────────────
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const [ax, ay] = worldToCanvas(points[i].x, points[i].y, scale, ox, oy);
      const [bx, by] = worldToCanvas(points[j].x, points[j].y, scale, ox, oy);

      ctx.strokeStyle = "#6366f1";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();

      // Edge label
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      const dx = bx - ax, dy = by - ay;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = (-dy / len) * 16;
      const ny = (dx / len) * 16;
      ctx.font = "bold 11px 'Space Grotesk', sans-serif";
      ctx.fillStyle = "#4f46e5";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${points[i].label}${points[j].label}`, mx + nx, my + ny);
    }

    // ── Angle arcs ────────────────────────────────────────────────────────
    for (let i = 0; i < n; i++) {
      const prev = points[(i - 1 + n) % n];
      const curr = points[i];
      const next = points[(i + 1) % n];
      const [cx2, cy2] = worldToCanvas(curr.x, curr.y, scale, ox, oy);
      const [px2, py2] = worldToCanvas(prev.x, prev.y, scale, ox, oy);
      const [nx2, ny2] = worldToCanvas(next.x, next.y, scale, ox, oy);
      const a1 = Math.atan2(py2 - cy2, px2 - cx2);
      const a2 = Math.atan2(ny2 - cy2, nx2 - cx2);
      ctx.strokeStyle = "#a5b4fc";
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(cx2, cy2, 16, a1, a2, false);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // ── Centers ───────────────────────────────────────────────────────────
    const drawCenter = (
      pt: Point2D | null | undefined,
      label: string,
      color: string,
      visible: boolean
    ) => {
      if (!visible || !pt) return;
      const [cx2, cy2] = worldToCanvas(pt.x, pt.y, scale, ox, oy);

      // Glow
      const grad = ctx.createRadialGradient(cx2, cy2, 2, cx2, cy2, 14);
      grad.addColorStop(0, color + "cc");
      grad.addColorStop(1, color + "00");
      ctx.beginPath();
      ctx.arc(cx2, cy2, 14, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Cross marker
      drawCross(ctx, cx2, cy2, 8, color, 2);

      // Dot
      ctx.beginPath();
      ctx.arc(cx2, cy2, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Label + coordinate
      ctx.font = "bold 12px 'Space Grotesk', sans-serif";
      ctx.fillStyle = color;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(label, cx2 + 10, cy2 - 8);
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.fillStyle = color + "bb";
      ctx.fillText(`(${pt.x.toFixed(2)}, ${pt.y.toFixed(2)})`, cx2 + 10, cy2 + 6);
    };

    if (centers) {
      drawCenter(centers.centroid, "G", CENTER_COLORS.centroid, centerVisibility?.centroid ?? false);
      drawCenter(centers.circumcenter, "O", CENTER_COLORS.circumcenter, centerVisibility?.circumcenter ?? false);
      drawCenter(centers.incenter, "I", CENTER_COLORS.incenter, centerVisibility?.incenter ?? false);
      drawCenter(centers.orthocenter, "H", CENTER_COLORS.orthocenter, centerVisibility?.orthocenter ?? false);
    }

    // ── Vertices ──────────────────────────────────────────────────────────
    for (let i = 0; i < n; i++) {
      const [vx, vy] = worldToCanvas(points[i].x, points[i].y, scale, ox, oy);
      const color = getFaceColor(i + 2);

      // Shadow/glow
      ctx.shadowColor = color + "66";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(vx, vy, VERTEX_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.shadowBlur = 0;

      // White border
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label above
      ctx.font = "bold 13px 'Space Grotesk', sans-serif";
      ctx.fillStyle = "#1e293b";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(points[i].label, vx, vy - VERTEX_RADIUS - 11);

      // Coordinate below
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(
        `(${points[i].x.toFixed(1)}, ${points[i].y.toFixed(1)})`,
        vx, vy + VERTEX_RADIUS + 11
      );
    }
  }, [points, showGrid, centers, centerVisibility, width, height]);

  useEffect(() => {
    computeTransform();
    draw();
  }, [computeTransform, draw]);

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const getPos = (e: React.MouseEvent | React.TouchEvent): [number, number] => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0] || e.changedTouches[0];
      return [(t.clientX - rect.left) * sx, (t.clientY - rect.top) * sy];
    }
    return [(e.clientX - rect.left) * sx, (e.clientY - rect.top) * sy];
  };

  const hitTest = (cx: number, cy: number): number => {
    const scale = scaleRef.current;
    const [ox, oy] = originRef.current;
    for (let i = 0; i < points.length; i++) {
      const [vx, vy] = worldToCanvas(points[i].x, points[i].y, scale, ox, oy);
      if (Math.sqrt((cx - vx) ** 2 + (cy - vy) ** 2) <= DRAG_HIT) return i;
    }
    return -1;
  };

  const snap = (v: number) => Math.round(v * 2) / 2;

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width: "100%", height: "100%", display: "block", cursor: "crosshair" }}
      onMouseDown={(e) => { dragIdx.current = hitTest(...getPos(e)); }}
      onMouseMove={(e) => {
        if (dragIdx.current < 0 || !onPointMove) return;
        const [cx, cy] = getPos(e);
        const [wx, wy] = canvasToWorld(cx, cy, scaleRef.current, originRef.current[0], originRef.current[1]);
        onPointMove(dragIdx.current, snap(wx), snap(wy));
      }}
      onMouseUp={() => { dragIdx.current = -1; }}
      onMouseLeave={() => { dragIdx.current = -1; }}
      onTouchStart={(e) => { e.preventDefault(); dragIdx.current = hitTest(...getPos(e)); }}
      onTouchMove={(e) => {
        e.preventDefault();
        if (dragIdx.current < 0 || !onPointMove) return;
        const [cx, cy] = getPos(e);
        const [wx, wy] = canvasToWorld(cx, cy, scaleRef.current, originRef.current[0], originRef.current[1]);
        onPointMove(dragIdx.current, snap(wx), snap(wy));
      }}
      onTouchEnd={() => { dragIdx.current = -1; }}
    />
  );
}
