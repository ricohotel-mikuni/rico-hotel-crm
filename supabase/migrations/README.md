# Migration運用ルール

## Gitで既に管理されています

このディレクトリ(`supabase/migrations/`)はリポジトリの一部であり、他のソースコードと同じく**既にGitで管理・追跡されています**。`git log -- supabase/migrations/` で誰がいつどのmigrationを追加したか確認できます。ローカルにしか無いファイルではありません。

## 適用方法(重要)

このプロジェクトには Supabase CLI のプロジェクトリンク(`supabase link`)が設定されていません。そのため migration ファイルは **自動では適用されません**。新しいファイルが増えるたびに、以下の手順で **手動で** 適用してください。

1. [Supabase Studio](https://app.supabase.com) → 対象プロジェクト → **SQL Editor** を開く。
2. `supabase/migrations/` 内のファイルを **番号順に**(`001` → `002` → … → 最新)、まだ実行していないものだけ貼り付けて実行する。
   - 既に実行済みのファイルを再実行しても安全です(`CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` / `CREATE OR REPLACE VIEW` などで冪等に書かれています)。
3. 実行後、目的のテーブル/viewがアプリから見えるか確認する。もし直後に「Could not find the table ... in the schema cache」が出る場合は、SQL Editorで以下を実行してPostgRESTのスキーマキャッシュを更新してください(多くのmigrationファイルは末尾に`NOTIFY pgrst, 'reload schema';`を含みますが、それでも反映されない場合の保険です):
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```
   それでも直らない場合は、Supabase Studioの Project Settings → General → **Restart project** を実行してください(PostgRESTプロセスの再起動)。

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
