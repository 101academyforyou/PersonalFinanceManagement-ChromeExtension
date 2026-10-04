// 介紹頁互動：線上試玩的範例資料與縮放
(() => {
  const STORAGE_KEY = "transactions"; // 與 js/storage.js 的 localStorage 退回機制相同
  const frame = document.getElementById("demoFrame");
  const wrap = document.getElementById("demoWrap");
  const status = document.getElementById("demoStatus");

  function setStatus(text) {
    status.textContent = text;
  }

  function reloadDemo() {
    frame.contentWindow.location.reload();
  }

  document.getElementById("loadDemo").addEventListener("click", () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(window.FINNY_DEMO_DATA));
      reloadDemo();
      setStatus("已載入 10 筆範例交易，試試搜尋、篩選或編輯吧！");
    } catch {
      setStatus("這個瀏覽器無法儲存資料，請關閉無痕模式後再試試。");
    }
  });

  document.getElementById("clearDemo").addEventListener("click", () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* 無法存取儲存空間時，畫面本來就是空的 */
    }
    reloadDemo();
    setStatus("已清空，從第一筆開始記帳吧！");
  });

  // 窄螢幕時等比例縮小 360px 的試玩畫面，避免水平捲動
  const FRAME_W = 360;
  const FRAME_H = 580 + 34; // 含上方視窗列
  function fit() {
    const available = wrap.clientWidth;
    const scale = Math.min(1, available / FRAME_W);
    wrap.style.setProperty("--scale", scale);
    wrap.style.height = `${FRAME_H * scale}px`;
  }
  window.addEventListener("resize", fit);
  fit();
})();
