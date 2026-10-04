/**
 * storage.js
 * 交易資料存取層：封裝 chrome.storage.local。
 * 在非擴充功能環境（例如直接以瀏覽器開啟 popup.html 預覽）時，
 * 自動退回使用 localStorage，方便開發與測試。
 */

const STORAGE_KEY = "transactions";

const hasChromeStorage =
  typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;

function readRaw() {
  if (hasChromeStorage) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve(result[STORAGE_KEY]);
      });
    });
  }
  try {
    return Promise.resolve(JSON.parse(localStorage.getItem(STORAGE_KEY)));
  } catch {
    return Promise.resolve(undefined);
  }
}

function writeRaw(transactions) {
  if (hasChromeStorage) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [STORAGE_KEY]: transactions }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve();
      });
    });
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  return Promise.resolve();
}

/** 取得全部交易（永遠回傳陣列） */
export async function getTransactions() {
  const data = await readRaw();
  return Array.isArray(data) ? data : [];
}

/** 產生下一個交易編號，格式為 TX-001、TX-002 … */
export function generateId(transactions) {
  const max = transactions.reduce((acc, tx) => {
    const match = /^TX-(\d+)$/.exec(tx.id);
    return match ? Math.max(acc, Number(match[1])) : acc;
  }, 0);
  return `TX-${String(max + 1).padStart(3, "0")}`;
}

/** 新增交易，回傳新增後的交易物件 */
export async function addTransaction(data) {
  const transactions = await getTransactions();
  const tx = { id: generateId(transactions), ...data };
  transactions.push(tx);
  await writeRaw(transactions);
  return tx;
}

/** 更新指定 id 的交易，回傳更新後的交易物件 */
export async function updateTransaction(id, data) {
  const transactions = await getTransactions();
  const index = transactions.findIndex((tx) => tx.id === id);
  if (index === -1) throw new Error("找不到這筆交易");
  transactions[index] = { ...transactions[index], ...data, id };
  await writeRaw(transactions);
  return transactions[index];
}

/** 刪除指定 id 的交易 */
export async function deleteTransaction(id) {
  const transactions = await getTransactions();
  await writeRaw(transactions.filter((tx) => tx.id !== id));
}
