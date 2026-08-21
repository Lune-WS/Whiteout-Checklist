/* ==========================================
   Whiteout Checklist 
   data.js
========================================== */


// ==========================================
// キャラクター設定 (SettingManager)
// ==========================================

const SettingManager = {
    // 現在の設定を取得する
    get: function() {
        const saved = localStorage.getItem("ws_settings");
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("設定の読み込みに失敗しました", e);
            }
        }
        // 初回起動時や設定がない時のデフォルト値
        return {
            characters: ["Lune", "Melune", "Chocolat", "Vanille"],
            alliances: {
                Lune: "MEL",
                Melune: "MEL",
                Chocolat: "RxR",
                Vanille: "RxR"
            }
        };
    },
    // 設定を保存して画面を更新する
    save: function(data) {
        localStorage.setItem("ws_settings", JSON.stringify(data));
        location.reload(); 
    }
};

// ==========================================
// デイリー
// ==========================================

const DAILY_TASKS = [

    {
        id: "daily_chat",
        label: "💬 チャット確認"
    },

    {
        id: "daily_red",
        label: "🔴 赤ぽち確認"
    },

    {
        id: "daily_station",
        label: "🏭 ステーションチェック"
    },

    {
        id: "daily_event",
        label: "🎪 イベントタイマー"
    },

    {
        id: "daily_union",
        label: "🛒 同盟ショップ確認"
    },

    {
        id: "daily_shop",
        label: "🛍 ショップ買い物"
    }

];


// ==========================================
// 都市チェック
// ==========================================

const CITY_TASKS = [

    {
        id: "city_route",
        label: "🛣 旅路",
        double: true
    },

    {
        id: "city_build",
        label: "🏗 建築",
        double: true
    },

    {
        id: "city_train",
        label: "⚔ 兵士訓練",
        double: true
    },

    {
        id: "city_research",
        label: "🔬 研究",
        double: true
    },

    {
        id: "city_school",
        label: "🎓 戦争学園",
        double: true
    },

    {
        id: "city_specialist",
        label: "👨‍🔧 専門家",
        double: true
    },

    {
        id: "city_puzzle",
        label: "🧩 パズル",
        double: true
    },

    {
        id: "city_lab",
        label: "⚗ 錬成実験室"
    },

    {
        id: "city_underground",
        label: "🌋 地底探検"
    },

    {
        id: "city_island",
        label: "🏝 暁の島いいね"
    },

    {
        id: "city_arena",
        label: "🏟 競技場"
    },

    {
        id: "city_alliance_coin",
        label: "🤝 同盟コイン集め"
    }


];
// ==========================================
// 時間チェック
// ==========================================

const TIME_GROUPS = [

    {
        id: "9",
        title: "🌅 9:00",
        className: "time9"
    },

    {
        id: "17",
        title: "🌇 17:00",
        className: "time17"
    },

    {
        id: "1",
        title: "🌙 1:00",
        className: "time1"
    }

];

const TIME_TASKS = [

    {
        id: "search",
        label: "🔍 探検回収",
        times: ["9","17","1"]
    },

    {
        id: "island",
        label: "🏝 暁の島",
        times: ["9","17","1"]
    },

    {
        id: "fire",
        label: "🔥 灯台",
        note: "日曜：烈火注意",
        times: ["9","17","1"]
    },

    {
        id: "mine",
        label: "⛏ 採集",
        times: ["9","17","1"]
    },

    {
        id: "rally",
        label: "🤝 自動集結",
        times: ["9","17","1"]
    },

    {
        id: "help",
        label: "🔗 同盟支援",
        times: ["9","17","1"]
    },

    {
        id: "pet",
        label: "🐾 ペット",
        times: ["9","17"]
    },

    {
        id: "supply",
        label: "🎁 旅の補給",
        times: ["9","17"]
    }

];

// ==========================================
// 初期幹部メニュー
// ==========================================

const DEFAULT_OFFICERS = [

    "熊予約",

    "大型採集9:00",

    "大型採集21:00",

    "コイン"

];

// ==========================================
// 熊罠
// ==========================================

// 基準日
const BEAR_START = "2026-07-31";

// 開催間隔（日）
const BEAR_INTERVAL = 2;

// デフォルト時間
const DEFAULT_BEAR_TIME = "21:00";

// ==========================================
// LocalStorage
// ==========================================

const STORAGE = {

    character: "ws_current_character",

    events: "ws_events",

    lastReset: "ws_last_reset",

    backup: "ws_backup"

};
