import { useNavigate } from 'react-router-dom'
import { useTable } from '../../hooks/useData'
import HubShell from '../../layout/HubShell'
import { PageLoader, ErrorState, Btn } from '../../ui'
import { C } from '../../lib/constants'

const STATUS_LABEL = { active: '在籍中', inactive: '退職済み' }
const STATUS_COLOR = { active: '#1B5E20', inactive: '#9E9E9E' }
const STATUS_BG = { active: '#E8F5E9', inactive: '#F5F5F5' }

function StatusPill({ status }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 9px', borderRadius: 12,
      fontSize: 11, fontWeight: 700,
      background: STATUS_BG[status] || '#F5F5F5',
      color: STATUS_COLOR[status] || '#757575',
    }}>
      {STATUS_LABEL[status] || status || '—'}
    </span>
  )
}

// 社員管理 — 大栄商事株式会社に所属する社員の一覧(閲覧専用)。
// v_employee_directory(supabase/migrations/005_company_foundation.sql)
// は employees + 現在の主配属(employee_assignments) + locations +
// departments を結合したビュー。編集は今回実装せず、既存の
// スタッフ設定画面への導線のみ用意する。
export default function EmployeeDirectory() {
  const navigate = useNavigate()
  const { data: employees, loading, error, refresh } = useTable(
    'v_employee_directory',
    q => q.select('*'),
    'employees',
  )

  return (
    <HubShell>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px 56px' }}>
        <div style={{ marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, letterSpacing: 2.5, marginBottom: 8 }}>
              社員管理
            </div>
            <h1 style={{ fontSize: 21, fontWeight: 700, color: C.navy, margin: '0 0 5px' }}>
              社員ディレクトリ
            </h1>
            <div style={{ fontSize: 13, color: '#90A4AE' }}>
              大栄商事株式会社に所属する社員の一覧(閲覧専用)
            </div>
          </div>
          <Btn onClick={() => navigate('/hotels/rico-mikuni/sales/settings')} icon="ti-settings" label="スタッフ・権限設定へ" color={C.navy} outline />
        </div>

        {loading && <PageLoader />}
        {!loading && error && <ErrorState message={error} onRetry={refresh} />}
        {!loading && !error && (
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #ECEFF1', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F5F7FA' }}>
                    {['社員番号', '氏名', '役職', '部署', '配属先', '状態'].map(h => (
                      <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, color: '#607D8B', fontWeight: 600, borderBottom: '1px solid #ECEFF1', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '28px', textAlign: 'center', color: '#BDBDBD', fontSize: 12 }}>
                        社員データがありません
                      </td>
                    </tr>
                  )}
                  {employees.map((e, i) => (
                    <tr key={e.id} style={{ background: i % 2 ? '#FAFAFA' : '#fff', borderBottom: '1px solid #F5F5F5' }}>
                      <td style={{ padding: '9px 14px', color: '#607D8B', whiteSpace: 'nowrap' }}>{e.employee_no || '—'}</td>
                      <td style={{ padding: '9px 14px', fontWeight: 600, color: C.navy, whiteSpace: 'nowrap' }}>{e.full_name}</td>
                      <td style={{ padding: '9px 14px', color: '#607D8B' }}>{e.position || '—'}</td>
                      <td style={{ padding: '9px 14px', color: '#607D8B' }}>{e.department_name || '—'}</td>
                      <td style={{ padding: '9px 14px', color: '#607D8B' }}>{e.location_name || '—'}</td>
                      <td style={{ padding: '9px 14px' }}><StatusPill status={e.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </HubShell>
  )
}
