const ROMAJI_CHART = {
    'a':'ｱ','i':'ｲ','u':'ｳ','e':'ｴ','o':'ｵ',
    'ka':'ｶ','ki':'ｷ','ku':'ｸ','ke':'ｹ','ko':'ｺ',
    'ga':'ｶﾞ','gi':'ｷﾞ','gu':'ｸﾞ','ge':'ｹﾞ','go':'ｺﾞ',
    'sa':'ｻ','shi':'ｼ','su':'ｽ','se':'ｾ','so':'ｿ',
    'za':'ｻﾞ','ji':'ｼﾞ','zu':'ｽﾞ','ze':'ｾﾞ','zo':'ｿﾞ',
    'ta':'ﾀ','chi':'ﾁ','tsu':'ﾂ','te':'ﾃ','to':'ﾄ',
    'da':'ﾀﾞ','di':'ﾁﾞ','du':'ﾂﾞ','de':'ﾃﾞ','do':'ﾄﾞ',
    'na':'ﾅ','ni':'ﾆ','nu':'ﾇ','ne':'ﾈ','no':'ﾉ',
    'ha':'ﾊ','hi':'ﾋ','fu':'ﾌ','he':'ﾍ','ho':'ﾎ',
    'ba':'ﾊﾞ','bi':'ﾋﾞ','bu':'ﾌﾞ','be':'ﾍﾞ','bo':'ﾎﾞ',
    'pa':'ﾊﾟ','pi':'ﾋﾟ','pu':'ﾌﾟ','pe':'ﾍﾟ','po':'ﾎﾟ',
    'ma':'ﾏ','mi':'ﾐ','mu':'ﾑ','me':'ﾒ','mo':'ﾓ',
    'ya':'ﾔ','yu':'ﾕ','yo':'ﾖ',
    'ra':'ﾗ','ri':'ﾘ','ru':'ﾙ','re':'ﾚ','ro':'ﾛ',
    'wa':'ﾜ','wo':'ｦ','n':'ﾝ',
    'kya':'ｷｬ','kyu':'ｷｭ','kyo':'ｷｮ','sha':'ｼｬ','shu':'ｼｭ','sho':'ｼｮ',
    'cha':'ﾁｬ','chu':'ﾁｭ','cho':'ﾁｮ','nya':'ﾆｬ','nyu':'ﾆｭ','nyo':'ﾆｮ',
    'hya':'ﾋｬ','hyu':'ﾋｭ','hyo':'ﾋｮ','mya':'ﾐｬ','myu':'ﾐｭ','myo':'ﾐｮ',
    'rya':'ﾘｬ','ryu':'ﾘｭ','ryo':'ﾘｮ','gya':'ｷﾞｬ','gyu':'ｷﾞｭ','gyo':'ｷﾞｮ',
    'ja':'ｼﾞｬ','ju':'ｼﾞｭ','jo':'ｼﾞｮ','bya':'ﾋﾞｬ','byu':'ﾋﾞｭ','byo':'ﾋﾞｮ',
    'pya':'ﾋﾟｬ','pyu':'ﾋﾟｭ','pyo':'ﾋﾟｮ',
    'm':'ﾝ','l':'ﾙ','r':'ﾙ','v':'ｳﾞ','th':'ｻ','ts':'ﾂ'
};

/** ローマ字文字列をカタカナに変換（最長一致） */
function romajiToKatakana(str) {
    let res = '', i = 0;
    const s = str.toLowerCase();
    while (i < s.length) {
        let matched = false;
        // 3文字から1文字までマッチを試行
        for (let len = 3; len >= 1; len--) {
            const part = s.substring(i, i + len);
            if (ROMAJI_CHART[part]) {
                res += ROMAJI_CHART[part];
                i += len;
                matched = true;
                break;
            }
        }
        if (!matched) {
            // 子音の重なり（促音「ッ」）の判定
            if (i + 1 < s.length && s[i] === s[i+1] && s[i].match(/[a-z]/)) {
                res += 'ｯ';
                i += 1;
            } else {
                // マッチしない1文字はそのまま残す（数字など）
                res += s[i].toUpperCase();
                i++;
            }
        }
    }
    return res;
}

/**
 * 英字をカタカナに変換するヘルパー
 * 1. 辞書マッチ（英単語）
 * 2. API 呼び出し（英単語・高度な変換） -> 漢字が混じったら却下
 * 3. ローマ字変換（フォールバック：確実なカナ化）
 */
async function applyEnglishKatakana(text) {
    const tokens = [...new Set(text.match(/[A-Z]+/g) || [])];
    let result = text;
    for (const token of tokens) {
        // 1. 辞書マッチ（最優先：確実な英単語）
        const fromDict = ENGLISH_WORDS_TO_KATAKANA[token];
        if (fromDict) { result = result.split(token).join(fromDict); continue; }

        // 2. API 呼び出し（英単語の読みを取得）
        let fromApi = await getEnglishKatakanaFromProxy(token);
        if (fromApi && !/[\u4E00-\u9FFF]/.test(fromApi)) {
            // API結果に漢字が含まれない場合（純粋なカタカナ読み）、それを採用
            const finalApi = processSmallChars(toHalfWidthKatakana(fromApi));
            result = result.split(token).join(finalApi);
            continue;
        }

        // 3. ローマ字変換（最終フォールバック：名前や未知の語）
        const fromRomaji = romajiToKatakana(token);
        // 半角カタカナまたは英数字のみになるまで整形
        const finalRomaji = processSmallChars(toHalfWidthKatakana(fromRomaji));
        result = result.split(token).join(finalRomaji);
    }
    return result;
}
