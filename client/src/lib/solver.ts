/**
 * solver.ts — Polygon solver from partial edge/angle data
 *
 * Strategy:
 * For a polygon with n vertices, we have:
 *   - n sides: a_1, a_2, ..., a_n  (a_i = side between vertex i and i+1)
 *   - n interior angles: A_1, A_2, ..., A_n
 *   - Constraint: sum of interior angles = (n-2)*180°
 *
 * For n=3 (triangle): fully determined by 3 independent pieces (SSS/SAS/ASA/AAS/SSA).
 * For n>3: we triangulate and solve each triangle in sequence.
 *
 * Each step records:
 *   - which law was used (sine / cosine / angle-sum)
 *   - the LaTeX string showing the formula and substitution
 *   - the result
 */

export type ValueState = "given" | "solved" | "unknown";

export interface PolygonValue {
  value: number | null;
  state: ValueState;
}

export interface SolverStep {
  law: "cosine" | "sine" | "angle_sum" | "given" | "polygon_angle_sum";
  description: string;   // plain text
  latex: string;         // full LaTeX block (can be multi-line, use \\ for newlines)
  result: string;        // e.g. "a = 5.000"
  solved: string;        // variable name solved
  value: number;
}

export interface SolverResult {
  sides: PolygonValue[];       // length n
  angles: PolygonValue[];      // length n (interior angles in degrees)
  steps: SolverStep[];
  success: boolean;
  error?: string;
  /** Reconstructed vertex coordinates (for drawing) */
  vertices: Array<{ x: number; y: number }>;
}

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

function fmt(n: number, dp = 4): string {
  return n.toFixed(dp);
}

/** Clamp angle to (0, 180) */
function clampAngle(a: number): number {
  return Math.max(0.001, Math.min(179.999, a));
}

/**
 * Solve a triangle given any 3 independent values.
 * sides: [a, b, c] (null = unknown), angles: [A, B, C] in degrees (null = unknown)
 * Returns solved sides and angles, plus LaTeX steps.
 */
