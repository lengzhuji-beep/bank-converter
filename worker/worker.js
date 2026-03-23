/**
 * Cloudflare Worker: BankTransfer Master バックエンドプロキシ (Hybrid Edition V2)
 * 
 * 1. 常用英単語辞書 (Dictionary) で即時変換
 * 2. 辞書にない場合のみ Gemini AI (Best Effort)
 */

const YAHOO_FURIGANA_URL = 'https://jlp.yahooapis.jp/FuriganaService/V2/furigana';
const GEMINI_MODEL = 'gemini-2.0-flash-lite'; // 2.0 lite の方がクォータが若干緩い傾向

// 大容量カタカナ変換辞書（ビジネス・銀行・IT用語中心）
const WORD_DICTIONARY = {
    "apple": "アップル", "orange": "オレンジ", "machine": "マシン", "corporation": "コーポレーション",
    "company": "カンパニー", "services": "サービス", "group": "グループ", "design": "デザイン",
    "shop": "ショップ", "bank": "バンク", "money": "マネー", "test": "テスト", "book": "ブック",
    "digital": "デジタル", "solution": "ソリューション", "tech": "テック", "inc": "インク",
    "limited": "リミテッド", "japan": "ジャパン", "international": "インターナショナル", "global": "グローバル",
    "systems": "システムズ", "software": "ソフトウェア", "media": "メディア", "news": "ニュース",
    "center": "センター", "station": "ステーション", "hotel": "ホテル", "travel": "トラベル",
    "air": "エアー", "trust": "トラスト", "agency": "エージェンシー", "consulting": "コンサルティング",
    "network": "ネットワーク", "office": "オフィス", "studio": "スタジオ", "factory": "ファクトリー",
    "market": "マーケット", "store": "ストア", "club": "クラブ", "school": "スクール",
    "university": "ユニバーシティ", "college": "カレッジ", "garden": "ガーデン", "park": "パーク",
    "street": "ストリート", "road": "ロード", "blue": "ブルー", "red": "レッド", "green": "グリーン",
    "white": "ホワイト", "black": "ブラック", "gold": "ゴールド", "silver": "シルバー",
    "star": "スター", "sun": "サン", "moon": "ムーン", "river": "リバー", "mountain": "マウンテン",
    "sky": "スカイ", "sea": "シー", "ocean": "オーシャン", "land": "ランド", "forest": "フォレスト",
    "town": "タウン", "city": "シティ", "world": "ワールド", "future": "フューチャー",
    "dream": "ドリーム", "smile": "スマイル", "happy": "ハッピー", "lucky": "ラッキー",
    "seven": "セブン", "one": "ワン", "two": "ツー", "three": "スリー", "four": "フォー", "five": "ファイブ",
    "six": "シックス", "eight": "エイト", "nine": "ナイン", "ten": "テン", "plus": "プラス", "minus": "マイナス",
    "zero": "ゼロ", "point": "ポイント", "high": "ハイ", "low": "ロー", "fast": "ファスト", "slow": "スロー",
    "light": "ライト", "dark": "ダーク", "open": "オープン", "close": "クローズ", "start": "スタート", "stop": "ストップ",
    "go": "ゴー", "come": "カム", "get": "ゲット", "make": "メイク", "take": "テイク", "give": "ギブ", "keep": "キープ",
    "save": "セーブ", "buy": "バイ", "sell": "セル", "pay": "ペイ", "card": "カード", "cash": "キャッシュ",
    "check": "チェック", "bill": "ビル", "account": "アカウント", "login": "ログイン", "user": "ユーザー",
    "admin": "アドミン", "support": "サポート", "help": "ヘルプ", "search": "サーチ", "view": "ビュー", "edit": "エディット",
    "copy": "コピー", "paste": "ペースト", "delete": "デリート", "upload": "アップロード", "download": "ダウンロード",
    "image": "イメージ", "photo": "フォト", "video": "ビデオ", "music": "ミュージック", "sound": "サウンド",
    "voice": "ボイス", "talk": "トーク", "write": "ライト", "read": "リード", "mail": "メール", "post": "ポスト",
    "message": "メッセージ", "chat": "チャット", "phone": "フォン", "mobile": "モバイル", "online": "オンライン",
    "internet": "インターネット", "web": "ウェブ", "site": "サイト", "link": "リンク", "page": "ページ",
    "form": "フォーム", "button": "ボタン", "menu": "メニュー", "list": "リスト", "table": "テーブル",
    "data": "データ", "file": "ファイル", "code": "コード", "tool": "ツール", "app": "アップ", "game": "ゲーム",
    "play": "プレイ", "win": "ウィン", "lose": "ルーズ", "life": "ライフ", "love": "ラブ", "peace": "ピース",
    "nature": "ネイチャー", "animal": "アニマル", "dog": "ドッグ", "cat": "キャット", "bird": "バード",
    "fish": "フィッシュ", "flower": "フラワー", "tree": "ツリー", "fruit": "フルーツ", "food": "フード",
    "drink": "ドリンク", "water": "ウォーター", "coffee": "コーヒー", "tea": "ティー", "milk": "ミルク",
    "bread": "ブレッド", "rice": "ライス", "meat": "ミート", "vegetable": "ベジタブル", "cake": "ケーキ",
    "candy": "キャンディ", "ice": "アイス", "hot": "ホット", "cool": "クール", "warm": "ウォーム", "cold": "コールド",
    "spring": "スプリング", "summer": "サマー", "autumn": "オータム", "winter": "ウィンター", "rain": "レイン",
    "snow": "スノー", "wind": "ウィンド", "cloud": "クラウド", "fire": "ファイヤ", "earth": "アース", "space": "スペース",
    "universe": "ユニバース", "magic": "マジック", "hope": "ホープ", "clear": "クリア", "free": "フリー",
    "best": "ベスト", "good": "グッド", "nice": "ナイス", "fine": "ファイン", "super": "スーパー", "ultra": "ウルトラ",
    "mega": "メガ", "max": "マックス", "mini": "ミニ", "small": "スモール", "big": "ビッグ", "large": "ラージ",
    "wide": "ワイド", "long": "ロング", "short": "ショート", "new": "ニュー", "old": "オールド", "young": "ヤング",
    "rich": "リッチ", "poor": "プア", "strong": "ストロング", "weak": "ウィーク", "hard": "ハード", "easy": "イージー",
    "busy": "ビジー", "ready": "レディ", "finish": "フィニッシュ", "perfect": "パーフェクト", "beauty": "ビューティ",
    "color": "カラー", "style": "スタイル", "real": "リアル", "virtual": "バーチャル", "smart": "スマート",
    "intelligent": "インテリジェント", "automatic": "オートマチック", "manual": "マニュアル", "active": "アクティブ",
    "passive": "パッシブ", "simple": "シンプル", "complex": "コンプレックス", "standard": "スタンダード",
    "custom": "カスタム", "premium": "プレミアム", "basic": "ベーシック", "main": "メイン", "sub": "サブ",
    "top": "トップ", "bottom": "ボトム", "left": "レフト", "right": "ライト", "front": "フロント", "back": "バック",
    "inside": "インサイド", "outside": "アウトサイド", "middle": "ミドル", "near": "ニア", "far": "ファー",
    "here": "ヒア", "there": "ゼア", "now": "ナウ", "past": "パスト", "present": "プレゼント", "weekly": "ウィークリー",
    "monthly": "マンスリー", "yearly": "イヤリー", "daily": "デイリー",
    // 銀行・ビジネス追加分
    "meeting": "ミーティング", "client": "クライアント", "customer": "カスタマー", "business": "ビジネス",
    "partner": "パートナー", "contract": "コントラクト", "report": "レポート", "analysis": "アナリシス",
    "strategy": "ストラテジー", "sales": "セールス", "product": "プロダクト", "item": "アイテム",
    "order": "オーダー", "price": "プライス", "cost": "コスト", "tax": "タックス", "credit": "クレジット",
    "debit": "デビット", "loan": "ローン", "fund": "ファンド", "stock": "ストック", "bond": "ボンド",
    "trade": "トレード", "invest": "インベスト", "asset": "アセット", "profit": "プロフィット", "loss": "ロス",
    "budget": "バジェット", "audit": "オーディット", "legal": "リーガル", "policy": "ポリシー", "rule": "ルール",
    "quality": "クオリティ", "safety": "セーフティ", "risk": "リスク", "danger": "デンジャー", "bug": "バグ",
    "fix": "フィックス", "patch": "パッチ", "update": "アップデート", "version": "バージョン", "release": "リリース",
    "launch": "ローンチ", "event": "イベント", "show": "ショー", "fair": "フェア", "conference": "カンファレンス",
    "seminar": "セミナー", "workshop": "ワークショップ", "training": "トレーニング", "education": "エデュケーション",
    "campus": "キャンパス", "library": "ライブラリ", "print": "プリント", "scan": "スキャン", "fax": "ファックス",
    "email": "イーメール", "cell": "セル", "form": "フォーム", "input": "インプット", "output": "アウトプット",
    "result": "リザルト", "status": "ステータス", "success": "サクセス", "cancel": "キャンセル",
    "true": "トゥルー", "false": "フォルス", "null": "ヌル", "none": "ナン", "void": "ボイド", "empty": "エンプティ",
    "total": "トータル", "sum": "サム", "count": "カウント", "chart": "チャート", "graph": "グラフ",
    "window": "ウィンドウ", "frame": "フレーム", "icon": "アイコン", "logo": "ロゴ", "brand": "ブランド",
    "id": "アイディー", "pass": "パス", "token": "トークン", "key": "キー", "secret": "シークレット",
    "sign": "サイン", "verify": "ベリファイ", "log": "ログ", "history": "ヒストリー", "track": "トラック",
    "trace": "トレース", "debug": "デバッグ", "build": "ビルド", "deploy": "デプロイ", "host": "ホスト",
    "server": "サーバー", "cloud": "クラウド", "db": "デービー", "storage": "ストレージ", "drive": "ドライブ",
    "disk": "ディスク", "ram": "ラム", "cpu": "シーピーユー", "gpu": "ジーピーユー", "core": "コア",
    "extra": "エクストラ", "mega": "メガ", "giga": "ギガ", "tera": "テラ", "peta": "ペタ",
    "marketing": "マーケティング", "management": "マネジメント", "advertising": "アドバタイジング",
    "creative": "クリエイティブ", "experience": "エクスペリエンス", "innovation": "イノベーション",
    "performance": "パフォーマンス", "efficiency": "エフィシェンシー", "effective": "エフェクティブ",
    "security": "セキュリティ", "privacy": "プライバシー", "condition": "コンディション", "option": "オプション",
    "setting": "セッティング", "control": "コントロール", "remote": "リモート", "local": "ローカル",
    "system": "システム", "process": "プロセス", "action": "アクション", "activity": "アクティビティ",
    "energy": "エネルギー", "power": "パワー", "dynamic": "ダイナミック", "static": "スタティック",
    "classic": "クラシック", "modern": "モダン", "vision": "ビジョン", "mission": "ミッション",
    "value": "バリュー", "culture": "カルチャー", "message": "メッセージ"
};

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: CORS_HEADERS });
        }

        if (request.method !== 'POST') {
            return jsonResponse({ error: 'Method not allowed' }, 405);
        }

        let body;
        try { body = await request.json(); } catch (e) { return jsonResponse({ error: 'Invalid JSON' }, 400); }

        if (url.pathname === '/transliterate') {
            const { word } = body;
            if (!word || typeof word !== 'string') { return jsonResponse({ error: 'Missing "word" parameter' }, 400); }

            const lowerWord = word.toLowerCase();

            // 1. 辞書チェック
            if (WORD_DICTIONARY[lowerWord]) {
                return jsonResponse({ katakana: WORD_DICTIONARY[lowerWord], source: 'dictionary' });
            }

            // 2. 辞書にない場合 → Gemini AI
            if (!env.GEMINI_API_KEY) { return jsonResponse({ katakana: null, source: null }); }

            const prompt = `Convert English to Katakana pronunciation. Return only Katakana.
Input: ${word}`;

            try {
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;
                const response = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.1, maxOutputTokens: 20 }
                    }),
                });

                const data = await response.json();
                let katakana = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;

                if (katakana && /[a-zA-Z]/.test(katakana)) { katakana = null; }

                return jsonResponse({ katakana, source: 'gemini' });
            } catch (e) {
                return jsonResponse({ katakana: null, source: 'error', error: e.message });
            }
        }

        const { q } = body;
        if (!q || typeof q !== 'string') { return jsonResponse({ error: 'Missing "q" parameter' }, 400); }

        try {
            const yahooRes = await fetch(YAHOO_FURIGANA_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': `Yahoo AppID: ${env.YAHOO_CLIENT_ID}`,
                },
                body: JSON.stringify({
                    id: '1', jsonrpc: '2.0',
                    method: 'jlp.furiganaservice.furigana',
                    params: { q, grade: 1 },
                }),
            });
            const data = await yahooRes.json();
            return jsonResponse(data, yahooRes.ok ? 200 : yahooRes.status);
        } catch (e) {
            return jsonResponse({ error: 'Upstream API error', detail: e.message }, 502);
        }
    },
};
