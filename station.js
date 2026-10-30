// ゲーム画面の配置順に対応させた12箇所のステーションデータ（ゲームアイコンの見た目を指定）
const stations = [
  // 1段目
  { id: 0, level: 1, name: "技術", icon: "🔬", bgClass: "bg-tech" },
  { id: 1, level: 1, name: "建築", icon: "🏗️", bgClass: "bg-build" },
  { id: 2, level: 3, name: "技術", icon: "🔬", bgClass: "bg-tech" },

  // 2段目
  { id: 3, level: 1, name: "生産", icon: "🔧", bgClass: "bg-prod" },   /* ゲーム内のスパナアイコン風 */
  { id: 4, level: 1, name: "採集", icon: "🚜", bgClass: "bg-gather" }, /* 車アイコン風 */
  { id: 5, level: 3, name: "建築", icon: "🏗️", bgClass: "bg-build" },

  // 3段目
  { id: 6, level: 2, name: "訓練", icon: "👤", bgClass: "bg-train" },  /* 兵士アイコン風 */
  { id: 7, level: 2, name: "武器", icon: "🔫", bgClass: "bg-weapon" },
  { id: 8, level: 2, name: "防御", icon: "🛡️", bgClass: "bg-defense" },

  // 4段目
  { id: 9, level: 4, name: "武器", icon: "🔫", bgClass: "bg-weapon" },
  { id: 10, level: 3, name: "遠征", icon: "🥾", bgClass: "bg-expedition" },
  { id: 11, level: 4, name: "防御", icon: "🛡️", bgClass: "bg-defense" }
];

const STORAGE_KEY = "wsStationManagerStateV4";

const defaultState = {
  currentAllianceId: "main",
  alliances: [{ id: "main", name: "メイン同盟" }],
  stationDataByAlliance: { main: {} }
};

let state = loadState();
let sortMode = "time";
let searchKeyword = "";

const container = document.getElementById("stations");
const closeNow = document.getElementById("closeNow");
const todayStations = document.getElementById("todayStations");
const allianceStats = document.getElementById("allianceStats");
const allianceSelect = document.getElementById("allianceSelect");
const allianceNameInput = document.getElementById("allianceNameInput");
const addAllianceBtn = document.getElementById("addAllianceBtn");
const renameAllianceBtn = document.getElementById("renameAllianceBtn");
const deleteAllianceBtn = document.getElementById("deleteAllianceBtn");
const searchInput = document.getElementById("searchInput");

// シールド・再シールドサイクル定義（ミリ秒）
const SHIELD_DURATION_MS = 3 * 24 * 60 * 60 * 1000; // 3日間 (72時間)
const OCCUPY_WINDOW_MS = 1 * 60 * 60 * 1000;       // 占領時間 (1時間)
const AUTO_RESET_CYCLE_MS = 4 * 24 * 60 * 60 * 1000; // 自動リセットサイクル (72H + 24H = 96時間)

bindEvents();
normalizeState();
renderAllianceSelect();
drawStations();

setInterval(updateLiveContent, 1000);

function loadState() {
  try {
    for (const key of [STORAGE_KEY, "wsStationManagerStateV3", "wsStationManagerStateV2"]) {
      const saved = JSON.parse(localStorage.getItem(key));
      if (saved && typeof saved === "object" && saved.stationDataByAlliance) {
        return saved;
      }
    }

    const oldStationData = JSON.parse(localStorage.getItem("stationData") || "null");
    if (oldStationData && typeof oldStationData === "object") {
      return {
        currentAllianceId: "main",
        alliances: [{ id: "main", name: "メイン同盟" }],
        stationDataByAlliance: { main: oldStationData }
      };
    }
  } catch (e) {
    console.error("データ読込失敗", e);
  }

  return structuredClone(defaultState);
}

function normalizeState() {
  if (!Array.isArray(state.alliances) || state.alliances.length === 0) {
    state.alliances = structuredClone(defaultState.alliances);
  }

  if (!state.stationDataByAlliance || typeof state.stationDataByAlliance !== "object") {
    state.stationDataByAlliance = {};
  }

  state.alliances.forEach((alliance) => {
    if (!state.stationDataByAlliance[alliance.id]) {
      state.stationDataByAlliance[alliance.id] = {};
    }
  });

  const exists = state.alliances.some((alliance) => alliance.id === state.currentAllianceId);
  if (!exists) {
    state.currentAllianceId = state.alliances[0].id;
  }
}