export function solveTriangle(
  sides: (number | null)[],
  angles: (number | null)[],
  labels: { sides: string[]; angles: string[] }
): { sides: number[]; angles: number[]; steps: SolverStep[]; success: boolean; error?: string } {
  const s = [...sides] as (number | null)[];
  const a = [...angles] as (number | null)[];
  const steps: SolverStep[] = [];

  const [sa, sb, sc] = labels.sides;  // side labels
  const [la, lb, lc] = labels.angles; // angle labels (opposite to sides)

  const known = () =>
    s.filter((v) => v !== null).length + a.filter((v) => v !== null).length;

  // Use angle sum if 2 angles known
  const tryAngleSum = () => {
    const ki = a.map((v, i) => (v !== null ? i : -1)).filter((i) => i >= 0);
    if (ki.length === 2) {
      const sum = a[ki[0]]! + a[ki[1]]!;
      const ui = [0, 1, 2].find((i) => a[i] === null)!;
      const val = clampAngle(180 - sum);
      a[ui] = val;
      const lbl = labels.angles[ui];
      const k0lbl = labels.angles[ki[0]];
      const k1lbl = labels.angles[ki[1]];
      steps.push({
        law: "angle_sum",
        description: `Angle sum of triangle: ${lbl} = 180° − ${k0lbl} − ${k1lbl}`,
        latex: `\\angle ${lbl} = 180^\\circ - \\angle ${k0lbl} - \\angle ${k1lbl} = 180^\\circ - ${fmt(a[ki[0]]!, 2)}^\\circ - ${fmt(a[ki[1]]!, 2)}^\\circ = ${fmt(val, 2)}^\\circ`,
        result: `${lbl} = ${fmt(val, 2)}°`,
        solved: lbl,
        value: val,
      });
      return true;
    }
    return false;
  };

  // Cosine rule: c² = a² + b² − 2ab·cos(C)  → find c or C
  const tryCosine = () => {
    // Find side from 2 sides + included angle
    for (let ci = 0; ci < 3; ci++) {
      const ai = (ci + 1) % 3;
      const bi = (ci + 2) % 3;
      if (s[ai] !== null && s[bi] !== null && a[ci] !== null && s[ci] === null) {
        const av = s[ai]!, bv = s[bi]!, Cv = a[ci]!;
        const cv = Math.sqrt(av * av + bv * bv - 2 * av * bv * Math.cos(Cv * DEG));
        s[ci] = cv;
        steps.push({
          law: "cosine",
          description: `Cosine rule: find ${labels.sides[ci]}`,
          latex:
            `\\textbf{Cosine Rule:}\\quad ${labels.sides[ci]}^2 = ${labels.sides[ai]}^2 + ${labels.sides[bi]}^2 - 2 \\cdot ${labels.sides[ai]} \\cdot ${labels.sides[bi]} \\cdot \\cos(\\angle ${labels.angles[ci]})` +
            `\\\\ ${labels.sides[ci]}^2 = ${fmt(av)}^2 + ${fmt(bv)}^2 - 2(${fmt(av)})(${fmt(bv)})\\cos(${fmt(Cv, 2)}^\\circ)` +
            `\\\\ ${labels.sides[ci]}^2 = ${fmt(av * av + bv * bv - 2 * av * bv * Math.cos(Cv * DEG), 4)}` +
            `\\\\ ${labels.sides[ci]} = ${fmt(cv)}`,
          result: `${labels.sides[ci]} = ${fmt(cv)}`,
          solved: labels.sides[ci],
          value: cv,
        });
        return true;
      }
    }
    // Find angle from 3 sides
    if (s[0] !== null && s[1] !== null && s[2] !== null) {
      for (let ci = 0; ci < 3; ci++) {
        if (a[ci] === null) {
          const ai = (ci + 1) % 3;
          const bi = (ci + 2) % 3;
          const cv = s[ci]!, av = s[ai]!, bv = s[bi]!;
          const cosC = (av * av + bv * bv - cv * cv) / (2 * av * bv);
          const Cv = clampAngle(Math.acos(Math.max(-1, Math.min(1, cosC))) * RAD);
          a[ci] = Cv;
          steps.push({
            law: "cosine",
            description: `Cosine rule: find ∠${labels.angles[ci]}`,
            latex:
              `\\textbf{Cosine Rule:}\\quad \\cos(\\angle ${labels.angles[ci]}) = \\dfrac{${labels.sides[ai]}^2 + ${labels.sides[bi]}^2 - ${labels.sides[ci]}^2}{2 \\cdot ${labels.sides[ai]} \\cdot ${labels.sides[bi]}}` +
              `\\\\ \\cos(\\angle ${labels.angles[ci]}) = \\dfrac{${fmt(av)}^2 + ${fmt(bv)}^2 - ${fmt(cv)}^2}{2(${fmt(av)})(${fmt(bv)})} = ${fmt(cosC, 4)}` +
              `\\\\ \\angle ${labels.angles[ci]} = \\cos^{-1}(${fmt(cosC, 4)}) = ${fmt(Cv, 2)}^\\circ`,
            result: `∠${labels.angles[ci]} = ${fmt(Cv, 2)}°`,
            solved: labels.angles[ci],
            value: Cv,
          });
          return true;
        }
      }
    }
    return false;
  };

  // Sine rule: a/sin(A) = b/sin(B)
  const trySine = () => {
    // Find side given another side and two angles
    for (let i = 0; i < 3; i++) {
      if (s[i] === null && a[i] !== null) {
        for (let j = 0; j < 3; j++) {
          if (j !== i && s[j] !== null && a[j] !== null) {
            const sv = s[j]!, Av = a[i]!, Bv = a[j]!;
            const val = (sv * Math.sin(Av * DEG)) / Math.sin(Bv * DEG);
            s[i] = val;
            steps.push({
              law: "sine",
              description: `Sine rule: find ${labels.sides[i]}`,
              latex:
                `\\textbf{Sine Rule:}\\quad \\dfrac{${labels.sides[i]}}{\\sin(\\angle ${labels.angles[i]})} = \\dfrac{${labels.sides[j]}}{\\sin(\\angle ${labels.angles[j]})}` +
                `\\\\ ${labels.sides[i]} = \\dfrac{${labels.sides[j]} \\cdot \\sin(\\angle ${labels.angles[i]})}{\\sin(\\angle ${labels.angles[j]})}` +
                `\\\\ ${labels.sides[i]} = \\dfrac{${fmt(sv)} \\cdot \\sin(${fmt(Av, 2)}^\\circ)}{\\sin(${fmt(Bv, 2)}^\\circ)} = ${fmt(val)}`,
              result: `${labels.sides[i]} = ${fmt(val)}`,
              solved: labels.sides[i],
              value: val,
            });
            return true;
          }
        }
      }
    }
    // Find angle given two sides and opposite angle
    for (let i = 0; i < 3; i++) {
      if (a[i] === null && s[i] !== null) {
        for (let j = 0; j < 3; j++) {
          if (j !== i && s[j] !== null && a[j] !== null) {
            const si = s[i]!, sj = s[j]!, Aj = a[j]!;
            const sinI = (si * Math.sin(Aj * DEG)) / sj;
            if (Math.abs(sinI) > 1) continue;
            const Ai = clampAngle(Math.asin(Math.max(-1, Math.min(1, sinI))) * RAD);
            a[i] = Ai;
            steps.push({
              law: "sine",
              description: `Sine rule: find ∠${labels.angles[i]}`,
              latex:
                `\\textbf{Sine Rule:}\\quad \\dfrac{\\sin(\\angle ${labels.angles[i]})}{${labels.sides[i]}} = \\dfrac{\\sin(\\angle ${labels.angles[j]})}{${labels.sides[j]}}` +
                `\\\\ \\sin(\\angle ${labels.angles[i]}) = \\dfrac{${labels.sides[i]} \\cdot \\sin(\\angle ${labels.angles[j]})}{${labels.sides[j]}}` +
                `\\\\ \\sin(\\angle ${labels.angles[i]}) = \\dfrac{${fmt(si)} \\cdot \\sin(${fmt(Aj, 2)}^\\circ)}{${fmt(sj)}} = ${fmt(sinI, 4)}` +
                `\\\\ \\angle ${labels.angles[i]} = \\sin^{-1}(${fmt(sinI, 4)}) = ${fmt(Ai, 2)}^\\circ`,
              result: `∠${labels.angles[i]} = ${fmt(Ai, 2)}°`,
              solved: labels.angles[i],
              value: Ai,
            });
            return true;
          }
        }
      }
    }
    return false;
  };

  // Iteratively apply rules
  let maxIter = 20;
  while (known() < 6 && maxIter-- > 0) {
    const prev = known();
    tryAngleSum() || tryCosine() || trySine();
    if (known() === prev) break; // no progress
  }

  const success = s.every((v) => v !== null) && a.every((v) => v !== null);
  return {
    sides: s as number[],
    angles: a as number[],
    steps,
    success,
    error: success ? undefined : "Insufficient data to solve triangle",
  };
}

