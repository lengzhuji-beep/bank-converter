const input = document.getElementById('companyInput');

// ============================================================
// プロキシURL: Cloudflare Worker (Yahoo Furigana APIを安全に呼び出す)
// ============================================================
const PROXY_URL = 'https://bank-transfer-furigana-proxy.pengi-dev.workers.dev';

const resultDisplay = document.getElementById('convertedResult');
const charCountDisplay = document.getElementById('charCount');
const copyBtn = document.getElementById('copyBtn');
const candidatesList = document.getElementById('candidatesList');
const candidatesSection = document.getElementById('candidatesSection');

// Rule status elements
const rules = {
    katakana: document.getElementById('rule-katakana'),
    uppercase: document.getElementById('rule-uppercase'),
    smallchar: document.getElementById('rule-smallchar'),
    symbols: document.getElementById('rule-symbols'),
    corp: document.getElementById('rule-corp'),
    length: document.getElementById('rule-length')
};

// ============================================================
// 1. 法人略号テーブル（銀行公式資料準拠）
//    target: 入力される法人格の漢字
//    abbr:   略号（半角カタカナ）
//    位置判定:  先頭 → abbr + ")"  /  末尾 → "(" + abbr  /  中間 → "(" + abbr + ")"
// ============================================================
const CORP_ABBREVIATIONS = [
    // 1. 法人
    { target: '株式会社',           abbr: 'ｶ' },
    { target: '有限会社',           abbr: 'ﾕ' },
    { target: '合名会社',           abbr: 'ﾒ' },
    { target: '合資会社',           abbr: 'ｼ' },
    { target: '合同会社',           abbr: 'ﾄﾞ' },
    { target: '医療法人社団',       abbr: 'ｲ' },
    { target: '医療法人財団',       abbr: 'ｲ' },
    { target: '社会医療法人',       abbr: 'ｲ' },
    { target: '医療法人',           abbr: 'ｲ' },
    { target: '財団法人',           abbr: 'ｻﾞｲ' },
    { target: '一般財団法人',       abbr: 'ｻﾞｲ' },
    { target: '公益財団法人',       abbr: 'ｻﾞｲ' },
    { target: '社団法人',           abbr: 'ｼﾔ' },
    { target: '一般社団法人',       abbr: 'ｼﾔ' },
    { target: '公益社団法人',       abbr: 'ｼﾔ' },
    { target: '宗教法人',           abbr: 'ｼｭｳ' },
    { target: '学校法人',           abbr: 'ｶﾞｸ' },
    { target: '社会福祉法人',       abbr: 'ﾌｸ' },
    { target: '更生保護法人',       abbr: 'ｺﾞ' },
    { target: '相互会社',           abbr: 'ｿ' },
    { target: '特定非営利活動法人', abbr: 'ﾄｸﾋ' },
    { target: '独立行政法人',       abbr: 'ﾄﾞｸ' },
    { target: '弁護士法人',         abbr: 'ﾍﾞﾝ' },
    { target: '有限責任中間法人',   abbr: 'ﾁｭｳ' },
    { target: '無限責任中間法人',   abbr: 'ﾁｭｳ' },
    { target: '行政書士法人',       abbr: 'ｷﾞﾖ' },
    { target: '司法書士法人',       abbr: 'ｼﾎｳ' },
    { target: '税理士法人',         abbr: 'ｾﾞｲ' },
    { target: '国立大学法人',       abbr: 'ﾀﾞｲ' },
    { target: '公立大学法人',       abbr: 'ﾀﾞｲ' },
    { target: '農事組合法人',       abbr: 'ﾉｳ' },
    { target: '管理組合法人',       abbr: 'ｶﾝﾘ' },
    { target: '社会保険労務士法人', abbr: 'ﾛｳﾑ' },
    // 2. 営業所
    { target: '営業所',             abbr: 'ｴｲ' },
    { target: '出張所',             abbr: 'ｼｭﾂ' },
    // 3. 事業
    { target: '連合会',             abbr: 'ﾚﾝ' },
    { target: '共済組合',           abbr: 'ｷｮｳｻｲ' },
    { target: '協同組合',           abbr: 'ｷｮｳｸﾐ' },
    { target: '生命保険',           abbr: 'ｾｲﾒｲ' },
    { target: '海上火災保険',       abbr: 'ｶｲｼﾞｮｳ' },
    { target: '火災海上保険',       abbr: 'ｶｻｲ' },
    { target: '健康保険組合',       abbr: 'ｹﾝﾎﾟ' },
    { target: '国民健康保険組合',   abbr: 'ｺｸﾎ' },
    { target: '国民健康保険団体連合会', abbr: 'ｺｸﾎﾚﾝ' },
    { target: '社会保険診療報酬支払基金', abbr: 'ｼﾔﾎ' },
    { target: '厚生年金基金',       abbr: 'ｺｳﾈﾝ' },
    { target: '従業員組合',         abbr: 'ｼﾞｭｳｸﾐ' },
    { target: '労働組合',           abbr: 'ﾛｳｸﾐ' },
    { target: '生活協同組合',       abbr: 'ｾｲｷｮｳ' },
    { target: '食糧販売協同組合',   abbr: 'ｼﾞｮｳﾊﾝｷｮｳ' },
    { target: '国家公務員共済組合連合会', abbr: 'ｺｸｷｮｳﾚﾝ' },
    { target: '農業協同組合連合会', abbr: 'ﾉｳｷｮｳﾚﾝ' },
    { target: '農業協同組合',       abbr: 'ﾉｳｷｮｳ' },
    { target: '経済農業協同組合連合会', abbr: 'ｹｲｻﾞｲﾚﾝ' },
    { target: '共済農業協同組合連合会', abbr: 'ｷｮｳｻｲﾚﾝ' },
    { target: '漁業協同組合',       abbr: 'ｷﾞｮｷｮｳ' },
    { target: '漁業協同組合連合会', abbr: 'ｷﾞｮﾚﾝ' },
    { target: '漁業組合',           abbr: 'ｷﾞｮｸﾐ' },
    { target: '社会福祉協議会',     abbr: 'ｼﾔｷｮｳ' },
    { target: '特別養護老人ホーム', abbr: 'ﾄｸﾖｳ' },
    { target: '有限責任事業組合',   abbr: 'ﾕｸﾐ' },
    { target: '信用金庫',           abbr: 'ｼﾝｷﾝ' },
    { target: '信用組合',           abbr: 'ｼﾝｸﾐ' },
    { target: '労働金庫',           abbr: 'ﾛｳｷﾝ' },
    { target: '信用農業協同組合連合会', abbr: 'ｼﾝﾚﾝ' },
    { target: '信用漁業協同組合連合会', abbr: 'ｼﾝｷﾞｮﾚﾝ' },
    { target: '農業組合',           abbr: 'ﾉｳｷｮｳ' },
];

