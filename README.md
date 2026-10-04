# Finny 記帳｜Personal Finance Management Chrome Extension

可愛 × 科技 × 簡潔的個人記帳 Chrome Extension，陪你記帳的是 AI 財務小助手 **Finny 🤖**。

🌐 介紹網頁：https://101academyforyou.github.io/PersonalFinanceManagement-ChromeExtension/

## 功能

- **總覽**：目前餘額、本月收入、本月支出、最近 5 筆交易
- **記帳**：類型（收入／支出）、金額、分類、說明、日期；含欄位驗證
- **紀錄**：關鍵字搜尋，依類型／分類／月份篩選，編輯與刪除（刪除前會再確認）
- **Finny 助手**：依照你的收支狀況給提醒，例如「今天還沒記帳喔」或「本月支出已超過收入」

財務計算：

```
總收入   = 收入總和
總支出   = 支出總和
目前餘額 = 總收入 − 總支出
```

## 安裝

1. 開啟 `chrome://extensions`
2. 開啟右上角「開發人員模式」
3. 點「載入未封裝項目」，選擇本專案資料夾
4. 點工具列上的 Finny 圖示開始記帳

## 技術

- Chrome Extension Manifest V3
- 原生 HTML / CSS / JavaScript（ES Modules），不使用框架
- 資料存於 `chrome.storage.local`，無後端、無資料庫
- 直接用瀏覽器開啟 `popup.html` 時會改用 `localStorage`，方便開發預覽

## 資料結構

```js
{
  id: "TX-001",
  type: "expense",      // "income" | "expense"
  amount: 280,
  category: "飲食",
  description: "午餐",
  date: "2026-10-04"    // YYYY-MM-DD
}
```

## 專案結構

```
├── manifest.json
├── popup.html
├── popup.css
├── popup.js          # UI 與事件處理
├── js/
│   ├── storage.js    # chrome.storage.local 存取（新增／更新／刪除、編號產生）
│   ├── finance.js    # 分類、財務計算、篩選、格式化、Finny 訊息
│   └── validation.js # 交易欄位驗證
└── assets/
    ├── icons/        # 16 / 32 / 48 / 128 px 圖示
    └── mascot/       # Finny 吉祥物 SVG
```
