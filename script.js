/* ==========================================
   Whiteout Checklist V4.1
   script.js (都市チェック追加・競技場移動・メモ帳全員表示対応版)
========================================== */


// 倉庫回収の待ち時間テーブル (1〜30回対応)
const STORAGE_INTERVALS = [
    0.5, 1, 1.5, 2.5, 5, 10, 10, 10, 10, 20, 
    30, 45, 60, 60, 72, 108, 108, 108, 108, 120, 
    120, 120, 120, 120, 120, 120, 120, 120, 120, 120
];

let currentCharacter = localStorage.getItem(STORAGE?.character || "ws_current_character") || CHARACTERS[0];


// ------------------------------------------
// ⏰ 毎日 朝9:00 自動リセット処理
// ------------------------------------------
function checkDailyReset() {
    const lastResetStr = localStorage.getItem("ws_last_reset_date");
    const now = new Date();

    let resetTime = new Date();
    resetTime.setHours(9, 0, 0, 0);

    if (now < resetTime) {
        resetTime.setDate(resetTime.getDate() - 1);
    }

    const resetTimeISO = resetTime.toISOString();

    if (!lastResetStr || new Date(lastResetStr).getTime() < resetTime.getTime()) {

        Object.keys(localStorage).forEach(key => {

            // ステーション管理データは削除しない
            if (key === "wsStationManagerStateV4" || key.startsWith("ws_station")) {
                return;
            }

            // 専門家管理（wh_expert_）のデータも絶対に削除しない！
            if (key.startsWith("wh_expert_")) {
                return;
            }

            // 幹部メニュー（officer_list）のチェックのみ朝9時にリセットする
            if (key === "officer_list") {
                try {
                    let officers = JSON.parse(localStorage.getItem("officer_list") || "[]");
                    officers = officers.map(o => ({ ...o, checked: false }));
                    localStorage.setItem("officer_list", JSON.stringify(officers));
                } catch (e) {}
                return;
            }

            // 残したいデータ
            if (
                key.includes("_hide_") ||
                key.startsWith("ws_") ||
                key.includes("_list") ||
                key.endsWith("_bear_time") ||
                key.endsWith("_storage_time") ||
                key.endsWith("_hero_time")
            ) {
                return;
            }
            // それ以外はリセット
            localStorage.removeItem(key);
        });

        localStorage.setItem("ws_last_reset_date", resetTimeISO);
    }
}

// 初期化処理
function init() {
    checkDailyReset(); // 朝9時のリセット判定を最初に実行
    renderCharacters();
    renderBear();
    renderStationSummary();
    renderDaily();
    renderCity();
    renderTime();
    renderRepeat();
    renderEvents();
    renderOfficers();
    updateProgress();
    setupEvents();
}

document.addEventListener("DOMContentLoaded", init);

// 安全にラベル文字列を取得するヘルパー関数
function getItemLabel(item) {
    if (typeof item === "string") return item;
    return item ? (item.label || item.name || item.title || "") : "";
}

// キャラごとの進捗率(%)を計算する関数
function getCharProgressPercent(charName) {
    let total = 0, checked = 0;
    const isChecked = (id) => localStorage.getItem(`${charName}_${id}`) === "1";

    // デイリータスク
    DAILY_TASKS.forEach(t => { 
        total++; 
        if (isChecked(t.id)) checked++; 
    });

    // 都市タスク
    CITY_TASKS.forEach(t => {
        if (t.double) {
            total += 2;
            if (isChecked(`${t.id}_am`)) checked++;
            if (isChecked(`${t.id}_pm`)) checked++;
        } else {
            total++;
            if (isChecked(t.id)) checked++;
        }
    });

    // 時間タスク
    TIME_TASKS.forEach(task => {
        TIME_GROUPS.forEach(group => {
            const supported = task.times ? task.times.includes(group.id) : true;
            if (!supported) return;

            total++;
            if (isChecked(`time_${group.id}_${task.id}`)) {
                checked++;
            }
        });
    });

    return total === 0 ? 0 : Math.round((checked / total) * 100);
}