// ============================================================
// 2. ひらがな → カタカナ変換テーブル
// ============================================================
const HIRAGANA_TO_KATAKANA = {
    'ぁ': 'ァ', 'あ': 'ア', 'ぃ': 'ィ', 'い': 'イ', 'ぅ': 'ゥ', 'う': 'ウ',
    'ぇ': 'ェ', 'え': 'エ', 'ぉ': 'ォ', 'お': 'オ',
    'か': 'カ', 'が': 'ガ', 'き': 'キ', 'ぎ': 'ギ', 'く': 'ク', 'ぐ': 'グ',
    'け': 'ケ', 'げ': 'ゲ', 'こ': 'コ', 'ご': 'ゴ',
    'さ': 'サ', 'ざ': 'ザ', 'し': 'シ', 'じ': 'ジ', 'す': 'ス', 'ず': 'ズ',
    'せ': 'セ', 'ぜ': 'ゼ', 'そ': 'ソ', 'ぞ': 'ゾ',
    'た': 'タ', 'だ': 'ダ', 'ち': 'チ', 'ぢ': 'ヂ', 'っ': 'ッ', 'つ': 'ツ',
    'づ': 'ヅ', 'て': 'テ', 'で': 'デ', 'と': 'ト', 'ど': 'ド',
    'な': 'ナ', 'に': 'ニ', 'ぬ': 'ヌ', 'ね': 'ネ', 'の': 'ノ',
    'は': 'ハ', 'ば': 'バ', 'ぱ': 'パ', 'ひ': 'ヒ', 'び': 'ビ', 'ぴ': 'ピ',
    'ふ': 'フ', 'ぶ': 'ブ', 'ぷ': 'プ', 'へ': 'ヘ', 'べ': 'ベ', 'ぺ': 'ペ',
    'ほ': 'ホ', 'ぼ': 'ボ', 'ぽ': 'ポ',
    'ま': 'マ', 'み': 'ミ', 'む': 'ム', 'め': 'メ', 'も': 'モ',
    'ゃ': 'ャ', 'や': 'ヤ', 'ゅ': 'ュ', 'ゆ': 'ユ', 'ょ': 'ョ', 'よ': 'ヨ',
    'ら': 'ラ', 'り': 'リ', 'る': 'ル', 'れ': 'レ', 'ろ': 'ロ',
    'わ': 'ワ', 'ゐ': 'ヰ', 'ゑ': 'ヱ', 'を': 'ヲ', 'ん': 'ン',
    'ゔ': 'ヴ', 'ゕ': 'ヵ', 'ゖ': 'ヶ'
};

