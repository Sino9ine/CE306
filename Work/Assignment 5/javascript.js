
const COIN_ICON = `<span class="coin-icon" aria-hidden="true"><svg viewBox="0 0 24 24" role="img"><circle cx="12" cy="12" r="9" fill="#FBBF24" stroke="#B45309" stroke-width="1.5"/><circle cx="12" cy="12" r="6" fill="none" stroke="#F59E0B" stroke-width="1.5"/><path d="M12 7v10M9.5 9.5c.5-1 4-1 4.5.5.5 1.5-4 1-4 2.5s4 1 4.5-.5" fill="none" stroke="#92400E" stroke-width="1.4" stroke-linecap="round"/></svg></span>`;

const CROPS = {
  carrot: {
    name: "แครอท",
    emoji: "🥕",
    price: 10,
    reward: 25,
    growTime: 15
  },
  corn: {
    name: "ข้าวโพด",
    emoji: "🌽",
    price: 20,
    reward: 45,
    growTime: 25
  },
  lettuce: {
    name: "ผักกาด",
    emoji: "🥬",
    price: 30,
    reward: 70,
    growTime: 35
  },
  tomato: {
    name: "มะเขือเทศ",
    emoji: "🍅",
    price: 40,
    reward: 100,
    growTime: 45
  },
  strawberry: {
    name: "สตรอว์เบอร์รี",
    emoji: "🍓",
    price: 60,
    reward: 150,
    growTime: 60
  }
};

const LEVELS = {
  1: { plots: 4, goal: 5, time: 180, label: "ง่าย" },
  2: { plots: 9, goal: 10, time: 150, label: "ปานกลาง" },
  3: { plots: 16, goal: 15, time: 120, label: "ยาก" }
};

const STORAGE_KEY = "farmRelaxSaveV2";
const THEME_KEY = "farmRelaxTheme";

let state = {
  coins: 100,
  harvestCount: 0,
  selectedSeed: "carrot",
  currentLevel: 1,
  inventory: {
    carrot: 3,
    corn: 2,
    lettuce: 1,
    tomato: 0,
    strawberry: 0
  },
  plots: [],
  selectedPlot: null,
  gameOver: false,
  startTime: Date.now(),
  remainingSeconds: LEVELS[1].time
};

let timerInterval = null;
let growthInterval = null;

const $ = (id) => document.getElementById(id);

