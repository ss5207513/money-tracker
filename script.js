const RECORDS_KEY = "cuteMoneyRecords";
const GOAL_KEY = "cuteMoneyGoal";
const AVATAR_KEY = "cuteMoneyAvatar";
const CARRIER_KEY = "cuteMoneyCarrier";
const INVOICES_KEY = "cuteMoneyInvoices";

let records = [];
let currentPage = 1;
const pageSize = 10;

let carrierData = {
  carrierNumber: "",
  invoices: []
};

let html5QrCode = null;
let calcExpression = "";

const incomeCategories = ["薪水", "打工收入", "獎金", "紅包", "投資", "其他收入"];
const expenseCategories = ["餐飲", "飲料", "交通", "購物", "娛樂", "生活", "房租", "醫療", "學費", "其他支出"];

document.addEventListener("DOMContentLoaded", () => {
  initDefaultDate();
  loadRecords();
  loadGoal();
  loadCarrierData();
  initCategoryOptions();
  initAvatarUpload();
  bindEvents();
  updateScreen();
  renderInvoices();
});

function bindEvents() {
  document.querySelectorAll(".tab-btn").forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
  });

  document.getElementById("type").addEventListener("change", initCategoryOptions);
  document.getElementById("addRecordBtn").addEventListener("click", addRecord);
  document.getElementById("saveGoalBtn").addEventListener("click", saveGoal);
  document.getElementById("clearBtn").addEventListener("click", clearAllRecords);

  document.getElementById("monthFilter").addEventListener("change", () => {
    currentPage = 1;
    renderRecords();
  });

  document.getElementById("prevPageBtn").addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderRecords();
    }
  });

  document.getElementById("nextPageBtn").addEventListener("click", () => {
    const filtered = getFilteredRecords();
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

    if (currentPage < totalPages) {
      currentPage++;
      renderRecords();
    }
  });

  document.getElementById("saveCarrierBtn").addEventListener("click", saveCarrier);
  document.getElementById("startScanBtn").addEventListener("click", startCarrierScan);
  document.getElementById("stopScanBtn").addEventListener("click", stopCarrierScan);
  document.getElementById("invoiceImage").addEventListener("change", uploadInvoiceImage);

  initCalculator();
}

function switchTab(targetId) {
  document.querySelectorAll(".tab-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === targetId);
  });

  document.querySelectorAll(".tab-section").forEach((section) => {
    section.classList.toggle("active", section.id === targetId);
  });

  if (targetId !== "invoiceSection") {
    stopCarrierScan();
  }
}

function initDefaultDate() {
  const today = new Date();
  document.getElementById("date").value = toDateString(today);
  document.getElementById("monthFilter").value = toMonthString(today);
}

function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toMonthString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatMoney(number) {
  return "$" + Number(number || 0).toLocaleString("en-US");
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* 計算機 */
function initCalculator() {
  const openBtn = document.getElementById("openCalculatorBtn");
  const closeBtn = document.getElementById("closeCalculatorBtn");
  const calculatorBox = document.getElementById("calculatorBox");
  const calcDisplay = document.getElementById("calcDisplay");

  openBtn.addEventListener("click", () => {
    calculatorBox.classList.toggle("active");
  });

  closeBtn.addEventListener("click", () => {
    calculatorBox.classList.remove("active");
  });

  document.querySelectorAll("[data-calc]").forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.dataset.calc;
      calcExpression += value;
      calcDisplay.value = calcExpression;
    });
  });

  document.getElementById("calcClearBtn").addEventListener("click", () => {
    calcExpression = "";
    calcDisplay.value = "";
  });

  document.getElementById("calcBackBtn").addEventListener("click", () => {
    calcExpression = calcExpression.slice(0, -1);
    calcDisplay.value = calcExpression;
  });

  document.getElementById("calcEqualBtn").addEventListener("click", () => {
    calculateResult();
  });

  document.getElementById("useCalcAmountBtn").addEventListener("click", () => {
    const result = calculateResult();

    if (result !== null) {
      document.getElementById("amount").value = result;
      calculatorBox.classList.remove("active");
    }
  });
}