// ============================================================
// 3. 漢字1文字 → 音読み（代表音読み）の動的変換テーブル
//    ユーザーの入力漢字をその場でカタカナ近似読みに変換するための
//    1文字単位の多目的マッピング
// ============================================================
const KANJI_ON_READINGS = {
    '亜': 'ア', '哀': 'アイ', '愛': 'アイ', '悪': 'アク', '握': 'アク',
    '圧': 'アツ', '安': 'アン', '案': 'アン', '以': 'イ', '位': 'イ',
    '医': 'イ', '意': 'イ', '異': 'イ', '移': 'イ', '員': 'イン',
    '因': 'イン', '引': 'イン', '飲': 'イン', '院': 'イン', '右': 'ウ',
    '宇': 'ウ', '運': 'ウン', '雲': 'ウン', '営': 'エイ', '影': 'エイ',
    '永': 'エイ', '英': 'エイ', '衛': 'エイ', '易': 'エキ', '益': 'エキ',
    '液': 'エキ', '円': 'エン', '遠': 'エン', '沿': 'エン', '援': 'エン',
    '演': 'エン', '応': 'オウ', '往': 'オウ', '欧': 'オウ', '奥': 'オク',
    '屋': 'オク', '音': 'オン', '温':'オン', '家': 'カ', '科': 'カ',
    '火': 'カ', '花': 'カ', '貨': 'カ', '課': 'カ', '価': 'カ',
    '化': 'カ', '会': 'カイ', '海': 'カイ', '界': 'カイ', '開': 'カイ',
    '外': 'ガイ', '害': 'ガイ', '各': 'カク', '格': 'カク', '学': 'ガク',
    '活': 'カツ', '合': 'ゴウ', '感': 'カン', '冠': 'カン', '完': 'カン',
    '官': 'カン', '観': 'カン', '環': 'カン', '関': 'カン', '管': 'カン',
    '館': 'カン', '企': 'キ', '機': 'キ', '期': 'キ', '基': 'キ',
    '記': 'キ', '技': 'ギ', '議': 'ギ', '給': 'キュウ', '共': 'キョウ',
    '協': 'キョウ', '境': 'キョウ', '教': 'キョウ', '業': 'ギョウ',
    '銀': 'ギン', '金': 'キン', '区': 'ク', '具': 'グ', '組': 'ソ',
    '経': 'ケイ', '計': 'ケイ', '建': 'ケン', '健': 'ケン', '険': 'ケン',
    '研': 'ケン', '現': 'ゲン', '厚': 'コウ', '光': 'コウ', '公': 'コウ',
    '工': 'コウ', '行': 'コウ', '国': 'コク', '商': 'ショウ', '証': 'ショウ',
    '消': 'ショウ', '産': 'サン', '参': 'サン', '財': 'ザイ', '際': 'サイ',
    '済': 'サイ', '斉': 'サイ', '社': 'シャ', '士': 'シ', '市': 'シ',
    '師': 'シ', '史': 'シ', '事': 'ジ', '寺': 'ジ', '時': 'ジ',
    '実': 'ジツ', '設': 'セツ', '税': 'ゼイ', '生': 'セイ', '所': 'ショ',
    '従': 'ジュウ', '住': 'ジュウ', '術': 'ジュツ', '職': 'ショク',
    '食': 'ショク', '信': 'シン', '新': 'シン', '進': 'シン', '水': 'スイ',
    '制': 'セイ', '政': 'セイ', '整': 'セイ', '製': 'セイ', '請': 'セイ',
    '接': 'セツ', '先': 'セン', '専': 'セン', '送': 'ソウ', '総': 'ソウ',
    '増': 'ゾウ', '大': 'ダイ', '団': 'ダン', '地': 'チ', '中': 'チュウ',
    '特': 'トク', '道': 'ドウ', '独': 'ドク', '都': 'ト', '動': 'ドウ',
    '認': 'ニン', '乳': 'ニュウ', '農': 'ノウ', '能': 'ノウ', '馬': 'バ',
    '売': 'バイ', '判': 'バン', '反': 'ハン', '費': 'ヒ', '品': 'ヒン',
    '福': 'フク', '府': 'フ', '法': 'ホウ', '務': 'ム', '無': 'ム',
    '民': 'ミン', '名': 'メイ', '問': 'モン', '有': 'ユウ', '来': 'ライ',
    '理': 'リ', '力': 'リョク', '労': 'ロウ', '和': 'ワ', '話': 'ワ',
    '安': 'アン', '委': 'イ', '一': 'イチ', '本': 'ホン', '人': 'ジン',
    '連': 'レン', '輸': 'ユ', '用': 'ヨウ', '要': 'ヨウ', '洋': 'ヨウ',
    '銀': 'ギン', '病': 'ビョウ', '品': 'ヒン', '部': 'ブ', '文': 'ブン',
    '配': 'ハイ', '買': 'バイ', '発': 'ハツ', '般': 'ハン', '番': 'バン',
    '物': 'ブツ', '流': 'リュウ', '立': 'リツ', '料': 'リョウ', '量': 'リョウ',
    '器': 'キ', '境': 'キョウ', '形': 'ケイ', '化': 'カ', '科': 'カ',
    '鉄': 'テツ', '電': 'デン', '店': 'テン', '転': 'テン', '伝': 'デン',
    '通': 'ツウ', '的': 'テキ', '定': 'テイ', '情': 'ジョウ', '常': 'ジョウ',
    '状': 'ジョウ', '城': 'ジョウ', '上': 'ジョウ', '林': 'リン', '里': 'リ',
    '良': 'リョウ', '利': 'リ', '林': 'リン', '論': 'ロン', '録': 'ロク',
    '話': 'ワ', '詩': 'シ', '試': 'シ', '修': 'シュウ', '収': 'シュウ',
    '助': 'ジョ', '食': 'ショク', '触': 'ショク', '続': 'ゾク', '属': 'ゾク',
    '多': 'タ', '体': 'タイ', '待': 'タイ', '代': 'ダイ', '貸': 'タイ',
    '態': 'タイ', '弁': 'ベン', '辺': 'ヘン', '編': 'ヘン', '変': 'ヘン',
    '宝': 'ホウ', '望': 'ボウ', '邦': 'ホウ', '報': 'ホウ', '訪': 'ホウ',
    '野': 'ヤ', '薬': 'ヤク', '役': 'ヤク', '約': 'ヤク', '養': 'ヨウ',
    '容': 'ヨウ', '預': 'ヨ', '幼': 'ヨウ', '勇': 'ユウ', '優': 'ユウ',
    '郵': 'ユウ', '様': 'ヨウ', '際': 'サイ', '左': 'サ', '施': 'シ',
    '座': 'ザ', '在': 'ザイ', '材': 'ザイ', '剤': 'ザイ', '勾': 'コウ',
    '工': 'コウ', '件': 'ケン', '見': 'ケン', '兼': 'ケン', '権': 'ケン',
    '験': 'ケン', '後': 'ゴ', '語': 'ゴ', '号': 'ゴウ', '護': 'ゴ',
    '交': 'コウ', '考': 'コウ', '校': 'コウ', '港': 'コウ', '幸': 'コウ',
    '皇': 'コウ', '耕': 'コウ', '購': 'コウ', '航': 'コウ', '控': 'コウ',
    '語': 'ゴ', '誤': 'ゴ', '告': 'コク', '混': 'コン', '婚': 'コン',
    '恵': 'ケイ', '敬': 'ケイ', '形': 'ケイ', '継': 'ケイ', '警': 'ケイ',
    '軽': 'ケイ', '掲': 'ケイ', '鶏': 'ケイ', '刑': 'ケイ', '契': 'ケイ',
    '帰': 'キ', '寄': 'キ', '希': 'キ', '季': 'キ', '既': 'キ',
    '義': 'ギ', '技': 'ギ', '祈': 'キ', '机': 'キ', '規': 'キ',
    '宮': 'キュウ', '急': 'キュウ', '旧': 'キュウ', '求': 'キュウ', '究': 'キュウ',
    '橋': 'キョウ', '競': 'キョウ', '郷': 'キョウ', '強': 'キョウ',
    '区': 'ク', '駆': 'ク', '苦': 'ク', '薬': 'ヤク', '若': 'ジャク',
    '繊': 'セン', '鮮': 'セン', '選': 'セン', '銭': 'セン', '船': 'セン',
    '戦': 'セン', '全': 'ゼン', '善': 'ゼン', '然': 'ゼン',
};

// ============================================================
// 4. 数字の読み（英語・日本語）
// ============================================================
const DIGITS_PHONETIC = {
    '0': ['ｾﾞﾛ', 'ﾚｲ'],
    '1': ['ﾜﾝ', 'ｲﾁ'],
    '2': ['ﾂｰ', 'ﾆ'],
    '3': ['ｽﾘｰ', 'ｻﾝ'],
    '4': ['ﾌｫｰ', 'ﾖﾝ'],
    '5': ['ﾌｧｲﾌﾞ', 'ｺﾞ'],
    '6': ['ｼｯｸｽ', 'ﾛｸ'],
    '7': ['ｾﾌﾞﾝ', 'ﾅﾅ'],
    '8': ['ｴｲﾄ', 'ﾊﾁ'],
    '9': ['ﾅｲﾝ', 'ｷｭｳ']
};

// 1文字ずつ読む用テーブル
const DIGIT_JP_SINGLE = ['ｾﾞﾛ','ｲﾁ','ﾆ','ｻﾝ','ﾖﾝ','ｺﾞ','ﾛｸ','ﾅﾅ','ﾊﾁ','ｷｭｳ'];
const DIGIT_EN_SINGLE = ['ｾﾞﾛ','ﾜﾝ','ﾂｰ','ｽﾘｰ','ﾌｫｰ','ﾌｧｲﾌﾞ','ｼｯｸｽ','ｾﾌﾞﾝ','ｴｲﾄ','ﾅｲﾝ'];

/** 数字列を1文字ずつ日本語読みに変換: "123"→"ｲﾁﾆｻﾝ" */
function digitsToJpSingle(str) { return str.replace(/[0-9]/g, d => DIGIT_JP_SINGLE[+d]); }
/** 数字列を1文字ずつ英語読みに変換: "123"→"ﾜﾝﾂｰｽﾘｰ" */
function digitsToEnSingle(str) { return str.replace(/[0-9]/g, d => DIGIT_EN_SINGLE[+d]); }

