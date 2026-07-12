import { useTable } from '../../hooks/useData'
import { AsyncBoundary, TableSkeleton, Empty } from '../../ui'
import { DASH } from '../../lib/designSystem'
import { DarkPage } from '../../ui/DesignSystemKit'

function ResultBadge({ success }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 9px', borderRadius: 12, fontSize: 11, fontWeight: 700,
      background: success ? 'rgba(76,217,100,.14)' : 'rgba(220,38,38,.12)', color: success ? DASH.green : DASH.alert,
    }}>
      {success ? '成功' : '失敗'}
    </span>
  )
}

const METHOD_LABEL = { password: 'パスワード', pin: 'PIN' }
const REASON_LABEL = {
  wrong_pin: 'PIN誤り', locked: 'ロック中', device_not_trusted: '未信頼端末', not_enrolled: 'PIN未登録',
}

// 監査ログ(/admin/audit-logs) — 現時点ではlogin_history(PIN/パスワード
// ログインの成否)のみを表示する。audit_logs本体(操作・変更履歴)は
// service-role/Edge Function基盤が無いため意図的に空のまま(009参照)。
// このRPC(verify_employee_pin/record_password_login)経由の書き込みだけが
// 現状「サーバー側で信頼できる」記録のため、まずここから提供する。
// Design System v1.0(承認済み提案書「Design System v1.0 仕様変更」)。
export default function AdminAuditLog() {
  const { data: rows, loading, error, refresh } = useTable(
    'login_history',
    q => q.select('*, employees(full_name)').order('created_at', { ascending: false }).limit(200),
  )

  return (
    <DarkPage maxWidth={980}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 11, color: DASH.gold, fontWeight: 700, letterSpacing: 2.5, marginBottom: 8 }}>管理者専用</div>
        <h1 style={{ fontSize: 21, fontWeight: 700, color: DASH.textMain, margin: '0 0 5px' }}>監査ログ — ログイン履歴</h1>
        <div style={{ fontSize: 13, color: DASH.textFaint }}>
          パスワード・PINログインの成功/失敗を新しい順に表示しています(直近200件)。操作履歴・変更履歴は今後のモジュール追加に合わせて拡張予定です。
        </div>
      </div>

      <div style={{ background: DASH.card, borderRadius: 14, border: `1px solid ${DASH.border}`, boxShadow: DASH.cardShadow, overflow: 'hidden' }}>
        <AsyncBoundary loading={loading} error={error} onRetry={refresh} skeleton={<div style={{ padding: 16 }}><TableSkeleton rows={6} columns={5} /></div>}>
          {rows.length === 0 ? (
            <Empty icon="ti-list-check" title="まだログイン履歴がありません" />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: 'rgba(212,175,55,.08)', textAlign: 'left' }}>
                    {['日時', '氏名', '方法', '結果', '詳細'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', color: DASH.gold, fontWeight: 700, fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id} style={{ borderTop: i > 0 ? `1px solid ${DASH.border}` : 'none' }}>
                      <td style={{ padding: '9px 14px', color: DASH.textSub, whiteSpace: 'nowrap' }}>
                        {new Date(r.created_at).toLocaleString('ja-JP')}
                      </td>
                      <td style={{ padding: '9px 14px', color: DASH.textSub }}>{r.employees?.full_name || '—'}</td>
                      <td style={{ padding: '9px 14px', color: DASH.textSub }}>{METHOD_LABEL[r.method] || r.method}</td>
                      <td style={{ padding: '9px 14px' }}>
                        <ResultBadge success={r.success} />
                      </td>
                      <td style={{ padding: '9px 14px', color: DASH.textFaint }}>{REASON_LABEL[r.reason] || r.reason || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AsyncBoundary>
      </div>
    </DarkPage>
  )
}
