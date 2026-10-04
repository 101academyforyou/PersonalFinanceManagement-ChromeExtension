/**
 * validation.js
 * 交易資料驗證。回傳 { valid, errors, data }，
 * errors 以欄位名稱為 key，值為繁體中文錯誤訊息；data 為整理後的資料。
 */

import { CATEGORIES } from "./finance.js";

const MAX_AMOUNT = 100_000_000;
const MAX_DESCRIPTION = 50;

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function validateTransaction(input) {
  const errors = {};
  const type = input.type;
  const amountText = String(input.amount ?? "").trim();
  const amount = Number(amountText);
  const category = String(input.category ?? "").trim();
  const description = String(input.description ?? "").trim();
  const date = String(input.date ?? "").trim();

  if (type !== "income" && type !== "expense") {
    errors.type = "請選擇收入或支出";
  }

  if (amountText === "") {
    errors.amount = "請輸入金額";
  } else if (!Number.isFinite(amount) || amount <= 0) {
    errors.amount = "金額必須大於 0";
  } else if (amount > MAX_AMOUNT) {
    errors.amount = "金額太大了，請再確認一下";
  } else if (!/^\d+(\.\d{1,2})?$/.test(amountText)) {
    errors.amount = "金額最多到小數點後兩位";
  }

  const categories = CATEGORIES[type] || [];
  if (!category) {
    errors.category = "請選擇分類";
  } else if (categories.length && !categories.some((c) => c.name === category)) {
    errors.category = "分類不正確";
  }

  if (description.length > MAX_DESCRIPTION) {
    errors.description = `說明最多 ${MAX_DESCRIPTION} 個字`;
  }

  if (!date) {
    errors.date = "請選擇日期";
  } else if (!isValidDate(date)) {
    errors.date = "日期格式不正確";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    data: { type, amount, category, description, date },
  };
}