function calculateResult() {
  const calcDisplay = document.getElementById("calcDisplay");

  try {
    if (!calcExpression) return null;

    if (!/^[0-9+\-*/.() ]+$/.test(calcExpression)) {
      alert("計算式格式錯誤");
      return null;
    }

    const result = Function('"use strict"; return (' + calcExpression + ")")();

    if (!isFinite(result)) {
      alert("計算結果錯誤");
      return null;
    }

    const finalResult = Math.round(result * 100) / 100;
    calcExpression = String(finalResult);
    calcDisplay.value = calcExpression;

    return finalResult;
  } catch (error) {
    alert("請確認計算式是否正確");
    return null;
  }
}

/* 記帳 */
function saveRecords() {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

function loadRecords() {
  const saved = localStorage.getItem(RECORDS_KEY);
  records = saved ? JSON.parse(saved) : [];
}

function initCategoryOptions() {
  const type = document.getElementById("type").value;
  const categorySelect = document.getElementById("category");
  const categories = type === "income" ? incomeCategories : expenseCategories;

  categorySelect.innerHTML = categories
    .map((item) => `<option value="${item}">${item}</option>`)
    .join("");
}

function addRecord() {
  const type = document.getElementById("type").value;
  const category = document.getElementById("category").value.trim();
  const amount = Number(document.getElementById("amount").value);
  const date = document.getElementById("date").value;
  const note = document.getElementById("note").value.trim();

  if (!amount || amount <= 0) {
    alert("請輸入正確金額");
    return;
  }

  const record = {
    id: Date.now(),
    type,
    category,
    amount,
    date,
    note: note || "未填寫備註"
  };

  records.unshift(record);
  currentPage = 1;
  saveRecords();
  clearForm();
  updateScreen();
}

function clearForm() {
  document.getElementById("amount").value = "";
  document.getElementById("note").value = "";
  document.getElementById("date").value = toDateString(new Date());
  document.getElementById("type").value = "income";
  initCategoryOptions();
}

function deleteRecord(id) {
  records = records.filter((item) => item.id !== id);
  saveRecords();
  updateScreen();
}

function clearAllRecords() {
  if (!confirm("確定要清空所有交易紀錄嗎？")) return;

  records = [];
  currentPage = 1;
  saveRecords();
  updateScreen();
}

/* 目標 */
function saveGoal() {
  const name = document.getElementById("goalName").value.trim();
  const amount = Number(document.getElementById("goalAmount").value);

  if (!name || !amount || amount <= 0) {
    alert("請輸入正確的目標資料");
    return;
  }

  localStorage.setItem(GOAL_KEY, JSON.stringify({ name, amount }));
  updateGoalUI();
  alert("存錢目標已儲存");
}

function loadGoal() {
  const savedGoal = localStorage.getItem(GOAL_KEY);
  if (!savedGoal) return;

  const goal = JSON.parse(savedGoal);
  document.getElementById("goalName").value = goal.name || "";
  document.getElementById("goalAmount").value = goal.amount || "";
}

function getGoal() {
  const savedGoal = localStorage.getItem(GOAL_KEY);
  return savedGoal ? JSON.parse(savedGoal) : null;
}

function getTotals() {
  const totalIncome = records
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const totalExpense = records
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense
  };
}

function updateSummaryCards() {
  const { totalIncome, totalExpense, balance } = getTotals();

  document.getElementById("totalIncome").textContent = formatMoney(totalIncome);
  document.getElementById("totalExpense").textContent = formatMoney(totalExpense);
  document.getElementById("balance").textContent = formatMoney(balance);
}

function updateGoalUI() {
  const goal = getGoal();
  const { balance } = getTotals();

  if (!goal) {
    document.getElementById("goalLabel").textContent = "尚未設定目標";
    document.getElementById("goalPercent").textContent = "0%";
    document.getElementById("goalProgressBar").style.width = "0%";
    return;
  }

  const progress = Math.max(0, Math.min(100, (balance / goal.amount) * 100));

  document.getElementById("goalLabel").textContent =
    `${goal.name}：${formatMoney(balance)} / ${formatMoney(goal.amount)}`;

  document.getElementById("goalPercent").textContent = `${progress.toFixed(0)}%`;
  document.getElementById("goalProgressBar").style.width = `${progress}%`;
}