// ==========================================
// キャラクター切り替え
// ==========================================
function renderCharacters() {
    const container = document.getElementById("characterBar");
    if (!container) return;
    container.innerHTML = "";

    const settings = SettingManager.get();
    const characters = settings.characters;
    const alliances = settings.alliances;
    const colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEEAD"];

    characters.forEach((char, index) => {
        const btn = document.createElement("button");
        const isMain = (index === 0);
        const isActive = (char === currentCharacter);
        const color = colors[index % colors.length];

        btn.className = `character-btn ${isActive ? "active" : ""}`;
        
        btn.style.borderColor = isMain ? "#FFD700" : color;
        btn.style.borderWidth = "2px";
        btn.style.borderStyle = "solid";
        btn.style.borderRadius = "12px";
        btn.style.padding = "10px";
        btn.style.minWidth = "100px";

        const alliance = alliances[char] || "無所属";
        const charPercent = getCharProgressPercent(char);

        btn.innerHTML = `
            <div style="font-size:11px; font-weight:bold; color:#666; margin-bottom:4px;">[${alliance}]</div>
            <div style="font-size:18px; font-weight:900; color:#333; margin-bottom:2px;">${char}</div>
            <div style="font-size:13px; font-weight:bold; color:${color};">${charPercent}%</div>
        `;
        
        btn.onclick = () => {
            currentCharacter = char;
            localStorage.setItem(STORAGE?.character || "ws_current_character", char);
            init();
        };
        
        container.appendChild(btn);
    });
}

// ==========================================
// 熊罠タイマー
// ==========================================
function renderBear() {
    const dateEl = document.getElementById("bearDate");
    const timeEl = document.getElementById("bearTime");
    if (!dateEl || !timeEl) return;

    const savedTime = localStorage.getItem(`${currentCharacter}_bear_time`) || DEFAULT_BEAR_TIME;
    timeEl.textContent = savedTime;

    const start = new Date(BEAR_START);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let next = new Date(start);
    while (next < today) {
        next.setDate(next.getDate() + BEAR_INTERVAL);
    }

    dateEl.textContent = `${next.getMonth() + 1}/${next.getDate()}`;
}

// ==========================================
// デイリー & おまけ
// ==========================================
function renderDaily() {
    const container = document.getElementById("dailyContainer");
    if (!container) return;
    container.innerHTML = "";

    DAILY_TASKS.forEach(task => {
        const checked = localStorage.getItem(`${currentCharacter}_${task.id}`) === "1";
        const label = document.createElement("label");
        label.className = `task-item ${checked ? "checked" : ""}`;
        label.innerHTML = `
            <input type="checkbox" ${checked ? "checked" : ""} onchange="toggleTask('${task.id}', this.checked)">
            <span>${getItemLabel(task)}</span>
        `;
        container.appendChild(label);
    });
}

// ==========================================
// 都市チェック
// ==========================================
function renderCity() {
    const container = document.getElementById("cityContainer");
    if (!container) return;
    container.innerHTML = "";

    CITY_TASKS.forEach(task => {
        const div = document.createElement("div");
        div.className = "city-item";

        if (task.double) {
            const checkedAM = localStorage.getItem(`${currentCharacter}_${task.id}_am`) === "1";
            const checkedPM = localStorage.getItem(`${currentCharacter}_${task.id}_pm`) === "1";
            div.innerHTML = `
                <span class="city-label">${getItemLabel(task)}</span>
                <div style="display:flex; gap:10px;">
                    <label class="city-check">🌅 <input type="checkbox" ${checkedAM ? "checked" : ""} onchange="toggleTask('${task.id}_am', this.checked)"></label>
                    <label class="city-check">🌙 <input type="checkbox" ${checkedPM ? "checked" : ""} onchange="toggleTask('${task.id}_pm', this.checked)"></label>
                </div>
            `;
        } else {
            const checked = localStorage.getItem(`${currentCharacter}_${task.id}`) === "1";
            div.innerHTML = `
                <span class="city-label">${getItemLabel(task)}</span>
                <label class="city-check"><input type="checkbox" ${checked ? "checked" : ""} onchange="toggleTask('${task.id}', this.checked)"></label>
            `;
        }
        container.appendChild(div);
    });
}