function bindEvents() {
  document.querySelectorAll('input[name="sort"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      sortMode = radio.value;
      drawStations();
    });
  });

  if (allianceSelect) {
    allianceSelect.addEventListener("change", (event) => {
      state.currentAllianceId = event.target.value;
      persistState();
      drawStations();
    });
  }

  if (addAllianceBtn) addAllianceBtn.addEventListener("click", addAlliance);
  if (renameAllianceBtn) renameAllianceBtn.addEventListener("click", renameAlliance);
  if (deleteAllianceBtn) deleteAllianceBtn.addEventListener("click", deleteAlliance);

  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      searchKeyword = event.target.value.trim();
      drawStations();
    });
  }

  if (allianceNameInput) {
    allianceNameInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        addAlliance();
      }
    });
  }

  const copyTodayBtn = document.getElementById("copyTodayBtn");
  if (copyTodayBtn) {
    copyTodayBtn.addEventListener("click", () => {
      if (!window.todayCopyText) {
        alert("コピーする内容がありません。");
        return;
      }
      navigator.clipboard.writeText(window.todayCopyText).then(() => {
        alert("コピーしました！");
      }).catch(err => {
        console.error("コピー失敗", err);
        alert("コピーに失敗しました。");
      });
    });
  }
}

function getCurrentAlliance() {
  return state.alliances.find((alliance) => alliance.id === state.currentAllianceId) || state.alliances[0];
}

function getCurrentStationData() {
  const alliance = getCurrentAlliance();
  if (!state.stationDataByAlliance[alliance.id]) {
    state.stationDataByAlliance[alliance.id] = {};
  }
  return state.stationDataByAlliance[alliance.id];
}

function persistState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    updateSummary();
  } catch (e) {
    console.error("データ保存失敗", e);
  }
}

function renderAllianceSelect() {
  if (!allianceSelect) return;
  const currentId = state.currentAllianceId;
  allianceSelect.innerHTML = state.alliances
    .map((alliance) => `<option value="${alliance.id}">${escapeHtml(alliance.name)}</option>`)
    .join("");
  allianceSelect.value = currentId;
}

function addAlliance() {
  if (!allianceNameInput) return;
  const name = allianceNameInput.value.trim();
  if (!name) {
    alert("同盟名を入力してください。");
    return;
  }

  const duplicate = state.alliances.some((alliance) => alliance.name === name);
  if (duplicate) {
    alert("同じ名前の同盟がすでにあります。");
    return;
  }

  const id = `alliance_${Date.now()}`;
  state.alliances.push({ id, name });
  state.stationDataByAlliance[id] = {};
  state.currentAllianceId = id;
  allianceNameInput.value = "";
  persistState();
  renderAllianceSelect();
  drawStations();
}

function renameAlliance() {
  if (!allianceNameInput) return;
  const alliance = getCurrentAlliance();
  const nextName = allianceNameInput.value.trim();
  if (!nextName) {
    alert("変更後の同盟名を入力してください。");
    return;
  }

  const duplicate = state.alliances.some((item) => item.id !== alliance.id && item.name === nextName);
  if (duplicate) {
    alert("同じ名前の同盟がすでにあります。");
    return;
  }

  alliance.name = nextName;
  allianceNameInput.value = "";
  persistState();
  renderAllianceSelect();
  drawStations();
}

function deleteAlliance() {
  if (state.alliances.length === 1) {
    alert("最後の1つは削除できません。");
    return;
  }

  const alliance = getCurrentAlliance();
  const ok = confirm(`「${alliance.name}」を削除します。\nこの同盟の記録もすべて消えます。`);
  if (!ok) return;

  state.alliances = state.alliances.filter((item) => item.id !== alliance.id);
  delete state.stationDataByAlliance[alliance.id];
  state.currentAllianceId = state.alliances[0].id;
  persistState();
  renderAllianceSelect();
  drawStations();
}

