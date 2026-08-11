/* ==========================================
   Whiteout Checklist V4
   script.js (イベントチェックボックス追加 & 朝9時リセット実装版)
========================================== */

// 倉庫回収の待ち時間テーブル (1〜30回対応)
const STORAGE_INTERVALS = [
    0.5, 1, 1.5, 2.5, 5, 10, 10, 10, 10, 20, 
    30, 45, 60, 60, 72, 108, 108, 108, 108, 120, 
    120, 120, 120, 120, 120, 120, 120, 120, 120, 120
];

let currentCharacter = localStorage.getItem(STORAGE?.character || "ws_current_character") || CHARACTERS[0];

// キャラクター → 表示する同盟
const CHARACTER_STATION_ALLIANCE = {
    Lune: "MEL",
    Melune: "MEL",
    Chocolat: "RxR",
    Vanille: "RxR"
};

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

            // ★追加：専門家管理（wh_expert_）のデータも絶対に削除しない！
            if (key.startsWith("wh_expert_")) {
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

    DAILY_TASKS.forEach(t => { total++; if (isChecked(t.id)) checked++; });
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

    return total === 0 ? 0 : Math.round((checked / total) * 100);
}

// ==========================================
// キャラクター切り替え
// ==========================================
function renderCharacters() {
    const container = document.getElementById("characterBar");
    if (!container) return;
    container.innerHTML = "";

    const icons = { Lune: "🌙", Melune: "🍈", Chocolat: "🍫", Vanille: "🍦" };

    CHARACTERS.forEach(char => {
        const btn = document.createElement("button");
        const isMain = (char === CHARACTERS[0]); 
        const isActive = (char === currentCharacter);

        btn.className = `character-btn ${isActive ? "active" : ""} ${isMain ? "main-btn" : ""}`;
        
        const alliance = CHARACTER_ALLIANCES[char] || "";
        const charPercent = getCharProgressPercent(char);

        btn.innerHTML = `
            <div style="font-size:10px; opacity:0.8; font-weight:bold;">[${alliance}]</div>
            <div class="character-name ${isMain ? "main-character" : ""}">${icons[char] || "👤"} ${char}</div>
            <div class="character-progress" id="prog_${char}">${charPercent}%</div>
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
// 熊罠タイマー（キャラ別対応版）
// ==========================================
function renderBear() {
    const dateEl = document.getElementById("bearDate");
    const timeEl = document.getElementById("bearTime");
    if (!dateEl || !timeEl) return;

    // ★ キャラクタ―ごとの時間を取得（なければデフォルト値）
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
        html += `<th class="${g.className || ""}">${g.title}</th>`;
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
// 繰り返し（0:00:00 形式＆リアルタイム秒数更新版）
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

                    // 「0:00:05」や「02:15:30」のようなフォーマットに整形
                    const pad = (n) => String(n).padStart(2, '0');
                    if (h > 0) {
                        timeDisplay = `${h}:${pad(m)}:${pad(s)}`;
                    } else {
                        timeDisplay = `${m}:${pad(s)}`; // 1時間未満なら 「分:秒」 (例: 04:30)
                    }
                }
            }
        }

        div.innerHTML = `
            <div class="repeat-title">${task.icon} ${task.label} (${count}/${task.max})</div>
            <div class="repeat-bottom">
                <div class="repeat-bar">${stars || "☆"}</div>
                <div class="repeat-time" style="width: auto; white-space: nowrap; font-family: monospace; font-weight: bold;">${timeDisplay}</div>
                <button class="repeat-add primary-btn" onclick="addRepeat('${task.id}', ${task.max})">＋</button>
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

    DAILY_TASKS.forEach(t => { total++; if (isChecked(t.id)) checked++; });
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
    if (countEl) countEl.textContent = `${checked} / ${total}`;

    const charProg = document.getElementById(`prog_${currentCharacter}`);
    if (charProg) charProg.textContent = `${percent}%`;
}
function renderStationSummary() {

    const el = document.getElementById("stationToday");
    if (!el) return;

    const alliance = CHARACTER_STATION_ALLIANCE[currentCharacter] || "MEL";

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
// イベント描画 (★ 編集・チェック・目隠し対応版)
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
        
        // 目隠し判定（キャラ別）
        const hideKey = `${currentCharacter}_hide_event_${eventId}`;
        const isHidden = localStorage.getItem(hideKey) === "1";

        // ★ チェックボックス判定（キャラ別）
        const checkKey = `${currentCharacter}_check_event_${eventId}`;
        const isChecked = localStorage.getItem(checkKey) === "1";

        return `
            <div class="event-item ${isHidden ? "event-hidden" : ""} ${isChecked ? "checked" : ""}">
                <div class="event-left" style="display:flex; align-items:center; gap:8px;">
                    <input type="checkbox" ${isChecked ? "checked" : ""} onchange="toggleEventCheck('${eventId}', this.checked)">
                    <div>
                        <div class="event-title">${escapeHtml(e.title)}</div>
                        ${e.memo ? `<div class="event-memo">${escapeHtml(e.memo)}</div>` : ""}
                    </div>
                </div>
                <div class="event-right">
                    <button type="button" onclick="editEvent('${eventId}')" title="編集">✏️</button>
                    <button type="button" onclick="toggleHideEvent('${eventId}')" title="目隠し">${isHidden ? "👁" : "🙈"}</button>
                    <button type="button" onclick="deleteEvent('${eventId}')" title="削除">❌</button>
                </div>
            </div>
        `;
    }).join("");
    initListSortable();
}

