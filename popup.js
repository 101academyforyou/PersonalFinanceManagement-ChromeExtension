import {
  getTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
} from "./js/storage.js";
import {
  CATEGORIES,
  calcSummary,
  calcMonthSummary,
  filterTransactions,
  sortByDateDesc,
  formatCurrency,
  formatDate,
  getCategoryIcon,
  getFinnyMessage,
  todayString,
} from "./js/finance.js";
import { validateTransaction } from "./js/validation.js";

const RECENT_LIMIT = 5;

const state = {
  transactions: [],
  editingId: null,
  pendingDeleteId: null,
};

const $ = (selector) => document.querySelector(selector);

const el = {
  finnyMessage: $("#finnyMessage"),
  tabs: $(".tabs"),
  balanceAmount: $("#balanceAmount"),
  balanceSub: $("#balanceSub"),
  monthIncome: $("#monthIncome"),
  monthExpense: $("#monthExpense"),
  recentList: $("#recentList"),
  form: $("#txForm"),
  formTitle: $("#formTitle"),
  formIdBadge: $("#formIdBadge"),
  categoryGrid: $("#categoryGrid"),
  submitBtn: $("#submitBtn"),
  cancelEdit: $("#cancelEdit"),
  searchInput: $("#searchInput"),
  filterType: $("#filterType"),
  filterCategory: $("#filterCategory"),
  filterMonth: $("#filterMonth"),
  clearFilters: $("#clearFilters"),
  listSummary: $("#listSummary"),
  allList: $("#allList"),
  confirmModal: $("#confirmModal"),
  confirmText: $("#confirmText"),
  confirmOk: $("#confirmOk"),
  confirmCancel: $("#confirmCancel"),
  toast: $("#toast"),
};

/* ---------- 分頁切換 ---------- */

function switchView(view) {
  el.tabs.dataset.active = view;
  document.querySelectorAll(".tab").forEach((tab) => {
    const active = tab.dataset.view === view;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  document.querySelectorAll(".view").forEach((section) => {
    section.classList.toggle("is-active", section.id === `view-${view}`);
  });
  $(".views").scrollTop = 0;
  if (view === "form" && !state.editingId) {
    el.form.amount.focus();
  }
}

/* ---------- 共用：交易項目 ---------- */

function createTxItem(tx, { withActions = false } = {}) {
  const li = document.createElement("li");
  li.className = `tx-item ${tx.type}`;
  li.dataset.id = tx.id;

  const icon = document.createElement("div");
  icon.className = "tx-icon";
  icon.textContent = getCategoryIcon(tx.type, tx.category);

  const main = document.createElement("div");
  main.className = "tx-main";
  const title = document.createElement("div");
  title.className = "tx-title";
  title.textContent = tx.description || tx.category;
  const meta = document.createElement("div");
  meta.className = "tx-meta";
  meta.textContent = `${tx.category} · ${formatDate(tx.date)}`;
  main.append(title, meta);

  const side = document.createElement("div");
  side.className = "tx-side";
  const amount = document.createElement("div");
  amount.className = "tx-amount";
  amount.textContent = `${tx.type === "income" ? "+" : "-"}${formatCurrency(tx.amount)}`;
  side.append(amount);

  if (withActions) {
    const actions = document.createElement("div");
    actions.className = "tx-actions";
    actions.append(
      createIconButton("✏️", "edit", `編輯 ${tx.id}`),
      createIconButton("🗑️", "delete", `刪除 ${tx.id}`)
    );
    side.append(actions);
  }

  li.append(icon, main, side);
  return li;
}

function createIconButton(text, action, label) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `icon-btn ${action}`;
  btn.dataset.action = action;
  btn.title = label;
  btn.setAttribute("aria-label", label);
  btn.textContent = text;
  return btn;
}

function createEmpty(emoji, text) {
  const li = document.createElement("li");
  li.className = "empty";
  const icon = document.createElement("span");
  icon.className = "emoji";
  icon.textContent = emoji;
  li.append(icon, text);
  return li;
}

/* ---------- 總覽 ---------- */

function renderDashboard() {
  const { income, expense, balance } = calcSummary(state.transactions);
  const month = calcMonthSummary(state.transactions);

  el.balanceAmount.textContent = formatCurrency(balance);
  el.balanceSub.textContent = `總收入 ${formatCurrency(income)} · 總支出 ${formatCurrency(expense)}`;
  el.monthIncome.textContent = formatCurrency(month.income);
  el.monthIncome.title = el.monthIncome.textContent;
  el.monthExpense.textContent = formatCurrency(month.expense);
  el.monthExpense.title = el.monthExpense.textContent;

  const recent = sortByDateDesc(state.transactions).slice(0, RECENT_LIMIT);
  el.recentList.replaceChildren(
    ...(recent.length
      ? recent.map((tx) => createTxItem(tx))
      : [createEmpty("🌱", "還沒有任何交易，點「記帳」開始吧！")])
  );
}

function renderFinny() {
  const message = getFinnyMessage(state.transactions);
  if (el.finnyMessage.textContent === message) return;
  el.finnyMessage.textContent = message;
  el.finnyMessage.classList.remove("pop");
  void el.finnyMessage.offsetWidth; // 重新觸發動畫
  el.finnyMessage.classList.add("pop");
}

/* ---------- 記帳表單 ---------- */

function currentFormType() {
  return el.form.querySelector('input[name="type"]:checked').value;
}

function renderCategoryChips(type, selected) {
  const chips = CATEGORIES[type].map((cat) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "category-chip";
    btn.dataset.category = cat.name;
    btn.setAttribute("role", "radio");
    const isSelected = cat.name === selected;
    btn.classList.toggle("is-selected", isSelected);
    btn.setAttribute("aria-checked", String(isSelected));
    const emoji = document.createElement("span");
    emoji.className = "emoji";
    emoji.textContent = cat.icon;
    btn.append(emoji, cat.name);
    return btn;
  });
  el.categoryGrid.replaceChildren(...chips);
}