/** 数値を日本語数値読みに変換: 111→"ﾋｬｸｼﾞｭｳｲﾁ" */
function numberToJapanese(n) {
    if (n === 0) return 'ｾﾞﾛ';
    const O = ['','ｲﾁ','ﾆ','ｻﾝ','ﾖﾝ','ｺﾞ','ﾛｸ','ﾅﾅ','ﾊﾁ','ｷｭｳ'];
    let res = '', mn = Math.floor(n / 10000); n %= 10000;
    const sn = Math.floor(n/1000); n%=1000; const hn = Math.floor(n/100); n%=100;
    const jn = Math.floor(n/10);   n%=10;
    if (mn > 0) {
        const a=Math.floor(mn/1000),b=Math.floor(mn%1000/100),c=Math.floor(mn%100/10),d=mn%10;
        if(a)res+=(a>1?O[a]:'')+`ｾﾝ`; if(b)res+=(b>1?O[b]:'')+`ﾋｬｸ`;
        if(c)res+=(c>1?O[c]:'')+`ｼﾞｭｳ`; if(d)res+=O[d]; res+='ﾏﾝ';
    }
    if(sn>0)res+=(sn>1?O[sn]:'')+`ｾﾝ`; if(hn>0)res+=(hn>1?O[hn]:'')+`ﾋｬｸ`;
    if(jn>0)res+=(jn>1?O[jn]:'')+`ｼﾞｭｳ`; if(n>0)res+=O[n];
    return res;
}

/** 数値を英語数値読みに変換: 111→"ﾜﾝﾊﾝﾄﾞﾚｯﾄﾞｱﾝﾄﾞｲﾚﾌﾞﾝ" */
function numberToEnglish(n) {
    if (n === 0) return 'ｾﾞﾛ';
    const Ones=['','ﾜﾝ','ﾂｰ','ｽﾘｰ','ﾌｫｰ','ﾌｧｲﾌﾞ','ｼｯｸｽ','ｾﾌﾞﾝ','ｴｲﾄ','ﾅｲﾝ',
                'ﾃﾝ','ｲﾚﾌﾞﾝ','ﾄｩｴﾙﾌﾞ','ｻｰﾃｨｰﾝ','ﾌｫｰﾃｨｰﾝ','ﾌｨﾌﾃｨｰﾝ',
                'ｼｯｸｽﾃｨｰﾝ','ｾﾌﾞﾝﾃｨｰﾝ','ｴｲﾃｨｰﾝ','ﾅｲﾝﾃｨｰﾝ'];
    const Tens=['','','ﾄｩｴﾝﾃｨ','ｻｰﾃｨ','ﾌｫｰﾃｨ','ﾌｨﾌﾃｨ','ｼｯｸｽﾃｨ','ｾﾌﾞﾝﾃｨ','ｴｲﾃｨ','ﾅｲﾝﾃｨ'];
    function b1k(v){
        let r='';
        if(v>=100){r+=Ones[Math.floor(v/100)]+'ﾊﾝﾄﾞﾚｯﾄﾞ';v%=100;if(v)r+='ｱﾝﾄﾞ';}
        if(v>=20){r+=Tens[Math.floor(v/10)];v%=10;r+=Ones[v];}else if(v>0)r+=Ones[v];
        return r;
    }
    let res='';
    if(n>=1000000){res+=b1k(Math.floor(n/1000000))+'ﾐﾘｵﾝ';n%=1000000;if(n)res+='ｱﾝﾄﾞ';}
    if(n>=1000){res+=b1k(Math.floor(n/1000))+'ｻｳｻﾞﾝﾄﾞ';n%=1000;if(n)res+='ｱﾝﾄﾞ';}
    if(n>0)res+=b1k(n);
    return res;
}

// ============================================================
// 5. 小書き文字 → 大文字変換
// ============================================================
const SMALL_TO_LARGE = {
    'ｧ': 'ｱ', 'ｨ': 'ｲ', 'ｩ': 'ｳ', 'ｪ': 'ｴ', 'ｫ': 'ｵ',
    'ｯ': 'ﾂ', 'ｬ': 'ﾔ', 'ｭ': 'ﾕ', 'ｮ': 'ﾖ',
    'ァ': 'ア', 'ィ': 'イ', 'ゥ': 'ウ', 'ェ': 'エ', 'ォ': 'オ',
    'ッ': 'ツ', 'ャ': 'ヤ', 'ュ': 'ユ', 'ョ': 'ヨ'
};

