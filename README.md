# 立體幾何計算器 — Solid Geometry Calculator

A bilingual (中文 / English) interactive web app for computing geometric properties of prisms and pyramids with 3–6 base vertices.

**Live Demo:** https://kingtmc314.github.io/solid-geometry-calculator/

---

## Features

| Feature | Description |
|---|---|
| **Base polygon** | 3 to 6 vertices, freely configurable (x, y coordinates) |
| **Solid types** | Prism (柱體) or Pyramid (錐體) |
| **Base calculations** | All edge lengths, interior angles, area (shoelace formula), perimeter |
| **Solid calculations** | Volume, lateral edge lengths, all face areas |
| **Dihedral angles** | Select any two faces to compute the angle between their planes |
| **Angle matrix** | Full N×N matrix of dihedral angles between all face pairs |
| **3D viewer** | Interactive Three.js renderer — drag to rotate, scroll to zoom |
| **Bilingual UI** | Toggle between 中文 and English at any time |

---

## Tech Stack

- **React 19** + **TypeScript** — UI framework
- **Three.js** — 3D rendering with OrbitControls
- **KaTeX** — mathematical formula rendering
- **Tailwind CSS v4** + **shadcn/ui** — design system
- **Vite** — build tool
- **GitHub Actions** — CI/CD to GitHub Pages

---

## Local Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build
```

---

## Mathematics

### Base Area (Shoelace Formula)
$$A = \frac{1}{2} \left| \sum_{i=0}^{n-1} (x_i y_{i+1} - x_{i+1} y_i) \right|$$

### Volume
- **Prism:** $V = A \times h$
- **Pyramid:** $V = \frac{1}{3} A \times h$

### Dihedral Angle
The dihedral angle between two faces is computed from their outward unit normals $\hat{n}_A$ and $\hat{n}_B$:

$$\theta = 180° - \arccos(\hat{n}_A \cdot \hat{n}_B)$$

---

## License

MIT © 2026
