# 🏨 リコホテル三国 営業管理システム v5.0

React + Supabase + Vercel によるクラウド対応営業管理システム

---

## ✅ 機能一覧

- **ログイン認証**（メール・パスワード / Supabase Auth）
- **権限管理**（管理者 / マネージャー / 営業担当 / 閲覧のみ）
- **営業先管理**（FileMaker風フォーム・前後ナビ・タブ切替）
- **営業日報**（日次記録・一覧・削除）
- **案件管理**（ステータス管理・成約確率・成果報酬自動計算）
- **成果報酬管理**（担当者別集計）
- **ダッシュボード**（KPI分析・グラフ）
- **契約管理**
- **ユーザー管理**（管理者のみ）
- **リアルタイム同期**（全デバイスで数秒以内に反映）
- **レスポンシブ**（PC / Mac / iPhone / iPad / Android）
- **CSVエクスポート**

---

## 🚀 セットアップ手順

### STEP 1 — Supabase プロジェクトを作成する

1. **https://supabase.com** にアクセス → 「Start your project」
2. GitHubアカウントでサインアップ（無料）
3. 「New project」→ プロジェクト名: `rico-hotel-crm`、パスワードを設定、リージョン: `Northeast Asia (Tokyo)` → 「Create new project」
4. プロジェクト作成完了まで2〜3分待つ

### STEP 2 — データベースを設定する

1. Supabase の左メニュー「SQL Editor」をクリック
2. 「New query」をクリック
3. `supabase/migrations/001_initial_schema.sql` の中身をすべてコピー → 貼り付け → 「Run」
4. 同様に `supabase/migrations/002_rls_policies.sql` の中身を実行
5. 「Table Editor」で `clients`, `cases`, `daily_reports`, `contracts`, `user_profiles` テーブルが作成されていることを確認

### STEP 3 — Supabase の接続情報を取得する

1. 左メニュー「Settings」→「API」
2. 以下の2つをメモする：
   - **Project URL**: `https://xxxxxxxxxxxx.supabase.co`
   - **anon public key**: `eyJh...` から始まる長い文字列

### STEP 4 — 環境変数ファイルを設定する

プロジェクトのルートフォルダで `.env.example` を `.env` にコピー：

```bash
cp .env.example .env
```

`.env` を開いて値を入力：

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJh...（実際のキーを貼り付け）
```

### STEP 5 — ローカルで動作確認する

```bash
# 依存パッケージをインストール
npm install

# 開発サーバー起動
npm run dev
```

ブラウザで `http://localhost:5173` を開く。

### STEP 6 — 最初の管理者アカウントを作成する

1. Supabase の左メニュー「Authentication」→「Users」
2. 「Invite user」または「Add user」で管理者のメールアドレスとパスワードを登録
3. 「Table Editor」→「user_profiles」テーブルで、作成されたユーザーの `role` を `admin` に変更
4. 作成したメールアドレスでシステムにログイン

### STEP 7 — Vercel でデプロイする（URLを発行する）

1. **https://vercel.com** にアクセス → GitHubアカウントでサインアップ
2. GitHubにプロジェクトをプッシュ：
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/あなたのID/rico-hotel-crm.git
   git push -u origin main
   ```
3. Vercel で「New Project」→ GitHubリポジトリを選択 → 「Import」
4. 「Environment Variables」に以下を追加：
   - `VITE_SUPABASE_URL` = Step3で取得したURL
   - `VITE_SUPABASE_ANON_KEY` = Step3で取得したキー
5. 「Deploy」をクリック → 2〜3分でURLが発行される
6. 発行されたURL（例: `https://rico-hotel-crm.vercel.app`）をスタッフに共有

---

## 👥 権限一覧

| 権限 | ログイン | 閲覧 | 登録・編集 | 削除 | ユーザー管理 |
|------|---------|------|-----------|------|------------|
| admin（管理者） | ✅ | ✅ | ✅ | ✅ | ✅ |
| manager（マネージャー） | ✅ | ✅ | ✅ | ✅ | ❌ |
| sales（営業担当） | ✅ | ✅ | ✅ | ❌ | ❌ |
| viewer（閲覧のみ） | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 📱 動作確認済みデバイス

- PC（Windows / Mac）— Chrome, Edge, Safari, Firefox
- iPhone / iPad — Safari
- Android — Chrome

---

## 🔄 リアルタイム同期

Supabase Realtime を使用しています。
- 平井さんが営業先を追加 → 数秒以内に社長の画面にも反映
- 案件ステータスを変更 → 全デバイスで同時更新

---

## 📊 将来の拡張（Phase 2）

`supabase/migrations/` に以下のSQLファイルを追加するだけで機能拡張できます：

- `008_rooms.sql` — 部屋管理・清掃指示
- `009_cleaning.sql` — 清掃管理
- `010_shifts.sql` — シフト管理
- `011_petty_cash.sql` — 小口現金管理
- `012_expenses.sql` — 経費申請
- `013_purchase.sql` — 購入申請
- `014_cashier.sql` — キャッシャーレポート

---

## ❓ よくある質問

**Q: データはどこに保存されますか？**
A: Supabase（PostgreSQL）のクラウドサーバーに保存されます。ブラウザを閉じても消えません。

**Q: スタッフが増えたらどうすればいいですか？**
A: 「設定」画面の「スタッフを追加」から管理者が追加できます。

**Q: 無料で使えますか？**
A: Supabase無料プランで最大500MB、Vercel無料プランで月100GBまで利用できます。当面は無料で十分です。

**Q: データのバックアップは？**
A: Supabase が毎日自動バックアップしています。加えて「CSV出力」機能でいつでもエクスポートできます。
