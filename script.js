const RECORDS_KEY = "cuteMoneyRecords";
const GOAL_KEY = "cuteMoneyGoal";
const AVATAR_KEY = "cuteMoneyAvatar";

let records = [];
let currentPage = 1;
const pageSize = 10;

const incomeCategories = ["薪水", "打工收入", "獎金", "紅包", "投資", "其他收入"];
const expenseCategories = ["餐飲", "飲料", "交通", "購物", "娛樂", "生活", "房租", "醫療", "學費", "其他支出"];

document.addEventListener("DOMContentLoaded", () => {
  initDefaultDate();
  loadRecords();
  loadGoal();
  initCategoryOptions();
  initAvatarUpload();
  bindEvents();
  updateScreen();
});

function bindEvents() {
  document.getElementById("type").addEventListener("change", () => {
    initCategoryOptions();
  });

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
}

function initDefaultDate() {
  const today = new Date();
  const dateInput = document.getElementById("date");
  const monthFilter = document.getElementById("monthFilter");

  if (dateInput) {
    dateInput.value = toDateString(today);
  }

  if (monthFilter) {
    monthFilter.value = toMonthString(today);
  }
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

function saveRecords() {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

function loadRecords() {
  const saved = localStorage.getItem(RECORDS_KEY);
  records = saved ? JSON.parse(saved) : [];
}

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
  saveRecords();
  currentPage = 1;
  updateScreen();
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

  const balance = totalIncome - totalExpense;

  return { totalIncome, totalExpense, balance };
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
                <span class="record-amount ${amountClass}">${sign}${formatMoney(record.amount)}</span>
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

  bindDeleteButtons();
  updatePagination(totalPages);
}

function bindDeleteButtons() {
  const buttons = document.querySelectorAll(".delete-btn");
  buttons.forEach((btn) => {
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

  prevBtn.style.opacity = currentPage <= 1 ? "0.5" : "1";
  nextBtn.style.opacity = currentPage >= totalPages ? "0.5" : "1";

  const filtered = getFilteredRecords();
  paginationBox.style.display = filtered.length > pageSize ? "flex" : "none";
}

function initAvatarUpload() {
  const avatarInput = document.getElementById("avatarInput");
  const avatarPreview = document.getElementById("avatarPreview");
  const avatarPlaceholder = document.getElementById("avatarPlaceholder");

  const savedAvatar = localStorage.getItem(AVATAR_KEY);

  if (savedAvatar) {
    avatarPreview.src = savedAvatar;
    avatarPreview.style.display = "block";
    avatarPlaceholder.style.display = "none";
  }

  avatarInput.addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      const imageData = e.target.result;
      avatarPreview.src = imageData;
      avatarPreview.style.display = "block";
      avatarPlaceholder.style.display = "none";
      localStorage.setItem(AVATAR_KEY, imageData);
    };
    reader.readAsDataURL(file);
  });
}

function updateScreen() {
  updateSummaryCards();
  updateGoalUI();
  renderRecords();
}