function getFilteredRecords() {
  const selectedMonth = document.getElementById("monthFilter").value;

  return records
    .filter((item) => String(item.date).slice(0, 7) === selectedMonth)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

function updateMonthSummary(filteredRecords) {
  const monthIncome = filteredRecords
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const monthExpense = filteredRecords
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  document.getElementById("monthIncome").textContent = formatMoney(monthIncome);
  document.getElementById("monthExpense").textContent = formatMoney(monthExpense);
}

function renderRecords() {
  const list = document.getElementById("recordList");
  const filtered = getFilteredRecords();

  updateMonthSummary(filtered);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  if (currentPage > totalPages) {
    currentPage = totalPages;
  }

  const start = (currentPage - 1) * pageSize;
  const currentRecords = filtered.slice(start, start + pageSize);

  if (currentRecords.length === 0) {
    list.innerHTML = `<li class="empty-box">目前沒有紀錄，先新增一筆收入或支出吧。</li>`;
  } else {
    list.innerHTML = currentRecords.map((record) => {
      const isIncome = record.type === "income";
      const typeText = isIncome ? "收入" : "支出";
      const sign = isIncome ? "+" : "-";
      const className = isIncome ? "income" : "expense";

      return `
        <li class="record-item ${className}">
          <div>
            <div class="record-title">
              <span class="record-dot ${className}"></span>
              <span>${typeText}｜${escapeHtml(record.category)}</span>
              <span class="record-amount ${className}">
                ${sign}${formatMoney(record.amount)}
              </span>
            </div>

            <div class="record-meta">
              日期：${escapeHtml(record.date)} ｜ 備註：${escapeHtml(record.note)}
            </div>
          </div>

          <button class="delete-btn" data-id="${record.id}">刪除</button>
        </li>
      `;
    }).join("");
  }

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      deleteRecord(Number(btn.dataset.id));
    });
  });

  document.getElementById("pageInfo").textContent = `第 ${currentPage} / ${totalPages} 頁`;
  document.getElementById("prevPageBtn").disabled = currentPage <= 1;
  document.getElementById("nextPageBtn").disabled = currentPage >= totalPages;
  document.getElementById("paginationBox").style.display = filtered.length > pageSize ? "flex" : "none";
}

/* 大頭貼 */
function initAvatarUpload() {
  const avatarBtn = document.getElementById("avatarBtn");
  const avatarInput = document.getElementById("avatarInput");
  const avatarPreview = document.getElementById("avatarPreview");
  const avatarPlaceholder = document.getElementById("avatarPlaceholder");

  const savedAvatar = localStorage.getItem(AVATAR_KEY);

  if (savedAvatar) {
    avatarPreview.src = savedAvatar;
    avatarPreview.style.display = "block";
    avatarPlaceholder.style.display = "none";
  }

  avatarBtn.addEventListener("click", () => {
    avatarInput.click();
  });

  avatarInput.addEventListener("change", function (event) {
    const file = event.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (e) {
      avatarPreview.src = e.target.result;
      avatarPreview.style.display = "block";
      avatarPlaceholder.style.display = "none";
      localStorage.setItem(AVATAR_KEY, e.target.result);
    };

    reader.readAsDataURL(file);
  });
}

/* 發票載具 */
function loadCarrierData() {
  const savedCarrier = localStorage.getItem(CARRIER_KEY);
  const savedInvoices = localStorage.getItem(INVOICES_KEY);

  carrierData.carrierNumber = savedCarrier || "";
  carrierData.invoices = savedInvoices ? JSON.parse(savedInvoices) : [];

  document.getElementById("carrierNumber").value = carrierData.carrierNumber;
  document.getElementById("currentCarrier").textContent = carrierData.carrierNumber || "尚未設定";
}

function saveCarrierData() {
  localStorage.setItem(CARRIER_KEY, carrierData.carrierNumber || "");
  localStorage.setItem(INVOICES_KEY, JSON.stringify(carrierData.invoices || []));
}

function saveCarrier() {
  const value = document.getElementById("carrierNumber").value.trim();

  if (!value) {
    alert("請輸入載具號碼");
    return;
  }

  carrierData.carrierNumber = value;
  saveCarrierData();

  document.getElementById("currentCarrier").textContent = value;
  alert("載具已儲存");
}

