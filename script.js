const GOOGLE_SCRIPT_URL = "
https://script.google.com/macros/s/AKfycbyNUMofDdzSe1hLdRqIbMCXCeRPgWCLfn002_agoek4dZxev3uKoTH7Ux-69LVIvVcjUw/exec";

// 交易紀錄：本機儲存，避免重新開網頁後消失
let records = JSON.parse(localStorage.getItem("records")) || [];

// 存錢目標
let goal = JSON.parse(localStorage.getItem("goal")) || {
  name: "",
  amount: 0
};

// 發票載具資料
let carrierData = JSON.parse(localStorage.getItem("carrierData")) || {
  carrierNumber: "",
  invoices: []
};

let scannerStream = null;
let scannerTimer = null;

window.onload = function () {
  const dateInput = document.getElementById("date");

  if (dateInput) {
    dateInput.value = new Date().toISOString().slice(0, 10);
  }

  updateScreen();
  loadRecords();
  initCarrierFeature();
};

/* =========================
   基本工具
========================= */

function formatMoney(number) {
  return "$" + Number(number || 0).toLocaleString("zh-TW");
}

function saveRecordsLocal() {
  localStorage.setItem("records", JSON.stringify(records));
}

function saveGoalData() {
  localStorage.setItem("goal", JSON.stringify(goal));
}

function isIncomeType(type) {
  return type === "income" || type === "收入";
}

function isExpenseType(type) {
  return type === "expense" || type === "支出";
}

/* =========================
   Google Sheet 同步
========================= */

function normalizeRecord(record) {
  return {
    id: record.id || record["id"] || "",
    type: record.type || record["type"] || record["類型"] || "",
    category: record.category || record["category"] || record["分類"] || "未分類",
    amount: Number(record.amount || record["amount"] || record["金額"] || 0),
    date: record.date || record["date"] || record["日期"] || "未填寫日期",
    note: record.note || record["note"] || record["備註"] || "未填寫備註"
  };
}

async function loadRecords() {
  if (
    GOOGLE_SCRIPT_URL === "請把這裡換成你的 Apps Script Web App 網址" ||
    GOOGLE_SCRIPT_URL.trim() === ""
  ) {
    console.log("尚未設定 Google Script URL，目前只使用本機儲存。");
    updateScreen();
    return;
  }

  try {
    console.log("開始讀取 Google Sheet");

    const response = await fetch(GOOGLE_SCRIPT_URL);
    const data = await response.json();

    console.log("Google Sheet 回傳資料：", data);

    if (!Array.isArray(data)) {
      console.log("Google Sheet 回傳不是陣列，保留本機資料。");
      updateScreen();
      return;
    }

    const sheetRecords = data
      .map(function (record) {
        return normalizeRecord(record);
      })
      .filter(function (record) {
        return (
          record.id !== "" &&
          record.amount > 0 &&
          (isIncomeType(record.type) || isExpenseType(record.type))
        );
      })
      .reverse();

    if (sheetRecords.length > 0) {
      records = sheetRecords;
      saveRecordsLocal();
      updateScreen();
    } else {
      console.log("Google Sheet 沒有資料，保留 localStorage 資料。");
      updateScreen();
    }
  } catch (error) {
    console.log("讀取 Google Sheet 失敗，保留本機資料：", error);
    updateScreen();
  }
}

async function sendToGoogleSheet(data) {
  if (
    GOOGLE_SCRIPT_URL === "請把這裡換成你的 Apps Script Web App 網址" ||
    GOOGLE_SCRIPT_URL.trim() === ""
  ) {
    console.log("尚未設定 Google Script URL，只儲存在本機。");
    return;
  }

  try {
    console.log("送出資料到 Google Sheet：", data);

    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify(data)
    });

    console.log("已送出到 Google Sheet");
  } catch (error) {
    console.log("同步到 Google Sheet 失敗：", error);
  }
}

/* =========================
   記帳功能
========================= */

async function addRecord() {
  const type = document.getElementById("type").value;
  const category = document.getElementById("category").value;
  const amount = Number(document.getElementById("amount").value);
  const date = document.getElementById("date").value;
  let note = document.getElementById("note").value.trim();

  if (!amount || amount <= 0) {
    alert("請輸入正確的金額");
    return;
  }

  if (!date) {
    alert("請選擇日期");
    return;
  }

  if (note === "") {
    note = "未填寫備註";
  }

  const newRecord = {
    id: Date.now(),
    type: type,
    category: category,
    amount: amount,
    date: date,
    note: note
  };

  records.unshift(newRecord);
  saveRecordsLocal();
  updateScreen();

  document.getElementById("amount").value = "";
  document.getElementById("note").value = "";

  await sendToGoogleSheet({
    action: "add",
    ...newRecord
  });
}