// ★ イベントの編集処理
function editEvent(eventId) {
    let events = JSON.parse(localStorage.getItem(STORAGE?.events || "ws_events") || "[]");
    const eventObj = events.find((e, index) => {
        const id = e.id ? String(e.id) : `evt_${index}_${e.title}`;
        return id === String(eventId);
    });

    if (!eventObj) return;

    const newTitle = prompt("イベント名を修正:", eventObj.title);
    if (newTitle === null) return;
    
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) {
        alert("イベント名を入力してください。");
        return;
    }

    const newMemo = prompt("備考を修正 (任意):", eventObj.memo || "");
    if (newMemo === null) return;

    eventObj.title = trimmedTitle;
    eventObj.memo = newMemo.trim();

    localStorage.setItem(STORAGE?.events || "ws_events", JSON.stringify(events));
    renderEvents();
}

// ★ イベントの完了チェック切り替え
function toggleEventCheck(eventId, checked) {
    const checkKey = `${currentCharacter}_check_event_${eventId}`;
    localStorage.setItem(checkKey, checked ? "1" : "0");
    renderEvents();
}

// キャラ固有の目隠し切り替え
function toggleHideEvent(eventId) {
    const hideKey = `${currentCharacter}_hide_event_${eventId}`;
    const isHidden = localStorage.getItem(hideKey) === "1";
    
    if (isHidden) {
        localStorage.removeItem(hideKey);
    } else {
        localStorage.setItem(hideKey, "1");
    }
    
    renderEvents();
}

// イベント削除
function deleteEvent(eventId) {
    let events = JSON.parse(localStorage.getItem(STORAGE?.events || "ws_events") || "[]");
    events = events.filter((e, index) => {
        const id = e.id ? String(e.id) : `evt_${index}_${e.title}`;
        return id !== String(eventId);
    });
    localStorage.setItem(STORAGE?.events || "ws_events", JSON.stringify(events));
    renderEvents();
}

