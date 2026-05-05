# Daily Life APP — Jim

個人每日管理 PWA，包含習慣追蹤、時間表、日曆事件管理。

---

## 專案結構

```
daily-life-app/
├── index.html              # 主入口
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker（離線快取）
├── .vscode/
│   ├── settings.json       # 編輯器設定
│   ├── extensions.json     # 推薦擴充套件
│   └── launch.json         # 瀏覽器啟動設定
└── src/
    ├── styles/
    │   ├── reset.css       # CSS Reset
    │   ├── variables.css   # 設計 Token（顏色、間距）
    │   └── app.css         # 所有元件樣式
    ├── data/
    │   ├── store.js        # 中央狀態（localStorage）
    │   ├── habits.js       # 習慣預設資料
    │   └── events.js       # 時間表 & 日曆預設資料
    ├── components/
    │   ├── weekstrip.js    # 週曆條元件
    │   ├── modal.js        # 新增事項 Modal
    │   └── navbar.js       # 底部導航
    ├── screens/
    │   ├── home.js         # 首頁（習慣 + 今日活動）
    │   ├── timeline.js     # 時間表（小時軸）
    │   ├── calendar.js     # 月曆 + 即將到來
    │   └── profile.js      # 我的（統計 + 設定）
    └── app.js              # 路由 & 啟動入口
```

---

## 快速開始

### 方法 1 — 使用 Vite (推薦，現代開發模式)

1. 確保已安裝 [Node.js](https://nodejs.org/)
2. 在終端機進入 `daily-life-app/` 資料夾
3. 執行安裝依賴：`npm install`
4. 啟動開發伺服器：`npm run dev`
5. 瀏覽器開啟 `http://localhost:5173`

### 方法 2 — Live Server (VS Code 擴充套件)

1. 在 VS Code 安裝 **Live Server** 擴充套件
2. 在 VS Code 中開啟 `daily-life-app/` 資料夾
3. 右鍵點擊 `index.html` → **Open with Live Server**
4. 瀏覽器自動開啟 `http://localhost:5500`

### 方法 3 — 直接開啟

雙擊 `index.html`（注意：PWA 功能與 Service Worker 在 `file://` 協議下無法運作）

---

## 功能說明

| 畫面 | 功能 |
|------|------|
| 🏠 首頁 | 問候語、週曆條、每日習慣打卡、今日活動 |
| ⏱ 時間表 | 逐小時時間軸、新增事項、彩色事件區塊 |
| 📅 日曆 | 月曆視圖、即將到來事件、Google 日曆標記 |
| 👤 我的 | 個人統計、連續天數、設定開關 |

---

## 下一步擴充

- [ ] 串接 Google Calendar API（OAuth 2.0）
- [ ] 推播通知（Web Push API）
- [ ] 雲端同步（Firebase Firestore）
- [ ] 習慣統計圖表
- [ ] 重複事件設定

---

## 技術棧

- **純 HTML / CSS / Vanilla JS**（無框架依賴）
- **PWA**：可安裝至手機桌面，離線使用
- **localStorage**：本地資料持久化
- **Google Fonts**：Nunito 字體
