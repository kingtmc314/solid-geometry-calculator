/**
 * BaseCanvas2D — Interactive 2D canvas for the base polygon
 * Deep tech dark theme: navy bg, cyan grid, coloured vertices
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
}

const VERTEX_RADIUS = 7;
const DRAG_HIT = 16;

export default function BaseCanvas2D({
  points,
  onPointMove,
  showGrid = true,
  centers,
  centerVisibility,
}: BaseCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragIdx = useRef<number>(-1);
  const scaleRef = useRef<number>(50);
  const originRef = useRef<[number, number]>([300, 240]);

  const computeTransform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length === 0) return;
    const W = canvas.width, H = canvas.height;
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs, 0) - 1;
    const maxX = Math.max(...xs, 0) + 1;
    const minY = Math.min(...ys, 0) - 1;
    const maxY = Math.max(...ys, 0) + 1;
    const rangeX = maxX - minX || 4;
    const rangeY = maxY - minY || 4;
    const pad = 72;
    const scale = Math.min((W - pad * 2) / rangeX, (H - pad * 2) / rangeY, 100);
    scaleRef.current = scale;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    originRef.current = [W / 2 - cx * scale, H / 2 + cy * scale];
  }, [points]);

  const w2c = (x: number, y: number): [number, number] => {
    const [ox, oy] = originRef.current;
    const s = scaleRef.current;
    return [ox + x * s, oy - y * s];
  };
  const c2w = (cx: number, cy: number): [number, number] => {
    const [ox, oy] = originRef.current;
    const s = scaleRef.current;
    return [(cx - ox) / s, (oy - cy) / s];
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const n = points.length;

    // Background
    ctx.fillStyle = "#0a0e1a";
    ctx.fillRect(0, 0, W, H);

    // Grid
    if (showGrid) {
      const s = scaleRef.current;
      const [ox, oy] = originRef.current;
      ctx.strokeStyle = "#141d35";
      ctx.lineWidth = 1;
      for (let x = ox % s; x < W; x += s) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = oy % s; y < H; y += s) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      // Axes
      ctx.strokeStyle = "#1e2d4a";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(ox, 0); ctx.lineTo(ox, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, oy); ctx.lineTo(W, oy); ctx.stroke();
      // Axis labels
      ctx.fillStyle = "#2e4070";
      ctx.font = "11px 'Space Grotesk', sans-serif";
      ctx.textAlign = "right"; ctx.textBaseline = "bottom";
      ctx.fillText("x", W - 4, oy - 4);
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText("y", ox + 4, 4);
      // Tick values
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#2e4070";
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      for (let x = ox % s; x < W; x += s) {
        const wx = Math.round((x - ox) / s);
        if (wx !== 0) ctx.fillText(String(wx), x, oy + 3);
      }
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      for (let y = oy % s; y < H; y += s) {
        const wy = Math.round((oy - y) / s);
        if (wy !== 0) ctx.fillText(String(wy), ox - 3, y);
      }
    }

    if (n < 2) return;

    // Circumcircle
    if (centerVisibility?.circumcircle && centers?.circumcenter && centers.circumradius) {
      const [ccx, ccy] = w2c(centers.circumcenter.x, centers.circumcenter.y);
      const r = centers.circumradius * scaleRef.current;
      ctx.beginPath(); ctx.arc(ccx, ccy, r, 0, Math.PI * 2);
      ctx.strokeStyle = CENTER_COLORS.circumcenter + "55";
      ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
    }

    // Incircle
    if (centerVisibility?.incircle && centers?.incenter && centers.inradius) {
      const [icx, icy] = w2c(centers.incenter.x, centers.incenter.y);
      const r = centers.inradius * scaleRef.current;
      ctx.beginPath(); ctx.arc(icx, icy, r, 0, Math.PI * 2);
      ctx.strokeStyle = CENTER_COLORS.incenter + "55";
      ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
    }

    // Polygon fill
    ctx.beginPath();
    const [fx, fy] = w2c(points[0].x, points[0].y);
    ctx.moveTo(fx, fy);
    for (let i = 1; i < n; i++) {
      const [px, py] = w2c(points[i].x, points[i].y);
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(0,212,255,0.06)";
    ctx.fill();

    // Edges + labels
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const [ax, ay] = w2c(points[i].x, points[i].y);
      const [bx, by] = w2c(points[j].x, points[j].y);
      ctx.strokeStyle = "#00d4ff";
      ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      const dx = bx - ax, dy = by - ay;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = (-dy / len) * 15, ny = (dx / len) * 15;
      ctx.font = "bold 11px 'Space Grotesk', sans-serif";
      ctx.fillStyle = "#00d4ff";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(`${points[i].label}${points[j].label}`, mx + nx, my + ny);
    }

    // Angle arcs
    for (let i = 0; i < n; i++) {
      const prev = points[(i - 1 + n) % n];
      const curr = points[i];
      const next = points[(i + 1) % n];
      const [cx2, cy2] = w2c(curr.x, curr.y);
      const [px2, py2] = w2c(prev.x, prev.y);
      const [nx2, ny2] = w2c(next.x, next.y);
      const a1 = Math.atan2(py2 - cy2, px2 - cx2);
      const a2 = Math.atan2(ny2 - cy2, nx2 - cx2);
      ctx.strokeStyle = "#00d4ff44";
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(cx2, cy2, 14, a1, a2, false); ctx.stroke();
    }

    // Centers
    const drawCenter = (pt: Point2D | null | undefined, label: string, color: string, visible: boolean) => {
      if (!visible || !pt) return;
      const [cx2, cy2] = w2c(pt.x, pt.y);
      // Glow
      const grad = ctx.createRadialGradient(cx2, cy2, 2, cx2, cy2, 14);
      grad.addColorStop(0, color + "aa"); grad.addColorStop(1, "transparent");
      ctx.beginPath(); ctx.arc(cx2, cy2, 14, 0, Math.PI * 2);
      ctx.fillStyle = grad; ctx.fill();
      // Cross
      ctx.strokeStyle = color; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx2 - 7, cy2); ctx.lineTo(cx2 + 7, cy2);
      ctx.moveTo(cx2, cy2 - 7); ctx.lineTo(cx2, cy2 + 7); ctx.stroke();
      // Dot
      ctx.beginPath(); ctx.arc(cx2, cy2, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      // Label
      ctx.font = "bold 11px 'Space Grotesk', sans-serif";
      ctx.fillStyle = color; ctx.textAlign = "left"; ctx.textBaseline = "bottom";
      ctx.fillText(label, cx2 + 8, cy2 - 2);
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.fillStyle = color + "99"; ctx.textBaseline = "top";
      ctx.fillText(`(${pt.x.toFixed(2)}, ${pt.y.toFixed(2)})`, cx2 + 8, cy2 + 2);
    };

    if (centers) {
      drawCenter(centers.centroid, "G", CENTER_COLORS.centroid, centerVisibility?.centroid ?? false);
      drawCenter(centers.circumcenter, "O", CENTER_COLORS.circumcenter, centerVisibility?.circumcenter ?? false);
      drawCenter(centers.incenter, "I", CENTER_COLORS.incenter, centerVisibility?.incenter ?? false);
      drawCenter(centers.orthocenter, "H", CENTER_COLORS.orthocenter, centerVisibility?.orthocenter ?? false);
    }

    // Vertices
    for (let i = 0; i < n; i++) {
      const [vx, vy] = w2c(points[i].x, points[i].y);
      const color = getFaceColor(i + 2);
      // Glow
      const grd = ctx.createRadialGradient(vx, vy, 0, vx, vy, 16);
      grd.addColorStop(0, color + "55"); grd.addColorStop(1, "transparent");
      ctx.beginPath(); ctx.arc(vx, vy, 16, 0, Math.PI * 2);
      ctx.fillStyle = grd; ctx.fill();
      // Dot
      ctx.beginPath(); ctx.arc(vx, vy, VERTEX_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = "#0a0e1a"; ctx.lineWidth = 2; ctx.stroke();
      // Label
      ctx.font = "bold 13px 'Space Grotesk', sans-serif";
      ctx.fillStyle = color; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      ctx.fillText(points[i].label, vx, vy - VERTEX_RADIUS - 6);
      // Coords
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#3d5070"; ctx.textBaseline = "top";
      ctx.fillText(`(${points[i].x.toFixed(1)}, ${points[i].y.toFixed(1)})`, vx, vy + VERTEX_RADIUS + 4);
    }
  }, [points, showGrid, centers, centerVisibility]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      computeTransform();
      draw();
    });
    ro.observe(canvas);
    canvas.width = canvas.offsetWidth || 600;
    canvas.height = canvas.offsetHeight || 480;
    computeTransform();
    draw();
    return () => ro.disconnect();
  }, [computeTransform, draw]);

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
    for (let i = 0; i < points.length; i++) {
      const [vx, vy] = w2c(points[i].x, points[i].y);
      if (Math.hypot(cx - vx, cy - vy) <= DRAG_HIT) return i;
    }
    return -1;
  };

  const snap = (v: number) => Math.round(v * 2) / 2;

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", display: "block", cursor: "crosshair" }}
      onMouseDown={(e) => { dragIdx.current = hitTest(...getPos(e)); }}
      onMouseMove={(e) => {
        if (dragIdx.current < 0 || !onPointMove) return;
        const [cx, cy] = getPos(e);
        const [wx, wy] = c2w(cx, cy);
        onPointMove(dragIdx.current, snap(wx), snap(wy));
      }}
      onMouseUp={() => { dragIdx.current = -1; }}
      onMouseLeave={() => { dragIdx.current = -1; }}
      onTouchStart={(e) => { e.preventDefault(); dragIdx.current = hitTest(...getPos(e)); }}
      onTouchMove={(e) => {
        e.preventDefault();
        if (dragIdx.current < 0 || !onPointMove) return;
        const [cx, cy] = getPos(e);
        const [wx, wy] = c2w(cx, cy);
        onPointMove(dragIdx.current, snap(wx), snap(wy));
      }}
      onTouchEnd={() => { dragIdx.current = -1; }}
    />
  );
}
