console.log("script.js 已成功載入");

let records = JSON.parse(localStorage.getItem("records")) || [];

let goal = JSON.parse(localStorage.getItem("goal")) || {
  name: "",
  amount: 0
};

let carrierData = JSON.parse(localStorage.getItem("carrierData")) || {
  carrierNumber: "",
  invoices: []
};

let scannerStream = null;

document.addEventListener("DOMContentLoaded", function () {
  console.log("頁面已載入，開始綁定按鈕");

  const dateInput = document.getElementById("date");
  if (dateInput) {
    dateInput.value = new Date().toISOString().slice(0, 10);
  }

  bindButtons();
  updateScreen();
  initCarrierFeature();
});

function bindButtons() {
  const saveGoalBtn = document.getElementById("saveGoalBtn");
  const addRecordBtn = document.getElementById("addRecordBtn");
  const clearRecordsBtn = document.getElementById("clearRecordsBtn");
  const saveCarrierBtn = document.getElementById("saveCarrierBtn");
  const startScanBtn = document.getElementById("startScanBtn");
  const stopScanBtn = document.getElementById("stopScanBtn");
  const invoiceImage = document.getElementById("invoiceImage");

  if (saveGoalBtn) {
    saveGoalBtn.addEventListener("click", saveGoal);
  }

  if (addRecordBtn) {
    addRecordBtn.addEventListener("click", addRecord);
  }

  if (clearRecordsBtn) {
    clearRecordsBtn.addEventListener("click", clearAllRecords);
  }

  if (saveCarrierBtn) {
    saveCarrierBtn.addEventListener("click", saveCarrier);
  }

  if (startScanBtn) {
    startScanBtn.addEventListener("click", startCarrierScan);
  }

  if (stopScanBtn) {
    stopScanBtn.addEventListener("click", stopCarrierScan);
  }

  if (invoiceImage) {
    invoiceImage.addEventListener("change", uploadInvoiceImage);
  }

  console.log("按鈕已綁定完成");
}

function saveRecordsLocal() {
  localStorage.setItem("records", JSON.stringify(records));
}

function saveGoalData() {
  localStorage.setItem("goal", JSON.stringify(goal));
}

function saveCarrierData() {
  localStorage.setItem("carrierData", JSON.stringify(carrierData));
}

function formatMoney(number) {
  return "$" + Number(number || 0).toLocaleString("zh-TW");
}

function isIncomeType(type) {
  return type === "income";
}

function isExpenseType(type) {
  return type === "expense";
}

function addRecord() {
  console.log("新增紀錄按鈕被點擊");

  const type = document.getElementById("type").value;
  const category = document.getElementById("category").value;
  const amount = Number(document.getElementById("amount").value);
  const date = document.getElementById("date").value;
  const noteInput = document.getElementById("note");

  let note = noteInput.value.trim();

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
  noteInput.value = "";
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

  if (!recordList) return;

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

    const isIncome = record.type === "income";
    const typeText = isIncome ? "收入" : "支出";
    const typeIcon = isIncome ? "🟢" : "🔴";
    const symbol = isIncome ? "+" : "-";
    const moneyClass = isIncome ? "money-income" : "money-expense";

    li.className = "record-item " + record.type;

    li.innerHTML = `
      <div>
        <div class="record-main">
          ${typeIcon} ${typeText}｜${record.category}
          <span class="${moneyClass}">
            ${symbol}${formatMoney(record.amount)}
          </span>
        </div>

        <div class="record-sub">
          日期：${record.date}｜備註：${record.note}
        </div>
      </div>

      <button type="button" class="delete-btn" data-id="${record.id}">
        刪除
      </button>
    `;

    const deleteBtn = li.querySelector(".delete-btn");
    deleteBtn.addEventListener("click", function () {
      deleteRecord(record.id);
    });

    recordList.appendChild(li);
  });
}

function deleteRecord(id) {
  records = records.filter(function (record) {
    return String(record.id) !== String(id);
  });

  saveRecordsLocal();
  updateScreen();
}

function clearAllRecords() {
  console.log("清空按鈕被點擊");

  const result = confirm("確定要清空所有交易紀錄嗎？");

  if (!result) return;

  records = [];
  saveRecordsLocal();
  updateScreen();
}

function saveGoal() {
  console.log("儲存目標按鈕被點擊");

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

  if (!goalText || !progressPercent || !progressFill) return;

  const goalNameInput = document.getElementById("goalName");
  const goalAmountInput = document.getElementById("goalAmount");

  if (goalNameInput) goalNameInput.value = goal.name || "";
  if (goalAmountInput) goalAmountInput.value = goal.amount || "";

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
  console.log("儲存載具按鈕被點擊");

  const carrierInput = document.getElementById("carrierNumber");
  const currentCarrier = document.getElementById("currentCarrier");

  if (!carrierInput) {
    alert("找不到載具輸入欄位");
    return;
  }

  const value = carrierInput.value.trim();

  if (value === "") {
    alert("請輸入載具號碼");
    return;
  }

  carrierData.carrierNumber = value;
  saveCarrierData();

  if (currentCarrier) {
    currentCarrier.textContent = value;
  }

  alert("載具已儲存");
}

async function startCarrierScan() {
  console.log("開啟相機掃描按鈕被點擊");

  const video = document.getElementById("scannerVideo");

  if (!video) {
    alert("找不到掃描畫面");
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("你的瀏覽器不支援相機功能");
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

    alert("相機已開啟。若要真正辨識 QR Code，需要瀏覽器支援 BarcodeDetector。");
  } catch (error) {
    console.log(error);
    alert("無法開啟相機，請確認你有允許相機權限。");
  }
}

function stopCarrierScan() {
  console.log("停止掃描按鈕被點擊");

  const video = document.getElementById("scannerVideo");

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

  alert("已停止掃描");
}

function uploadInvoiceImage(event) {
  console.log("上傳發票圖片");

  const file = event.target.files[0];

  if (!file) return;

  const newInvoice = {
    id: Date.now(),
    code: file.name,
    source: "圖片上傳",
    carrierNumber: carrierData.carrierNumber || "未設定載具",
    date: new Date().toLocaleString("zh-TW")
  };

  carrierData.invoices.unshift(newInvoice);
  saveCarrierData();
  showInvoices();

  alert("圖片已上傳並記錄");
  event.target.value = "";
}

function showInvoices() {
  const invoiceList = document.getElementById("invoiceList");

  if (!invoiceList) return;

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
      <div>
        <div class="invoice-main">
          🧾 ${item.source}｜${item.code}
        </div>

        <div class="invoice-sub">
          載具：${item.carrierNumber}<br>
          時間：${item.date}
        </div>
      </div>

      <button type="button" class="invoice-delete-btn" data-id="${item.id}">
        刪除
      </button>
    `;

    const deleteBtn = li.querySelector(".invoice-delete-btn");
    deleteBtn.addEventListener("click", function () {
      deleteInvoice(item.id);
    });

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