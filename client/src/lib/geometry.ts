/**
 * Solid Geometry Calculator — Core Math Library
 * Design: Blueprint / Technical Drawing style
 *
 * Handles all geometric computations:
 * - Base polygon: edge lengths, interior angles, area (using shoelace)
 * - Prism / Pyramid volume
 * - Dihedral angles between any two faces (via normal vectors)
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export type SolidType = "prism" | "pyramid";

// ─── Vector helpers ───────────────────────────────────────────────────────────

export function vec3(a: Point3D, b: Point3D): Point3D {
  return { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
}

export function dot(u: Point3D, v: Point3D): number {
  return u.x * v.x + u.y * v.y + u.z * v.z;
}

export function cross(u: Point3D, v: Point3D): Point3D {
  return {
    x: u.y * v.z - u.z * v.y,
    y: u.z * v.x - u.x * v.z,
    z: u.x * v.y - u.y * v.x,
  };
}

export function magnitude(v: Point3D): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function normalize(v: Point3D): Point3D {
  const m = magnitude(v);
  if (m < 1e-12) return { x: 0, y: 0, z: 0 };
  return { x: v.x / m, y: v.y / m, z: v.z / m };
}

// ─── Base polygon (2D, z=0) ───────────────────────────────────────────────────

/** Euclidean distance between two 2D points */
export function edgeLength(a: Point2D, b: Point2D): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

/** All edge lengths of the base polygon (ordered) */
export function baseEdgeLengths(pts: Point2D[]): number[] {
  const n = pts.length;
  return pts.map((p, i) => edgeLength(p, pts[(i + 1) % n]));
}

/**
 * Interior angle at vertex i (in degrees).
 * Uses vectors from vertex i to its two neighbours.
 */
export function interiorAngle(pts: Point2D[], i: number): number {
  const n = pts.length;
  const prev = pts[(i - 1 + n) % n];
  const curr = pts[i];
  const next = pts[(i + 1) % n];
  const u = { x: prev.x - curr.x, y: prev.y - curr.y };
  const v = { x: next.x - curr.x, y: next.y - curr.y };
  const lenU = Math.sqrt(u.x ** 2 + u.y ** 2);
  const lenV = Math.sqrt(v.x ** 2 + v.y ** 2);
  if (lenU < 1e-12 || lenV < 1e-12) return 0;
  const cosA = (u.x * v.x + u.y * v.y) / (lenU * lenV);
  return (Math.acos(Math.max(-1, Math.min(1, cosA))) * 180) / Math.PI;
}

/** All interior angles of the base polygon (degrees) */
export function baseInteriorAngles(pts: Point2D[]): number[] {
  return pts.map((_, i) => interiorAngle(pts, i));
}

/**
 * Signed area via shoelace formula.
 * Returns positive value (absolute area).
 */
export function baseArea(pts: Point2D[]): number {
  let sum = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    sum += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return Math.abs(sum) / 2;
}

/** Perimeter of the base polygon */
export function basePerimeter(pts: Point2D[]): number {
  return baseEdgeLengths(pts).reduce((a, b) => a + b, 0);
}

// ─── 3D solid construction ────────────────────────────────────────────────────

export function buildSolid(
  base: Point2D[],
  solidType: SolidType,
  height: number
): { baseVertices: Point3D[]; topVertices: Point3D[] } {
  const baseVertices: Point3D[] = base.map((p) => ({ x: p.x, y: p.y, z: 0 }));

  if (solidType === "prism") {
    const topVertices: Point3D[] = base.map((p) => ({
      x: p.x,
      y: p.y,
      z: height,
    }));
    return { baseVertices, topVertices };
  } else {
    const cx = base.reduce((s, p) => s + p.x, 0) / base.length;
    const cy = base.reduce((s, p) => s + p.y, 0) / base.length;
    return { baseVertices, topVertices: [{ x: cx, y: cy, z: height }] };
  }
}

// ─── Volume ───────────────────────────────────────────────────────────────────

export function volume(
  base: Point2D[],
  solidType: SolidType,
  height: number
): number {
  const A = baseArea(base);
  if (solidType === "prism") return A * height;
  return (A * height) / 3;
}

// ─── Face definitions ─────────────────────────────────────────────────────────

export interface Face {
  /** Human-readable label key (used for i18n lookup) */
  labelKey: string;
  /** Index for display (1-based for sides) */
  labelIndex?: number;
  /** 3D vertices of this face (in order) */
  vertices: Point3D[];
}

/**
 * Returns all faces of the solid.
 * Face 0 = bottom base
 * Face 1 = top base (prism only)
 * Remaining = lateral faces
 */