// ============================================================
// 6. 英単語 → 半角カタカナ（商号・社名頻出語辞典）
// ============================================================
const ENGLISH_WORDS_TO_KATAKANA = {
    // 法人格・行政
    'CORPORATION':'ｺｰﾎﾟﾚｰｼｮﾝ','COMPANY':'ｶﾝﾊﾟﾆｰ','ENTERPRISE':'ｴﾝﾀｰﾌﾟﾗｲｽﾞ',
    'INTERNATIONAL':'ｲﾝﾀｰﾅｼｮﾅﾙ','GLOBAL':'ｸﾞﾛｰﾊﾞﾙ','HOLDINGS':'ﾎｰﾙﾃﾞｨﾝｸﾞｽ',
    'GROUP':'ｸﾞﾙｰﾌﾟ','PARTNERS':'ﾊﾟｰﾄﾅｰｽﾞ','PARTNER':'ﾊﾟｰﾄﾅｰ',
    'ASSOCIATES':'ｱｿｼｴｲﾂ',
    // IT・テクノロジー
    'SYSTEM':'ｼｽﾃﾑ','SYSTEMS':'ｼｽﾃﾑｽﾞ','SOFTWARE':'ｿﾌﾄｳｪｱ','HARDWARE':'ﾊｰﾄﾞｳｪｱ',
    'TECHNOLOGY':'ﾃｸﾉﾛｼﾞｰ','TECHNOLOGIES':'ﾃｸﾉﾛｼﾞｰｽﾞ','DIGITAL':'ﾃﾞｼﾞﾀﾙ',
    'NETWORK':'ﾈｯﾄﾜｰｸ','NETWORKS':'ﾈｯﾄﾜｰｸｽﾞ','DATA':'ﾃﾞｰﾀ','CLOUD':'ｸﾗｳﾄﾞ',
    'WEB':'ｳｪﾌﾞ','SOFT':'ｿﾌﾄ','TECH':'ﾃｯｸ','INFORMATION':'ｲﾝﾌｫﾒｰｼｮﾝ',
    'ENGINEERING':'ｴﾝｼﾞﾆｱﾘﾝｸﾞ','DEVELOPMENT':'ﾃﾞﾍﾞﾛｯﾌﾟﾒﾝﾄ',
    'SOLUTION':'ｿﾘｭｰｼｮﾝ','SOLUTIONS':'ｿﾘｭｰｼｮﾝｽﾞ','MEDIA':'ﾒﾃﾞｨｱ',
    'COMMUNICATION':'ｺﾐｭﾆｹｰｼｮﾝ','COMMUNICATIONS':'ｺﾐｭﾆｹｰｼｮﾝｽﾞ',
    // 商社・流通
    'TRADING':'ﾄﾚｰﾃﾞｨﾝｸﾞ','TRADE':'ﾄﾚｰﾄﾞ','LOGISTICS':'ﾛｼﾞｽﾃｨｸｽ','SUPPLY':'ｻﾌﾟﾗｲ',
    'IMPORT':'ｲﾝﾎﾟｰﾄ','EXPORT':'ｴｸｽﾎﾟｰﾄ','SERVICE':'ｻｰﾋﾞｽ','SERVICES':'ｻｰﾋﾞｽﾞ',
    'SALES':'ｾｰﾙｽﾞ','MARKETING':'ﾏｰｹﾃｨﾝｸﾞ',
    // 金融・不動産
    'FINANCE':'ﾌｧｲﾅﾝｽ','FINANCIAL':'ﾌｧｲﾅﾝｼｬﾙ','CAPITAL':'ｷｬﾋﾟﾀﾙ',
    'INVESTMENT':'ｲﾝﾍﾞｽﾄﾒﾝﾄ','ASSET':'ｱｾｯﾄ','ASSETS':'ｱｾｯﾂ',
    'REAL':'ﾘｱﾙ','ESTATE':'ｴｽﾃｰﾄ',
    // 建設・製造
    'CONSTRUCTION':'ｺﾝｽﾄﾗｸｼｮﾝ','PLANNING':'ﾌﾟﾗﾝﾆﾝｸﾞ','INDUSTRIES':'ｲﾝﾀﾞｽﾄﾘｰｽﾞ',
    'INDUSTRY':'ｲﾝﾀﾞｽﾄﾘｰ','PRODUCTION':'ﾌﾟﾛﾀﾞｸｼｮﾝ',
    // ヘルス・食品
    'FOODS':'ﾌｰﾄﾞｽﾞ','FOOD':'ﾌｰﾄﾞ','HEALTH':'ﾍﾙｽ','CARE':'ｹｱ','PHARMA':'ﾌｧｰﾏ',
    // 共通
    'JAPAN':'ｼﾞｬﾊﾟﾝ','ASIA':'ｱｼﾞｱ','TOKYO':'ﾄｳｷﾖｳ','OSAKA':'ｵｰｻｶ',
    'RESEARCH':'ﾘｻｰﾁ','CONSULTING':'ｺﾝｻﾙﾃｨﾝｸﾞ','MANAGEMENT':'ﾏﾈｼﾞﾒﾝﾄ',
    'SUPPORT':'ｻﾎﾟｰﾄ','DESIGN':'ﾃﾞｻﾞｲﾝ','CREATIVE':'ｸﾘｴｲﾃｨﾌﾞ',
    'ENERGY':'ｴﾈﾙｷﾞｰ','POWER':'ﾊﾟﾜｰ','PLUS':'ﾌﾟﾗｽ','OFFICE':'ｵﾌｨｽ',
    'NEXT':'ﾈｸｽﾄ','NEW':'ﾆｭｰ','ONE':'ﾜﾝ','FIRST':'ﾌｧｰｽﾄ','BEST':'ﾍﾞｽﾄ',
    'PRIME':'ﾌﾟﾗｲﾑ','PRO':'ﾌﾟﾛ','LIFE':'ﾗｲﾌ','STYLE':'ｽﾀｲﾙ',
    'HOME':'ﾎｰﾑ','HOUSE':'ﾊｳｽ','GREEN':'ｸﾞﾘｰﾝ','CLEAN':'ｸﾘｰﾝ',
    'SMART':'ｽﾏｰﾄ','FUTURE':'ﾌｭｰﾁｬｰ','WORLD':'ﾜｰﾙﾄﾞ','LINK':'ﾘﾝｸ',
    'ACT':'ｱｸﾄ','ART':'ｱｰﾄ','MAX':'ﾏｯｸｽ','TOP':'ﾄｯﾌﾟ','STAR':'ｽﾀｰ',
    'SUN':'ｻﾝ','CROSS':'ｸﾛｽ','ADVANCE':'ｱﾄﾞﾊﾞﾝｽ','COMPLEX':'ｺﾝﾌﾟﾚｯｸｽ',
    'LAND':'ﾗﾝﾄﾞ','ECO':'ｴｺ','BIO':'ﾊﾞｲｵ','ALL':'ｵｰﾙ',
};

/**
 * 英単語をカタカナに変換（候補生成用）
 * 辞書にある単語を優先的に置換し、残った英字は1文字ずつ近似変換
 */
function processEnglish(str) {
    // 長い順に並べておきロングマッチ優先
    const sorted = Object.keys(ENGLISH_WORDS_TO_KATAKANA).sort((a, b) => b.length - a.length);
    let result = str;
    for (const word of sorted) {
        // 単語境界は [英字以外 or 先頭/末尾] とする
        const re = new RegExp(`(?<![A-Z])${word}(?![A-Z])`, 'g');
        result = result.replace(re, ENGLISH_WORDS_TO_KATAKANA[word]);
    }
    return result;
}

// ============================================================
// 変換関数群
// ============================================================

