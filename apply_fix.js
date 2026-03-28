const fs = require('fs');
let code = fs.readFileSync('converter.js', 'utf8');

const startStr = '/**\r\n * ローマ字 → カタカナ変換テーブル';
const startIdx = code.indexOf(startStr);
if (startIdx === -1) {
    console.error('Start index not found! Trying with just \n...');
    const startIdx2 = code.indexOf('/**\n * ローマ字 → カタカナ変換テーブル');
    if (startIdx2 === -1) {
        console.error('Still not found.');
        process.exit(1);
    }
}
const actualStartIdx = code.indexOf(startStr) !== -1 ? code.indexOf(startStr) : code.indexOf('/**\n * ローマ字 → カタカナ変換テーブル');

const endStr1 = 'return result;\r\n}';
const endStr2 = 'return result;\n}';
let endIdx = code.indexOf(endStr1, actualStartIdx);
let usingEndStr = endStr1;

if (endIdx === -1) {
    endIdx = code.indexOf(endStr2, actualStartIdx);
    usingEndStr = endStr2;
    if (endIdx === -1) {
        console.error('End index not found!');
        process.exit(1);
    }
}
endIdx += usingEndStr.length;

const replacement = fs.readFileSync('fix_block.js', 'utf8');
const newCode = code.substring(0, actualStartIdx) + replacement + code.substring(endIdx);
fs.writeFileSync('converter.js', newCode, 'utf8');
console.log('Successfully replaced code!');