// ==========================================
// 時間チェック
// ==========================================
function renderTime() {
    const container = document.getElementById("timeContainer");
    if (!container) return;

    let html = `<table class="time-table"><thead><tr><th>タスク</th>`;
    TIME_GROUPS.forEach(g => {
        html += `<th class="${g.className \vert{}\vert{} ""}">${g.title}</th>`;
    });
    html += `</tr></thead><tbody>`;

    TIME_TASKS.forEach(task => {
        html += `<tr><td>${getItemLabel(task)}${task.note ? `<span class="small-note">${task.note}</span>` : ""}</td>`;
        TIME_GROUPS.forEach(g => {
            const isSupported = task.times ? task.times.includes(g.id) : true;
            if (isSupported) {
                const key = `time_${g.id}_${task.id}`;
                const checked = localStorage.getItem(`${currentCharacter}_${key}`) === "1";
                html += `<td><input type="checkbox" ${checked ? "checked" : ""} onchange="toggleTask('${key}', this.checked)"></td>`;
            } else {
                html += `<td style="color:#ccc;">-</td>`;
            }
        });
        html += `</tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

// ==========================================
// 繰り返し
// ==========================================
function renderRepeat() {
    const container = document.getElementById("repeatContainer");
    if (!container) return;
    container.innerHTML = "";

    const tasks = [
        { id: "repeat_hero", icon: "🎖", label: "英雄募集", max: 5 },
        { id: "repeat_storage", icon: "📦", label: "倉庫回収", max: 30 }
    ];

    tasks.forEach(task => {
        const count = Number(localStorage.getItem(`${currentCharacter}_${task.id}`) || 0);
        const nextTimeStr = localStorage.getItem(`${currentCharacter}_${task.id}_time`) || "--:--";

        const div = document.createElement("div");
        div.className = "repeat-row";
        
        const stars = "★".repeat(Math.min(count, 10)) + (count > 10 ? ` +${count - 10}` : "");

        let timeDisplay = nextTimeStr;
        if (nextTimeStr && nextTimeStr !== "--:--") {
            const now = new Date();
            let targetDate = new Date(nextTimeStr);
            if (isNaN(targetDate.getTime())) {
                const parts = nextTimeStr.split(":");
                if (parts.length >= 2) {
                    targetDate = new Date();
                    targetDate.setHours(Number(parts[0]), Number(parts[1]), Number(parts[2] || 0), 0);
                }
            }

            const diffMs = targetDate - now;
            if (!isNaN(diffMs)) {
                if (diffMs <= 0) {
                    timeDisplay = "完了可能";
                } else {
                    const totalSec = Math.ceil(diffMs / 1000);
                    const h = Math.floor(totalSec / 3600);
                    const m = Math.floor((totalSec % 3600) / 60);
                    const s = totalSec % 60;

                    const pad = (n) => String(n).padStart(2, '0');
                    if (h > 0) {
                        timeDisplay = `${h}:${pad(m)}:${pad(s)}`;
                    } else {
                        timeDisplay = `${m}:${pad(s)}`;
                    }
                }
            }
        }

        div.innerHTML = `
            <div class="repeat-title">${task.icon}${task.label} (${count}/${task.max})</div>
            <div class="repeat-bottom">
                <div class="repeat-bar">${stars || "☆"}</div>
                <div class="repeat-time" style="width: auto; white-space: nowrap; font-family: monospace; font-weight: bold;">${timeDisplay}</div>
                <button class="repeat-add primary-btn" onclick="addRepeat('${task.id}',${task.max})">＋</button>
            </div>
        `;
        container.appendChild(div);
    });
}

function addRepeat(id, maxCount) {
    let count = Number(localStorage.getItem(`${currentCharacter}_${id}`) || 0);
    if (count >= maxCount) return;

    count++;
    localStorage.setItem(`${currentCharacter}_${id}`, count);

    let minutesToAdd = 5;
    if (id === "repeat_storage") {
        minutesToAdd = STORAGE_INTERVALS[count - 1] || 120;
    }

    const next = new Date();
    next.setSeconds(next.getSeconds() + Math.round(minutesToAdd * 60));

    localStorage.setItem(
        `${currentCharacter}_${id}_time`,
        next.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );

    renderRepeat();
    updateProgress();
}

function toggleTask(id, checked) {
    localStorage.setItem(`${currentCharacter}_${id}`, checked ? "1" : "0");
    renderDaily();
    renderCity();
    renderTime();
    updateProgress();
}

// ==========================================
// 進捗更新
// ==========================================
function updateProgress() {
    let total = 0, checked = 0;
    const isChecked = (id) => localStorage.getItem(`${currentCharacter}_${id}`) === "1";

    DAILY_TASKS.forEach(t => { 
        total++; 
        if (isChecked(t.id)) checked++; 
    });

    CITY_TASKS.forEach(t => {
        if (t.double) {
            total += 2;
            if (isChecked(`${t.id}_am`)) checked++;
            if (isChecked(`${t.id}_pm`)) checked++;
        } else {
            total++;
            if (isChecked(t.id)) checked++;
        }
    });

    TIME_TASKS.forEach(task => {
        TIME_GROUPS.forEach(group => {
            const supported = task.times ? task.times.includes(group.id) : true;
            if (!supported) return;

            total++;
            if (isChecked(`time_${group.id}_${task.id}`)) {
                checked++;
            }
        });
    });

    const percent = total === 0 ? 0 : Math.round((checked / total) * 100);

    const fill = document.getElementById("progressFill");
    const percentEl = document.getElementById("progressPercent");
    const countEl = document.getElementById("progressCount");

    if (fill) fill.style.width = `${percent}%`;
    if (percentEl) percentEl.textContent = `${percent}%`;
    if (countEl) countEl.textContent = `${checked} /${total}`;

    const charProg = document.getElementById(`prog_${currentCharacter}`);
    if (charProg) charProg.textContent = `${percent}%`;
}

function renderStationSummary() {
    const el = document.getElementById("stationToday");
    if (!el) return;

    const settings = SettingManager.get();
    const alliance = settings.alliances[currentCharacter] || "MEL";

    const urgent = Number(
        localStorage.getItem(`ws_station_${alliance}_now`) || 0
    );

    const today = Number(
        localStorage.getItem(`ws_station_${alliance}_today`) || 0
    );

    if (urgent > 0) {
        el.innerHTML = `🔴 今すぐ閉鎖：${urgent}件<br>🟡 24時間以内：${today}件`;
    } else {
        el.innerHTML = `🟢 24時間以内：${today}件`;
    }
}

// ==========================================
// イベント描画
// ==========================================
function renderEvents() {
    const container = document.getElementById("eventContainer");
    if (!container) return;
    
    let events = JSON.parse(localStorage.getItem(STORAGE?.events || "ws_events") || "null");
    if (!events || events.length === 0) {
        events = typeof DEFAULT_EVENTS !== "undefined" ? DEFAULT_EVENTS : [];
    }

    container.innerHTML = events.map((e, index) => {
        const eventId = e.id ? String(e.id) : `evt_${index}_${e.title}`;
        
        const hideKey = `${currentCharacter}_hide_event_${eventId}`;
        const isHidden = localStorage.getItem(hideKey) === "1";

        const checkKey = `${currentCharacter}_check_event_${eventId}`;
        const isChecked = localStorage.getItem(checkKey) === "1";

        return `
            <div class="event-item ${isHidden ? "event-hidden" : ""} ${isChecked ? "checked" : ""}">
                <div
