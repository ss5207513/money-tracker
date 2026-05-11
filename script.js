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
    button.addEventListener("click", () => {
      switchTab(button.dataset.tab);
    });
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
}

/* 分類切換 */
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

/* 日期 */
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

/* 工具 */
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

/* 記帳資料 */
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

  if (!category) {
    alert("請選擇分類");
    return;
  }

  if (!amount || amount <= 0) {
    alert("請輸入正確金額");
    return;
  }

  if (!date) {
    alert("請選擇日期");
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

  const filtered = getFilteredRecords();
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  if (currentPage > totalPages) currentPage = totalPages;

  updateScreen();
}

function clearAllRecords() {
  if (records.length === 0) {
    alert("目前沒有紀錄可以清空");
    return;
  }

  const ok = confirm("確定要清空所有交易紀錄嗎？");
  if (!ok) return;

  records = [];
  currentPage = 1;
  saveRecords();
  updateScreen();
}

/* 目標 */
function saveGoalToLocal(goal) {
  localStorage.setItem(GOAL_KEY, JSON.stringify(goal));
}

function loadGoal() {
  const savedGoal = localStorage.getItem(GOAL_KEY);
  if (!savedGoal) return;

  const goal = JSON.parse(savedGoal);
  document.getElementById("goalName").value = goal.name || "";
  document.getElementById("goalAmount").value = goal.amount || "";
}

function saveGoal() {
  const name = document.getElementById("goalName").value.trim();
  const amount = Number(document.getElementById("goalAmount").value);

  if (!name) {
    alert("請輸入目標名稱");
    return;
  }

  if (!amount || amount <= 0) {
    alert("請輸入正確的目標金額");
    return;
  }

  saveGoalToLocal({ name, amount });
  updateGoalUI();
  alert("存錢目標已儲存");
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
  const goalLabel = document.getElementById("goalLabel");
  const goalPercent = document.getElementById("goalPercent");
  const goalProgressBar = document.getElementById("goalProgressBar");
  const { balance } = getTotals();

  if (!goal || !goal.name || !goal.amount) {
    goalLabel.textContent = "尚未設定目標";
    goalPercent.textContent = "0%";
    goalProgressBar.style.width = "0%";
    return;
  }

  const progress = Math.max(0, Math.min(100, (balance / goal.amount) * 100));

  goalLabel.textContent = `${goal.name}：${formatMoney(balance)} / ${formatMoney(goal.amount)}`;
  goalPercent.textContent = `${progress.toFixed(0)}%`;
  goalProgressBar.style.width = `${progress}%`;
}

/* 月份與分頁 */
function getSelectedMonth() {
  return document.getElementById("monthFilter").value;
}

