import { useNavigate } from 'react-router-dom'
import HubShell from '../layout/HubShell'
import { useBrand } from '../branding/BrandContext'
import { Btn } from '../ui'
import { C } from '../lib/constants'

export default function ComingSoon({ module }) {
  const navigate = useNavigate()
  const brand = useBrand()

  return (
    <HubShell>
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
        <div style={{ fontSize: 13, color: '#90A4AE', marginBottom: 28, lineHeight: 1.7 }}>
          この機能は現在準備中です。<br />
          今後のアップデートで順次公開いたします。
        </div>
        <Btn onClick={() => navigate(brand.homePath)} icon="ti-arrow-left" label="ホームへ戻る" color={C.navy} />
      </div>
    </HubShell>
  )
}
