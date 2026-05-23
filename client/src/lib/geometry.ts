/**
 * geometry.ts — Core geometric computation library
 *
 * Features:
 * - Named vertices (NamedPoint with label)
 * - 2D base polygon: edges, interior angles, area, perimeter
 * - Four special centers: centroid, circumcenter, incenter, orthocenter
 *   (exact for triangle; generalised for polygons where applicable)
 * - 3D solid (prism / pyramid): faces named by vertex labels, volume, dihedral angles
 * - Face colours
 */

export type SolidType = "prism" | "pyramid";

export interface NamedPoint {
  label: string;
  x: number;
  y: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function dist2D(a: Point2D, b: Point2D): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

export function interiorAngle(a: Point2D, b: Point2D, c: Point2D): number {
  const ux = a.x - b.x, uy = a.y - b.y;
  const vx = c.x - b.x, vy = c.y - b.y;
  const dot = ux * vx + uy * vy;
  const mag = Math.sqrt(ux ** 2 + uy ** 2) * Math.sqrt(vx ** 2 + vy ** 2);
  if (mag < 1e-12) return 0;
  return (Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180) / Math.PI;
}

export function signedArea(pts: Point2D[]): number {
  const n = pts.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return area / 2;
}

export function polygonArea(pts: Point2D[]): number {
  return Math.abs(signedArea(pts));
}

// ─── Base 2D result ───────────────────────────────────────────────────────────

export interface BaseResult {
  edgeLengths: number[];
  edgeLabels: string[];
  angles: number[];
  angleLabels: string[];
  perimeter: number;
  area: number;
  isCCW: boolean;
}

export function computeBase(pts: NamedPoint[]): BaseResult {
  const n = pts.length;
  const edgeLengths: number[] = [];
  const edgeLabels: string[] = [];
  const angles: number[] = [];
  const angleLabels: string[] = [];

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    edgeLengths.push(dist2D(pts[i], pts[j]));
    edgeLabels.push(`${pts[i].label}${pts[j].label}`);
  }

  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    const curr = pts[i];
    const next = pts[(i + 1) % n];
    angles.push(interiorAngle(prev, curr, next));
    angleLabels.push(`∠${curr.label}`);
  }

  return {
    edgeLengths,
    edgeLabels,
    angles,
    angleLabels,
    perimeter: edgeLengths.reduce((s, v) => s + v, 0),
    area: polygonArea(pts),
    isCCW: signedArea(pts) > 0,
  };
}

// ─── Four Special Centers ─────────────────────────────────────────────────────

export interface CentersResult {
  /** Centroid (形心) — always defined */
  centroid: Point2D;
  centroidExists: true;

  /** Circumcenter (外心) — exact for triangle; generalised for polygon */
  circumcenter: Point2D | null;
  circumcenterExists: boolean;
  circumradius: number | null;
  /** Note about circumcenter for non-triangles */
  circumcenterNote?: string;

  /** Incenter (內心) — exact for triangle; generalised for polygon */
  incenter: Point2D | null;
  incenterExists: boolean;
  inradius: number | null;
  incenterNote?: string;

  /** Orthocenter (垂心) — exact for triangle; generalised for polygon */
  orthocenter: Point2D | null;
  orthocenterExists: boolean;
  orthocenterNote?: string;
}

/**
 * Compute the four special centers.
 * For triangles: exact formulas.
 * For polygons (n>3): centroid is exact; others use generalised/approximate methods
 * and a note is shown.
 */