function updateScreen() {
  let totalIncome = 0;
  let totalExpense = 0;

  records.forEach(function (record) {
    if (isIncomeType(record.type)) {
      totalIncome += Number(record.amount);
    }

    if (isExpenseType(record.type)) {
      totalExpense += Number(record.amount);
    }
  });

  const balance = totalIncome - totalExpense;

  const totalIncomeEl = document.getElementById("totalIncome");
  const totalExpenseEl = document.getElementById("totalExpense");
  const balanceEl = document.getElementById("balance");

  if (totalIncomeEl) totalIncomeEl.textContent = formatMoney(totalIncome);
  if (totalExpenseEl) totalExpenseEl.textContent = formatMoney(totalExpense);
  if (balanceEl) balanceEl.textContent = formatMoney(balance);

  updateGoalProgress(balance);
  showRecords();
}

function showRecords() {
  const recordList = document.getElementById("recordList");

  if (!recordList) {
    return;
  }

  recordList.innerHTML = "";

  if (records.length === 0) {
    recordList.innerHTML = `
      <div class="empty">
        目前沒有紀錄，先新增一筆收入或支出吧。
      </div>
    `;
    return;
  }

  records.forEach(function (record) {
    const li = document.createElement("li");

    const isIncome = isIncomeType(record.type);
    const typeText = isIncome ? "收入" : "支出";
    const typeIcon = isIncome ? "🟢" : "🔴";
    const symbol = isIncome ? "+" : "-";
    const moneyClass = isIncome ? "money-income" : "money-expense";

    const category = record.category || "未分類";
    const amount = Number(record.amount || 0);
    const date = record.date || "未填寫日期";
    const note = record.note || "未填寫備註";

    li.className = "record-item " + (isIncome ? "income" : "expense");

    li.innerHTML = `
      <div>
        <div class="record-main">
          ${typeIcon} ${typeText}｜${category}
          <span class="${moneyClass}">
            ${symbol}${formatMoney(amount)}
          </span>
        </div>

        <div class="record-sub">
          日期：${date}｜備註：${note}
        </div>
      </div>

      <button class="delete-btn" onclick="deleteRecord(${record.id})">
        刪除
      </button>
    `;

    recordList.appendChild(li);
  });
}

async function deleteRecord(id) {
  records = records.filter(function (record) {
    return String(record.id) !== String(id);
  });

  saveRecordsLocal();
  updateScreen();

  await sendToGoogleSheet({
    action: "delete",
    id: id
  });
}

async function clearAllRecords() {
  const result = confirm("確定要清空所有交易紀錄嗎？");

  if (result === true) {
    records = [];
    saveRecordsLocal();
    updateScreen();

    await sendToGoogleSheet({
      action: "clear"
    });
  }
}

/* =========================
   存錢目標
========================= */

function saveGoal() {
  const goalName = document.getElementById("goalName").value.trim();
  const goalAmount = Number(document.getElementById("goalAmount").value);

  if (goalName === "") {
    alert("請輸入目標名稱");
    return;
  }

  if (!goalAmount || goalAmount <= 0) {
    alert("請輸入正確的目標金額");
    return;
  }

  goal = {
    name: goalName,
    amount: goalAmount
  };

  saveGoalData();
  updateScreen();

  alert("存錢目標已儲存");
}

function updateGoalProgress(balance) {
  const goalText = document.getElementById("goalText");
  const progressPercent = document.getElementById("progressPercent");
  const progressFill = document.getElementById("progressFill");

  if (!goalText || !progressPercent || !progressFill) {
    return;
  }

  const goalNameInput = document.getElementById("goalName");
  const goalAmountInput = document.getElementById("goalAmount");

  if (goalNameInput) {
    goalNameInput.value = goal.name || "";
  }

  if (goalAmountInput) {
    goalAmountInput.value = goal.amount || "";
  }

  if (!goal.name || !goal.amount) {
    goalText.textContent = "尚未設定目標";
    progressPercent.textContent = "0%";
    progressFill.style.width = "0%";
    return;
  }

  let percent = Math.floor((balance / goal.amount) * 100);

  if (percent < 0) percent = 0;
  if (percent > 100) percent = 100;

  goalText.textContent =
    goal.name + "：" + formatMoney(balance) + " / " + formatMoney(goal.amount);

  progressPercent.textContent = percent + "%";
  progressFill.style.width = percent + "%";
}

/* =========================
   發票載具功能
========================= */

function saveCarrierData() {
  localStorage.setItem("carrierData", JSON.stringify(carrierData));
}

