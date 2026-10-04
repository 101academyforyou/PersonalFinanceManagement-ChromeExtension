/**
 * finance.js
 * 財務計算、分類設定與篩選邏輯（純函式，不依賴 DOM）。
 */

export const CATEGORIES = {
  expense: [
    { name: "飲食", icon: "🍱" },
    { name: "交通", icon: "🚌" },
    { name: "購物", icon: "🛍️" },
    { name: "娛樂", icon: "🎮" },
    { name: "居家", icon: "🏠" },
    { name: "醫療", icon: "💊" },
    { name: "學習", icon: "📚" },
    { name: "其他", icon: "✨" },
  ],
  income: [
    { name: "薪資", icon: "💼" },
    { name: "獎金", icon: "🎁" },
    { name: "投資", icon: "📈" },
    { name: "兼職", icon: "💻" },
    { name: "其他", icon: "✨" },
  ],
};

export function getCategoryIcon(type, category) {
  const list = CATEGORIES[type] || [];
  const found = list.find((c) => c.name === category);
  return found ? found.icon : "✨";
}

/**
 * 總收入 = 收入總和
 * 總支出 = 支出總和
 * 目前餘額 = 總收入 − 總支出
 */
export function calcSummary(transactions) {
  let income = 0;
  let expense = 0;
  for (const tx of transactions) {
    if (tx.type === "income") income += Number(tx.amount) || 0;
    else if (tx.type === "expense") expense += Number(tx.amount) || 0;
  }
  return { income, expense, balance: income - expense };
}

/** 取得 YYYY-MM 格式的月份字串 */
export function monthKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** 本地時區的今天，YYYY-MM-DD */
export function todayString(date = new Date()) {
  const d = String(date.getDate()).padStart(2, "0");
  return `${monthKey(date)}-${d}`;
}

/** 計算指定月份（預設本月）的收入與支出 */
export function calcMonthSummary(transactions, month = monthKey()) {
  return calcSummary(transactions.filter((tx) => tx.date.startsWith(month)));
}

/** 依日期（新到舊）排序，同日期依編號新到舊 */
export function sortByDateDesc(transactions) {
  return [...transactions].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return b.id.localeCompare(a.id, undefined, { numeric: true });
  });
}

/**
 * 篩選交易
 * @param {Array} transactions
 * @param {{keyword?: string, type?: string, category?: string, month?: string}} filters
 */
export function filterTransactions(transactions, filters = {}) {
  const keyword = (filters.keyword || "").trim().toLowerCase();
  return transactions.filter((tx) => {
    if (filters.type && filters.type !== "all" && tx.type !== filters.type) return false;
    if (filters.category && filters.category !== "all" && tx.category !== filters.category)
      return false;
    if (filters.month && !tx.date.startsWith(filters.month)) return false;
    if (keyword) {
      const haystack = `${tx.description} ${tx.category} ${tx.amount} ${tx.id}`.toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }
    return true;
  });
}

/** 本月支出最高的分類 */
export function topExpenseCategory(transactions, month = monthKey()) {
  const totals = {};
  for (const tx of transactions) {
    if (tx.type !== "expense" || !tx.date.startsWith(month)) continue;
    totals[tx.category] = (totals[tx.category] || 0) + Number(tx.amount);
  }
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  return entries.length ? { category: entries[0][0], amount: entries[0][1] } : null;
}

const currencyFormatter = new Intl.NumberFormat("zh-TW", {
  maximumFractionDigits: 2,
});

export function formatCurrency(amount) {
  const sign = amount < 0 ? "-" : "";
  return `${sign}$${currencyFormatter.format(Math.abs(amount))}`;
}

/** 2026-10-04 → 10/04（週六） */
export function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const weekday = ["日", "一", "二", "三", "四", "五", "六"][new Date(y, m - 1, d).getDay()];
  return `${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}（${weekday}）`;
}

/** Finny 依照目前財務狀況給的一句話 */
export function getFinnyMessage(transactions, now = new Date()) {
  if (transactions.length === 0) {
    return "嗨！我是 Finny 🤖 一起記下第一筆帳吧！";
  }
  const month = monthKey(now);
  const { income, expense } = calcMonthSummary(transactions, month);
  const { balance } = calcSummary(transactions);
  const today = todayString(now);
  const recordedToday = transactions.some((tx) => tx.date === today);

  if (balance < 0) return "餘額變成負數了，這陣子要省一點喔 🥺";
  if (income > 0 && expense > income) return "本月支出已超過收入，Finny 有點擔心 💦";
  if (income > 0 && expense / income >= 0.8) return "本月已花掉八成收入，要踩一下煞車囉 🚦";
  const top = topExpenseCategory(transactions, month);
  if (!recordedToday) return "今天還沒記帳喔～花一分鐘記一下吧 ✍️";
  if (top) return `本月花最多的是「${top.category}」，共 ${formatCurrency(top.amount)} 👀`;
  return "今天也有好好記帳，超棒的！✨";
}
