const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyNUMofDdzSe1hLdRqIbMCXCeRPgWCLfn002_agoek4dZxev3uKoTH7Ux-69LVIvVcjUw/exec";

let records = [];

let goal = JSON.parse(localStorage.getItem("goal")) || {
  name: "",
  amount: 0
};

window.onload = function () {
  const dateInput = document.getElementById("date");

  if (dateInput) {
    dateInput.value = new Date().toISOString().slice(0, 10);
  }

  loadRecords();
};

function saveGoalData() {
  localStorage.setItem("goal", JSON.stringify(goal));
}

function formatMoney(number) {
  return "$" + Number(number || 0).toLocaleString("zh-TW");
}

function isIncomeType(type) {
  return type === "income" || type === "收入";
}

function isExpenseType(type) {
  return type === "expense" || type === "支出";
}

function normalizeRecord(record) {
  return {
    id: record.id || Date.now(),
    type: record.type || record["類型"] || "",
    category: record.category || record["分類"] || "未分類",
    amount: Number(record.amount || record["金額"] || 0),
    date: record.date || record["日期"] || "未填寫日期",
    note: record.note || record["備註"] || "未填寫備註"
  };
}

async function loadRecords() {
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL);
    const data = await response.json();

    records = data
      .map(function (record) {
        return normalizeRecord(record);
      })
      .filter(function (record) {
        return record.id && record.amount >= 0;
      });

    records.reverse();
    updateScreen();
  } catch (error) {
    console.log("讀取失敗：", error);
    alert("讀取 Google Sheet 失敗，請檢查 Apps Script 網址或部署設定。");
  }
}

async function sendToGoogleSheet(data) {
  try {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify(data)
    });
  } catch (error) {
    console.log("同步失敗：", error);
    alert("同步到 Google Sheet 失敗。");
  }
}

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
  updateScreen();

  document.getElementById("amount").value = "";
  document.getElementById("note").value = "";

  await sendToGoogleSheet({
    action: "add",
    ...newRecord
  });

  await loadRecords();
}

function updateScreen() {
  let totalIncome = 0;
  let totalExpense = 0;

  records.forEach(function (record) {
    if (isIncomeType(record.type)) {
      totalIncome += Number(record.amount);
    } else if (isExpenseType(record.type)) {
      totalExpense += Number(record.amount);
    }
  });

  const balance = totalIncome - totalExpense;

  document.getElementById("totalIncome").textContent = formatMoney(totalIncome);
  document.getElementById("totalExpense").textContent = formatMoney(totalExpense);
  document.getElementById("balance").textContent = formatMoney(balance);

  updateGoalProgress(balance);
  showRecords();
}

function showRecords() {
  const recordList = document.getElementById("recordList");
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
    const note = record.note || "未填寫備註";
    const date = record.date || "未填寫日期";

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

  updateScreen();

  await sendToGoogleSheet({
    action: "delete",
    id: id
  });

  await loadRecords();
}

async function clearAllRecords() {
  const result = confirm("確定要清空所有交易紀錄嗎？");

  if (result === true) {
    records = [];
    updateScreen();

    await sendToGoogleSheet({
      action: "clear"
    });

    await loadRecords();
  }
}

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

  document.getElementById("goalName").value = goal.name || "";
  document.getElementById("goalAmount").value = goal.amount || "";

  if (!goal.name || !goal.amount) {
    goalText.textContent = "尚未設定目標";
    progressPercent.textContent = "0%";
    progressFill.style.width = "0%";
    return;
  }

  let percent = Math.floor((balance / goal.amount) * 100);

  if (percent < 0) {
    percent = 0;
  }

  if (percent > 100) {
    percent = 100;
  }

  goalText.textContent =
    goal.name + "：" + formatMoney(balance) + " / " + formatMoney(goal.amount);

  progressPercent.textContent = percent + "%";
  progressFill.style.width = percent + "%";
}