/**
 * i18n — Chinese / English translations
 * Design: Blueprint / Technical Drawing
 */

export type Lang = "zh" | "en";

export const translations = {
  zh: {
    // App header
    appTitle: "立體幾何計算器",
    appSubtitle: "Solid Geometry Calculator",
    langSwitch: "English",

    // Solid type & height
    sectionSolidType: "立體類型 & 高度",
    labelType: "類型",
    labelHeight: "高度",
    optPrism: "柱體",
    optPyramid: "錐體",
    unitHeight: "單位",

    // Base vertices
    sectionBaseVerts: "底面頂點",
    tooltipReset: "重設預設值",
    tooltipAddPoint: "新增頂點（最多 6 個）",
    hintBase: "底面在 z=0 平面，頂點按順序排列",
    labelX: "x 座標",
    labelY: "y 座標",

    // Dihedral
    sectionDihedral: "平面交角",
    labelPlaneA: "平面 A",
    labelPlaneB: "平面 B",
    dihedralAngle: "交角",
    dihedralRad: "弧度",
    dihedralHint: "請選擇兩個不同平面",

    // Tabs
    tabBase: "底面",
    tabSolid: "立體",
    tabFaces: "各面",
    tabDihedralMatrix: "交角矩陣",

    // Base results
    cardEdgeLengths: "邊長",
    labelPerimeter: "周長",
    unitLength: "單位",
    cardAngles: "內角",
    labelAngleSum: "角度和",
    unitDeg: "°",
    cardArea: "底面積",
    unitAreaSq: "平方單位",
    formulaArea: "（梯形公式）",

    // Solid results
    cardVolume: "體積",
    unitVolCube: "立方單位",
    formulaPrism: "V = A × h",
    formulaPyramid: "V = ⅓ × A × h",
    labelBaseArea: "底面積 A",
    labelHeightH: "高度 h",
    cardLateralEdges: "側稜長",
    labelLateralEdgePrism: "側稜",
    labelLateralEdgePyramid: "斜稜",

    // Faces
    cardFaceArea: "面積",
    unitFaceVerts: "頂點",

    // Dihedral matrix
    dihedralMatrixHint: "任意兩平面之間的交角（度數）。對角線為 0°（同一平面）。",
    colFace: "面 / 面",

    // Face labels
    faceBase: "底面",
    faceTop: "頂面",
    faceSide: "側面",
    faceApex: "頂點 A",

    // Viewer hint
    viewerHint: "拖曳旋轉 · 滾輪縮放 · 右鍵平移",
    viewerNeedPoints: "請至少輸入 3 個底面頂點",

    // Status bar
    statusPoints: "點",
    statusPrism: "柱體",
    statusPyramid: "錐體",
  },

  en: {
    // App header
    appTitle: "Solid Geometry Calculator",
    appSubtitle: "立體幾何計算器",
    langSwitch: "中文",

    // Solid type & height
    sectionSolidType: "Solid Type & Height",
    labelType: "Type",
    labelHeight: "Height",
    optPrism: "Prism",
    optPyramid: "Pyramid",
    unitHeight: "units",

    // Base vertices
    sectionBaseVerts: "Base Vertices",
    tooltipReset: "Reset to defaults",
    tooltipAddPoint: "Add vertex (max 6)",
    hintBase: "Base lies in z=0 plane; vertices in order",
    labelX: "x coord",
    labelY: "y coord",

    // Dihedral
    sectionDihedral: "Dihedral Angle",
    labelPlaneA: "Plane A",
    labelPlaneB: "Plane B",
    dihedralAngle: "Dihedral Angle",
    dihedralRad: "rad",
    dihedralHint: "Select two different planes",

    // Tabs
    tabBase: "Base",
    tabSolid: "Solid",
    tabFaces: "Faces",
    tabDihedralMatrix: "Angle Matrix",

    // Base results
    cardEdgeLengths: "Edge Lengths",
    labelPerimeter: "Perimeter",
    unitLength: "units",
    cardAngles: "Interior Angles",
    labelAngleSum: "Sum",
    unitDeg: "°",
    cardArea: "Base Area",
    unitAreaSq: "sq units",
    formulaArea: "(shoelace formula)",

    // Solid results
    cardVolume: "Volume",
    unitVolCube: "cubic units",
    formulaPrism: "V = A × h",
    formulaPyramid: "V = ⅓ × A × h",
    labelBaseArea: "Base Area A",
    labelHeightH: "Height h",
    cardLateralEdges: "Lateral Edges",
    labelLateralEdgePrism: "lateral",
    labelLateralEdgePyramid: "slant",

    // Faces
    cardFaceArea: "Area",
    unitFaceVerts: "vertices",

    // Dihedral matrix
    dihedralMatrixHint:
      "Dihedral angle between any two faces (degrees). Diagonal = 0° (same face).",
    colFace: "Face / Face",

    // Face labels
    faceBase: "Base",
    faceTop: "Top",
    faceSide: "Side",
    faceApex: "Apex A",

    // Viewer hint
    viewerHint: "Drag to rotate · Scroll to zoom · Right-click to pan",
    viewerNeedPoints: "Please enter at least 3 base vertices",

    // Status bar
    statusPoints: "pts",
    statusPrism: "Prism",
    statusPyramid: "Pyramid",
  },
} as const;

export type TranslationKey = keyof typeof translations.zh;
export type Translations = typeof translations.zh;