function startCarrierScan() {
  const scannerArea = document.getElementById("scannerArea");

  if (typeof Html5Qrcode === "undefined") {
    alert("QR Code 掃描套件尚未載入");
    return;
  }

  scannerArea.style.display = "block";
  scannerArea.innerHTML = "";

  html5QrCode = new Html5Qrcode("scannerArea");

  html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    function (decodedText) {
      handleInvoiceQrCode(decodedText, "相機掃描");
      stopCarrierScan();
    }
  ).catch(() => {
    alert("無法開啟相機，請確認相機權限");
  });
}

function stopCarrierScan() {
  const scannerArea = document.getElementById("scannerArea");

  if (html5QrCode) {
    html5QrCode.stop().then(() => {
      html5QrCode.clear();
      html5QrCode = null;
      scannerArea.innerHTML = "";
      scannerArea.style.display = "none";
    }).catch(() => {
      html5QrCode = null;
      scannerArea.innerHTML = "";
      scannerArea.style.display = "none";
    });
  }
}

function uploadInvoiceImage(event) {
  const file = event.target.files[0];

  if (!file) return;

  const scannerArea = document.getElementById("scannerArea");
  scannerArea.style.display = "block";

  const imageScanner = new Html5Qrcode("scannerArea");

  imageScanner.scanFile(file, true)
    .then((decodedText) => {
      handleInvoiceQrCode(decodedText, "圖片上傳");
      imageScanner.clear();
      scannerArea.innerHTML = "";
      scannerArea.style.display = "none";
    })
    .catch(() => {
      alert("沒有辨識到 QR Code");
      imageScanner.clear();
      scannerArea.innerHTML = "";
      scannerArea.style.display = "none";
    });

  event.target.value = "";
}

function handleInvoiceQrCode(rawCode, source) {
  const invoice = {
    id: Date.now(),
    source,
    rawCode,
    carrierNumber: carrierData.carrierNumber || "未設定載具",
    invoiceNumber: "已掃描發票",
    invoiceDate: new Date().toLocaleDateString("zh-TW"),
    totalAmount: 0,
    expanded: false,
    items: [
      {
        name: "QR Code 原始內容",
        quantity: "-",
        amount: rawCode
      }
    ]
  };

  carrierData.invoices.unshift(invoice);
  saveCarrierData();
  renderInvoices();

  alert("發票已掃描");
}

function renderInvoices() {
  const list = document.getElementById("invoiceList");

  if (!carrierData.invoices.length) {
    list.innerHTML = `<li class="empty-box">尚未掃描發票，可使用相機或上傳圖片。</li>`;
    return;
  }

  list.innerHTML = carrierData.invoices.map((invoice) => {
    return `
      <li class="invoice-item">
        <div>
          <div class="invoice-main invoice-toggle" data-id="${invoice.id}">
            🧾 ${escapeHtml(invoice.invoiceNumber)}
          </div>

          <div class="invoice-sub">
            日期：${escapeHtml(invoice.invoiceDate)}<br>
            載具：${escapeHtml(invoice.carrierNumber)}<br>
            點擊發票可展開明細
          </div>

          <div class="invoice-detail-box" style="display:${invoice.expanded ? "block" : "none"};">
            <p><strong>內容：</strong></p>
            <p>${escapeHtml(invoice.rawCode)}</p>
          </div>
        </div>

        <button class="invoice-delete-btn" data-id="${invoice.id}">刪除</button>
      </li>
    `;
  }).join("");

  document.querySelectorAll(".invoice-toggle").forEach((item) => {
    item.addEventListener("click", () => {
      const id = Number(item.dataset.id);

      carrierData.invoices = carrierData.invoices.map((invoice) => {
        if (invoice.id === id) {
          invoice.expanded = !invoice.expanded;
        }

        return invoice;
      });

      saveCarrierData();
      renderInvoices();
    });
  });

  document.querySelectorAll(".invoice-delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.id);

      carrierData.invoices = carrierData.invoices.filter((invoice) => invoice.id !== id);

      saveCarrierData();
      renderInvoices();
    });
  });
}

function updateScreen() {
  updateSummaryCards();
  updateGoalUI();
  renderRecords();
}