/**
 * SolidViewer — Three.js 3D rendering
 * Features:
 * - Click a face to select it (first click = face A, second = face B)
 * - Dihedral helper: shared edge highlighted, normal arrows, angle arc
 * - Elegant white/light tech theme background
 * - Each face has its own colour
 */
import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Face3D, NamedPoint, SolidType } from "@/lib/geometry";
import { getFaceColor, dihedralArcInfo } from "@/lib/geometry";

interface SolidViewerProps {
  points: NamedPoint[];
  solidType: SolidType;
  height: number;
  apexLabel: string;
  faces: Face3D[];
  highlightFaceIndices: number[];
  onFaceClick?: (faceIndex: number) => void;
}

// Our coord system → Three.js: (x, y, z) → (x, z, -y)
function toThree(p: { x: number; y: number; z: number }): THREE.Vector3 {
  return new THREE.Vector3(p.x, p.z, -p.y);
}

function buildFaceGeometry(
  verts: { x: number; y: number; z: number }[]
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  verts.forEach((v) => {
    const t = toThree(v);
    positions.push(t.x, t.y, t.z);
  });
  for (let i = 1; i < verts.length - 1; i++) {
    indices.push(0, i, i + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function makeTextSprite(
  text: string,
  color: string,
  fontSize = 24,
  bgAlpha = 0
): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 80;
  const ctx = canvas.getContext("2d")!;
  if (bgAlpha > 0) {
    ctx.fillStyle = `rgba(255,255,255,${bgAlpha})`;
    ctx.roundRect(4, 4, 152, 72, 8);
    ctx.fill();
  }
  ctx.fillStyle = color;
  ctx.font = `bold ${fontSize}px 'Space Grotesk', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 80, 40);
  const tex = new THREE.CanvasTexture(canvas);
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
}

export default function SolidViewer({
  points,
  solidType,
  height,
  apexLabel,
  faces,
  highlightFaceIndices,
  onFaceClick,
}: SolidViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const frameRef = useRef<number>(0);
  // Map mesh uuid → face index for click detection
  const meshMapRef = useRef<Map<string, number>>(new Map());

  // ── Init scene once ──────────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e1a);
    sceneRef.current = scene;

    // Subtle grid
    const grid = new THREE.GridHelper(24, 24, 0x1e2d4a, 0x141d35);
    scene.add(grid);

    const w = mount.clientWidth || 600;
    const h = mount.clientHeight || 450;
    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 1000);
    camera.position.set(12, 9, 12);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controlsRef.current = controls;

    // Lighting for dark tech look
    scene.add(new THREE.AmbientLight(0x1a2a4a, 1.2));
    const dir1 = new THREE.DirectionalLight(0x00d4ff, 0.8);
    dir1.position.set(15, 20, 10);
    scene.add(dir1);
    const dir2 = new THREE.DirectionalLight(0xffffff, 0.5);
    dir2.position.set(-10, 5, -8);
    scene.add(dir2);
    const dir3 = new THREE.DirectionalLight(0x00ff9d, 0.2);
    dir3.position.set(0, -10, 0);
    scene.add(dir3);

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const ro = new ResizeObserver(() => {
      if (!mount) return;
      const nw = mount.clientWidth;
      const nh = mount.clientHeight;
      if (nw === 0 || nh === 0) return;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  // ── Click handler ────────────────────────────────────────────────────────
  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (!onFaceClick) return;
      const mount = mountRef.current;
      const renderer = rendererRef.current;
      const camera = cameraRef.current;
      const scene = sceneRef.current;
      if (!mount || !renderer || !camera || !scene) return;

      const rect = mount.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

      const meshes: THREE.Mesh[] = [];
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh && meshMapRef.current.has(obj.uuid)) {
          meshes.push(obj);
        }
      });

      const hits = raycaster.intersectObjects(meshes, false);
      if (hits.length > 0) {
        const faceIdx = meshMapRef.current.get(hits[0].object.uuid);
        if (faceIdx !== undefined) onFaceClick(faceIdx);
      }
    },
    [onFaceClick]
  );

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    mount.addEventListener("click", handleClick);
    return () => mount.removeEventListener("click", handleClick);
  }, [handleClick]);

  // ── Rebuild solid mesh ───────────────────────────────────────────────────
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || faces.length === 0 || points.length < 3) return;

    // Remove old group
    const old = scene.getObjectByName("solidGroup");
    if (old) scene.remove(old);
    meshMapRef.current.clear();

    const group = new THREE.Group();
    group.name = "solidGroup";

    const isHL = (i: number) => highlightFaceIndices.includes(i);

    // ── Face meshes ──────────────────────────────────────────────────────
    faces.forEach((face, fi) => {
      const color = getFaceColor(fi);
      const highlighted = isHL(fi);

      const geo = buildFaceGeometry(face.vertices);

      const mat = new THREE.MeshPhongMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: highlighted ? 0.72 : 0.28,
        side: THREE.DoubleSide,
        shininess: 80,
        specular: new THREE.Color(0xffffff),
      });
      const mesh = new THREE.Mesh(geo, mat);
      meshMapRef.current.set(mesh.uuid, fi);
      group.add(mesh);

      // Edges
      const edges = new THREE.EdgesGeometry(geo);
      const lineMat = new THREE.LineBasicMaterial({
        color: highlighted ? new THREE.Color(color) : new THREE.Color(color),
        linewidth: highlighted ? 2 : 1,
        transparent: true,
        opacity: highlighted ? 1 : 0.6,
      });
      group.add(new THREE.LineSegments(edges, lineMat));

      // Face label at centroid
      const nv = face.vertices.length;
      const cx = face.vertices.reduce((s, v) => s + v.x, 0) / nv;
      const cy = face.vertices.reduce((s, v) => s + v.y, 0) / nv;
      const cz = face.vertices.reduce((s, v) => s + v.z, 0) / nv;
      const tp = toThree({ x: cx, y: cy, z: cz });
      const n = face.normal;
      const offset = 0.3;
      const sprite = makeTextSprite(
        face.name,
        highlighted ? color : "#00d4ff",
        highlighted ? 26 : 20,
        highlighted ? 0.85 : 0.5
      );
      sprite.position.set(
        tp.x + n.x * offset,
        tp.y + n.z * offset,
        tp.z + (-n.y) * offset
      );
      sprite.scale.set(1.6, 0.8, 1);
      group.add(sprite);
    });

    // ── Vertex labels ────────────────────────────────────────────────────
    const allVerts: Array<{ pos: { x: number; y: number; z: number }; label: string }> = [];
    const n = points.length;
    points.forEach((p) => allVerts.push({ pos: { x: p.x, y: p.y, z: 0 }, label: p.label }));
    if (solidType === "prism") {
      points.forEach((p) =>
        allVerts.push({ pos: { x: p.x, y: p.y, z: height }, label: `${p.label}'` })
      );
    } else {
      const cx = points.reduce((s, p) => s + p.x, 0) / n;
      const cy = points.reduce((s, p) => s + p.y, 0) / n;
      allVerts.push({ pos: { x: cx, y: cy, z: height }, label: apexLabel });
    }

    allVerts.forEach(({ pos, label }) => {
      const tp = toThree(pos);
      // Small sphere at vertex
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 12, 12),
        new THREE.MeshPhongMaterial({ color: 0x00d4ff, emissive: 0x003344 })
      );
      sphere.position.copy(tp);
      group.add(sphere);

      const sprite = makeTextSprite(label, "#00d4ff", 28);
      sprite.position.set(tp.x, tp.y + 0.5, tp.z);
      sprite.scale.set(0.9, 0.9, 1);
      group.add(sprite);
    });

    // ── Dihedral helper lines ────────────────────────────────────────────
    if (
      highlightFaceIndices.length === 2 &&
      highlightFaceIndices[0] !== highlightFaceIndices[1]
    ) {
      const fA = faces[highlightFaceIndices[0]];
      const fB = faces[highlightFaceIndices[1]];
      const arcInfo = dihedralArcInfo(fA, fB);

      if (arcInfo) {
        const { arcCenter, armA, armB, sharedVerts, edgeDir } = arcInfo;
        const armLen = 1.8;

        // Shared edge (thick line)
        if (sharedVerts.length >= 2) {
          const edgeGeo = new THREE.BufferGeometry().setFromPoints([
            toThree(sharedVerts[0]),
            toThree(sharedVerts[1]),
          ]);
          const edgeLine = new THREE.Line(
            edgeGeo,
            new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 3 })
          );
          group.add(edgeLine);
        }

        // Normal arrows from arc center
        const arcCenterV3 = toThree(arcCenter);
        const colorA = new THREE.Color(getFaceColor(highlightFaceIndices[0]));
        const colorB = new THREE.Color(getFaceColor(highlightFaceIndices[1]));

        // Arrow for face A normal
        const arrowA = new THREE.ArrowHelper(
          new THREE.Vector3(armA.x, armA.z, -armA.y).normalize(),
          arcCenterV3,
          armLen,
          colorA,
          0.25,
          0.15
        );
        group.add(arrowA);

        // Arrow for face B normal
        const arrowB = new THREE.ArrowHelper(
          new THREE.Vector3(armB.x, armB.z, -armB.y).normalize(),
          arcCenterV3,
          armLen,
          colorB,
          0.25,
          0.15
        );
        group.add(arrowB);

        // Angle arc (dashed circle segment)
        const angleRad = (arcInfo.angleDeg * Math.PI) / 180;
        const arcPoints: THREE.Vector3[] = [];
        const arcRadius = 0.6;
        const steps = 32;
        const startVec = new THREE.Vector3(armA.x, armA.z, -armA.y).normalize();
        const endVec = new THREE.Vector3(armB.x, armB.z, -armB.y).normalize();
        // Build rotation axis
        const rotAxis = new THREE.Vector3()
          .crossVectors(startVec, endVec)
          .normalize();
        if (rotAxis.length() > 0.01) {
          for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const angle = t * angleRad;
            const v = startVec.clone().applyAxisAngle(rotAxis, angle);
            arcPoints.push(
              arcCenterV3.clone().add(v.multiplyScalar(arcRadius))
            );
          }
          const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPoints);
          group.add(
            new THREE.Line(
              arcGeo,
              new THREE.LineBasicMaterial({
                color: 0xf59e0b,
                transparent: true,
                opacity: 0.9,
              })
            )
          );
        }

        // Angle label near arc midpoint
        if (arcPoints.length > 0) {
          const midArc = arcPoints[Math.floor(arcPoints.length / 2)];
          const labelSprite = makeTextSprite(
            `${arcInfo.angleDeg.toFixed(1)}°`,
            "#f59e0b",
            22,
            0.9
          );
          labelSprite.position.set(
            midArc.x + 0.1,
            midArc.y + 0.2,
            midArc.z + 0.1
          );
          labelSprite.scale.set(1.4, 0.7, 1);
          group.add(labelSprite);
        }

        // Dashed perpendicular lines from arc center to each face (helper)
        const dashMat = new THREE.LineDashedMaterial({
          color: 0x94a3b8,
          dashSize: 0.15,
          gapSize: 0.1,
          transparent: true,
          opacity: 0.6,
        });
        const dashA = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            arcCenterV3,
            arcCenterV3
              .clone()
              .add(
                new THREE.Vector3(armA.x, armA.z, -armA.y)
                  .normalize()
                  .multiplyScalar(armLen * 1.2)
              ),
          ]),
          dashMat
        );
        dashA.computeLineDistances();
        group.add(dashA);

        const dashB = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            arcCenterV3,
            arcCenterV3
              .clone()
              .add(
                new THREE.Vector3(armB.x, armB.z, -armB.y)
                  .normalize()
                  .multiplyScalar(armLen * 1.2)
              ),
          ]),
          dashMat
        );
        dashB.computeLineDistances();
        group.add(dashB);
      }
    }

    scene.add(group);
  }, [points, solidType, height, apexLabel, faces, highlightFaceIndices]);

  return (
    <div
      ref={mountRef}
      className="w-full h-full"
      style={{ minHeight: 280, cursor: onFaceClick ? "pointer" : "grab" }}
    />
  );
}