// HTMLエスケープ用ヘルパー
function escapeHtml(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

// ==========================================
// 幹部メニュー描画 (並び替え対応版)
// ==========================================
function renderOfficers() {
    const container = document.getElementById("officerContainer");
    if (!container) return;

    const officerCard = document.getElementById("officerCard");

    if (officerCard) {
        if (currentCharacter === "Lune") {
            officerCard.style.display = ""; // Luneなら表示
        } else {
            officerCard.style.display = "none"; // Lune以外なら非表示
        }
    }

    let officers = JSON.parse(localStorage.getItem("officer_list") || "null");
    if (!officers) {
        officers = DEFAULT_OFFICERS.map((t, idx) => ({ id: idx + 1, text: t, checked: false }));
        localStorage.setItem("officer_list", JSON.stringify(officers));
    }

    container.innerHTML = officers.map(o => `
        <div class="officer-item ${o.checked ? "checked" : ""}">
            <input type="checkbox" ${o.checked ? "checked" : ""} onchange="toggleOfficer('${o.id}', this.checked)">
            <span>${o.text}</span>
            <button type="button" class="officer-delete" onclick="deleteOfficer('${o.id}')">❌</button>
        </div>
    `).join("");

    // ★ 表示切り替え後にドラッグ＆ドロップ（並び替え）を再接続・更新する
    if (typeof initSortable === "function") {
        initSortable();
    } else if (typeof setupSortable === "function") {
        setupSortable();
    } else if (typeof Sortable !== "undefined" && window.bottomSortable) {
        // SortableJSを使っている場合の再適用
        try {
            window.bottomSortable.option("disabled", false);
        } catch (e) {}
    }
    initListSortable();
}

// 幹部メニューの項目を削除する関数
function deleteOfficer(id) {
    let officers = JSON.parse(localStorage.getItem("officer_list") || "[]");
    // 該当するID以外のものだけを残す
    officers = officers.filter(o => String(o.id) !== String(id));
    localStorage.setItem("officer_list", JSON.stringify(officers));
    renderOfficers(); // 再描画
}

// ==========================================
// イベント・各種ボタン操作のセットアップ
// ==========================================
function setupEvents() {
// 熊時間編集（キャラ別保存）
    const editBearBtn = document.getElementById("editBearTime");
    if (editBearBtn) {
        editBearBtn.onclick = () => {
            const cur = document.getElementById("bearTime")?.textContent || "21:00";
            const val = prompt(`【${currentCharacter}】の熊罠時間を入力してください`, cur);
            if (val) {
                // ★ キャラクタ―ごとに時間を保存！
                localStorage.setItem(`${currentCharacter}_bear_time`, val);
                renderBear();
            }
        };
    }
    
    // 地底メモ開閉
    const toggleMemoBtn = document.getElementById("toggleMemo");
    const memoBody = document.getElementById("memoBody");
    if (toggleMemoBtn && memoBody) {
        toggleMemoBtn.onclick = () => memoBody.classList.toggle("hidden");
    }

    // イベントフォーム開閉
    const toggleEventBtn = document.getElementById("toggleEventForm");
    const eventForm = document.getElementById("eventForm");
    if (toggleEventBtn && eventForm) {
        toggleEventBtn.onclick = () => eventForm.classList.toggle("hidden");
    }

    // イベント追加
    const addEventBtn = document.getElementById("addEventBtn");
    if (addEventBtn) {
        addEventBtn.onclick = () => {
            const titleInput = document.getElementById("eventTitle");
            const memoInput = document.getElementById("eventMemo");
            const title = titleInput.value.trim();
            const memo = memoInput.value.trim();
            if (!title) return;

            const events = JSON.parse(localStorage.getItem(STORAGE?.events || "ws_events") || "[]");
            events.push({ id: Date.now(), title, memo });
            localStorage.setItem(STORAGE?.events || "ws_events", JSON.stringify(events));

            titleInput.value = "";
            memoInput.value = "";
            eventForm.classList.add("hidden");
            renderEvents();
        };
    }

    // 幹部フォーム開閉
    const toggleOfficerBtn = document.getElementById("toggleOfficerForm");
    const officerForm = document.getElementById("officerForm");
    if (toggleOfficerBtn && officerForm) {
        toggleOfficerBtn.onclick = () => officerForm.classList.toggle("hidden");
    }

    // 幹部追加
    const addOfficerBtn = document.getElementById("addOfficerBtn");
    if (addOfficerBtn) {
        addOfficerBtn.onclick = () => {
            const input = document.getElementById("officerInput");
            const val = input.value.trim();
            if (!val) return;

            const officers = JSON.parse(localStorage.getItem("officer_list") || "[]");
            officers.push({ id: Date.now(), text: val, checked: false });
            localStorage.setItem("officer_list", JSON.stringify(officers));

            input.value = "";
            officerForm.classList.add("hidden");
            renderOfficers();
        };
    }
    

    // JSON保存
    const exportBtn = document.getElementById("exportJson");
    if (exportBtn) {
        exportBtn.onclick = () => {
            const data = {};
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                data[k] = localStorage.getItem(k);
            }
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `whiteout_backup_${new Date().toISOString().slice(0,10)}.json`;
            a.click();
        };
    }

    // JSON読込
    const importBtn = document.getElementById("importJson");
    const importFile = document.getElementById("importJsonFile");
    if (importBtn && importFile) {
        importBtn.onclick = () => importFile.click();
        importFile.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const data = JSON.parse(evt.target.result);
                    Object.keys(data).forEach(k => localStorage.setItem(k, data[k]));
                    alert("復元完了しました！");
                    init();
                } catch (err) {
                    alert("ファイルの読み込みに失敗しました。");
                }
            };
            reader.readAsText(file);
        };
    }
    // ステーション管理を開く
    const openStationBtn = document.getElementById("openStation");

    if (openStationBtn) {
        openStationBtn.onclick = () => {
            renderStationSummary();
            window.location.href = "station.html";
        };
    }
}

