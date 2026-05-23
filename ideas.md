# 立體幾何計算器 — 設計構思

## 三個設計方向

<response>
<text>
**方向一：工程藍圖風格（Blueprint / Technical Drawing）**

- **Design Movement**: 工業製圖 / 包豪斯工程美學
- **Core Principles**:
  1. 精確、清晰的格線底紋，呼應工程圖紙質感
  2. 深藍底色搭配白色/青色線條，強調精密感
  3. 所有數值以等寬字體呈現，模擬技術文件
  4. 左右分欄：左側輸入控制，右側 3D 視圖
- **Color Philosophy**: 深海藍 (#0a1628) 底色、青白 (#a8d8ea) 強調色、橙黃 (#f5a623) 用於高亮數值
- **Layout Paradigm**: 左側固定控制面板 + 右側全高 3D 視圖，底部結果列表
- **Signature Elements**: 格線背景、虛線標注、帶刻度的座標軸
- **Interaction Philosophy**: 點擊即選取，hover 時顯示數值標籤，選擇平面時高亮對應面
- **Animation**: 立體出現時從中心展開 (scale 0.8→1)，數值更新時數字滾動效果
- **Typography System**: 標題 Space Grotesk Bold，數值 JetBrains Mono，說明文字 Inter Regular
</text>
<probability>0.08</probability>
</response>

<response>
<text>
**方向二：學術白板風格（Academic Whiteboard）**

- **Design Movement**: 現代教育科技 / 清晰學術排版
- **Core Principles**:
  1. 乾淨白底，大量留白，聚焦內容
  2. 色彩只用於分類（底面=藍、側面=綠、頂=橙）
  3. 所有計算結果以卡片形式整齊排列
  4. 數學符號以 KaTeX 渲染
- **Color Philosophy**: 純白底 (#ffffff)、石板藍 (#2d5be3) 主色、翠綠 (#16a34a) 次色
- **Layout Paradigm**: 頂部導航 + 三欄式主體（輸入 | 3D | 結果）
- **Signature Elements**: 圓角卡片、帶圖示的結果標籤、步驟式引導
- **Interaction Philosophy**: 逐步引導，每步完成後才解鎖下一步
- **Animation**: 卡片淡入 (opacity 0→1, translateY 8px→0)，結果數字計數動畫
- **Typography System**: 標題 Outfit SemiBold，內文 Noto Sans TC，數學 KaTeX
</text>
<probability>0.07</probability>
</response>

<response>
<text>
**方向三：深色科學計算器風格（Dark Scientific）**

- **Design Movement**: 科學儀器 / 暗色主題計算工具
- **Core Principles**:
  1. 深色背景減少視覺疲勞，適合長時間使用
  2. 螢光綠/青色強調重要數值
  3. 緊湊佈局，最大化資訊密度
  4. 側邊欄可收折，3D 視圖可全屏
- **Color Philosophy**: 深灰 (#111827) 底色、螢光青 (#06b6d4) 強調、暖白 (#f9fafb) 文字
- **Layout Paradigm**: 左側可收折面板 + 中央 3D 視圖 + 右側結果抽屜
- **Signature Elements**: 發光邊框效果、數值高亮背景、浮動工具提示
- **Interaction Philosophy**: 鍵盤友好，所有操作可用快捷鍵，即時計算無需確認
- **Animation**: 面板滑入 (translateX)，數值閃爍更新，3D 模型旋轉過渡
- **Typography System**: 標題 Sora Bold，數值 Fira Code，說明 Inter
</text>
<probability>0.06</probability>
</response>

## 選定方向

**選定：方向一 — 工程藍圖風格**

理由：最能體現幾何計算的精密感，深藍底色搭配格線背景讓 3D 模型更突出，等寬字體令數值清晰易讀，整體風格專業而不失現代感。