function getFilteredRecords() {
  const selectedMonth = getSelectedMonth();

  const filtered = records.filter((item) => {
    if (!selectedMonth) return true;
    return String(item.date).slice(0, 7) === selectedMonth;
  });

  filtered.sort((a, b) => {
    if (a.date === b.date) return b.id - a.id;
    return b.date.localeCompare(a.date);
  });

  return filtered;
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

  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * pageSize;
  const currentRecords = filtered.slice(start, start + pageSize);

  if (currentRecords.length === 0) {
    list.innerHTML = `
      <li class="empty-box">
        目前沒有紀錄，先新增一筆收入或支出吧。
      </li>
    `;
  } else {
    list.innerHTML = currentRecords
      .map((record) => {
        const isIncome = record.type === "income";
        const typeText = isIncome ? "收入" : "支出";
        const sign = isIncome ? "+" : "-";
        const amountClass = isIncome ? "income" : "expense";
        const dotClass = isIncome ? "income" : "expense";
        const itemClass = isIncome ? "income" : "expense";

        return `
          <li class="record-item ${itemClass}">
            <div class="record-left">
              <div class="record-title">
                <span class="record-dot ${dotClass}"></span>
                <span>${typeText}｜${escapeHtml(record.category)}</span>
                <span class="record-amount ${amountClass}">
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
      })
      .join("");
  }

  bindRecordDeleteButtons();
  updatePagination(totalPages);
}

function bindRecordDeleteButtons() {
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.getAttribute("data-id"));
      deleteRecord(id);
    });
  });
}

function updatePagination(totalPages) {
  const pageInfo = document.getElementById("pageInfo");
  const prevBtn = document.getElementById("prevPageBtn");
  const nextBtn = document.getElementById("nextPageBtn");
  const paginationBox = document.getElementById("paginationBox");

  pageInfo.textContent = `第 ${currentPage} / ${totalPages} 頁`;

  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;

  const filtered = getFilteredRecords();
  paginationBox.style.display = filtered.length > pageSize ? "flex" : "none";
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

    if (!file.type.startsWith("image/")) {
      alert("請選擇圖片檔案");
      avatarInput.value = "";
      return;
    }

    resizeImage(file, 300, 300, function (imageData) {
      avatarPreview.src = imageData;
      avatarPreview.style.display = "block";
      avatarPlaceholder.style.display = "none";

      try {
        localStorage.setItem(AVATAR_KEY, imageData);
      } catch (error) {
        alert("圖片太大，請換一張較小的圖片");
      }

      avatarInput.value = "";
    });
  });
}

function resizeImage(file, maxWidth, maxHeight, callback) {
  const reader = new FileReader();

  reader.onload = function (event) {
    const img = new Image();

    img.onload = function () {
      let width = img.width;
      let height = img.height;

      const ratio = Math.min(maxWidth / width, maxHeight / height, 1);

      width = Math.round(width * ratio);
      height = Math.round(height * ratio);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      const imageData = canvas.toDataURL("image/jpeg", 0.8);
      callback(imageData);
    };

    img.src = event.target.result;
  };

  reader.readAsDataURL(file);
}

/* 發票載具 */
function loadCarrierData() {
  const savedCarrier = localStorage.getItem(CARRIER_KEY);
  const savedInvoices = localStorage.getItem(INVOICES_KEY);

  carrierData.carrierNumber = savedCarrier || "";
  carrierData.invoices = savedInvoices ? JSON.parse(savedInvoices) : [];

  const carrierInput = document.getElementById("carrierNumber");
  const currentCarrier = document.getElementById("currentCarrier");

  if (carrierInput) carrierInput.value = carrierData.carrierNumber;
  if (currentCarrier) currentCarrier.textContent = carrierData.carrierNumber || "尚未設定";
}

function saveCarrierData() {
  localStorage.setItem(CARRIER_KEY, carrierData.carrierNumber || "");
  localStorage.setItem(INVOICES_KEY, JSON.stringify(carrierData.invoices || []));
}

function saveCarrier() {
  const input = document.getElementById("carrierNumber");
  const value = input.value.trim();

  if (!value) {
    alert("請輸入載具號碼");
    return;
  }

  carrierData.carrierNumber = value;
  saveCarrierData();

  document.getElementById("currentCarrier").textContent = value;
  alert("載具已儲存");
}

/* QR 掃描 */
function startCarrierScan() {
  const scannerArea = document.getElementById("scannerArea");

  if (typeof Html5Qrcode === "undefined") {
    alert("QR Code 掃描套件尚未載入，請確認網路連線。");
    return;
  }

  scannerArea.style.display = "block";
  scannerArea.innerHTML = "";

  if (html5QrCode) {
    stopCarrierScan();
  }

  html5QrCode = new Html5Qrcode("scannerArea");

  html5QrCode.start(
    { facingMode: "environment" },
    {
      fps: 10,
      qrbox: {
        width: 250,
        height: 250
      }
    },
    function (decodedText) {
      handleInvoiceQrCode(decodedText, "相機掃描");
      stopCarrierScan();
    },
    function () {}
  ).catch(function (error) {
    console.log(error);
    alert("無法開啟相機，請確認已允許相機權限，並使用 HTTPS 網址。");
  });
}

function stopCarrierScan() {
  const scannerArea = document.getElementById("scannerArea");

  if (!scannerArea) return;

  if (html5QrCode) {
    html5QrCode.stop()
      .then(function () {
        html5QrCode.clear();
        html5QrCode = null;
        scannerArea.innerHTML = "";
        scannerArea.style.display = "none";
      })
      .catch(function () {
        html5QrCode = null;
        scannerArea.innerHTML = "";
        scannerArea.style.display = "none";
      });
  } else {
    scannerArea.innerHTML = "";
    scannerArea.style.display = "none";
  }
}

function uploadInvoiceImage(event) {
  const file = event.target.files[0];

  if (!file) return;

  if (typeof Html5Qrcode === "undefined") {
    alert("QR Code 掃描套件尚未載入，請確認網路連線。");
    event.target.value = "";
    return;
  }

  const scannerArea = document.getElementById("scannerArea");
  scannerArea.style.display = "block";

  const imageScanner = new Html5Qrcode("scannerArea");

  imageScanner.scanFile(file, true)
    .then(function (decodedText) {
      handleInvoiceQrCode(decodedText, "圖片上傳");

      imageScanner.clear();
      scannerArea.innerHTML = "";
      scannerArea.style.display = "none";
    })
    .catch(function () {
      alert("沒有辨識到 QR Code，請換一張清楚的發票圖片。");

      imageScanner.clear();
      scannerArea.innerHTML = "";
      scannerArea.style.display = "none";
    });

  event.target.value = "";
}

function handleInvoiceQrCode(rawCode, source) {
  const invoice = parseTaiwanInvoiceQr(rawCode, source);

  carrierData.invoices.unshift(invoice);
  saveCarrierData();
  renderInvoices();

  alert("發票 QR Code 已掃描，可點擊發票查看明細");
}

function parseTaiwanInvoiceQr(rawCode, source) {
  const raw = String(rawCode || "").trim();

  const invoice = {
    id: Date.now(),
    source,
    rawCode: raw,
    carrierNumber: carrierData.carrierNumber || "未設定載具",
    scanDate: new Date().toLocaleString("zh-TW"),
    invoiceNumber: "未辨識",
    invoiceDate: "未辨識",
    totalAmount: 0,
    randomCode: "",
    sellerId: "",
    items: [],
    expanded: false
  };

  const invoiceNumberMatch = raw.match(/[A-Z]{2}\d{8}/);

  if (invoiceNumberMatch) {
    invoice.invoiceNumber = invoiceNumberMatch[0];
  }

  if (raw.length >= 37 && /^[A-Z]{2}\d{8}/.test(raw)) {
    const dateCode = raw.substring(10, 17);
    const randomCode = raw.substring(17, 21);
    const totalAmountHex = raw.substring(29, 37);

    invoice.invoiceDate = convertRocDate(dateCode);
    invoice.randomCode = randomCode;

    const totalAmount = parseInt(totalAmountHex, 16);

    if (!Number.isNaN(totalAmount)) {
      invoice.totalAmount = totalAmount;
    }

    if (raw.length >= 53) {
      invoice.sellerId = raw.substring(45, 53);
    }
  }

  invoice.items = parseInvoiceItems(raw);

  return invoice;
}

function convertRocDate(code) {
  if (!/^\d{7}$/.test(code)) return "未辨識";

  const year = Number(code.substring(0, 3)) + 1911;
  const month = code.substring(3, 5);
  const day = code.substring(5, 7);

  return `${year}/${month}/${day}`;
}

function parseInvoiceItems(rawCode) {
  const raw = String(rawCode || "").trim();
  let text = raw;

  if (text.startsWith("**")) {
    text = text.substring(2);
  }

  const parts = text
    .split(":")
    .map((part) => part.trim())
    .filter((part) => part !== "");

  const items = [];

  if (parts.length >= 3) {
    for (let i = 0; i < parts.length; i += 3) {
      items.push({
        name: parts[i] || "未辨識品項",
        quantity: parts[i + 1] || "-",
        amount: parts[i + 2] || "-"
      });
    }
  }

  if (items.length === 0) {
    items.push({
      name: "QR Code 原始內容",
      quantity: "-",
      amount: raw
    });
  }

  return items;
}

function renderInvoices() {
  const list = document.getElementById("invoiceList");

  if (!list) return;

  if (!carrierData.invoices || carrierData.invoices.length === 0) {
    list.innerHTML = `
      <li class="empty-box">
        尚未掃描發票，可使用相機或上傳圖片。
      </li>
    `;
    return;
  }

  list.innerHTML = carrierData.invoices
    .map((invoice) => {
      const amountText = invoice.totalAmount > 0 ? formatMoney(invoice.totalAmount) : "未辨識";
      const detailDisplay = invoice.expanded ? "block" : "none";

      return `
        <li class="invoice-item">
          <div>
            <div class="invoice-main invoice-toggle" data-id="${invoice.id}">
              🧾 ${escapeHtml(invoice.invoiceNumber)}
            </div>

            <div class="invoice-sub">
              日期：${escapeHtml(invoice.invoiceDate)}<br>
              金額：${amountText}<br>
              載具：${escapeHtml(invoice.carrierNumber)}<br>
              點擊發票可展開明細
            </div>

            <div class="invoice-detail" style="display:${detailDisplay}">
              ${renderInvoiceDetail(invoice)}
            </div>
          </div>

          <button class="invoice-delete-btn" data-id="${invoice.id}">
            刪除
          </button>
        </li>
      `;
    })
    .join("");

  bindInvoiceButtons();
}

function renderInvoiceDetail(invoice) {
  const itemHtml = invoice.items
    .map((item, index) => {
      return `
        <div class="invoice-product">
          <strong>${index + 1}. ${escapeHtml(item.name)}</strong>
          <span>數量：${escapeHtml(item.quantity)}</span>
          <span>金額：${escapeHtml(item.amount)}</span>
        </div>
      `;
    })
    .join("");

  return `
    <div class="invoice-detail-box">
      <p><strong>發票號碼：</strong>${escapeHtml(invoice.invoiceNumber)}</p>
      <p><strong>發票日期：</strong>${escapeHtml(invoice.invoiceDate)}</p>
      <p><strong>發票金額：</strong>${invoice.totalAmount > 0 ? formatMoney(invoice.totalAmount) : "未辨識"}</p>
      <p><strong>隨機碼：</strong>${escapeHtml(invoice.randomCode || "未辨識")}</p>
      <p><strong>賣方統編：</strong>${escapeHtml(invoice.sellerId || "未辨識")}</p>

      <hr>

      <p><strong>購買品項：</strong></p>
      ${itemHtml}
    </div>
  `;
}

function bindInvoiceButtons() {
  document.querySelectorAll(".invoice-toggle").forEach((item) => {
    item.addEventListener("click", () => {
      const id = Number(item.getAttribute("data-id"));

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
      const id = Number(btn.getAttribute("data-id"));

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