/* ==========================================
   イベント＆幹部 リスト項目の並び替え機能（本体）
========================================== */
function makeListSortable(containerId, storageKey) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let draggedItem = null;

    container.querySelectorAll('.event-item, .officer-item').forEach(item => {
        item.setAttribute('draggable', 'true');
        item.style.cursor = 'grab';

        item.addEventListener('dragstart', (e) => {
            if (['INPUT', 'BUTTON'].includes(e.target.tagName)) {
                e.preventDefault();
                return;
            }
            draggedItem = item;
            item.classList.add('item-dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('item-dragging');
            draggedItem = null;
            saveItemOrder(containerId, storageKey);
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            if (!draggedItem || draggedItem === item) return;

            const rect = item.getBoundingClientRect();
            const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
            container.insertBefore(draggedItem, next ? item.nextSibling : item);
        });
    });
}

function saveItemOrder(containerId, storageKey) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (containerId === 'eventContainer') {
        const events = JSON.parse(localStorage.getItem(storageKey) || "[]");
        const newEvents = [];
        container.querySelectorAll('.event-item').forEach(el => {
            const title = el.querySelector('.event-title')?.textContent.trim();
            const found = events.find(e => e.title === title);
            if (found) newEvents.push(found);
        });
        if (newEvents.length > 0) {
            localStorage.setItem(storageKey, JSON.stringify(newEvents));
        }
    } else if (containerId === 'officerContainer') {
        const officers = JSON.parse(localStorage.getItem(storageKey) || "[]");
        const newOfficers = [];
        container.querySelectorAll('.officer-item').forEach(el => {
            const text = el.querySelector('span')?.textContent.trim();
            const found = officers.find(o => o.text === text);
            if (found) newOfficers.push(found);
        });
        if (newOfficers.length > 0) {
            localStorage.setItem(storageKey, JSON.stringify(newOfficers));
        }
    }
}

function initListSortable() {
    makeListSortable('eventContainer', STORAGE?.events || "ws_events");
    makeListSortable('officerContainer', 'officer_list');
}
// カウントダウンを1秒ごとに更新する処理
setInterval(() => {
    // 繰り返しタスク（英雄募集・倉庫回収）の表示を再生成
    renderRepeat();
}, 1000);