function getCalculatedShieldInfo(record) {
  if (!record || !record.closeTime) return null;

  const baseStart = new Date(record.closeTime).getTime();
  const now = Date.now();

  if (now < baseStart) {
    const shieldEnd = new Date(baseStart + SHIELD_DURATION_MS);
    return {
      currentShieldEnd: shieldEnd,
      nextShieldEnd: new Date(shieldEnd.getTime() + SHIELD_DURATION_MS + OCCUPY_WINDOW_MS),
      nextNextShieldEnd: new Date(shieldEnd.getTime() + (SHIELD_DURATION_MS + OCCUPY_WINDOW_MS) * 2),
      isAutoLoop: false
    };
  }

  const elapsed = now - baseStart;
  const cycleCount = Math.floor(elapsed / AUTO_RESET_CYCLE_MS);
  const currentCycleStart = baseStart + (cycleCount * AUTO_RESET_CYCLE_MS);
  
  const currentShieldEnd = new Date(currentCycleStart + SHIELD_DURATION_MS);
  
  const nextShieldEnd = new Date(currentShieldEnd.getTime() + SHIELD_DURATION_MS + OCCUPY_WINDOW_MS);
  const nextNextShieldEnd = new Date(nextShieldEnd.getTime() + SHIELD_DURATION_MS + OCCUPY_WINDOW_MS);

  return {
    currentShieldEnd,
    nextShieldEnd,
    nextNextShieldEnd,
    isAutoLoop: cycleCount > 0
  };
}