function selectedCategory() {
  const chip = el.categoryGrid.querySelector(".category-chip.is-selected");
  return chip ? chip.dataset.category : "";
}

function selectCategory(name) {
  el.categoryGrid.querySelectorAll(".category-chip").forEach((chip) => {
    const active = chip.dataset.category === name;
    chip.classList.toggle("is-selected", active);
    chip.setAttribute("aria-checked", String(active));
  });
  showErrors({ ...lastErrors, category: undefined });
}

let lastErrors = {};

function showErrors(errors) {
  lastErrors = errors;
  el.form.querySelectorAll("[data-error]").forEach((node) => {
    const message = errors[node.dataset.error] || "";
    node.textContent = message;
    node.closest(".field").classList.toggle("has-error", Boolean(message));
  });
}

function resetForm() {
  state.editingId = null;
  el.form.reset();
  el.form.date.value = todayString();
  el.formTitle.textContent = "新增一筆";
  el.formIdBadge.hidden = true;
  el.cancelEdit.hidden = true;
  el.submitBtn.textContent = "記下來 ✨";
  renderCategoryChips("expense", CATEGORIES.expense[0].name);
  showErrors({});
}

function startEdit(id) {
  const tx = state.transactions.find((t) => t.id === id);
  if (!tx) return;
  state.editingId = id;
  el.form.querySelector(`input[name="type"][value="${tx.type}"]`).checked = true;
  el.form.amount.value = tx.amount;
  el.form.description.value = tx.description;
  el.form.date.value = tx.date;
  renderCategoryChips(tx.type, tx.category);
  el.formTitle.textContent = "編輯交易";
  el.formIdBadge.textContent = tx.id;
  el.formIdBadge.hidden = false;
  el.cancelEdit.hidden = false;
  el.submitBtn.textContent = "儲存變更 💾";
  showErrors({});
  switchView("form");
}

async function handleSubmit(event) {
  event.preventDefault();
  const { valid, errors, data } = validateTransaction({
    type: currentFormType(),
    amount: el.form.amount.value,
    category: selectedCategory(),
    description: el.form.description.value,
    date: el.form.date.value,
  });
  showErrors(errors);
  if (!valid) {
    toast("有欄位需要再確認一下喔 🧐");
    return;
  }

  el.submitBtn.disabled = true;
  try {
    if (state.editingId) {
      await updateTransaction(state.editingId, data);
      toast("已更新交易 ✅");
      await refresh();
      resetForm();
      switchView("list");
    } else {
      const tx = await addTransaction(data);
      toast(`已記下 ${tx.category} ${formatCurrency(tx.amount)} 🎉`);
      await refresh();
      const type = data.type;
      resetForm();
      // 保留類型，方便連續記帳
      el.form.querySelector(`input[name="type"][value="${type}"]`).checked = true;
      renderCategoryChips(type, CATEGORIES[type][0].name);
      el.form.amount.focus();
    }
  } catch (err) {
    console.error(err);
    toast("儲存失敗，請再試一次 😢");
  } finally {
    el.submitBtn.disabled = false;
  }
}

/* ---------- 紀錄列表 ---------- */

function renderCategoryFilter() {
  const type = el.filterType.value;
  const current = el.filterCategory.value;
  const names =
    type === "all"
      ? [...new Set([...CATEGORIES.expense, ...CATEGORIES.income].map((c) => c.name))]
      : CATEGORIES[type].map((c) => c.name);

  const options = [new Option("全部分類", "all"), ...names.map((n) => new Option(n, n))];
  el.filterCategory.replaceChildren(...options);
  el.filterCategory.value = names.includes(current) ? current : "all";
}