function initCarrierFeature() {
  const carrierInput = document.getElementById("carrierNumber");
  const currentCarrier = document.getElementById("currentCarrier");

  if (carrierInput) {
    carrierInput.value = carrierData.carrierNumber || "";
  }

  if (currentCarrier) {
    currentCarrier.textContent = carrierData.carrierNumber || "尚未設定";
  }

  showInvoices();
}

function saveCarrier() {
  const carrierInput = document.getElementById("carrierNumber");

  if (!carrierInput) {
    return;
  }

  const value = carrierInput.value.trim();

  if (value === "") {
    alert("請輸入載具號碼");
    return;
  }

  carrierData.carrierNumber = value;
  saveCarrierData();
  initCarrierFeature();

  alert("載具已儲存");
}

async function startCarrierScan() {
  const video = document.getElementById("scannerVideo");

  if (!video) {
    alert("找不到掃描器畫面");
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("你的瀏覽器不支援相機功能。");
    return;
  }

  if (!("BarcodeDetector" in window)) {
    alert("你的瀏覽器不支援直接掃描，請改用上傳圖片或手動輸入。");
    return;
  }

  try {
    scannerStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment"
      }
    });

    video.srcObject = scannerStream;
    video.style.display = "block";

    const detector = new BarcodeDetector({
      formats: [
        "qr_code",
        "code_128",
        "code_39",
        "ean_13",
        "ean_8"
      ]
    });

    scannerTimer = setInterval(async function () {
      try {
        const codes = await detector.detect(video);

        if (codes.length > 0) {
          const result = codes[0].rawValue;
          addInvoiceRecord(result, "相機掃描");
          stopCarrierScan();
          alert("掃描成功");
        }
      } catch (error) {
        console.log("掃描中：", error);
      }
    }, 800);
  } catch (error) {
    console.log(error);
    alert("無法開啟相機，請確認瀏覽器是否允許相機權限。");
  }
}

function stopCarrierScan() {
  const video = document.getElementById("scannerVideo");

  if (scannerTimer) {
    clearInterval(scannerTimer);
    scannerTimer = null;
  }

  if (scannerStream) {
    scannerStream.getTracks().forEach(function (track) {
      track.stop();
    });
    scannerStream = null;
  }

  if (video) {
    video.srcObject = null;
    video.style.display = "none";
  }
}

async function uploadInvoiceImage(event) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  if (!("BarcodeDetector" in window)) {
    alert("你的瀏覽器不支援圖片掃描，請改用相機掃描或手動輸入。");
    event.target.value = "";
    return;
  }

  try {
    const imageBitmap = await createImageBitmap(file);

    const detector = new BarcodeDetector({
      formats: [
        "qr_code",
        "code_128",
        "code_39",
        "ean_13",
        "ean_8"
      ]
    });

    const codes = await detector.detect(imageBitmap);

    if (codes.length === 0) {
      alert("沒有偵測到 QR Code 或條碼，請換一張清楚的圖片。");
      event.target.value = "";
      return;
    }

    const result = codes[0].rawValue;
    addInvoiceRecord(result, "圖片上傳");

    alert("上傳掃描成功");
  } catch (error) {
    console.log(error);
    alert("圖片掃描失敗，請改用更清楚的圖片。");
  }

  event.target.value = "";
}

function addInvoiceRecord(code, source) {
  const newInvoice = {
    id: Date.now(),
    code: code,
    source: source,
    carrierNumber: carrierData.carrierNumber || "未設定載具",
    date: new Date().toLocaleString("zh-TW")
  };

  carrierData.invoices.unshift(newInvoice);
  saveCarrierData();
  showInvoices();
}

function showInvoices() {
  const invoiceList = document.getElementById("invoiceList");

  if (!invoiceList) {
    return;
  }

  invoiceList.innerHTML = "";

  if (carrierData.invoices.length === 0) {
    invoiceList.innerHTML = `
      <div class="empty">
        尚未掃描發票，可使用相機或上傳圖片。
      </div>
    `;
    return;
  }

  carrierData.invoices.forEach(function (item) {
    const li = document.createElement("li");

    li.className = "invoice-item";

    li.innerHTML = `
      <div class="invoice-main">
        🧾 ${item.source}｜${item.code}
      </div>

      <div class="invoice-sub">
        載具：${item.carrierNumber}<br>
        時間：${item.date}
      </div>

      <button class="invoice-delete-btn" onclick="deleteInvoice(${item.id})">
        刪除
      </button>
    `;

    invoiceList.appendChild(li);
  });
}

function deleteInvoice(id) {
  carrierData.invoices = carrierData.invoices.filter(function (item) {
    return String(item.id) !== String(id);
  });

  saveCarrierData();
  showInvoices();
}