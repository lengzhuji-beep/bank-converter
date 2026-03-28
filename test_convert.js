const fs = require('fs');

global.window = {}; // mock
global.document = {
    getElementById: () => ({
        addEventListener: () => {},
        innerHTML: '',
        style: {},
        value: '',
        classList: { add: ()=>{}, remove: ()=>{} },
        appendChild: ()=>{},
        querySelector: () => ({ style: {}, classList: { add: ()=>{}, remove: ()=>{} } })
    }),
    querySelector: () => ({ addEventListener: () => {}, style: {} }),
    createElement: () => ({ classList: { add: () => {} }, textContent: '', appendChild: () => {}, onclick: () => {} })
};

eval(fs.readFileSync('converter.js', 'utf8'));

// mock proxy
global.convertKanji = async (str) => str; // dummy
global.getEnglishKatakanaFromProxy = async (t) => null;

async function run() {
    console.log("Testing...");
    try {
        await convert(); // convert the empty input? Wait, input takes from DOM.
        // Let's call the logic directly by modifying DOM mock
    } catch (e) {
        console.error(e);
    }
}
run();
