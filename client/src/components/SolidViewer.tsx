/**
 * SolidViewer — Three.js 3D rendering of prism/pyramid
 * Design: Blueprint style — dark navy background, cyan wireframe, orange highlights
 * Mobile-friendly: uses ResizeObserver for responsive canvas
 */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Face, Point2D, SolidType } from "@/lib/geometry";
import { buildSolid } from "@/lib/geometry";

interface SolidViewerProps {
  base: Point2D[];
  solidType: SolidType;
  height: number;
  highlightFaces?: number[];
  faces: Face[];
  /** Localised face label resolver */
  getFaceLabel: (face: Face) => string;
}

function buildThreeGeometry(
  base: Point2D[],
  solidType: SolidType,
  height: number
): THREE.BufferGeometry {
  const { baseVertices, topVertices } = buildSolid(base, solidType, height);
  const n = base.length;

  const positions: number[] = [];
  const indices: number[] = [];

  // Vertices: base first, then top/apex
  // Three.js uses Y-up; our solid uses Z-up, so map: (x, y, z) → (x, z, -y)
  const allVerts = [...baseVertices, ...topVertices];
  allVerts.forEach((v) => positions.push(v.x, v.z, -v.y));

  if (solidType === "prism") {
    // Bottom face (CW winding when viewed from below → outward normal down)
    for (let i = 1; i < n - 1; i++) {
      indices.push(0, i + 1, i);
    }
    // Top face
    const off = n;
    for (let i = 1; i < n - 1; i++) {
      indices.push(off, off + i, off + i + 1);
    }
    // Lateral quads
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      indices.push(i, j, n + j);
      indices.push(i, n + j, n + i);
    }
  } else {
    const apexIdx = n;
    // Bottom face
    for (let i = 1; i < n - 1; i++) {
      indices.push(0, i + 1, i);
    }
    // Lateral triangles
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      indices.push(i, j, apexIdx);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export default function SolidViewer({
  base,
  solidType,
  height,
  highlightFaces = [],
  faces,
  getFaceLabel,
}: SolidViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const frameRef = useRef<number>(0);

  // ── Init scene once ──────────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060e1a);
    sceneRef.current = scene;

    // Blueprint grid
    const grid = new THREE.GridHelper(24, 24, 0x112244, 0x0d1a33);
    scene.add(grid);

    // Axes helper (small)
    const axes = new THREE.AxesHelper(3);
    scene.add(axes);

    // Camera
    const w = mount.clientWidth || 500;
    const h = mount.clientHeight || 400;
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.set(10, 8, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 2;
    controls.maxDistance = 60;
    controlsRef.current = controls;

    // Lighting
    scene.add(new THREE.AmbientLight(0x223355, 1.0));
    const dir = new THREE.DirectionalLight(0x88ccff, 1.4);
    dir.position.set(12, 18, 10);
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0x334466, 0.5);
    fill.position.set(-8, 4, -8);
    scene.add(fill);

    // Animate loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Responsive resize
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
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  // ── Rebuild solid mesh when data changes ─────────────────────────────────
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || base.length < 3) return;

    // Remove previous solid
    const old = scene.getObjectByName("solidGroup");
    if (old) scene.remove(old);

    const group = new THREE.Group();
    group.name = "solidGroup";

    const geo = buildThreeGeometry(base, solidType, height);

    // Solid mesh (translucent navy)
    const solidMat = new THREE.MeshPhongMaterial({
      color: 0x1a4a7a,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      shininess: 80,
      specular: new THREE.Color(0x4488cc),
    });
    group.add(new THREE.Mesh(geo, solidMat));

    // Wireframe (cyan blueprint lines)
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x4dd9f5,
      wireframe: true,
      transparent: true,
      opacity: 0.75,
    });
    group.add(new THREE.Mesh(geo.clone(), wireMat));

    // Highlighted faces (orange overlay)
    if (highlightFaces.length > 0) {
      highlightFaces.forEach((fi) => {
        const face = faces[fi];
        if (!face) return;
        const pts = face.vertices;
        const hGeo = new THREE.BufferGeometry();
        const hPos: number[] = [];
        pts.forEach((v) => hPos.push(v.x, v.z, -v.y));
        const hIdx: number[] = [];
        for (let k = 1; k < pts.length - 1; k++) {
          hIdx.push(0, k, k + 1);
        }
        hGeo.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(hPos, 3)
        );
        hGeo.setIndex(hIdx);
        const hMat = new THREE.MeshBasicMaterial({
          color: 0xf5a623,
          transparent: true,
          opacity: 0.4,
          side: THREE.DoubleSide,
        });
        group.add(new THREE.Mesh(hGeo, hMat));
        // Orange wireframe border for highlighted face
        const hWire = new THREE.LineSegments(
          new THREE.EdgesGeometry(hGeo),
          new THREE.LineBasicMaterial({ color: 0xf5a623, linewidth: 2 })
        );
        group.add(hWire);
      });
    }

    // Vertex sprites
    const { baseVertices, topVertices } = buildSolid(base, solidType, height);
    const allV =
      solidType === "prism"
        ? [...baseVertices, ...topVertices]
        : [...baseVertices, topVertices[0]];

    allV.forEach((v, i) => {
      const isApex = solidType === "pyramid" && i === base.length;
      const label = isApex ? "A" : `P${i < base.length ? i + 1 : i - base.length + 1}'`;
      const canvas = document.createElement("canvas");
      canvas.width = 80;
      canvas.height = 80;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = isApex ? "#ff8b94" : "#f5a623";
      ctx.font = "bold 32px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, 40, 40);
      const tex = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: tex, transparent: true })
      );
      sprite.position.set(v.x, v.z + 0.4, -v.y);
      sprite.scale.set(0.9, 0.9, 1);
      group.add(sprite);
    });

    scene.add(group);
  }, [base, solidType, height, highlightFaces, faces, getFaceLabel]);

  return (
    <div
      ref={mountRef}
      className="w-full h-full"
      style={{ minHeight: 280 }}
    />
  );
}
