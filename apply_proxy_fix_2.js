const fs = require('fs');
let code = fs.readFileSync('converter.js', 'utf8');

const regex = /async function getEnglishKatakanaFromProxy\([\s\S]*?\}\r?\n\}/m;

const replacement = `async function getEnglishKatakanaFromProxy(word) {
    if (!PROXY_URL || PROXY_URL.includes('YOUR_WORKER')) return null;
    try {
        const res = await fetch(PROXY_URL + '/transliterate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word: word.toLowerCase() })
        });
        if (!res.ok) return null;
        const json = await res.json();
        return json.katakana || null;
    } catch (e) {
        return null;
    }
}`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('converter.js', code);
    console.log('Successfully applied accurate fetch fix.');
} else {
    console.log('Could not find function to replace.');
    process.exit(1);
}