export function computeCenters(pts: NamedPoint[]): CentersResult {
  const n = pts.length;

  // ── Centroid (形心) ── always the arithmetic mean of vertices
  const centroid: Point2D = {
    x: pts.reduce((s, p) => s + p.x, 0) / n,
    y: pts.reduce((s, p) => s + p.y, 0) / n,
  };

  if (n === 3) {
    // ── Triangle exact formulas ──────────────────────────────────────────
    const [A, B, C] = pts;
    const a = dist2D(B, C); // side opposite A
    const b = dist2D(A, C); // side opposite B
    const c = dist2D(A, B); // side opposite C

    // Circumcenter: intersection of perpendicular bisectors
    // Using formula: solve linear system
    const D = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
    let circumcenter: Point2D | null = null;
    let circumradius: number | null = null;
    if (Math.abs(D) > 1e-12) {
      const ux =
        ((A.x ** 2 + A.y ** 2) * (B.y - C.y) +
          (B.x ** 2 + B.y ** 2) * (C.y - A.y) +
          (C.x ** 2 + C.y ** 2) * (A.y - B.y)) /
        D;
      const uy =
        ((A.x ** 2 + A.y ** 2) * (C.x - B.x) +
          (B.x ** 2 + B.y ** 2) * (A.x - C.x) +
          (C.x ** 2 + C.y ** 2) * (B.x - A.x)) /
        D;
      circumcenter = { x: ux, y: uy };
      circumradius = dist2D(circumcenter, A);
    }

    // Incenter: weighted by opposite side lengths
    const perim = a + b + c;
    const incenter: Point2D = {
      x: (a * A.x + b * B.x + c * C.x) / perim,
      y: (a * A.y + b * B.y + c * C.y) / perim,
    };
    // Inradius = Area / s  (s = semi-perimeter)
    const area = polygonArea(pts);
    const inradius = area / (perim / 2);

    // Orthocenter: intersection of altitudes
    // Using: H = A + B + C - 2*circumcenter  (only if circumcenter exists)
    // More robust: direct linear system
    let orthocenter: Point2D | null = null;
    // Altitude from A perpendicular to BC
    const bcDx = C.x - B.x, bcDy = C.y - B.y;
    // Altitude from B perpendicular to AC
    const acDx = C.x - A.x, acDy = C.y - A.y;
    // Line through A with direction (bcDy, -bcDx): A + t*(bcDy, -bcDx)
    // Line through B with direction (acDy, -acDx): B + s*(acDy, -acDx)
    // Solve: A.x + t*bcDy = B.x + s*acDy
    //        A.y - t*bcDx = B.y - s*acDx
    const det = bcDy * (-acDx) - (-bcDx) * acDy;
    if (Math.abs(det) > 1e-12) {
      const t = ((B.x - A.x) * (-acDx) - (B.y - A.y) * acDy) / det;
      orthocenter = {
        x: A.x + t * bcDy,
        y: A.y - t * bcDx,
      };
    }

    return {
      centroid,
      centroidExists: true,
      circumcenter,
      circumcenterExists: circumcenter !== null,
      circumradius,
      incenter,
      incenterExists: true,
      inradius,
      orthocenter,
      orthocenterExists: orthocenter !== null,
    };
  }

  // ── General polygon (n > 3) ───────────────────────────────────────────────
  const note = (lang: string) =>
    lang === "zh"
      ? "（僅三角形有精確值，此為近似）"
      : "(Exact only for triangles; this is approximate)";

  // Generalised circumcenter: minimise sum of squared distances to all vertices
  // → least-squares circumcenter = centroid of vertices (approximate)
  // Better: use the circumcenter of the "best-fit" triangle formed by first 3 vertices
  // We compute it for the polygon's first 3 vertices as a representative value
  const sub3 = pts.slice(0, 3) as [NamedPoint, NamedPoint, NamedPoint];
  const [A3, B3, C3] = sub3;
  const D3 = 2 * (A3.x * (B3.y - C3.y) + B3.x * (C3.y - A3.y) + C3.x * (A3.y - B3.y));
  let circumcenter: Point2D | null = null;
  let circumradius: number | null = null;
  if (Math.abs(D3) > 1e-12) {
    const ux =
      ((A3.x ** 2 + A3.y ** 2) * (B3.y - C3.y) +
        (B3.x ** 2 + B3.y ** 2) * (C3.y - A3.y) +
        (C3.x ** 2 + C3.y ** 2) * (A3.y - B3.y)) /
      D3;
    const uy =
      ((A3.x ** 2 + A3.y ** 2) * (C3.x - B3.x) +
        (B3.x ** 2 + B3.y ** 2) * (A3.x - C3.x) +
        (C3.x ** 2 + C3.y ** 2) * (B3.x - A3.x)) /
      D3;
    circumcenter = { x: ux, y: uy };
    circumradius = dist2D(circumcenter, A3);
  }

  // Generalised incenter: weighted centroid by edge lengths
  const edgeLens = pts.map((p, i) => dist2D(p, pts[(i + 1) % n]));
  const totalEdge = edgeLens.reduce((s, v) => s + v, 0);
  const incenter: Point2D = {
    x: pts.reduce((s, p, i) => s + edgeLens[i] * p.x, 0) / totalEdge,
    y: pts.reduce((s, p, i) => s + edgeLens[i] * p.y, 0) / totalEdge,
  };
  const area = polygonArea(pts);
  const inradius = (2 * area) / totalEdge; // apothem approximation

  // Generalised orthocenter: for regular polygons it coincides with centroid
  // For irregular polygons, use the "de Longchamps point" approximation:
  // H ≈ 3G - 2O  (Euler line relation, approximate for polygons)
  let orthocenter: Point2D | null = null;
  if (circumcenter) {
    orthocenter = {
      x: 3 * centroid.x - 2 * circumcenter.x,
      y: 3 * centroid.y - 2 * circumcenter.y,
    };
  }

  return {
    centroid,
    centroidExists: true,
    circumcenter,
    circumcenterExists: circumcenter !== null,
    circumradius,
    circumcenterNote: note("zh"),
    incenter,
    incenterExists: true,
    inradius,
    incenterNote: note("zh"),
    orthocenter,
    orthocenterExists: orthocenter !== null,
    orthocenterNote: note("zh"),
  };
}

