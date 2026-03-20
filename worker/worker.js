/**
 * Cloudflare Worker: BankTransfer Master バックエンドプロキシ
 *
 * エンドポイント:
 *   POST /         → Yahoo! Japan ルビ振りAPI（漢字→ひらがな）
 *   POST /transliterate → Google Input Tools（英字→カタカナ）
 *
 * 秘匿情報:
 *   YAHOO_CLIENT_ID はCloudflareシークレットで管理（コードには書かない）
 */

const YAHOO_FURIGANA_URL = 'https://jlp.yahooapis.jp/FuriganaService/V2/furigana';

// Google Input Tools: ローマ字→日本語変換（非公式APIだが安定して動作）
// itc=ja-t-i0-und: 日本語入力変換モード
const GOOGLE_INPUT_TOOLS_URL =
    'https://inputtools.google.com/request?itc=ja-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8';

// CORSヘッダー
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

        // プリフライトリクエスト
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: CORS_HEADERS });
        }

        if (request.method !== 'POST') {
            return jsonResponse({ error: 'Method not allowed' }, 405);
        }

        let body;
        try {
            body = await request.json();
        } catch (e) {
            return jsonResponse({ error: 'Invalid JSON' }, 400);
        }

        // ============================================================
        // POST /transliterate  英字（ローマ字）→ カタカナ
        // ============================================================
        if (url.pathname === '/transliterate') {
            const { word } = body;
            if (!word || typeof word !== 'string') {
                return jsonResponse({ error: 'Missing "word" parameter' }, 400);
            }

            try {
                const res = await fetch(
                    `${GOOGLE_INPUT_TOOLS_URL}&text=${encodeURIComponent(word.toLowerCase())}`,
                    {
                        headers: {
                            'User-Agent': 'Mozilla/5.0',
                            'Referer': 'https://www.google.com/',
                        },
                    }
                );
                const text = await res.text();

                // レスポンス例: ["SUCCESS",[["com",[["コム",[]]],""]]]
                const json = JSON.parse(text);
                if (
                    json[0] === 'SUCCESS' &&
                    json[1]?.[0]?.[1]?.[0]?.[0]
                ) {
                    return jsonResponse({ katakana: json[1][0][1][0][0] });
                }
                return jsonResponse({ katakana: null });
            } catch (e) {
                return jsonResponse({ katakana: null });
            }
        }

        // ============================================================
        // POST /  （デフォルト）漢字 → ひらがな（Yahoo Furigana API）
        // ============================================================
        const { q } = body;
        if (!q || typeof q !== 'string') {
            return jsonResponse({ error: 'Missing "q" parameter' }, 400);
        }

        try {
            const yahooRes = await fetch(YAHOO_FURIGANA_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': `Yahoo AppID: ${env.YAHOO_CLIENT_ID}`,
                },
                body: JSON.stringify({
                    id: '1',
                    jsonrpc: '2.0',
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