function drawStations() {
  if (!container) return;
  const alliance = getCurrentAlliance();
  const stationData = getCurrentStationData();
  const keyword = searchKeyword.toLowerCase();

  let list = [...stations].filter((station) => {
    if (!keyword) return true;
    const text = `lv${station.level} ${station.name}`.toLowerCase();
    return text.includes(keyword);
  });

  if (sortMode === "time") {
    list.sort((a, b) => getRemainSeconds(a.id) - getRemainSeconds(b.id));
  } else {
    list.sort((a, b) => (a.level !== b.level ? a.level - b.level : a.id - b.id));
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <strong>${escapeHtml(alliance.name)}</strong> に一致するステーションがありません。<br />
        検索語を変えてみてください。
      </div>
    `;
    updateSummary();
    return;
  }

  container.innerHTML = list.map((station) => buildStationCard(station, stationData[station.id])).join("");

  list.forEach((station) => {
    const inputEl = document.getElementById(`remain${station.id}`);
    if (inputEl) {
      inputEl.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          saveRemain(station.id);
        }
      });
    }
  });

  updateSummary();
}

function buildStationCard(station, record) {
  const status = getStationStatus(record);
  const calc = getCalculatedShieldInfo(record);

  let dateText = "未登録";
  let remainText = "";
  let futureText = "";

  if (calc) {
    const shieldEnd = calc.currentShieldEnd;
    dateText = formatShortDate(shieldEnd);

    const remainMs = shieldEnd.getTime() - Date.now();
    if (remainMs > 0) {
      const totalSeconds = Math.floor(remainMs / 1000);
      const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
      const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
      const seconds = String(totalSeconds % 60).padStart(2, '0');
      remainText = `（あと ${hours}:${minutes}:${seconds}）`;
    } else {
      remainText = "（シールド切れ・要占領）";
    }

    const nextStr = formatShortDate(calc.nextShieldEnd);
    const nextNextStr = formatShortDate(calc.nextNextShieldEnd);
    futureText = `
      <div class="schedule-future">
        <span>次回切: <strong>${nextStr}</strong></span>
        <span>次々回切: <strong>${nextNextStr}</strong></span>
        ${calc.isAutoLoop ? `<span style="color:#d97706;">🔄 自動ループ中</span>` : ''}
      </div>
    `;
  }

  const stationTitle = `Lv${station.level} ${escapeHtml(station.name)}`;

  return `
<div class="station-row" data-id="${station.id}">
    <div class="station-header">
        <div class="station-header-left">
            <div class="game-icon-badge ${station.bgClass}">${station.icon}</div>
            <div class="station-name">${stationTitle}</div>
        </div>
        <button type="button" class="btn-action-now" onclick="confirmSaveNow(${station.id}, '${escapeHtml(station.name)}')">⚡ 今占領 (3日開始)</button>
    </div>

    <div class="station-date" data-field="dateText">
        ${status.icon} ${dateText} <span data-field="remainText" style="font-size: 0.85em; color: #666;">${remainText}</span>
    </div>

    ${futureText}

    <div class="quick-time-presets">
        <button type="button" onclick="addTimeInput(${station.id}, 1, 0, 0)">+1日</button>
        <button type="button" onclick="addTimeInput(${station.id}, 0, 12, 0)">+12H</button>
        <button type="button" onclick="addTimeInput(${station.id}, 0, 1, 0)">+1H</button>
        <button type="button" onclick="addTimeInput(${station.id}, 0, 0, 30)">+30分</button>
        <button type="button" onclick="addTimeInput(${station.id}, 0, 0, 15)">+15分</button>
        <button type="button" onclick="addTimeInput(${station.id}, 0, 0, 1)">+1分</button>
        <button type="button" onclick="clearTimeInput(${station.id})" class="btn-clear">✕</button>
    </div>

    <div class="station-input-group">
        <input
            id="remain${station.id}"
            type="text"
            inputmode="numeric"
            placeholder="日 時 分 (例: 2 4 30)"
        >
        <button type="button" class="btn-action-save" onclick="saveRemain(${station.id})">手動保存</button>
        <button type="button" class="btn-action-reset" onclick="resetStation(${station.id})">🗑</button>
    </div>
</div>
`;
}

function getStationStatus(record) {
  if (!record || !record.closeTime) {
    return { icon: "⚪", badgeText: "未登録" };
  }

  const calc = getCalculatedShieldInfo(record);
  if (!calc) return { icon: "⚪", badgeText: "未登録" };

  const now = Date.now();
  const remain = calc.currentShieldEnd.getTime() - now;

  if (remain <= 0) {
    return { icon: "🔴", badgeText: "今閉じる" };
  }
  if (remain <= 86400000) {
    return { icon: "🟠", badgeText: "本日注意" };
  }
  return { icon: "🟢", badgeText: "シールド中" };
}

function confirmSaveNow(id, name) {
  if (confirm(`「${name}」を今占領（たった今から3日間のシールド開始）にしますか？`)) {
    saveNow(id);
  }
}

function saveNow(id) {
  const stationData = getCurrentStationData();
  stationData[id] = { closeTime: new Date().toISOString() };
  persistState();
  drawStations();
}

function addTimeInput(id, addDays, addHours, addMins) {
  const input = document.getElementById(`remain${id}`);
  if (!input) return;

  const parts = input.value.trim().split(/\s+/);
  let d = parseInt(parts[0], 10) || 0;
  let h = parseInt(parts[1], 10) || 0;
  let m = parseInt(parts[2], 10) || 0;

  d += addDays;
  h += addHours;
  m += addMins;

  if (m >= 60) {
    h += Math.floor(m / 60);
    m = m % 60;
  }
  if (h >= 24) {
    d += Math.floor(h / 24);
    h = h % 24;
  }

  input.value = `${d} ${h} ${m}`;
}

function clearTimeInput(id) {
  const input = document.getElementById(`remain${id}`);
  if (input) input.value = "";
}

function saveRemain(id) {
  const input = document.getElementById(`remain${id}`);
  if (!input) return;

  const text = input.value.trim();
  if (!text) {
    alert("残り時間を入力してください。\n例：2 4 30 (日 時間 分)");
    return;
  }

  const parts = text.split(/\s+/);
  const day = Number(parts[0] || 0);
  const hour = Number(parts[1] || 0);
  const minute = Number(parts[2] || 0);

  if (isNaN(day) || isNaN(hour) || isNaN(minute)) {
    alert("数字を正しく入力してください。\n例：2 4 30");
    return;
  }

  if (day === 0 && hour === 0 && minute === 0) {
    alert("入力が正しくありません。\n例：2 4 30");
    return;
  }

  const shieldEnd = new Date();
  shieldEnd.setDate(shieldEnd.getDate() + day);
  shieldEnd.setHours(shieldEnd.getHours() + hour);
  shieldEnd.setMinutes(shieldEnd.getMinutes() + minute);

  const closeTime = new Date(shieldEnd.getTime() - SHIELD_DURATION_MS);

  const stationData = getCurrentStationData();
  stationData[id] = { closeTime: closeTime.toISOString() };

  persistState();
  drawStations();
}

function resetStation(id) {
  const stationData = getCurrentStationData();
  delete stationData[id];
  persistState();
  drawStations();
}

function getRemainSeconds(id) {
  const stationData = getCurrentStationData();
  if (!stationData[id] || !stationData[id].closeTime) return Number.MAX_SAFE_INTEGER;

  const calc = getCalculatedShieldInfo(stationData[id]);
  if (!calc) return Number.MAX_SAFE_INTEGER;

  return calc.currentShieldEnd.getTime() - Date.now();
}

function updateSummary() {
  const stationData = getCurrentStationData();
  const now = Date.now();

  const urgent = [];
  const warningMap = {};

  let registeredCount = 0;

  stations.forEach((station) => {
    const record = stationData[station.id];
    if (!record || !record.closeTime) return;

    registeredCount++;

    const calc = getCalculatedShieldInfo(record);
    if (!calc) return;

    const shieldEnd = calc.currentShieldEnd;
    const remain = shieldEnd.getTime() - now;

    if (remain <= 0) {
      urgent.push(`
<div class="summary-item">
<strong>Lv${station.level} ${escapeHtml(station.name)}</strong><br>
シールド切れ（占領可能）
</div>
`);
      return;
    }

    if (remain > 0 && remain <= 86400000) {
      const month = shieldEnd.getMonth() + 1;
      const date = shieldEnd.getDate();
      const dateKey = `${month}/${date}`;

      const hoursStr = String(shieldEnd.getHours()).padStart(2, '0');
      const minutesStr = String(shieldEnd.getMinutes()).padStart(2, '0');
      const timeOnlyStr = `${hoursStr}:${minutesStr}`;

      if (!warningMap[dateKey]) {
        warningMap[dateKey] = [];
      }

      warningMap[dateKey].push({
        remain,
        html: `
<div class="summary-item">
<strong>Lv${station.level} ${escapeHtml(station.name)}：${timeOnlyStr}</strong>
</div>
`,
        text: `Lv${station.level} ${station.name}：${timeOnlyStr}`
      });
    }
  });

  const warningHtmlList = [];
  const copyTextLines = [];

  Object.keys(warningMap).forEach((dateKey) => {
    const items = warningMap[dateKey];
    items.sort((a, b) => a.remain - b.remain);

    copyTextLines.push(`📅 ステーション ${dateKey}`);
    items.forEach((item) => {
      warningHtmlList.push(item.html);
      copyTextLines.push(item.text);
    });
    copyTextLines.push("");
  });

  if (closeNow) closeNow.innerHTML = urgent.length ? urgent.join("") : "ありません";
  if (todayStations) todayStations.innerHTML = warningHtmlList.length ? warningHtmlList.join("") : "ありません";
  if (allianceStats) allianceStats.innerHTML = `${registeredCount} / ${stations.length} 登録`;

  window.todayCopyText = copyTextLines.join("\n").trim();

  const alliance = getCurrentAlliance();

  localStorage.setItem(`ws_station_${alliance.name}_now`, urgent.length);
  localStorage.setItem(`ws_station_${alliance.name}_today`, warningHtmlList.length);
  localStorage.setItem("ws_station_now_count", urgent.length);
  localStorage.setItem("ws_station_today_count", warningHtmlList.length);
  localStorage.setItem("ws_station_registered_count", registeredCount);
}

function updateLiveContent() {
  const activeEl = document.activeElement;
  if (activeEl && activeEl.tagName === "INPUT") {
    return;
  }

  const stationData = getCurrentStationData();
  const now = Date.now();

  stations.forEach((station) => {
    const card = container.querySelector(`.station-row[data-id="${station.id}"]`);
    if (!card) return;

    const record = stationData[station.id];
    if (!record || !record.closeTime) return;

    const calc = getCalculatedShieldInfo(record);
    if (!calc) return;

    const shieldEnd = calc.currentShieldEnd;
    const status = getStationStatus(record);
    const dateTextEl = card.querySelector('[data-field="dateText"]');

    if (dateTextEl) {
      const remainMs = shieldEnd.getTime() - now;
      let remainText = "";
      if (remainMs > 0) {
        const totalSeconds = Math.floor(remainMs / 1000);
        const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
        const seconds = String(totalSeconds % 60).padStart(2, '0');
        remainText = `（あと ${hours}:${minutes}:${seconds}）`;
      } else {
        remainText = "（シールド切れ・要占領）";
      }

      dateTextEl.innerHTML = `${status.icon} ${formatShortDate(shieldEnd)} <span data-field="remainText" style="font-size: 0.85em; color: #666;">${remainText}</span>`;
    }
  });

  updateSummary();
}

function formatShortDate(date) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function exportData() {
  const exportObj = {
    stationState: state,
  };
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith("ws_station") || key.includes("StationManager"))) {
      exportObj[key] = localStorage.getItem(key);
    }
  }

  const dataStr = JSON.stringify(exportObj, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ws_station_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!imported || typeof imported !== "object") {
        throw new Error("無効なデータ形式です");
      }

      if (imported.stationState) {
        state = imported.stationState;
        persistState();
      } else if (imported.alliances && imported.stationDataByAlliance) {
        state = imported;
        persistState();
      } else {
        Object.keys(imported).forEach(key => {
          if (key.startsWith("ws_")) {
            localStorage.setItem(key, imported[key]);
          }
        });
        state = loadState();
      }

      alert("ステーションデータを正常に復元しました！");
      location.reload();
    } catch (err) {
      console.error(err);
      alert("ファイルの読み込みに失敗しました。正しいバックアップファイルを選択してください。");
    }
  };
  reader.readAsText(file);
}
