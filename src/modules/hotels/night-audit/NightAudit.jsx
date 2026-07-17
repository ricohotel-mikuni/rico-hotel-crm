import { useState } from 'react'
import { useDailySales, useNightAudit } from '../../../hooks/useData'
import { useCurrentHotel } from '../HotelContext'
import { useBrand } from '../../../branding/BrandContext'
import { usePermission } from '../../../permissions/PermissionContext'
import { useNavigate } from 'react-router-dom'
import { Btn, Toast, AsyncBoundary, TableSkeleton, Empty } from '../../../ui'
import { DASH } from '../../../lib/designSystem'
import { DarkPage, KpiGrid, KpiCell, DarkPanel } from '../../../ui/DesignSystemKit'

const yen = (n) => `¥${Number(n || 0).toLocaleString()}`
const dateStr = (d) => d ? new Date(d).toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short' }) : ''
const dtStr = (iso) => iso ? new Date(iso).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''

// 日次締め(Night Audit、HotelOS Phase 1)— 売上管理(Revenue.jsx)と
// 同じDesign System部品(DarkPage/KpiGrid/KpiCell/DarkPanel)のみで
// 構成。「既存設計を変更しない」指示のため、daily_sales(売上管理)
// のテーブル・フック・RLSには一切手を加えず、締め処理は別テーブル
// night_audits(migration 024)への1回限りのINSERTとして実装した
// (UPDATE/DELETEポリシーが存在しないため、一度実行した締めは訂正
// できない確定記録)。保存後は購読により即時反映されるため、F5・
// 画面遷移は一切発生しない。
export default function NightAudit() {
  const hotel = useCurrentHotel()
  const brand = useBrand()
  const navigate = useNavigate()
  const { todayRecord: todaySales, loading: salesLoading, error: salesError, refresh: refreshSales } = useDailySales(hotel?.hotelId)
  const { history, todayAudit, loading, error, refresh, closeDay } = useNightAudit(hotel?.hotelId)
  const canEdit = usePermission('night-audit', 'edit')

  const [closing, setClosing] = useState(false)
  const [toast, setToast] = useState(null)
  const showToast = (m, t = 'success') => { setToast({ message: m, type: t }); setTimeout(() => setToast(null), 3000) }

  const doClose = async () => {
    if (!window.confirm('本日の売上を確定し、締め処理を実行します。実行後は取り消せません。よろしいですか？')) return
    setClosing(true)
    const { error } = await closeDay(todaySales)
    setClosing(false)
    if (error) return showToast(error.message, 'error')
    showToast('本日の締め処理が完了しました')
  }

  return (
    <DarkPage>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: DASH.gold, fontWeight: 700, letterSpacing: 2.5, marginBottom: 8 }}>ホテル業務</div>
        <h1 style={{ fontSize: 19, fontWeight: 700, color: DASH.textMain, margin: '0 0 3px' }}>日次締め</h1>
        <div style={{ fontSize: 12, color: DASH.textFaint }}>本日の売上を確認し、締め処理を実行します</div>
      </div>

      <AsyncBoundary loading={salesLoading || loading} error={salesError || error} onRetry={() => { refreshSales(); refresh() }} skeleton={<TableSkeleton rows={3} columns={5} />}>
        {todayAudit ? (
          <DarkPanel title="✅ 本日の締め状況">
            <div style={{ fontSize: 13, color: DASH.green, fontWeight: 700, marginBottom: 14 }}>
              本日は締め済みです({dtStr(todayAudit.closed_at)}・{todayAudit.employees?.full_name || '—'})
            </div>
            <KpiGrid>
              <KpiCell icon="ti-bed" color={DASH.green} label="客室売上" value={yen(todayAudit.room_revenue)} />
              <KpiCell icon="ti-coffee" color={DASH.gold} label="朝食売上" value={yen(todayAudit.breakfast_revenue)} />
              <KpiCell icon="ti-tools-kitchen-2" color={DASH.orange} label="夕食売上" value={yen(todayAudit.dinner_revenue)} />
              <KpiCell icon="ti-car" color={DASH.blue} label="駐車場売上" value={yen(todayAudit.parking_revenue)} />
              <KpiCell icon="ti-checkbox" color={DASH.purple} label="確定合計売上" value={yen(todayAudit.total_revenue)} />
            </KpiGrid>
          </DarkPanel>
        ) : !todaySales ? (
          <DarkPanel title="① 当日売上確認">
            <Empty
              icon="ti-report-money" title="本日の売上がまだ入力されていません"
              action={canEdit && <Btn onClick={() => navigate(`${brand.homePath}/revenue`)} icon="ti-arrow-right" label="売上管理画面へ" color={DASH.brandNavy} sm />}
            />
          </DarkPanel>
        ) : (
          <DarkPanel title="① 当日売上確認">
            <KpiGrid>
              <KpiCell icon="ti-bed" color={DASH.green} label="客室売上" value={yen(todaySales.room_revenue)} />
              <KpiCell icon="ti-coffee" color={DASH.gold} label="朝食売上" value={yen(todaySales.breakfast_revenue)} />
              <KpiCell icon="ti-tools-kitchen-2" color={DASH.orange} label="夕食売上" value={yen(todaySales.dinner_revenue)} />
              <KpiCell icon="ti-car" color={DASH.blue} label="駐車場売上" value={yen(todaySales.parking_revenue)} />
              <KpiCell icon="ti-chart-line" color={DASH.purple} label="合計売上" value={yen(todaySales.total_revenue)} />
            </KpiGrid>
            <div style={{ fontSize: 11, color: DASH.textFaint, margin: '14px 0' }}>
              上記の金額で本日の売上を確定します。実行後は売上管理画面で金額を修正しても、この締め記録の金額は変わりません(確定時点のスナップショット)。
            </div>
            {canEdit && <Btn onClick={doClose} icon="ti-lock" label="② 売上を確定して③ 締め処理を実行" color={DASH.gold} disabled={closing} />}
          </DarkPanel>
        )}
      </AsyncBoundary>

      <div style={{ marginTop: 20 }}>
        <DarkPanel title="🕘 締め履歴">
          <AsyncBoundary loading={loading} error={error} onRetry={refresh} skeleton={<TableSkeleton rows={3} columns={6} />}>
            {history.length === 0 ? <Empty icon="ti-history" title="締め履歴はまだありません" /> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'rgba(212,175,55,.08)' }}>
                      {['日付', '合計売上', '締め担当者', '締め日時'].map(h => (
                        <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, color: DASH.gold, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((a, i) => (
                      <tr key={a.id} style={{ borderTop: i > 0 ? `1px solid ${DASH.border}` : 'none' }}>
                        <td style={{ padding: '9px 12px', color: DASH.textMain, fontWeight: 600, whiteSpace: 'nowrap' }}>{dateStr(a.audit_date)}</td>
                        <td style={{ padding: '9px 12px', color: DASH.textMain, fontWeight: 700, whiteSpace: 'nowrap' }}>{yen(a.total_revenue)}</td>
                        <td style={{ padding: '9px 12px', color: DASH.textFaint, whiteSpace: 'nowrap' }}>{a.employees?.full_name || '—'}</td>
                        <td style={{ padding: '9px 12px', color: DASH.textFaint, whiteSpace: 'nowrap' }}>{dtStr(a.closed_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AsyncBoundary>
        </DarkPanel>
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </DarkPage>
  )
}
