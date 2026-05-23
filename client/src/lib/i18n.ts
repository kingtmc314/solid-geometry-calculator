/**
 * i18n — Chinese / English translations
 */

export type Lang = "zh" | "en";

export const translations = {
  zh: {
    // App header
    appTitle: "立體幾何計算器",
    appSubtitle: "Solid Geometry Calculator",
    langSwitch: "English",

    // Two-step flow
    step1Label: "第一步：底面",
    step2Label: "第二步：立體",
    step1Desc: "設定底面頂點，查看 2D 圖及計算結果",
    step2Desc: "選擇立體類型，查看 3D 視圖及計算結果",
    btnToStep2: "升成立體 →",
    btnBackStep1: "← 返回底面",

    // Vertex setup
    sectionVertices: "底面頂點",
    labelVertexName: "名稱",
    labelX: "x",
    labelY: "y",
    tooltipAddPoint: "新增頂點（最多 6 個）",
    tooltipRemovePoint: "移除此頂點",
    tooltipReset: "重設為預設值",
    hintBase: "底面在 z=0 平面，頂點按順序排列",
    hintVertexName: "可自由命名，如 A、B、P₁",
    presetTriangle: "三角形",
    presetSquare: "正方形",
    presetPentagon: "五邊形",
    presetHexagon: "六邊形",

    // Solid type
    sectionSolidType: "立體設定",
    labelType: "類型",
    labelHeight: "高度 h",
    labelApexLabel: "頂點名稱",
    optPrism: "柱體",
    optPyramid: "錐體",

    // 2D results tabs
    tab2DEdges: "邊長",
    tab2DAngles: "角度",
    tab2DArea: "面積",
    tab2DCenters: "四心",
    labelPerimeter: "周長",
    labelAngleSum: "角度和",
    labelArea: "面積",
    unitLength: "",
    unitDeg: "°",
    unitAreaSq: "平方單位",
    formulaArea: "（鞋帶公式）",

    // Four centers
    sectionCenters: "特殊中心",
    centerCentroid: "形心 G",
    centerCircumcenter: "外心 O",
    centerIncenter: "內心 I",
    centerOrthocenter: "垂心 H",
    centerCentroidDesc: "各頂點坐標的算術平均值",
    centerCircumcenterDesc: "外接圓圓心，到各頂點等距",
    centerIncenterDesc: "內切圓圓心，到各邊等距",
    centerOrthocenterDesc: "各頂點到對邊垂線的交點",
    showCircumcircle: "外接圓",
    showIncircle: "內切圓",
    circumradius: "外接圓半徑",
    inradius: "內切圓半徑",
    coordLabel: "坐標",
    centerNote: "（三角形有精確值；多邊形為近似）",
    centerNoteTriangle: "（三角形精確計算）",

    // 3D results tabs
    tabVolume: "體積",
    tabFaces: "各面",
    tabDihedralMatrix: "交角矩陣",
    labelVolume: "體積",
    unitVolCube: "立方單位",
    formulaPrism: "V = 底面積 × h",
    formulaPyramid: "V = ⅓ × 底面積 × h",
    labelBaseArea: "底面積",
    labelHeightH: "高度 h",
    labelLateralEdges: "側稜",
    labelFaceArea: "面積",
    unitFaceVerts: "頂點",

    // Dihedral
    sectionDihedral: "平面交角",
    labelPlaneA: "平面 A",
    labelPlaneB: "平面 B",
    dihedralAngle: "交角",
    dihedralRad: "弧度",
    dihedralHint: "請選擇兩個不同的平面",
    dihedralMatrixHint: "點擊任意格子可直接選取對應的兩個平面",
    dihedralClickHint: "可在右側 3D 圖點擊兩個面來選取",
    colFace: "平面",

    // Viewer
    viewerHint: "拖曳旋轉 · 滾輪縮放 · 右鍵平移 · 點擊面選取交角",
    viewerNeedPoints: "請先設定至少 3 個頂點",
    viewerClickFaceHint: "點擊第一個面…",
    viewerClickFace2Hint: "點擊第二個面…",
    viewerFaceSelected: "已選取：",

    // Canvas 2D
    canvas2DHint: "可拖曳頂點調整位置",
    canvas2DGrid: "顯示格線",

    // Status
    statusPoints: "點",
    statusPrism: "柱體",
    statusPyramid: "錐體",
  },

  en: {
    appTitle: "Solid Geometry Calculator",
    appSubtitle: "立體幾何計算器",
    langSwitch: "中文",

    step1Label: "Step 1: Base",
    step2Label: "Step 2: Solid",
    step1Desc: "Set base vertices, view 2D diagram and calculations",
    step2Desc: "Choose solid type, view 3D model and calculations",
    btnToStep2: "Build Solid →",
    btnBackStep1: "← Back to Base",

    sectionVertices: "Base Vertices",
    labelVertexName: "Name",
    labelX: "x",
    labelY: "y",
    tooltipAddPoint: "Add vertex (max 6)",
    tooltipRemovePoint: "Remove vertex",
    tooltipReset: "Reset to default",
    hintBase: "Base lies in z=0 plane, vertices in order",
    hintVertexName: "Custom labels, e.g. A, B, P₁",
    presetTriangle: "Triangle",
    presetSquare: "Square",
    presetPentagon: "Pentagon",
    presetHexagon: "Hexagon",

    sectionSolidType: "Solid Settings",
    labelType: "Type",
    labelHeight: "Height h",
    labelApexLabel: "Apex label",
    optPrism: "Prism",
    optPyramid: "Pyramid",

    tab2DEdges: "Edges",
    tab2DAngles: "Angles",
    tab2DArea: "Area",
    tab2DCenters: "Centers",
    labelPerimeter: "Perimeter",
    labelAngleSum: "Angle sum",
    labelArea: "Area",
    unitLength: "",
    unitDeg: "°",
    unitAreaSq: "sq. units",
    formulaArea: "(Shoelace formula)",

    // Four centers
    sectionCenters: "Special Centers",
    centerCentroid: "Centroid G",
    centerCircumcenter: "Circumcenter O",
    centerIncenter: "Incenter I",
    centerOrthocenter: "Orthocenter H",
    centerCentroidDesc: "Arithmetic mean of all vertices",
    centerCircumcenterDesc: "Centre of circumscribed circle",
    centerIncenterDesc: "Centre of inscribed circle",
    centerOrthocenterDesc: "Intersection of altitudes",
    showCircumcircle: "Circumcircle",
    showIncircle: "Incircle",
    circumradius: "Circumradius",
    inradius: "Inradius",
    coordLabel: "Coords",
    centerNote: "(Exact for triangles; approximate for polygons)",
    centerNoteTriangle: "(Exact for triangle)",

    tabVolume: "Volume",
    tabFaces: "Faces",
    tabDihedralMatrix: "Dihedral Matrix",
    labelVolume: "Volume",
    unitVolCube: "cu. units",
    formulaPrism: "V = Base area × h",
    formulaPyramid: "V = ⅓ × Base area × h",
    labelBaseArea: "Base area",
    labelHeightH: "Height h",
    labelLateralEdges: "Lateral edges",
    labelFaceArea: "Area",
    unitFaceVerts: "verts",

    sectionDihedral: "Dihedral Angles",
    labelPlaneA: "Plane A",
    labelPlaneB: "Plane B",
    dihedralAngle: "Angle",
    dihedralRad: "rad",
    dihedralHint: "Select two different faces",
    dihedralMatrixHint: "Click any cell to select the two corresponding faces",
    dihedralClickHint: "You can also click faces in the 3D view on the right",
    colFace: "Face",

    viewerHint: "Drag to rotate · Scroll to zoom · Right-click to pan · Click face to select",
    viewerNeedPoints: "Please set at least 3 vertices",
    viewerClickFaceHint: "Click first face…",
    viewerClickFace2Hint: "Click second face…",
    viewerFaceSelected: "Selected: ",

    canvas2DHint: "Drag vertices to reposition",
    canvas2DGrid: "Show grid",

    statusPoints: "pts",
    statusPrism: "Prism",
    statusPyramid: "Pyramid",
  },
} as const;

export type TranslationKey = keyof typeof translations.zh;
export type Translations = typeof translations.zh;
