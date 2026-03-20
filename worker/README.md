# Cloudflare Worker デプロイ手順

## 構成

```
browser → Cloudflare Worker (proxy) → Yahoo Furigana API
           ↑ Client IDはここに保存 (Cloudflare Secret)
```

## 手順

### 1. Node.js / npm をインストール（未インストールの場合）
[https://nodejs.org/](https://nodejs.org/) からLTS版をインストール

### 2. Wrangler CLIをインストール
```bash
npm install -g wrangler
```

### 3. Cloudflareにログイン
```bash
npx wrangler login
```
ブラウザが開くのでCloudflareアカウントで認証してください（無料アカウントでOK）

### 4. Workerをデプロイ
```bash
cd worker
npx wrangler deploy
```

デプロイ完了後、以下のようなURLが表示されます：
```
https://bank-transfer-furigana-proxy.your-account.workers.dev
```

### 5. Client IDをシークレットとして登録
```bash
npx wrangler secret put YAHOO_CLIENT_ID
```
プロンプトが表示されたら、Yahoo! Japan Client IDを入力してEnterを押します。
**※ Client IDはこの方法でのみ保存され、コード上には一切現れません。**

### 6. converter.js のプロキシURLを更新
`bank/converter.js` の先頭にある

```js
const PROXY_URL = 'https://YOUR_WORKER_SUBDOMAIN.workers.dev';
```

を、手順4で表示された実際のURLに書き換えます。

---

## 確認

`田中貴金属` と入力して `ﾀﾅｶｷｷﾝｿﾞｸ` と変換されれば成功です。

## 無料枠

| 制限 | 内容 |
|------|------|
| リクエスト数 | 10万回/日（無料） |
| CPU時間 | 10ms/リクエスト（無料） |
| Yahoo API | 5万回/日（無料） |

通常の個人・業務利用では無料枠に収まります。