/** 全角カタカナ・ひらがな → 半角カタカナ */
function toHalfWidthKatakana(str) {
    const kanaMap = {
        'ガ': 'ｶﾞ', 'ギ': 'ｷﾞ', 'グ': 'ｸﾞ', 'ゲ': 'ｹﾞ', 'ゴ': 'ｺﾞ',
        'ザ': 'ｻﾞ', 'ジ': 'ｼﾞ', 'ズ': 'ｽﾞ', 'ゼ': 'ｾﾞ', 'ゾ': 'ｿﾞ',
        'ダ': 'ﾀﾞ', 'ヂ': 'ﾁﾞ', 'ヅ': 'ﾂﾞ', 'デ': 'ﾃﾞ', 'ド': 'ﾄﾞ',
        'バ': 'ﾊﾞ', 'ビ': 'ﾋﾞ', 'ブ': 'ﾌﾞ', 'ベ': 'ﾍﾞ', 'ボ': 'ﾎﾞ',
        'パ': 'ﾊﾟ', 'ピ': 'ﾋﾟ', 'プ': 'ﾌﾟ', 'ペ': 'ﾍﾟ', 'ポ': 'ﾎﾟ',
        'ア': 'ｱ', 'イ': 'ｲ', 'ウ': 'ｳ', 'エ': 'ｴ', 'オ': 'ｵ',
        'カ': 'ｶ', 'キ': 'ｷ', 'ク': 'ｸ', 'ケ': 'ｹ', 'コ': 'ｺ',
        'サ': 'ｻ', 'シ': 'ｼ', 'ス': 'ｽ', 'セ': 'ｾ', 'ソ': 'ｿ',
        'タ': 'ﾀ', 'チ': 'ﾁ', 'ツ': 'ﾂ', 'テ': 'ﾃ', 'ト': 'ﾄ',
        'ナ': 'ﾅ', 'ニ': 'ﾆ', 'ヌ': 'ﾇ', 'ネ': 'ﾈ', 'ノ': 'ﾉ',
        'ハ': 'ﾊ', 'ヒ': 'ﾋ', 'フ': 'ﾌ', 'ヘ': 'ﾍ', 'ホ': 'ﾎ',
        'マ': 'ﾏ', 'ミ': 'ﾐ', 'ム': 'ﾑ', 'メ': 'ﾒ', 'モ': 'ﾓ',
        'ヤ': 'ﾔ', 'ユ': 'ﾕ', 'ヨ': 'ﾖ',
        'ラ': 'ﾗ', 'リ': 'ﾘ', 'ル': 'ﾙ', 'レ': 'ﾚ', 'ロ': 'ﾛ',
        'ワ': 'ﾜ', 'ヰ': 'ｲ', 'ヱ': 'ｴ', 'ヲ': 'ｦ', 'ン': 'ﾝ', 'ヴ': 'ｳﾞ',
        'ァ': 'ｧ', 'ィ': 'ｨ', 'ゥ': 'ｩ', 'ェ': 'ｪ', 'ォ': 'ｫ',
        'ッ': 'ｯ', 'ャ': 'ｬ', 'ュ': 'ｭ', 'ョ': 'ｮ',
        'ー': 'ｰ', '・': '･', '「': '｢', '」': '｣', '。': '｡', '、': '､',
        '　': ' '
    };
    let result = '';
    for (const char of str) {
        result += kanaMap[char] || char;
    }
    return result;
}

/** ひらがな → カタカナ */
function processHiragana(str) {
    let res = '';
    for (const char of str) {
        res += HIRAGANA_TO_KATAKANA[char] || char;
    }
    return res;
}

/** 漢字を1文字ずつ音読みで動的変換。辞書にない文字はそのまま残す */
function processKanjiDynamic(str) {
    let res = '';
    for (const char of str) {
        const cp = char.codePointAt(0);
        const isKanji = (cp >= 0x4E00 && cp <= 0x9FFF)
                     || (cp >= 0x3400 && cp <= 0x4DBF)
                     || (cp >= 0xF900 && cp <= 0xFAFF);
        if (isKanji) {
            res += KANJI_ON_READINGS[char] || char; // 辞書にない場合は漢字のまま
        } else {
            res += char;
        }
    }
    return res;
}

/** 小書き文字 → 大文字 */
function processSmallChars(str) {
    let res = str;
    for (const [small, large] of Object.entries(SMALL_TO_LARGE)) {
        res = res.split(small).join(large);
    }
    return res;
}

/** 法人略号の位置判定と置換
 * 返値: { str: 変換後文字列, abbrParts: [{placeholder, replacement}] }
 * 略号部分は \x01N\x01 プレースホルダーになり、後で復元する
 */
function handleCorpAbbreviations(str) {
    // 長い文字列を優先してマッチ（例: '医療法人社団' を '医療法人' より先に処理）
    const sorted = [...CORP_ABBREVIATIONS].sort((a, b) => b.target.length - a.target.length);

    for (const corp of sorted) {
        const idx = str.indexOf(corp.target);
        if (idx === -1) continue;

        const before = str.substring(0, idx);
        const after = str.substring(idx + corp.target.length);

        let abbr;
        if (idx === 0 && after.length > 0) {
            abbr = corp.abbr + ')';         // 先頭: abbr + ")" + 残り
        } else if (after.length === 0 && before.length > 0) {
            abbr = '(' + corp.abbr;         // 末尾: 前部分 + "(" + abbr
        } else if (before.length > 0 && after.length > 0) {
            abbr = '(' + corp.abbr + ')';   // 中間
        } else {
            abbr = corp.abbr + ')';         // 単独
        }

        // プレースホルダーで略号部分をマークする（APIが漢字と誤認識しないようにASCII記号）
        const PLACEHOLDER = '\x01CORP\x01';
        str = before + PLACEHOLDER + after;

        // PLACEHOLDER を後で abbr に戻すために返す
        return { str, abbr };
    }
    return { str, abbr: null };
}

/** 氏名と判定された漢字列に半角スペースを挿入 */
function handlePersonalNames(str) {
    const hasCorp = CORP_ABBREVIATIONS.some(c => str.includes(c.target));
    if (hasCorp) return str;
    if (str.includes(' ') || str.includes('　')) return str;

    // 漢字のみ2〜5文字の場合、姓＋名と判定
    if (/^[\u4E00-\u9FFF]{2,5}$/.test(str)) {
        if (str.length === 2) return str[0] + ' ' + str[1];
        if (str.length === 3) return str.slice(0, 2) + ' ' + str.slice(2);
        if (str.length === 4) return str.slice(0, 2) + ' ' + str.slice(2);
        if (str.length === 5) return str.slice(0, 2) + ' ' + str.slice(2);
    }
    return str;
}

/** メインの正規化処理 */
function normalizeInput(val) {
    let str = val.trim();

    // 1. 法人略号を先に置換（漢字変換前に行う必要がある）
    str = handleCorpAbbreviations(str);

    // 2. 個人名スペース挿入（法人でない場合のみ）
    str = handlePersonalNames(str);

    // 3. ひらがな → カタカナ
    str = processHiragana(str);

    // 4. 漢字を動的に音読み変換
    str = processKanjiDynamic(str);

    // 5. 全角英数字 → 半角
    str = str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));

    // 6. 大文字化
    str = str.toUpperCase();

    // 7. 記号変換
    str = str.replace(/・/g, '.');
    str = str.replace(/[【】「」『』〔〕〈〉《》]/g, '');

    // 8. 全角カタカナ → 半角カタカナ
    str = toHalfWidthKatakana(str);

    return str;
}

/** 変換候補の生成
 * extraCandidates: buildKatakanaCandidates()の返り値（{label,value}の配列）
 */
function generateCandidates(normalizedResult, extraCandidates) {
    if (!normalizedResult) return [];
    let results = [{ label: '標準変換', value: normalizedResult }];
    if (extraCandidates && extraCandidates.length) results.push(...extraCandidates);
    return results.filter((v, i, a) => a.findIndex(t => t.value === v.value) === i);
}

