import HubShell from '../layout/HubShell'
import { DASH } from '../lib/designSystem'
import { DarkPage } from '../ui/DesignSystemKit'

// `bare`: when this screen is already a child of a shell that renders
// its own Header (SidebarShell, used by property/admin routes), skip
// wrapping in HubShell (which would render a second header). Top-level
// company screens (e.g. /rentals, /ai) have no such ancestor shell, so
// they still get the default HubShell wrapper.
//
// No longer has its own in-content "ホームへ戻る" button — the header's
// breadcrumb (and, for property/admin routes, the persistent sidebar's
// own brand-logo header) already cover that, so a second one here was a
// redundant duplicate.
//
// Design System v1.0(承認済み提案書「Design System v1.0 仕様変更」)—
// この1ファイルはフロント・清掃・朝食・夕食・駐車場・設備・シフト・
// 入金管理・キャッシャーレポート・購入申請・経費精算・書類管理・
// 拠点設定・NEO・銀行融資管理・権限管理・システム管理・システム
// アーカイブ・バックアップなど「準備中」の全モジュールが共通で使う
// プレースホルダーのため、ここをDesign System化するだけでそれら
// すべての画面が一括で統一される。
export default function ComingSoon({ module, bare }) {
  const content = (
    <DarkPage maxWidth={460}>
      <div style={{ padding: '70px 0 40px', textAlign: 'center' }}>
        <div style={{
          width: 68, height: 68, borderRadius: 18, margin: '0 auto 20px',
          background: 'rgba(212,175,55,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className={`ti ${module.icon}`} style={{ fontSize: 30, color: DASH.gold }} />
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: DASH.textMain, margin: '0 0 8px' }}>
          {module.label}
        </h1>
        <div style={{ fontSize: 13, color: DASH.textFaint, lineHeight: 1.7 }}>
          この機能は現在準備中です。<br />
          今後のアップデートで順次公開いたします。
        </div>
      </div>
    </DarkPage>
  )

  return bare ? content : <HubShell>{content}</HubShell>
}
