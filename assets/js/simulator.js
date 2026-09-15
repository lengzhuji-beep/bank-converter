/**
 * マナーコンパス - ご祝儀・香典 相場シミュレーター
 */

const simulatorData = {
  wedding: {
    title: "結婚式・結婚祝い",
    calc: (rel, age) => {
      if (rel === 'friend' || rel === 'colleague') {
        return {
          amount: "30,000円",
          range: "3万円 〜 5万円（夫婦出席の場合は5万〜7万円）",
          notes: [
            "【新札の用意】必ず銀行や両替機でピン札（新札）を用意します。",
            "【割り切れない奇数】偶数（2・4・6万円など）は『別れ』を連想させるため避けます（※8万やペアの2万円は許容される場合もありますが3万円が鉄則）。",
            "【お札の向き】肖像画（顔）が表側・上部に来るように中袋に入れます。",
            "【袱紗（ふくさ）】赤・ピンク・紫などの慶事用袱紗に包んで持参し、受付で取り出します。"
          ]
        };
      }
      if (rel === 'boss') {
        const val = age === '40s' ? "50,000円" : "30,000円";
        return {
          amount: val,
          range: "3万円 〜 5万円",
          notes: [
            "部下・同僚よりも少額にならないよう配慮するのが一般的です。",
            "祝辞や主賓を務める場合は5万円以上を包むケースも多く見られます。",
            "必ず新札を用意し、汚れや折れ目のない祝儀袋を選びましょう。"
          ]
        };
      }
      if (rel === 'subordinate') {
        return {
          amount: age === '20s' ? "30,000円" : "50,000円",
          range: "3万円 〜 5万円",
          notes: [
            "上司の立場として出席する場合、3万円〜5万円が最も多い相場です。",
            "新札を用意し、袱紗（ふくさ）に右開きで包んで持参します。"
          ]
        };
      }
      if (rel === 'sibling') {
        const val = age === '20s' ? "50,000円" : "50,000円〜100,000円";
        return {
          amount: val,
          range: "5万円 〜 10万円",
          notes: [
            "兄弟・姉妹の場合は、自身が既婚か独身かによっても相場が変わります。",
            "親族間の取り決め（お互いに祝い金なし、一律5万円など）があればそれに従います。"
          ]
        };
      }
      if (rel === 'relative') {
        return {
          amount: age === '20s' ? "30,000円" : "50,000円",
          range: "3万円 〜 5万円（いとこ等）",
          notes: [
            "親族間の慣習を親御さんに事前に確認しておくのが確実です。"
          ]
        };
      }
      return {
        amount: "30,000円",
        range: "3万円 〜 5万円",
        notes: ["必ず新札を奇数枚で用意しましょう。"]
      };
    }
  },

  funeral: {
    title: "お通夜・葬儀（香典）",
    calc: (rel, age) => {
      if (rel === 'friend' || rel === 'colleague') {
        const val = age === '20s' ? "5,000円" : (age === '30s' ? "5,000円〜10,000円" : "10,000円");
        return {
          amount: val,
          range: "5,000円 〜 10,000円",
          notes: [
            "【新札はNG】新札（ピン札）は『不幸を予期して用意していた』とされるため避けます。新札しかない場合は一度軽く折り目をつけます。",
            "【忌み数】4（死）や9（苦）の金額は絶対に避けます。",
            "【お札の向き】肖像画（顔）を裏側・下向きにして入れます（『顔を伏せて悲しみを表す』という意味）。",
            "【袱紗（ふくさ）】紫・紺・グレー・緑などの弔事用袱紗に包み、左開きで取り出します（紫は慶弔兼用可）。"
          ]
        };
      }
      if (rel === 'boss' || rel === 'subordinate') {
        const val = age === '20s' ? "5,000円" : "10,000円";
        return {
          amount: val,
          range: "5,000円 〜 10,000円（会社の部署一同でまとめる場合もあり）",
          notes: [
            "社内規程やお悔やみ規定がある場合は事前に総務等に確認します。",
            "連名で包む場合は中央に代表者、左に順次氏名を記します。"
          ]
        };
      }
      if (rel === 'sibling') {
        const val = age === '20s' ? "30,000円" : "50,000円";
        return {
          amount: val,
          range: "3万円 〜 5万円",
          notes: [
            "親族間の取り決めを確認しましょう。",
            "4や9のつく金額は避けます。"
          ]
        };
      }
      if (rel === 'parents') {
        return {
          amount: "50,000円〜100,000円",
          range: "5万円 〜 10万円（自身が喪主でない場合）",
          notes: [
            "自分が喪主を務める場合は香典を包む必要はありません。"
          ]
        };
      }
      return {
        amount: "5,000円",
        range: "3,000円 〜 10,000円",
        notes: ["不祝儀袋は宗教（仏教・神道・キリスト教）に合わせたものを選びます。"]
      };
    }
  },

  baby: {
    title: "出産祝い",
    calc: (rel, age) => {
      if (rel === 'friend' || rel === 'colleague') {
        return {
          amount: "5,000円",
          range: "3,000円 〜 10,000円（連名の場合は1人1,000〜3,000円）",
          notes: [
            "【贈る時期】生後7日（お七夜）〜1ヶ月（お宮参り）の間が最適です。母子の退院や体調を最優先に確認しましょう。",
            "【のし袋】何度あっても嬉しい慶事のため、『紅白の蝶結び（花結び）』を選びます。",
            "【表書き】『御出産御祝』『御祝』と書きます。"
          ]
        };
      }
      if (rel === 'sibling' || rel === 'relative') {
        const val = age === '20s' ? "10,000円〜20,000円" : "20,000円〜30,000円";
        return {
          amount: val,
          range: "1万円 〜 3万円",
          notes: [
            "現金のほか、相手の希望を聞いてベビーベッドやチャイルドシート等の品物を贈るのも喜ばれます。"
          ]
        };
      }
      return {
        amount: "5,000円",
        range: "3,000円 〜 10,000円",
        notes: ["水引は『紅白の蝶結び』を用います。"]
      };
    }
  }
};

function runSimulation() {
  const eventType = document.getElementById('simEvent')?.value || 'wedding';
  const relation = document.getElementById('simRelation')?.value || 'friend';
  const age = document.getElementById('simAge')?.value || '30s';

  const category = simulatorData[eventType];
  if (!category) return;

  const result = category.calc(relation, age);

  // Update DOM
  const targetText = document.getElementById('resultTarget');
  const priceMain = document.getElementById('resultPriceMain');
  const priceRange = document.getElementById('resultPriceRange');
  const noteList = document.getElementById('resultNoteList');

  if (targetText) targetText.textContent = `${category.title}の目安相場`;
  if (priceMain) priceMain.textContent = result.amount;
  if (priceRange) priceRange.textContent = `（相場幅: ${result.range}）`;

  if (noteList) {
    noteList.innerHTML = '';
    result.notes.forEach(note => {
      const li = document.createElement('li');
      li.textContent = note;
      noteList.appendChild(li);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const simEvent = document.getElementById('simEvent');
  const simRelation = document.getElementById('simRelation');
  const simAge = document.getElementById('simAge');

  if (simEvent && simRelation && simAge) {
    simEvent.addEventListener('change', runSimulation);
    simRelation.addEventListener('change', runSimulation);
    simAge.addEventListener('change', runSimulation);
    // Initial run
    runSimulation();
  }
});