// ============================================================
// Yahoo! Japan ルビ振り API 呼び出し
// API エンドポイント (CORS 対応済み・2023年〜)
// Client ID は Yahoo! デベロッパーネットワークで無料取得可能
// ============================================================

/**
 * Cloudflare Workerプロキシ経由でフリガナを取得する。
 * Client IDはWorker内のシークレットに保存され、ブラウザには公開されない。
 */
async function getFuriganaFromProxy(text) {
    try {
        const res = await fetch(PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ q: text })
        });
        if (!res.ok) return null;
        const json = await res.json();
        if (json.error || !json.result) return null;

        let reading = '';
        for (const word of json.result.word) {
            reading += word.furigana || word.surface || '';
        }
        return reading;
    } catch (e) {
        console.warn('Proxy call failed:', e);
        return null;
    }
}

/**
 * 漢字をカタカナに変換（プロキシ優先、フォールバックは1文字音読み）
 */
async function convertKanji(text) {
    if (!/[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/.test(text)) return text;

    // プロキシが設定されている場合はそちらを優先使用
    if (PROXY_URL && !PROXY_URL.includes('YOUR_WORKER_SUBDOMAIN')) {
        const furigana = await getFuriganaFromProxy(text);
        if (furigana) return processHiragana(furigana);
    }

    // プロキシ未設定または失敗時は1文字フォールバック
    return processKanjiDynamic(text);
}

/**
 * Cloudflare Workerの /transliterate エンドポイント経由で
 * 英字ローマ字をカタカナに変換する（Google Input Toolsプロキシ）
 */
async function getEnglishKatakanaFromProxy(word) {
    if (!PROXY_URL || PROXY_URL.includes('YOUR_WORKER_SUBDOMAIN')) return null;
    try {
        const res = await fetch(`${PROXY_URL}/transliterate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word: word.toLowerCase() })
        });
        if (!res.ok) return null;
        const json = await res.json();
        return json.katakana || null;  // 全角カタカナで返ってくる
    } catch (e) {
        return null;
    }
}

/**
 * ローマ字 → カタカナ変換テーブル（ヘボン式・訓令式ハイブリッド）
 * 姓名や地名などの典型的なローマ字入力をクライアント側で確実に処理する。
 */
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
    'ja':'ｼﾞｬ','ju':'ｼﾞｭ','jo':'ｼﾞｮ','bya':'ﾊﾞ雅','byu':'ﾊﾞｭ','byo':'ﾊﾞｮ',
    'pya':'ﾊﾟｬ','pyu':'ﾊﾟｭ','pyo':'ﾊﾟｮ'
};

/** ローマ字文字列をカタカナに変換（最長一致） */
function romajiToKatakana(str) {
    let res = '', i = 0;
    const s = str.toLowerCase();
    while (i < s.length) {
        let matched = false;
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
            // 子音の重なり（促音「ッ」）の判定: っk -> kku
            if (i + 1 < s.length && s[i] === s[i+1] && s[i].match(/[a-z]/)) {
                res += 'ｯ';
                i += 1;
            } else {
                res += s[i].toUpperCase(); // 変換できない文字は大文字英字で残す
                i++;
            }
        }
    }
    return res;
}

/**
 * 英字をカタカナに変換するヘルパー
 * 1. ローマ字変換を試行
 * 2. 辞書マッチを試行
 * 3. Google Input Tools API を呼び出し、結果をカタカナ強制化
 */
async function applyEnglishKatakana(text) {
    const tokens = [...new Set(text.match(/[A-Z]+/g) || [])];
    let result = text;
    for (const token of tokens) {
        // 1. ローマ字変換を試行（完全にカタカナになれば採用）
        const fromRomaji = romajiToKatakana(token);
        if (/^[\uFF61-\uFF9F]+$/.test(fromRomaji)) {
            result = result.split(token).join(fromRomaji);
            continue;
        }

        // 2. 辞書マッチ
        const fromDict = ENGLISH_WORDS_TO_KATAKANA[token];
        if (fromDict) { result = result.split(token).join(fromDict); continue; }

        // 3. API 呼び出し
        let fromApi = await getEnglishKatakanaFromProxy(token);
        if (fromApi) {
            // API結果が漢字を含む場合、内蔵テーブルでカタカナに強制変換
            if (/[\u4E00-\u9FFF]/.test(fromApi)) {
                fromApi = processKanjiDynamic(fromApi);
            }
            // 半角化・小書き文字処理
            const finalApi = processSmallChars(toHalfWidthKatakana(fromApi));
            result = result.split(token).join(finalApi);
        }
    }
    return result;
}

/**
 * 数字の読み方バリエーション × 英字カタカナ変換を組み合わせて
 * 複数の「カタカナ読み案」候補を返す。
 *
 * 数字が含まれる場合: 4 種類 × 英字変換
 *   ① 1文字ずつ日本語読み  (例: 111 → ｲﾁｲﾁｲﾁ)
 *   ② 1文字ずつ英語読み    (例: 111 → ﾜﾝﾜﾝﾜﾝ)
 *   ③ 数値日本語読み        (例: 111 → ﾋｬｸｼﾞｭｳｲﾁ)
 *   ④ 数値英語読み          (例: 111 → ﾜﾝﾊﾝﾄﾞﾚｯﾄﾞｱﾝﾄﾞｲﾚﾌﾞﾝ)
 * 数字がない場合: 英字のみカタカナ変換
 */
async function buildKatakanaCandidates(normalizedResult) {
    const hasEnglish = /[A-Z]/.test(normalizedResult);
    const hasDigits  = /[0-9]/.test(normalizedResult);
    if (!hasEnglish && !hasDigits) return [];

    const seen = new Set([normalizedResult]);
    const candidates = [];

    async function addVariant(label, digitTransform) {
        // 数字列を変換 (連続数字をまとめて変換)
        let val = normalizedResult.replace(/[0-9]+/g, m => digitTransform(m));
        // 英字をカタカナ変換
        val = await applyEnglishKatakana(val);
        val = processSmallChars(val);
        if (!seen.has(val)) { seen.add(val); candidates.push({ label, value: val }); }
    }

    if (hasDigits) {
        await addVariant('数字：1文字ずつ日本語読み', digitsToJpSingle);
        await addVariant('数字：1文字ずつ英語読み',   digitsToEnSingle);
        await addVariant('数字：数値日本語読み',        m => numberToJapanese(parseInt(m, 10)));
        await addVariant('数字：数値英語読み',          m => numberToEnglish(parseInt(m, 10)));
    } else {
        // 英字のみの場合
        const val = processSmallChars(await applyEnglishKatakana(normalizedResult));
        if (!seen.has(val)) candidates.push({ label: 'カタカナ読み案', value: val });
    }

    return candidates;
}

/** メイン変換処理（非同期版） */
async function convert() {
    const val = input.value;
    if (!val) {
        resultDisplay.textContent = '変換結果がここに表示されます';
        charCountDisplay.textContent = '0 / 30';
        charCountDisplay.className = 'char-count';
        renderCandidates([]);
        return;
    }

    // 法人略号を先に置換（漢字変換前に行う必要がある）
    // ★ プレースホルダー方式: 略号部分をAPIに渡さないようにする
    let str = val.trim();
    const corpResult = handleCorpAbbreviations(str);
    str = corpResult.str;       // \x01CORP\x01 プレースホルダーを含む
    const corpAbbr = corpResult.abbr;  // 例: '(ｶ' or null

    str = handlePersonalNames(str);
    str = processHiragana(str);

    // Yahoo APIで漢字をひらがなに変換（プレースホルダーはAPIに届かない位置に残る）
    try {
        str = await convertKanji(str);
    } catch (e) {
        console.error('Kanji conversion error:', e);
    }

    // プレースホルダーを略号に戻す
    if (corpAbbr !== null) {
        str = str.replace('\x01CORP\x01', corpAbbr);
    }

    // 6. 全角英数字 → 半角 + 大文字化（英字変換の準備）
    str = str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
    str = str.toUpperCase();

    // 7. 英字（ローマ字）をカタカナに変換
    try {
        str = await applyEnglishKatakana(str);
    } catch (e) {
        console.error('English conversion error:', e);
    }

    // 8. 記号変換・正規化
    str = str.replace(/・/g, '.');
    str = str.replace(/[【】「」『』〔〕〈〉《》]/g, '');
    str = toHalfWidthKatakana(str);
    const final = processSmallChars(str);

    resultDisplay.textContent = final;
    charCountDisplay.textContent = `${final.length} / 30`;
    charCountDisplay.className = final.length > 30 ? 'char-count danger' : 'char-count';

    // 数字・英字の読み候補を非同期で複数生成
    const extraCandidates = await buildKatakanaCandidates(final);
    renderCandidates(generateCandidates(final, extraCandidates));
}

// ============================================================
// イベントリスナー
// ============================================================
let debounceTimer = null;
function debouncedConvert() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => convert(), 400);
}

input.addEventListener('input', debouncedConvert);

function renderCandidates(candidates) {
    candidatesList.innerHTML = ''; // 毎回クリア
    candidatesSection.style.display = 'flex'; // 常に表示して空状態メッセージを見せる

    if (candidates.length <= 1) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'candidates-empty';
        emptyMsg.innerHTML = `
            <div style="font-weight: 800; color: var(--accent-color); margin-bottom: 0.5rem; font-size: 1rem;">
                複数候補の表示エリア
            </div>
            <p>入力された名称のメインの変換結果は左側に表示され、その他の読み方のバリエーション（数字や英単語の読み案など）がここにリストアップされます。</p>
            <div class="placeholder-slot"></div>
            <div class="placeholder-slot" style="animation-delay: 0.2s; opacity: 0.3;"></div>
            <div class="placeholder-slot" style="animation-delay: 0.4s; opacity: 0.1;"></div>
            <ul style="margin-top: 0.4rem; padding-left: 1.2rem; font-size: 0.75rem; color: var(--text-secondary); line-height: 1.4; list-style-type: '・';">
                <li style="padding-left: 0.3rem;">数字の読み分け（イチ / ワン等）</li>
                <li style="padding-left: 0.3rem;">数値としての読み（ヒャク... 等）</li>
                <li style="padding-left: 0.3rem;">英字のカタカナ変換案</li>
            </ul>
        `;
        candidatesList.appendChild(emptyMsg);
        return;
    }

    candidates.forEach(c => {
        const item = document.createElement('div');
        item.className = 'candidate-item';
        item.innerHTML = `
            <div class="candidate-info">
                <span class="candidate-label">${c.label}</span>
                <span class="candidate-value" contenteditable="true" spellcheck="false" title="クリックして編集可能">${c.value}</span>
            </div>
            <button class="candidate-copy-btn" title="この候補をコピー">COPY</button>
        `;
        // 候補値の編集をノーマライズ
        const valueSpan = item.querySelector('.candidate-value');
        valueSpan.addEventListener('input', () => {
            let fixed = valueSpan.textContent
                .replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
                .toUpperCase();
            fixed = toHalfWidthKatakana(fixed);
            fixed = processSmallChars(fixed);
            if (valueSpan.textContent !== fixed) {
                const sel = window.getSelection();
                const offset = sel.rangeCount > 0 ? sel.getRangeAt(0).startOffset : fixed.length;
                valueSpan.textContent = fixed;
                try {
                    const range = document.createRange();
                    range.setStart(valueSpan.childNodes[0] || valueSpan, Math.min(offset, fixed.length));
                    range.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(range);
                } catch (e) {}
            }
        });
        
        // COPYボタンでクリップボードにコピー
        const copySubBtn = item.querySelector('.candidate-copy-btn');
        copySubBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const textToCopy = valueSpan.textContent;
            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalText = copySubBtn.textContent;
                copySubBtn.textContent = 'COPIED!';
                copySubBtn.style.background = '#3fb950';
                setTimeout(() => {
                    copySubBtn.textContent = originalText;
                    copySubBtn.style.background = '';
                }, 2000);
            });
        });

        candidatesList.appendChild(item);
    });
}


// 変換結果を直接編集できる（半角・大文字に再正規化）
resultDisplay.addEventListener('input', () => {
    const sel = window.getSelection();
    const offset = (sel.rangeCount > 0) ? sel.getRangeAt(0).startOffset : 0;
    let val = resultDisplay.textContent;
    // 全角英数字 → 半角 + 大文字
    let fixed = val.replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).toUpperCase();
    fixed = toHalfWidthKatakana(fixed);
    fixed = processSmallChars(fixed);
    if (resultDisplay.textContent !== fixed) {
        resultDisplay.textContent = fixed;
        try {
            const range = document.createRange();
            range.setStart(resultDisplay.childNodes[0] || resultDisplay, Math.min(offset, fixed.length));
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
        } catch (e) { /* ignore */ }
    }
    charCountDisplay.textContent = `${fixed.length} / 30`;
    charCountDisplay.className = fixed.length > 30 ? 'char-count danger' : 'char-count';
});

copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(resultDisplay.textContent).then(() => {
        const original = copyBtn.textContent;
        copyBtn.textContent = 'COPIED!';
        copyBtn.style.background = '#3fb950';
        setTimeout(() => {
            copyBtn.textContent = original;
            copyBtn.style.background = '';
        }, 2000);
    });
});

convert();