function saveGame() {
  const data = {
    coins: state.coins,
    harvestCount: state.harvestCount,
    selectedSeed: state.selectedSeed,
    currentLevel: state.currentLevel,
    inventory: state.inventory
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadGame() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return;

    state.coins = Number.isFinite(saved.coins) ? saved.coins : 100;
    state.harvestCount = Number.isFinite(saved.harvestCount) ? saved.harvestCount : 0;
    state.selectedSeed = CROPS[saved.selectedSeed] ? saved.selectedSeed : "carrot";
    state.currentLevel = LEVELS[saved.currentLevel] ? saved.currentLevel : 1;
    state.inventory = { ...state.inventory, ...(saved.inventory || {}) };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function createPlots() {
  state.plots = Array.from({ length: LEVELS[state.currentLevel].plots }, () => ({
    crop: null,
    plantedAt: null,
    waterBoost: 1,
    ready: false
  }));
  state.selectedPlot = null;
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = Math.max(0, seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function setStatus(message, type = "normal") {
  const status = $("status");
  status.textContent = message;

  status.className =
    "mt-4 rounded-xl px-4 py-3 text-sm font-semibold";

  if (type === "success") {
    status.classList.add("bg-green-100", "text-green-900", "dark:bg-green-950", "dark:text-green-200");
  } else if (type === "error") {
    status.classList.add("bg-red-100", "text-red-900", "dark:bg-red-950", "dark:text-red-200");
  } else if (type === "warning") {
    status.classList.add("bg-amber-100", "text-amber-900", "dark:bg-amber-950", "dark:text-amber-200");
  } else {
    status.classList.add("bg-green-100", "text-green-900", "dark:bg-green-950", "dark:text-green-200");
  }
}

function updateStats() {
  const level = LEVELS[state.currentLevel];

  $("coins").innerHTML = `${state.coins} ${COIN_ICON}`;
  $("harvestCount").textContent = `${state.harvestCount}`;
  $("goalText").textContent = `${level.goal}`;
  $("levelText").textContent =
    `Level ${state.currentLevel} · ${level.label} · ${level.plots} แปลง`;
  $("timer").textContent = formatTime(state.remainingSeconds);

  $("selectedSeedText").textContent =
    `${CROPS[state.selectedSeed].emoji} ${CROPS[state.selectedSeed].name}`;

  document.querySelectorAll(".level-button").forEach((button) => {
    const active = Number(button.dataset.level) === state.currentLevel;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function cropProgress(plot) {
  if (!plot.crop || !plot.plantedAt) return 0;

  const crop = CROPS[plot.crop];
  const elapsed = (Date.now() - plot.plantedAt) / 1000;
  const effectiveTime = crop.growTime / plot.waterBoost;

  return Math.min(100, (elapsed / effectiveTime) * 100);
}

function isReady(plot) {
  return plot.crop && cropProgress(plot) >= 100;
}

function renderFarm() {
  const farm = $("farmGrid");
  farm.className = `farm-grid level-${state.currentLevel}`;
  farm.innerHTML = "";

  state.plots.forEach((plot, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "soil-plot";
    button.setAttribute("aria-label", `แปลงที่ ${index + 1}`);
    button.dataset.index = index;

    if (state.selectedPlot === index) {
      button.classList.add("selected");
    }

    if (!plot.crop) {
      button.classList.add("empty");
      button.innerHTML = `
        <div class="text-center">
          <div class="text-4xl">🟫</div>
          <div class="mt-2 text-sm font-bold">แปลงว่าง</div>
        </div>
      `;
    } else {
      const crop = CROPS[plot.crop];
      const progress = cropProgress(plot);
      const ready = isReady(plot);

      if (ready) button.classList.add("ready-pulse");

      button.innerHTML = `
        <div class="flex h-full flex-col justify-between text-left">
          <div class="text-center">
            <div class="crop-emoji">${crop.emoji}</div>
            <div class="mt-2 font-extrabold">${crop.name}</div>
          </div>

          <div>
            <div class="flex items-center justify-between text-xs font-bold">
              <span>${ready ? "พร้อมเก็บ!" : "กำลังโต"}</span>
              <span>${Math.round(progress)}%</span>
            </div>
            <div class="growth-track mt-1">
              <div class="growth-fill" style="width: ${progress}%"></div>
            </div>
          </div>
        </div>
      `;
    }

    button.addEventListener("click", () => {
      state.selectedPlot = index;
      renderFarm();

      if (!plot.crop) {
        setStatus(`เลือกแปลงที่ ${index + 1} แล้ว กด "ปลูก" ได้เลย 🌱`);
      } else if (isReady(plot)) {
        setStatus(`ผักในแปลงที่ ${index + 1} พร้อมเก็บเกี่ยวแล้ว! 🧺`, "success");
      } else {
        setStatus(`เลือกแปลงที่ ${index + 1} แล้ว รอให้ผักโตต่อไป 🌱`);
      }
    });

    farm.appendChild(button);
  });
}

function renderSeeds() {
  const list = $("seedList");
  list.innerHTML = "";

  Object.entries(CROPS).forEach(([key, crop], index) => {
    const item = document.createElement("div");
    item.className = `seed-item ${state.selectedSeed === key ? "selected" : ""}`;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "seed-select";
    button.disabled = state.inventory[key] <= 0;
    button.innerHTML = `
      <span>${index + 1}. ${crop.emoji} ${crop.name}</span>
      <span class="ml-2 text-xs text-slate-500 dark:text-slate-400">x${state.inventory[key]}</span>
    `;

    button.addEventListener("click", () => selectSeed(key));
    item.appendChild(button);
    list.appendChild(item);
  });
}

function renderShop() {
  const list = $("shopList");
  list.innerHTML = "";

  Object.entries(CROPS).forEach(([key, crop]) => {
    const item = document.createElement("div");
    item.className = "shop-item";

    const info = document.createElement("div");
    info.className = "min-w-0";
    info.innerHTML = `
      <div class="font-bold">${crop.emoji} ${crop.name}</div>
      <div class="text-xs text-slate-500 dark:text-slate-400">${crop.price} ${COIN_ICON} / เมล็ด</div>
    `;

    const buy = document.createElement("button");
    buy.type = "button";
    buy.className = "buy-button";
    buy.textContent = "ซื้อ";
    buy.disabled = state.coins < crop.price;
    buy.addEventListener("click", () => buySeed(key));

    item.append(info, buy);
    list.appendChild(item);
  });
}

function selectSeed(key) {
  if (!CROPS[key]) return;

  if (state.inventory[key] <= 0) {
    setStatus(`เมล็ด${CROPS[key].name}หมดแล้ว ให้ซื้อเพิ่มจากร้านค้า`, "warning");
    return;
  }

  state.selectedSeed = key;
  renderSeeds();
  updateStats();
  setStatus(`เลือก ${CROPS[key].emoji} ${CROPS[key].name} แล้ว 🌱`);
}

function buySeed(key) {
  const crop = CROPS[key];

  if (state.coins < crop.price) {
    setStatus("เหรียญไม่พอสำหรับซื้อเมล็ดนี้", "error");
    return;
  }

  state.coins -= crop.price;
  state.inventory[key] += 1;

  saveGame();
  renderSeeds();
  renderShop();
  updateStats();

  setStatus(`ซื้อเมล็ด${crop.name}สำเร็จ!`, "success");
}

function plant() {
  if (state.gameOver) return;

  if (state.selectedPlot === null) {
    setStatus("กรุณาเลือกแปลงก่อนปลูก", "warning");
    return;
  }

  const plot = state.plots[state.selectedPlot];

  if (plot.crop) {
    setStatus("แปลงนี้มีผักอยู่แล้ว", "warning");
    return;
  }

  if (state.inventory[state.selectedSeed] <= 0) {
    setStatus("เมล็ดที่เลือกหมดแล้ว กรุณาซื้อเพิ่ม", "warning");
    return;
  }

  state.inventory[state.selectedSeed] -= 1;
  plot.crop = state.selectedSeed;
  plot.plantedAt = Date.now();
  plot.waterBoost = 1;
  plot.ready = false;

  saveGame();
  renderSeeds();
  renderFarm();

  setStatus(`ปลูก${CROPS[state.selectedSeed].name}สำเร็จ! 💧 รดน้ำเพื่อให้โตเร็วขึ้น`, "success");
}

function water() {
  if (state.gameOver) return;

  if (state.selectedPlot === null) {
    setStatus("กรุณาเลือกแปลงก่อนรดน้ำ", "warning");
    return;
  }

  const plot = state.plots[state.selectedPlot];

  if (!plot.crop) {
    setStatus("แปลงนี้ยังไม่มีผักให้รดน้ำ", "warning");
    return;
  }

  if (isReady(plot)) {
    setStatus("ผักพร้อมเก็บแล้ว ไม่ต้องรดน้ำเพิ่ม 🧺", "success");
    return;
  }

  plot.waterBoost = Math.min(2, plot.waterBoost + 0.5);
  renderFarm();

  setStatus("รดน้ำแล้ว! ผักจะโตเร็วขึ้น 💧", "success");
}

function harvest() {
  if (state.gameOver) return;

  if (state.selectedPlot === null) {
    setStatus("กรุณาเลือกแปลงก่อนเก็บเกี่ยว", "warning");
    return;
  }

  const plot = state.plots[state.selectedPlot];

  if (!plot.crop) {
    setStatus("แปลงนี้ยังไม่มีผัก", "warning");
    return;
  }

  if (!isReady(plot)) {
    setStatus("ผักยังโตไม่เต็มที่ รออีกนิดนะ 🌱", "warning");
    return;
  }

  const crop = CROPS[plot.crop];

  state.coins += crop.reward;
  state.harvestCount += 1;

  plot.crop = null;
  plot.plantedAt = null;
  plot.waterBoost = 1;
  plot.ready = false;

  saveGame();
  renderFarm();
  renderSeeds();
  renderShop();
  updateStats();

  if (state.harvestCount >= LEVELS[state.currentLevel].goal) {
    winGame();
    return;
  }

  setStatus(`เก็บ${crop.name}สำเร็จ! +${crop.reward} ${COIN_ICON} 🧺`, "success");
}

function winGame() {
  state.gameOver = true;
  stopTimers();

  $("resultEmoji").textContent = "🎉";
  $("resultTitle").textContent = `ชนะ Level ${state.currentLevel}!`;
  $("resultMessage").textContent =
    `คุณเก็บเกี่ยวครบ ${LEVELS[state.currentLevel].goal} ครั้งแล้ว เหรียญทั้งหมด ${state.coins} ${COIN_ICON}`;
  $("resultModal").classList.remove("hidden");

  setStatus("ชนะแล้ว! ทำเป้าหมายของ Level สำเร็จ 🎉", "success");
}

function loseGame() {
  state.gameOver = true;
  stopTimers();

  $("resultEmoji").textContent = "⏰";
  $("resultTitle").textContent = `หมดเวลา Level ${state.currentLevel}`;
  $("resultMessage").textContent =
    `คุณเก็บเกี่ยวได้ ${state.harvestCount}/${LEVELS[state.currentLevel].goal} ครั้ง ลองใหม่อีกครั้งนะ`;
  $("resultModal").classList.remove("hidden");

  setStatus("หมดเวลา! ยังทำเป้าหมายไม่สำเร็จ ลองใหม่อีกครั้ง", "error");
}

function updateTimer() {
  if (state.gameOver) return;

  const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
  state.remainingSeconds = Math.max(0, LEVELS[state.currentLevel].time - elapsed);

  updateStats();

  if (state.remainingSeconds <= 0) {
    loseGame();
  }
}

function startTimers() {
  stopTimers();

  timerInterval = setInterval(updateTimer, 1000);
  growthInterval = setInterval(() => {
    if (!state.gameOver) renderFarm();
  }, 500);
}

function stopTimers() {
  clearInterval(timerInterval);
  clearInterval(growthInterval);
  timerInterval = null;
  growthInterval = null;
}

function changeLevel(level) {
  const newLevel = Number(level);
  if (!LEVELS[newLevel]) return;

  state.currentLevel = newLevel;
  state.harvestCount = 0;
  state.gameOver = false;
  state.startTime = Date.now();
  state.remainingSeconds = LEVELS[newLevel].time;

  createPlots();
  renderAll();
  startTimers();

  setStatus(`เริ่ม Level ${newLevel} · ${LEVELS[newLevel].label} แล้ว! เป้าหมาย ${LEVELS[newLevel].goal} ครั้ง 🌱`);
}

function newGame() {
  const confirmed = confirm("ต้องการเริ่มเกมใหม่ใช่ไหม? ความคืบหน้าของเกมปัจจุบันจะถูกรีเซ็ต");
  if (!confirmed) return;

  state.coins = 100;
  state.harvestCount = 0;
  state.selectedSeed = "carrot";
  state.currentLevel = 1;
  state.inventory = {
    carrot: 3,
    corn: 2,
    lettuce: 1,
    tomato: 0,
    strawberry: 0
  };
  state.gameOver = false;
  state.startTime = Date.now();
  state.remainingSeconds = LEVELS[1].time;

  localStorage.removeItem(STORAGE_KEY);
  createPlots();
  renderAll();
  startTimers();

  $("resultModal").classList.add("hidden");
  setStatus("เริ่มเกมใหม่แล้ว! มาปลูกผักกัน 🌱", "success");
}

function renderAll() {
  renderFarm();
  renderSeeds();
  renderShop();
  updateStats();
}

function openRules() {
  $("rulesModal").classList.remove("hidden");
}

function closeRules() {
  $("rulesModal").classList.add("hidden");
}

function applyTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  $("themeButton").textContent = theme === "dark" ? "☀️ โหมดสว่าง" : "🌙 โหมดมืด";
  localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains("dark");
  applyTheme(isDark ? "light" : "dark");
}

function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  const preferredDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(savedTheme || (preferredDark ? "dark" : "light"));
}

function handleKeyboard(event) {
  const tag = document.activeElement?.tagName;
  const typing = tag === "INPUT" || tag === "TEXTAREA";

  if (typing) return;

  if (event.key >= "1" && event.key <= "5") {
    const keys = Object.keys(CROPS);
    const key = keys[Number(event.key) - 1];
    selectSeed(key);
    return;
  }

  if (event.key === " ") {
    event.preventDefault();
    plant();
    return;
  }

  if (event.key.toLowerCase() === "w") {
    water();
    return;
  }

  if (event.key.toLowerCase() === "h") {
    harvest();
    return;
  }

  if (event.key.toLowerCase() === "n") {
    newGame();
    return;
  }

  if (event.key === "Escape") {
    closeRules();
    $("resultModal").classList.add("hidden");
  }
}

$("plantButton").addEventListener("click", plant);
$("waterButton").addEventListener("click", water);
$("harvestButton").addEventListener("click", harvest);
$("newGameButton").addEventListener("click", newGame);
$("themeButton").addEventListener("click", toggleTheme);
$("rulesButton").addEventListener("click", openRules);
$("closeRules").addEventListener("click", closeRules);
$("closeRulesBottom").addEventListener("click", closeRules);
$("resultNewGame").addEventListener("click", newGame);

document.querySelectorAll(".level-button").forEach((button) => {
  button.addEventListener("click", () => changeLevel(button.dataset.level));
});

$("rulesModal").addEventListener("click", (event) => {
  if (event.target === $("rulesModal")) closeRules();
});

$("resultModal").addEventListener("click", (event) => {
  if (event.target === $("resultModal")) {
    $("resultModal").classList.add("hidden");
  }
});

document.addEventListener("keydown", handleKeyboard);

initTheme();
loadGame();
createPlots();
renderAll();
startTimers();
