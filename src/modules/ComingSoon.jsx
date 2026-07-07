import HubShell from '../layout/HubShell'
import { C } from '../lib/constants'

// `bare`: when this screen is already a child of a shell that renders
// its own Header (SidebarShell, used by property/admin routes), skip
// wrapping in HubShell (which would render a second header). Top-level
// company screens (e.g. /rentals, /ai) have no such ancestor shell, so
// they still get the default HubShell wrapper.
//
// No longer has its own in-content "ホームへ戻る" button — the header's
// breadcrumb (and, for property/admin routes, the persistent sidebar's
// own "ホーム" item) already cover that, so a second one here was a
// redundant duplicate.
export default function ComingSoon({ module, bare }) {
  const content = (
    <div style={{ maxWidth: 460, margin: '0 auto', padding: '90px 20px 40px', textAlign: 'center' }}>
      <div style={{
        width: 68, height: 68, borderRadius: 18, margin: '0 auto 20px',
        background: `${C.gold}1F`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className={`ti ${module.icon}`} style={{ fontSize: 30, color: '#B4933D' }} />
      </div>
      <h1 style={{ fontSize: 18, fontWeight: 700, color: C.navy, margin: '0 0 8px' }}>
        {module.label}
      </h1>
      <div style={{ fontSize: 13, color: '#90A4AE', lineHeight: 1.7 }}>
        この機能は現在準備中です。<br />
        今後のアップデートで順次公開いたします。
      </div>
    </div>
  )

  return bare ? content : <HubShell>{content}</HubShell>
}
