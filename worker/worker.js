/**
 * Cloudflare Worker: BankTransfer Master バックエンドプロキシ (Hybrid Edition V3)
 * 
 * 1. 大容量の常用英単語辞書で即時変換 (429エラー対策)
 * 2. 辞書にない場合のみ Gemini AI (Best Effort)
 */

const YAHOO_FURIGANA_URL = 'https://jlp.yahooapis.jp/FuriganaService/V2/furigana';
const GEMINI_MODEL = 'gemini-1.5-flash'; // 1.5-flashの方がクォータが若干安定する場合があるため戻す

const WORD_DICTIONARY = {
    // 基本・果物
    "apple": "アップル", "orange": "オレンジ", "banana": "バナナ", "grape": "グレープ",
    // 一般名詞
    "machine": "マシン", "umbrella": "アンブレラ", "headache": "ヘッデイク", "computer": "コンピューター",
    "software": "ソフトウェア", "hardware": "ハードウェア", "learning": "ラーニング", "science": "サイエンス",
    "service": "サービス", "support": "サポート", "info": "インフォ", "information": "インフォメーション",
    "data": "データ", "network": "ネットワーク", "system": "システム", "systems": "システムズ",
    "cloud": "クラウド", "digital": "デジタル", "global": "グローバル", "japan": "ジャパン",
    "tokyo": "トウキョウ", "osaka": "オオサカ", "group": "グループ", "center": "センター",
    "station": "ステーション", "hotel": "ホテル", "office": "オフィス", "studio": "スタジオ",
    "design": "デザイン", "creative": "クリエイティブ", "solution": "ソリューション", "solutions": "ソリューションズ",
    "business": "ビジネス", "marketing": "マーケティング", "management": "マネジメント", "consulting": "コンサルティング",
    "company": "カンパニー", "corporation": "コーポレーション", "inc": "インク", "limited": "リミテッド",
    "holdings": "ホールディングス", "partners": "パートナーズ", "agency": "エージェンシー", "trust": "トラスト",
    "bank": "バンク", "money": "マネー", "payment": "ペイメント", "credit": "クレジット", "card": "カード",
    "cash": "キャッシュ", "check": "チェック", "account": "アカウント", "order": "オーダー", "price": "プライス",
    "shop": "ショップ", "store": "ストア", "market": "マーケット", "factory": "ファクトリー", "lab": "ラボ",
    "university": "ユニバーシティ", "college": "カレッジ", "school": "スクール", "education": "エデュケーション",
    "medical": "メディカル", "health": "ヘルス", "care": "ケア", "life": "ライフ", "style": "スタイル",
    "home": "ホーム", "house": "ハウス", "building": "ビルディング", "garden": "ガーデン", "park": "パーク",
    "blue": "ブルー", "red": "レッド", "green": "グリーン", "white": "ホワイト", "black": "ブラック",
    "gold": "ゴールド", "silver": "シルバー", "star": "スター", "sun": "サン", "moon": "ムーン",
    "sky": "スカイ", "sea": "シー", "ocean": "オーシャン", "land": "ランド", "world": "ワールド",
    "future": "フューチャー", "dream": "ドリーム", "hope": "ホープ", "smile": "スマイル",
    "happy": "ハッピー", "lucky": "ラッキー", "plus": "プラス", "minus": "マイナス",
    "start": "スタート", "stop": "ストップ", "launch": "ローンチ", "event": "イベント", "show": "ショー",
    "fair": "フェア", "news": "ニュース", "media": "メディア", "book": "ブック", "travel": "トラベル",
    "air": "エアー", "energy": "エネルギー", "power": "パワー", "tech": "テック", "development": "デベロップメント",
    "engineering": "エンジニアリング", "planning": "プランニング", "strategy": "ストラテジー",
    "analysis": "アナリシス", "audit": "オーディット", "legal": "リーガル", "tax": "タックス",
    "contract": "コントラクト", "security": "セキュリティ", "privacy": "プライバシー", "access": "アクセス",
    "login": "ログイン", "user": "ユーザー", "admin": "アドミン", "support": "サポート",
    "help": "ヘルプ", "message": "メッセージ", "mail": "メール", "chat": "チャット",
    "forum": "フォーラム", "blog": "ブログ", "social": "ソーシャル", "video": "ビデオ", "audio": "オーディオ",
    "music": "ミュージック", "image": "イメージ", "photo": "フォト", "icon": "アイコン", "logo": "ロゴ",
    "brand": "ブランド", "marketing": "マーケティング", "sales": "セールス", "product": "プロダクト",
    "item": "アイテム", "stock": "ストック", "inventory": "インベントリ", "shipping": "シッピング",
    "delivery": "デリバリー", "returns": "リターンズ", "gift": "ギフト", "special": "スペシャル",
    "premium": "プレミアム", "standard": "スタンダード", "basic": "ベーシック", "entry": "エントリー",
    "expert": "エキスパート", "professional": "プロフェッショナル", "smart": "スマート", "auto": "オート",
    "active": "アクティブ", "passive": "パッシブ", "real": "リアル", "virtual": "バーチャル",
    "online": "オンライン", "offline": "オフライン", "mobile": "モバイル", "app": "アップ", "web": "ウェブ",
    "site": "サイト", "page": "ページ", "link": "リンク", "form": "フォーム", "button": "ボタン",
    "list": "リスト", "table": "テーブル", "chart": "チャート", "graph": "グラフ", "map": "マップ",
    "view": "ビュー", "edit": "エディット", "copy": "コピー", "paste": "ペースト", "delete": "デリート",
    "upload": "アップロード", "download": "ダウンロード", "sync": "シンク", "refresh": "リフレッシュ",
    "setting": "セッティング", "control": "コントロール", "remote": "リモート", "local": "ローカル",
    "version": "バージョン", "patch": "パッチ", "error": "エラー", "success": "サクセス",
    "warning": "ワーニング", "danger": "デンジャー", "safe": "セーフ", "best": "ベスト",
    "butterfly": "バタフライ" // ユーザーテスト用の単語も追加
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

            // 1. 辞書チェック (Dictionary Lookup)
            if (WORD_DICTIONARY[lowerWord]) {
                return jsonResponse({ katakana: WORD_DICTIONARY[lowerWord], source: 'dictionary' });
            }

            // 2. 辞書にない場合 → Gemini AI
            if (!env.GEMINI_API_KEY) { return jsonResponse({ katakana: null, source: null }); }

            const prompt = `Convert the English word "${word}" to Katakana pronunciation.
Return ONLY the Katakana. If it is a name or not English, return "NONE".`;

            try {
                // モデル名を環境やリストに合わせて調整。ここでは汎用的な1.5-flashを試行
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`;
                
                const response = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.1, maxOutputTokens: 20 }
                    }),
                });

                const data = await response.json();
                
                // エラーレスポンスの処理
                if (data.error) {
                    return jsonResponse({ 
                        katakana: null, 
                        source: 'gemini_error', 
                        error: data.error.message 
                    });
                }

                let katakana = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;

                if (katakana === 'NONE' || (katakana && /[a-zA-Z]/.test(katakana))) {
                    katakana = null;
                }

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