export function buildFaces(
  base: Point2D[],
  solidType: SolidType,
  height: number
): Face[] {
  const { baseVertices, topVertices } = buildSolid(base, solidType, height);
  const n = base.length;
  const faces: Face[] = [];

  // Bottom face
  faces.push({ labelKey: "faceBase", vertices: [...baseVertices] });

  if (solidType === "prism") {
    // Top face
    faces.push({ labelKey: "faceTop", vertices: [...topVertices] });
    // Lateral faces
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      faces.push({
        labelKey: "faceSide",
        labelIndex: i + 1,
        vertices: [
          baseVertices[i],
          baseVertices[j],
          topVertices[j],
          topVertices[i],
        ],
      });
    }
  } else {
    // Pyramid lateral faces
    const apex = topVertices[0];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      faces.push({
        labelKey: "faceSide",
        labelIndex: i + 1,
        vertices: [baseVertices[i], baseVertices[j], apex],
      });
    }
  }

  return faces;
}

// ─── Normal vector of a face ──────────────────────────────────────────────────

/**
 * Compute the outward-facing unit normal of a planar face.
 * Uses first three non-collinear vertices.
 * For the base (z=0, CCW winding), normal points downward (0,0,-1).
 * We normalise direction consistently: base normal = (0,0,-1), top = (0,0,+1).
 */
export function faceNormal(face: Face): Point3D {
  const v = face.vertices;
  if (v.length < 3) return { x: 0, y: 0, z: 1 };
  const u1 = vec3(v[0], v[1]);
  const u2 = vec3(v[0], v[2]);
  return normalize(cross(u1, u2));
}

// ─── Dihedral angle between two faces ────────────────────────────────────────

/**
 * Dihedral angle between two faces (degrees).
 *
 * The dihedral angle is the angle you would measure if you stood on the
 * shared edge and looked along it — i.e. the angle between the two half-planes.
 *
 * We compute it as:
 *   θ = arccos( n̂_A · n̂_B )          if normals point OUTWARD (same side)
 *   dihedral = 180° − θ               (interior angle)
 *
 * For faces that share no edge (non-adjacent), we still return the angle
 * between their planes, which is the same formula.
 */
export function dihedralAngle(faceA: Face, faceB: Face): number {
  const nA = faceNormal(faceA);
  const nB = faceNormal(faceB);
  const cosTheta = Math.max(-1, Math.min(1, dot(nA, nB)));
  // Angle between outward normals
  const angleBetweenNormals = (Math.acos(cosTheta) * 180) / Math.PI;
  // Interior dihedral = supplement of angle between outward normals
  return 180 - angleBetweenNormals;
}

// ─── Lateral edge lengths ─────────────────────────────────────────────────────

export function lateralEdgeLengths(
  base: Point2D[],
  solidType: SolidType,
  height: number
): number[] {
  const { baseVertices, topVertices } = buildSolid(base, solidType, height);
  if (solidType === "prism") {
    return baseVertices.map((b, i) => magnitude(vec3(b, topVertices[i])));
  } else {
    const apex = topVertices[0];
    return baseVertices.map((b) => magnitude(vec3(b, apex)));
  }
}

// ─── Face areas ───────────────────────────────────────────────────────────────

export function triangleArea3D(a: Point3D, b: Point3D, c: Point3D): number {
  const ab = vec3(a, b);
  const ac = vec3(a, c);
  return magnitude(cross(ab, ac)) / 2;
}

export function faceArea(face: Face): number {
  const v = face.vertices;
  if (v.length < 3) return 0;
  // Fan triangulation from v[0]
  let area = 0;
  for (let i = 1; i < v.length - 1; i++) {
    area += triangleArea3D(v[0], v[i], v[i + 1]);
  }
  return area;
}

// ─── Full result type ─────────────────────────────────────────────────────────

export interface GeometryResult {
  baseEdges: number[];
  baseAngles: number[];
  baseAreaVal: number;
  basePerimeterVal: number;
  solidVolume: number;
  lateralEdges: number[];
  faces: Face[];
  faceAreas: number[];
  /** dihedralMatrix[i][j] = dihedral angle between face i and face j (degrees) */
  dihedralMatrix: number[][];
}

export function computeAll(
  base: Point2D[],
  solidType: SolidType,
  height: number
): GeometryResult {
  const faces = buildFaces(base, solidType, height);
  const faceAreas = faces.map(faceArea);
  const n = faces.length;
  const dihedralMatrix: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) =>
      i === j ? 0 : dihedralAngle(faces[i], faces[j])
    )
  );

  return {
    baseEdges: baseEdgeLengths(base),
    baseAngles: baseInteriorAngles(base),
    baseAreaVal: baseArea(base),
    basePerimeterVal: basePerimeter(base),
    solidVolume: volume(base, solidType, height),
    lateralEdges: lateralEdgeLengths(base, solidType, height),
    faces,
    faceAreas,
    dihedralMatrix,
  };
}
