# Migration運用ルール

## Gitで既に管理されています

このディレクトリ(`supabase/migrations/`)はリポジトリの一部であり、他のソースコードと同じく**既にGitで管理・追跡されています**。`git log -- supabase/migrations/` で誰がいつどのmigrationを追加したか確認できます。ローカルにしか無いファイルではありません。

## 適用方法(自動 — GitHub Push → 本番DBへ自動反映)

`supabase/migrations/**` に変更を加えて `main` へ push すると、GitHub Actions
(`.github/workflows/supabase-migrations.yml`)が自動的に `supabase db push` を
実行し、本番のSupabaseプロジェクトへ反映します。**Supabase StudioのSQL Editor
に手動で貼り付ける運用はもう不要です。**

### 初回だけ必要な設定(リポジトリのSettingsで一度だけ)

GitHubリポジトリの **Settings → Secrets and variables → Actions → New repository secret** で、以下の3つを登録してください(いずれもコードには一切含めない、秘匿情報です):

| Secret名 | 値の取得場所 |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | Supabaseダッシュボード右上のアカウントメニュー → **Access Tokens** → 新規発行 |
| `SUPABASE_PROJECT_ID` | 対象プロジェクトの **Project Settings → General → Reference ID** |
| `SUPABASE_DB_PASSWORD` | 対象プロジェクトの **Project Settings → Database → Database password**(プロジェクト作成時に設定したもの。忘れた場合は同画面でリセット可能) |

この3つを登録した後は、以降の `supabase/migrations/` への変更は push するだけで自動的に本番へ適用されます。GitHubリポジトリの **Actions** タブから実行結果(成功/失敗)を確認できます。

### 初回実行時の注意

これまで一部のmigrationはSupabase Studioで手動実行されていた可能性があり、GitHub Actions側の適用履歴(`supabase_migrations.schema_migrations`)は空の状態から始まります。そのため初回実行時は `001` から順に全ファイルが実行されますが、全てのmigrationは冪等に書かれている(`CREATE TABLE IF NOT EXISTS` / `DROP POLICY IF EXISTS` → `CREATE POLICY` / `CREATE OR REPLACE TRIGGER` を徹底)ため、既に存在するテーブル/ポリシー/トリガーがあってもエラーにならず安全に完了します。

### トラブルシュート(手動介入が必要な場合のみ)

Actionsが失敗した場合は、GitHubの **Actions** タブでログを確認してください。よくある原因:
- Secretの値が誤っている(特にプロジェクトRef/パスワード)
- 稀に、あるmigrationの一部だけがSupabase側で過去に手動実行されており、冪等化で想定していない状態になっている場合 — その場合はエラーメッセージを元に該当ファイルを確認する。

どうしても自動適用できない場合の最終手段としてのみ、[Supabase Studio](https://app.supabase.com)のSQL Editorで該当ファイルを直接実行することも可能です(その後 `NOTIFY pgrst, 'reload schema';` を忘れずに)。

## 現在存在するはずのテーブル/View(2026-07-06時点、001〜009適用後)

具体的な一覧はリポジトリのコミットメッセージ(v1.2.3)を参照してください。ズレを感じたら、SQL Editorで以下を実行して実際の状態を確認できます:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
SELECT table_name FROM information_schema.views  WHERE table_schema = 'public' ORDER BY table_name;
```

## 新しいmigrationを追加するときの規則

1. ファイル名は `NNN_短い説明.sql`(3桁ゼロ埋め連番)、常に最新番号+1から始める。
2. 冪等に書く: `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `CREATE OR REPLACE VIEW/FUNCTION` を徹底し、二重実行してもエラーにならないようにする。
3. 新しいテーブルには必ずセットで書く: `ENABLE ROW LEVEL SECURITY` → 最低でも `<table>_select_...` ポリシー → 書き込みが必要なら `<table>_write_admin`(`public.is_admin_or_manager()`を使う、`002_rls_policies.sql`で定義済み)。閲覧を管理者限定にしたい機微データは`banks_select_admin`(`005`)を参考に。
4. `updated_at`が必要な可変テーブルは、既存の共有トリガー関数`update_updated_at()`(`001`で定義済み)をそのまま使う。新しい関数を作らない。
5. 履歴/ログ系テーブルを追加する前に、`009_extended_logs_and_documents.sql`冒頭のコメントで整理した既存の使い分け(`client_history`/`approval_history`/`audit_logs`/`activity_logs`)を確認し、同じ役割のテーブルを重複作成しない。
6. ファイル末尾に `NOTIFY pgrst, 'reload schema';` を付ける(スキーマキャッシュ関連の事故を防ぐ、007以降の慣習)。