function renderList() {
  const filtered = sortByDateDesc(
    filterTransactions(state.transactions, {
      keyword: el.searchInput.value,
      type: el.filterType.value,
      category: el.filterCategory.value,
      month: el.filterMonth.value,
    })
  );
  const { income, expense } = calcSummary(filtered);

  const count = document.createElement("span");
  count.textContent = `共 ${filtered.length} 筆`;
  const totals = document.createElement("span");
  const inSpan = document.createElement("span");
  inSpan.className = "in";
  inSpan.textContent = `+${formatCurrency(income)}`;
  const outSpan = document.createElement("span");
  outSpan.className = "out";
  outSpan.textContent = `-${formatCurrency(expense)}`;
  totals.append(inSpan, " / ", outSpan);
  el.listSummary.replaceChildren(count, totals);

  let empty;
  if (state.transactions.length === 0) {
    empty = createEmpty("📭", "目前沒有任何紀錄");
  } else {
    empty = createEmpty("🔎", "找不到符合條件的交易");
  }
  el.allList.replaceChildren(
    ...(filtered.length ? filtered.map((tx) => createTxItem(tx, { withActions: true })) : [empty])
  );
}

/* ---------- 刪除確認 ---------- */

function askDelete(id) {
  const tx = state.transactions.find((t) => t.id === id);
  if (!tx) return;
  state.pendingDeleteId = id;
  el.confirmText.textContent = `${tx.id}｜${tx.description || tx.category}｜${formatCurrency(tx.amount)}`;
  el.confirmModal.hidden = false;
  el.confirmCancel.focus();
}

function closeConfirm() {
  state.pendingDeleteId = null;
  el.confirmModal.hidden = true;
}

async function confirmDelete() {
  const id = state.pendingDeleteId;
  closeConfirm();
  if (!id) return;
  try {
    await deleteTransaction(id);
    if (state.editingId === id) resetForm();
    toast("已刪除 🗑️");
    await refresh();
  } catch (err) {
    console.error(err);
    toast("刪除失敗，請再試一次 😢");
  }
}

/* ---------- Toast ---------- */

let toastTimer;
function toast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove("show"), 1800);
}

/* ---------- 資料載入 ---------- */

async function refresh() {
  state.transactions = await getTransactions();
  renderDashboard();
  renderList();
  renderFinny();
}

function bindEvents() {
  el.tabs.addEventListener("click", (event) => {
    const tab = event.target.closest(".tab");
    if (!tab) return;
    if (tab.dataset.view === "form" && state.editingId) resetForm();
    switchView(tab.dataset.view);
  });

  document.querySelectorAll("[data-goto]").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.goto));
  });

  el.form.addEventListener("change", (event) => {
    if (event.target.name === "type") {
      renderCategoryChips(event.target.value, CATEGORIES[event.target.value][0].name);
    }
  });

  el.categoryGrid.addEventListener("click", (event) => {
    const chip = event.target.closest(".category-chip");
    if (chip) selectCategory(chip.dataset.category);
  });

  el.form.addEventListener("submit", handleSubmit);
  el.cancelEdit.addEventListener("click", () => {
    resetForm();
    switchView("list");
  });

  el.searchInput.addEventListener("input", renderList);
  el.filterType.addEventListener("change", () => {
    renderCategoryFilter();
    renderList();
  });
  el.filterCategory.addEventListener("change", renderList);
  el.filterMonth.addEventListener("change", renderList);
  el.clearFilters.addEventListener("click", () => {
    el.searchInput.value = "";
    el.filterType.value = "all";
    el.filterMonth.value = "";
    renderCategoryFilter();
    el.filterCategory.value = "all";
    renderList();
  });

  el.allList.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-action]");
    if (!btn) return;
    const id = btn.closest(".tx-item").dataset.id;
    if (btn.dataset.action === "edit") startEdit(id);
    if (btn.dataset.action === "delete") askDelete(id);
  });

  el.confirmOk.addEventListener("click", confirmDelete);
  el.confirmCancel.addEventListener("click", closeConfirm);
  el.confirmModal.addEventListener("click", (event) => {
    if (event.target === el.confirmModal) closeConfirm();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !el.confirmModal.hidden) closeConfirm();
  });
}

async function init() {
  el.tabs.dataset.active = "dashboard";
  renderCategoryFilter();
  resetForm();
  bindEvents();
  try {
    await refresh();
  } catch (err) {
    console.error(err);
    toast("讀取資料失敗 😢");
  }
}

init();