/**
 * Reconstruct 2D vertex coordinates from solved side lengths.
 * Places first vertex at origin, second along +x axis.
 */
export function reconstructVertices(
  sides: number[],
  angles: number[]
): Array<{ x: number; y: number }> {
  const n = sides.length;
  if (n < 3) return [];

  const verts: Array<{ x: number; y: number }> = [];
  verts.push({ x: 0, y: 0 });
  verts.push({ x: sides[0], y: 0 });

  let dir = 0; // current direction in radians

  for (let i = 1; i < n - 1; i++) {
    // Turn by exterior angle = π - interior angle
    dir += Math.PI - angles[i] * DEG;
    const prev = verts[verts.length - 1];
    verts.push({
      x: prev.x + sides[i] * Math.cos(dir),
      y: prev.y + sides[i] * Math.sin(dir),
    });
  }

  return verts;
}

/**
 * Main polygon solver.
 * For triangles: direct solve.
 * For n>3: triangulate using fan from vertex 0, solve each triangle.
 *
 * Input: arrays of length n, null = unknown
 */
export function solvePolygon(
  vertexLabels: string[],
  inputSides: (number | null)[],
  inputAngles: (number | null)[]
): SolverResult {
  const n = vertexLabels.length;
  if (n < 3) {
    return { sides: [], angles: [], steps: [], success: false, error: "Need at least 3 vertices", vertices: [] };
  }

  const steps: SolverStep[] = [];

  if (n === 3) {
    // Direct triangle solve
    const sideLabels = [
      `${vertexLabels[0]}${vertexLabels[1]}`,
      `${vertexLabels[1]}${vertexLabels[2]}`,
      `${vertexLabels[2]}${vertexLabels[0]}`,
    ];
    const angleLabels = vertexLabels.slice(0, 3);

    const res = solveTriangle(inputSides.slice(0, 3), inputAngles.slice(0, 3), {
      sides: sideLabels,
      angles: angleLabels,
    });
    steps.push(...res.steps);

    const verts = res.success ? reconstructVertices(res.sides, res.angles) : [];

    return {
      sides: res.sides.map((v, i) => ({ value: v, state: inputSides[i] !== null ? "given" : (v !== null ? "solved" : "unknown") })),
      angles: res.angles.map((v, i) => ({ value: v, state: inputAngles[i] !== null ? "given" : (v !== null ? "solved" : "unknown") })),
      steps,
      success: res.success,
      error: res.error,
      vertices: verts,
    };
  }

  // For n>3: fan triangulation from vertex 0
  // Triangles: (0,1,2), (0,2,3), ..., (0,n-2,n-1)
  // Sides of polygon: s[i] = side from vertex i to vertex (i+1)%n
  // Diagonal sides: d[i] = side from vertex 0 to vertex i+2 (for i=0..n-4)

  const solvedSides = [...inputSides] as (number | null)[];
  const solvedAngles = [...inputAngles] as (number | null)[];

  // Check polygon angle sum constraint
  const knownAngles = solvedAngles.filter((a) => a !== null) as number[];
  if (knownAngles.length === n - 1) {
    const sum = knownAngles.reduce((s, a) => s + a, 0);
    const target = (n - 2) * 180;
    const ui = solvedAngles.findIndex((a) => a === null);
    const val = clampAngle(target - sum);
    solvedAngles[ui] = val;
    steps.push({
      law: "polygon_angle_sum",
      description: `Polygon angle sum: ∠${vertexLabels[ui]} = (${n}-2)×180° − (sum of others)`,
      latex:
        `\\textbf{Polygon Angle Sum:}\\quad \\sum_{i=1}^{${n}} \\angle_i = (${n}-2) \\times 180^\\circ = ${target}^\\circ` +
        `\\\\ \\angle ${vertexLabels[ui]} = ${target}^\\circ - ${fmt(sum, 2)}^\\circ = ${fmt(val, 2)}^\\circ`,
      result: `∠${vertexLabels[ui]} = ${fmt(val, 2)}°`,
      solved: vertexLabels[ui],
      value: val,
    });
  }

  // Diagonal lengths (internal)
  const diagonals: (number | null)[] = new Array(n - 3).fill(null);

  // Fan triangles: tri[k] uses vertices 0, k+1, k+2
  // Sides of tri[k]:
  //   side opposite vertex 0: polygon side s[k+1] (from vertex k+1 to k+2)
  //   side opposite vertex k+1: diagonal d[k] (from 0 to k+2) or polygon side s[0] if k=0
  //   side opposite vertex k+2: diagonal d[k-1] (from 0 to k+1) or polygon side s[0] if k=0
  // Actually let's define:
  //   d[-1] = s[0] (from v0 to v1) — the first polygon side
  //   d[k] = diagonal from v0 to v(k+2) for k=0..n-4
  //   d[n-3] = s[n-1] (from v(n-1) to v0) — the last polygon side

  const getDiag = (k: number): number | null => {
    if (k === -1) return solvedSides[0];
    if (k === n - 3) return solvedSides[n - 1];
    return diagonals[k];
  };
  const setDiag = (k: number, v: number) => {
    if (k >= 0 && k < n - 3) diagonals[k] = v;
  };

  // For each fan triangle k (k=0..n-3):
  //   vertices: V0, V(k+1), V(k+2)
  //   sides:
  //     a = s[k+1]           (opposite V0, between V(k+1) and V(k+2))
  //     b = getDiag(k)       (opposite V(k+1), between V0 and V(k+2))
  //     c = getDiag(k-1)     (opposite V(k+2), between V0 and V(k+1))
  //   angles:
  //     A = angle at V0 (partial — not the full polygon angle)
  //     B = angle at V(k+1) (partial for interior vertices)
  //     C = angle at V(k+2) (partial for interior vertices)

  // For polygon angles: the polygon angle at V(k+1) equals the triangle angle at V(k+1)
  // only if k+1 is the first or last vertex in the fan (i.e. k=0 → V1 is a polygon vertex,
  // k=n-3 → V(n-1) is a polygon vertex). For interior vertices, the polygon angle is split
  // across two triangles.

  // Simplified approach: for each triangle, use polygon side angles directly if vertex
  // is only in one triangle (V1 and V(n-1)), otherwise mark as unknown for the triangle.

  let progress = true;
  let maxIter = n * 4;
  while (progress && maxIter-- > 0) {
    progress = false;
    for (let k = 0; k < n - 2; k++) {
      const v0 = 0, v1 = k + 1, v2 = k + 2;
      const sideA = solvedSides[k + 1]; // between v1 and v2
      const sideB = getDiag(k);         // between v0 and v2
      const sideC = getDiag(k - 1);     // between v0 and v1

      // Polygon angles at v1 and v2 are only directly usable if they're endpoint vertices
      const angleV1 = (k === 0) ? solvedAngles[v1] : null;
      const angleV2 = (k === n - 3) ? solvedAngles[v2] : null;

      const triSides: (number | null)[] = [sideA, sideB, sideC];
      const triAngles: (number | null)[] = [null, angleV1, angleV2];

      const sideLabels = [
        `${vertexLabels[v1]}${vertexLabels[v2]}`,
        `${vertexLabels[v0]}${vertexLabels[v2]}`,
        `${vertexLabels[v0]}${vertexLabels[v1]}`,
      ];
      const angleLabels = [
        vertexLabels[v0],
        vertexLabels[v1],
        vertexLabels[v2],
      ];

      const res = solveTriangle(triSides, triAngles, { sides: sideLabels, angles: angleLabels });

      if (res.success || res.sides.some((v) => v !== null) || res.angles.some((v) => v !== null)) {
        // Update diagonals
        if (res.sides[1] !== null && getDiag(k) === null) {
          setDiag(k, res.sides[1]);
          progress = true;
        }
        if (res.sides[2] !== null && getDiag(k - 1) === null) {
          setDiag(k - 1, res.sides[2]);
          progress = true;
        }
        // Update polygon sides
        if (res.sides[0] !== null && solvedSides[k + 1] === null) {
          solvedSides[k + 1] = res.sides[0];
          progress = true;
        }
        // Update polygon angles at endpoints
        if (k === 0 && res.angles[1] !== null && solvedAngles[v1] === null) {
          solvedAngles[v1] = res.angles[1];
          progress = true;
        }
        if (k === n - 3 && res.angles[2] !== null && solvedAngles[v2] === null) {
          solvedAngles[v2] = res.angles[2];
          progress = true;
        }

        if (res.steps.length > 0) {
          steps.push(...res.steps);
          progress = true;
        }
      }
    }
  }

  const success =
    solvedSides.every((v) => v !== null) &&
    solvedAngles.every((v) => v !== null);

  const verts = success
    ? reconstructVertices(solvedSides as number[], solvedAngles as number[])
    : [];

  return {
    sides: solvedSides.map((v, i) => ({
      value: v,
      state: inputSides[i] !== null ? "given" : v !== null ? "solved" : "unknown",
    })),
    angles: solvedAngles.map((v, i) => ({
      value: v,
      state: inputAngles[i] !== null ? "given" : v !== null ? "solved" : "unknown",
    })),
    steps,
    success,
    error: success ? undefined : "Insufficient data — please provide more sides or angles",
    vertices: verts,
  };
}