// ─── 3D Solid ─────────────────────────────────────────────────────────────────

export interface Face3D {
  vertexLabels: string[];
  name: string;
  vertices: Point3D[];
  type: "base" | "top" | "lateral";
  lateralIndex?: number;
  normal: Point3D;
}

export interface SolidResult {
  baseVerts3D: Point3D[];
  topVerts3D: Point3D[];
  faces: Face3D[];
  lateralEdgeLengths: number[];
  lateralEdgeLabels: string[];
  volume: number;
  faceAreas: number[];
  dihedralMatrix: number[][];
}

function normalize(v: Point3D): Point3D {
  const len = Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2);
  if (len < 1e-12) return { x: 0, y: 0, z: 1 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function cross(a: Point3D, b: Point3D): Point3D {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function dot3(a: Point3D, b: Point3D): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function sub3(a: Point3D, b: Point3D): Point3D {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function add3(a: Point3D, b: Point3D): Point3D {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function scale3(v: Point3D, s: number): Point3D {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function faceNormal(verts: Point3D[]): Point3D {
  if (verts.length < 3) return { x: 0, y: 0, z: 1 };
  const v1 = sub3(verts[1], verts[0]);
  const v2 = sub3(verts[2], verts[0]);
  return normalize(cross(v1, v2));
}

function polyArea3D(verts: Point3D[]): number {
  if (verts.length < 3) return 0;
  let area = 0;
  const o = verts[0];
  for (let i = 1; i < verts.length - 1; i++) {
    const v1 = sub3(verts[i], o);
    const v2 = sub3(verts[i + 1], o);
    const c = cross(v1, v2);
    area += Math.sqrt(c.x ** 2 + c.y ** 2 + c.z ** 2) / 2;
  }
  return area;
}

function dihedralAngle(nA: Point3D, nB: Point3D): number {
  const d = Math.max(-1, Math.min(1, dot3(nA, nB)));
  return 180 - (Math.acos(d) * 180) / Math.PI;
}

export function computeSolid(
  pts: NamedPoint[],
  solidType: SolidType,
  height: number,
  apexLabel = "A'"
): SolidResult {
  const n = pts.length;
  const baseVerts3D: Point3D[] = pts.map((p) => ({ x: p.x, y: p.y, z: 0 }));

  let topVerts3D: Point3D[];
  if (solidType === "prism") {
    topVerts3D = pts.map((p) => ({ x: p.x, y: p.y, z: height }));
  } else {
    const cx = pts.reduce((s, p) => s + p.x, 0) / n;
    const cy = pts.reduce((s, p) => s + p.y, 0) / n;
    topVerts3D = [{ x: cx, y: cy, z: height }];
  }

  const faces: Face3D[] = [];

  // Base face
  const baseN = normalize(faceNormal(baseVerts3D));
  const baseNDown: Point3D =
    baseN.z > 0 ? { x: -baseN.x, y: -baseN.y, z: -baseN.z } : baseN;
  faces.push({
    vertexLabels: pts.map((p) => p.label),
    name: pts.map((p) => p.label).join(""),
    vertices: [...baseVerts3D],
    type: "base",
    normal: baseNDown,
  });

  if (solidType === "prism") {
    const topLabels = pts.map((p) => `${p.label}'`);
    const topN: Point3D = { x: -baseNDown.x, y: -baseNDown.y, z: -baseNDown.z };
    faces.push({
      vertexLabels: topLabels,
      name: topLabels.join(""),
      vertices: [...topVerts3D],
      type: "top",
      normal: topN,
    });

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const verts: Point3D[] = [
        baseVerts3D[i],
        baseVerts3D[j],
        topVerts3D[j],
        topVerts3D[i],
      ];
      const lLabels = [pts[i].label, pts[j].label, `${pts[j].label}'`, `${pts[i].label}'`];
      faces.push({
        vertexLabels: lLabels,
        name: lLabels.join(""),
        vertices: verts,
        type: "lateral",
        lateralIndex: i + 1,
        normal: normalize(faceNormal(verts)),
      });
    }
  } else {
    const apex = topVerts3D[0];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const verts: Point3D[] = [baseVerts3D[i], baseVerts3D[j], apex];
      const lLabels = [pts[i].label, pts[j].label, apexLabel];
      faces.push({
        vertexLabels: lLabels,
        name: lLabels.join(""),
        vertices: verts,
        type: "lateral",
        lateralIndex: i + 1,
        normal: normalize(faceNormal(verts)),
      });
    }
  }

  const lateralEdgeLengths: number[] = [];
  const lateralEdgeLabels: string[] = [];
  if (solidType === "prism") {
    for (let i = 0; i < n; i++) {
      const b = baseVerts3D[i];
      const t = topVerts3D[i];
      lateralEdgeLengths.push(
        Math.sqrt((t.x - b.x) ** 2 + (t.y - b.y) ** 2 + (t.z - b.z) ** 2)
      );
      lateralEdgeLabels.push(`${pts[i].label}${pts[i].label}'`);
    }
  } else {
    const apex = topVerts3D[0];
    for (let i = 0; i < n; i++) {
      const b = baseVerts3D[i];
      lateralEdgeLengths.push(
        Math.sqrt((apex.x - b.x) ** 2 + (apex.y - b.y) ** 2 + (apex.z - b.z) ** 2)
      );
      lateralEdgeLabels.push(`${pts[i].label}${apexLabel}`);
    }
  }

  const baseArea = polygonArea(pts);
  const volume = solidType === "prism" ? baseArea * height : (baseArea * height) / 3;
  const faceAreas = faces.map((f) => polyArea3D(f.vertices));

  const nf = faces.length;
  const dihedralMatrix: number[][] = Array.from({ length: nf }, (_, i) =>
    Array.from({ length: nf }, (__, j) =>
      i === j ? 0 : dihedralAngle(faces[i].normal, faces[j].normal)
    )
  );

  return {
    baseVerts3D,
    topVerts3D,
    faces,
    lateralEdgeLengths,
    lateralEdgeLabels,
    volume,
    faceAreas,
    dihedralMatrix,
  };
}

// ─── Dihedral angle helpers for 3D visualisation ─────────────────────────────

/**
 * Find the shared edge (intersection line) between two faces.
 * Returns [pointOnLine, lineDirection] or null if no shared edge.
 */
export function findSharedEdge(
  faceA: Face3D,
  faceB: Face3D
): { p: Point3D; dir: Point3D; sharedVerts: Point3D[] } | null {
  const shared: Point3D[] = [];
  for (const va of faceA.vertices) {
    for (const vb of faceB.vertices) {
      if (
        Math.abs(va.x - vb.x) < 1e-9 &&
        Math.abs(va.y - vb.y) < 1e-9 &&
        Math.abs(va.z - vb.z) < 1e-9
      ) {
        shared.push(va);
      }
    }
  }
  if (shared.length < 2) return null;
  const dir = normalize(sub3(shared[1], shared[0]));
  return { p: shared[0], dir, sharedVerts: shared };
}

/**
 * Compute the dihedral angle arc centre and the two arm directions
 * for visualising the angle between two faces.
 */
export function dihedralArcInfo(
  faceA: Face3D,
  faceB: Face3D
): {
  arcCenter: Point3D;
  armA: Point3D;
  armB: Point3D;
  angleDeg: number;
  edgeDir: Point3D | null;
  sharedVerts: Point3D[];
} | null {
  const shared = findSharedEdge(faceA, faceB);

  // Compute angle
  const d = Math.max(-1, Math.min(1, dot3(faceA.normal, faceB.normal)));
  const angleDeg = 180 - (Math.acos(d) * 180) / Math.PI;

  if (!shared) {
    // No shared edge — use centroid midpoint as arc center
    const centA = faceA.vertices.reduce(
      (acc, v) => add3(acc, v),
      { x: 0, y: 0, z: 0 }
    );
    const nA = faceA.vertices.length;
    const centB = faceB.vertices.reduce(
      (acc, v) => add3(acc, v),
      { x: 0, y: 0, z: 0 }
    );
    const nB = faceB.vertices.length;
    const arcCenter = {
      x: (centA.x / nA + centB.x / nB) / 2,
      y: (centA.y / nA + centB.y / nB) / 2,
      z: (centA.z / nA + centB.z / nB) / 2,
    };
    return {
      arcCenter,
      armA: faceA.normal,
      armB: faceB.normal,
      angleDeg,
      edgeDir: null,
      sharedVerts: [],
    };
  }

  // Arc center: midpoint of shared edge
  const arcCenter =
    shared.sharedVerts.length >= 2
      ? {
          x: (shared.sharedVerts[0].x + shared.sharedVerts[1].x) / 2,
          y: (shared.sharedVerts[0].y + shared.sharedVerts[1].y) / 2,
          z: (shared.sharedVerts[0].z + shared.sharedVerts[1].z) / 2,
        }
      : shared.p;

  // Arms: perpendicular to edge direction, lying in each face
  const edgeDir = shared.dir;
  const armA = normalize(
    sub3(faceA.normal, scale3(edgeDir, dot3(faceA.normal, edgeDir)))
  );
  const armB = normalize(
    sub3(faceB.normal, scale3(edgeDir, dot3(faceB.normal, edgeDir)))
  );

  return {
    arcCenter,
    armA,
    armB,
    angleDeg,
    edgeDir,
    sharedVerts: shared.sharedVerts,
  };
}

// ─── Colour palette ───────────────────────────────────────────────────────────

// Elegant tech palette: indigo, teal, violet, rose, amber, emerald, sky, fuchsia
export const FACE_COLORS = [
  "#6366f1", // indigo — base
  "#14b8a6", // teal — top
  "#8b5cf6", // violet
  "#f43f5e", // rose
  "#f59e0b", // amber
  "#10b981", // emerald
  "#0ea5e9", // sky
  "#d946ef", // fuchsia
  "#fb923c", // orange
];

export const CENTER_COLORS = {
  centroid: "#f59e0b",     // amber
  circumcenter: "#6366f1", // indigo
  incenter: "#10b981",     // emerald
  orthocenter: "#f43f5e",  // rose
};

export function getFaceColor(index: number): string {
  return FACE_COLORS[index % FACE_COLORS.length];
}
