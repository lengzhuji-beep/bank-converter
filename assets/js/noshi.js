/**
 * マナーコンパス - のし袋・水引・表書きインタラクティブチェッカー
 */

const noshiData = {
  wedding: {
    type: "celebration",
    title: "結婚祝い・ご祝儀",
    mizuhikiKnot: "結び切り（または あわじ結び）",
    mizuhikiColor: "金銀 または 紅白（10本）",
    mizuhikiClass: "gold-silver",
    hasNoshi: true,
    topText: "寿",
    point: "結婚は一度きりであってほしい慶事のため、固く結ばれてほどけない『結び切り』を選びます。水引は通常5本ですが、結婚祝いは『夫婦2人分（5本×2）』として10本の水引を用います。"
  },
  baby: {
    type: "celebration",
    title: "出産祝い",
    mizuhikiKnot: "蝶結び（花結び）",
    mizuhikiColor: "紅白（5本または7本）",
    mizuhikiClass: "red-white",
    hasNoshi: true,
    topText: "御出産御祝",
    point: "出産は何度あってもおめでたい慶事であるため、ほどいて何度でも結び直せる『蝶結び』を用います。"
  },
  school: {
    type: "celebration",
    title: "入学・進学・就職祝い",
    mizuhikiKnot: "蝶結び（花結び）",
    mizuhikiColor: "紅白",
    mizuhikiClass: "red-white",
    hasNoshi: true,
    topText: "祝 御入学",
    point: "子どもの成長に伴うお祝いは何度あっても嬉しい慶事のため、『蝶結び』の水引を用います。"
  },
  illness: {
    type: "special",
    title: "病気・ケガのお見舞い",
    mizuhikiKnot: "結び切り（5本）",
    mizuhikiColor: "紅白（または 赤白）",
    mizuhikiClass: "red-white",
    hasNoshi: false, // お見舞いには熨斗は付けない！
    topText: "御見舞",
    point: "【重要】病気や怪我は二度と繰り返さないよう『結び切り』にします。また『病気を延ばす』につながるため、右上の『のし（熨斗）』が付いていない無地の封筒を選びます。"
  },
  recovery: {
    type: "celebration",
    title: "快気祝い（全快のお礼）",
    mizuhikiKnot: "結び切り",
    mizuhikiColor: "紅白",
    mizuhikiClass: "red-white",
    hasNoshi: true,
    topText: "快気祝",
    point: "病気がすっかり治り、二度と繰り返さないように『結び切り』の水引を用います。"
  },
  funeral_before: {
    type: "mourning",
    title: "お通夜・葬儀（通夜〜四十九日前）",
    mizuhikiKnot: "結び切り（あわじ結び）",
    mizuhikiColor: "黒白 または 双銀",
    mizuhikiClass: "black-white",
    hasNoshi: false,
    topText: "御霊前",
    point: "【薄墨で書く】悲しみの涙で墨が薄まったという意味を込め、薄墨の筆または筆ペンで書きます。四十九日までは故人が霊の状態とされるため、仏教では一般的に『御霊前』を用います（浄土真宗を除く）。"
  },
  funeral_after: {
    type: "mourning",
    title: "四十九日法要以降・一周忌",
    mizuhikiKnot: "結び切り（あわじ結び）",
    mizuhikiColor: "黒白、黄白（関西）、双銀",
    mizuhikiClass: "black-white",
    hasNoshi: false,
    topText: "御仏前",
    point: "四十九日の法要を終えると故人が成仏し仏になるとされるため、表書きは『御仏前』となります。四十九日以降は濃い黒墨で書いて構いません。"
  },
  gift: {
    type: "celebration",
    title: "お中元・お歳暮",
    mizuhikiKnot: "蝶結び",
    mizuhikiColor: "紅白",
    mizuhikiClass: "red-white",
    hasNoshi: true,
    topText: "御中元",
    point: "毎年繰り返してお世話になるお礼のため、『蝶結び』ののし紙を使用します。"
  }
};

function updateNoshiChecker() {
  const select = document.getElementById('noshiPurposeSelect');
  const nameInput = document.getElementById('noshiNameInput');
  if (!select) return;

  const key = select.value;
  const data = noshiData[key];
  if (!data) return;

  const senderName = (nameInput?.value.trim()) || "山田 太郎";

  // Visual Envelope Elements
  const noshiMark = document.getElementById('previewNoshiMark');
  const mizuhikiKnot = document.getElementById('previewMizuhikiKnot');
  const topTextEl = document.getElementById('previewTopText');
  const nameTextEl = document.getElementById('previewNameText');

  // Text Explanation Elements
  const expTitle = document.getElementById('expTitle');
  const expMizuhiki = document.getElementById('expMizuhiki');
  const expColor = document.getElementById('expColor');
  const expNoshi = document.getElementById('expNoshi');
  const expPoint = document.getElementById('expPoint');

  if (noshiMark) {
    noshiMark.style.display = data.hasNoshi ? 'flex' : 'none';
  }

  if (mizuhikiKnot) {
    mizuhikiKnot.className = `mizuhiki-knot ${data.mizuhikiClass}`;
    mizuhikiKnot.textContent = data.mizuhikiKnot;
  }

  if (topTextEl) {
    topTextEl.textContent = data.topText;
    // Mourning: gray thin ink effect
    if (data.type === 'mourning') {
      topTextEl.style.color = '#64748b';
    } else {
      topTextEl.style.color = '#0f172a';
    }
  }

  if (nameTextEl) {
    nameTextEl.textContent = senderName;
    if (data.type === 'mourning') {
      nameTextEl.style.color = '#64748b';
    } else {
      nameTextEl.style.color = '#334155';
    }
  }

  // Update Detail Card
  if (expTitle) expTitle.textContent = `${data.title} の正しい選び方`;
  if (expMizuhiki) expMizuhiki.textContent = data.mizuhikiKnot;
  if (expColor) expColor.textContent = data.mizuhikiColor;
  if (expNoshi) expNoshi.textContent = data.hasNoshi ? "あり（右上に熨斗マーク）" : "なし（無地の金封）";
  if (expPoint) expPoint.textContent = data.point;
}

document.addEventListener('DOMContentLoaded', () => {
  const select = document.getElementById('noshiPurposeSelect');
  const nameInput = document.getElementById('noshiNameInput');

  if (select) {
    select.addEventListener('change', updateNoshiChecker);
  }
  if (nameInput) {
    nameInput.addEventListener('input', updateNoshiChecker);
  }

  // Initial render
  updateNoshiChecker();
});
