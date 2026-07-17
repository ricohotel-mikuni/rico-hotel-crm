import { useState, useEffect } from 'react'
import { useDailySales } from '../../../hooks/useData'
import { useCurrentHotel } from '../HotelContext'
import { usePermission } from '../../../permissions/PermissionContext'
import Modal from '../../../ui/Modal'
import { Btn, Toast, AsyncBoundary, TableSkeleton, Empty } from '../../../ui'
import { DASH } from '../../../lib/designSystem'
import { DarkPage, KpiGrid, KpiCell, DarkPanel, DarkField, DarkTextarea } from '../../../ui/DesignSystemKit'

const yen = (n) => `¥${Number(n || 0).toLocaleString()}`
const dateStr = (d) => d ? new Date(d).toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short' }) : ''

const EMPTY_FORM = { room_revenue: '', breakfast_revenue: '', dinner_revenue: '', parking_revenue: '', notes: '' }

// 売上管理(HotelOS Phase 1)— Front Desk/Breakfast/Dinner/Parkingと
// 同じDesign System部品(DarkPage/KpiGrid/KpiCell/DarkPanel)のみで
// 構成。客室/朝食/夕食/駐車場のいずれのテーブルにも金額列が無い
// ため、宿泊・提供件数からの自動計算(=推測)は行わず、実際の締め
// 作業と同じくフロント/支配人が実額を日次で手入力する(migration
// 023、useDailySales)。合計はDB側のGENERATED ALWAYS ASで保証される
// ため、フロント側では計算しない。保存後は購読により一覧・KPIが
// 即時反映されるため、F5・画面遷移は一切発生しない。
export default function Revenue() {
  const hotel = useCurrentHotel()
  const { history, todayRecord, loading, error, refresh, save } = useDailySales(hotel?.hotelId)
  const canEdit = usePermission('revenue', 'edit')

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const showToast = (m, t = 'success') => { setToast({ message: m, type: t }); setTimeout(() => setToast(null), 3000) }

  useEffect(() => {
    if (modalOpen) {
      setForm(todayRecord
        ? {
          room_revenue: String(todayRecord.room_revenue ?? ''), breakfast_revenue: String(todayRecord.breakfast_revenue ?? ''),
          dinner_revenue: String(todayRecord.dinner_revenue ?? ''), parking_revenue: String(todayRecord.parking_revenue ?? ''),
          notes: todayRecord.notes || '',
        }
        : EMPTY_FORM)
    }
  }, [modalOpen, todayRecord])

  const saveSales = async () => {
    setSaving(true)
    const { error } = await save(form)
    setSaving(false)
    if (error) return showToast('保存に失敗しました: ' + error.message, 'error')
    showToast('本日の売上を保存しました')
    setModalOpen(false)
  }

  return (
    <DarkPage>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: DASH.gold, fontWeight: 700, letterSpacing: 2.5, marginBottom: 8 }}>ホテル業務</div>
          <h1 style={{ fontSize: 19, fontWeight: 700, color: DASH.textMain, margin: '0 0 3px' }}>売上管理</h1>
          <div style={{ fontSize: 12, color: DASH.textFaint }}>客室・朝食・夕食・駐車場の日次売上を記録します</div>
        </div>
        {canEdit && (
          <Btn onClick={() => setModalOpen(true)} icon="ti-report-money" label={todayRecord ? '本日の売上を編集' : '本日の売上を入力'} color={DASH.gold} />
        )}
      </div>

      <AsyncBoundary loading={loading} error={error} onRetry={refresh} skeleton={<TableSkeleton rows={2} columns={5} />}>
        <KpiGrid>
          <KpiCell icon="ti-bed" color={DASH.green} label="客室売上" value={yen(todayRecord?.room_revenue)} />
          <KpiCell icon="ti-coffee" color={DASH.gold} label="朝食売上" value={yen(todayRecord?.breakfast_revenue)} />
          <KpiCell icon="ti-tools-kitchen-2" color={DASH.orange} label="夕食売上" value={yen(todayRecord?.dinner_revenue)} />
          <KpiCell icon="ti-car" color={DASH.blue} label="駐車場売上" value={yen(todayRecord?.parking_revenue)} />
          <KpiCell icon="ti-chart-line" color={DASH.purple} label="本日の合計売上" value={yen(todayRecord?.total_revenue)} sub={todayRecord ? undefined : '未入力'} />
        </KpiGrid>
      </AsyncBoundary>

      <DarkPanel title="🧾 売上履歴">
        <AsyncBoundary loading={loading} error={error} onRetry={refresh} skeleton={<TableSkeleton rows={4} columns={7} />}>
          {history.length === 0 ? (
            <Empty icon="ti-report-money" title="売上記録はまだありません" />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'rgba(212,175,55,.08)' }}>
                    {['日付', '客室', '朝食', '夕食', '駐車場', '合計', '記録者'].map(h => (
                      <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, color: DASH.gold, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((r, i) => (
                    <tr key={r.id} style={{ borderTop: i > 0 ? `1px solid ${DASH.border}` : 'none' }}>
                      <td style={{ padding: '9px 12px', color: DASH.textMain, fontWeight: 600, whiteSpace: 'nowrap' }}>{dateStr(r.sales_date)}</td>
                      <td style={{ padding: '9px 12px', color: DASH.textSub, whiteSpace: 'nowrap' }}>{yen(r.room_revenue)}</td>
                      <td style={{ padding: '9px 12px', color: DASH.textSub, whiteSpace: 'nowrap' }}>{yen(r.breakfast_revenue)}</td>
                      <td style={{ padding: '9px 12px', color: DASH.textSub, whiteSpace: 'nowrap' }}>{yen(r.dinner_revenue)}</td>
                      <td style={{ padding: '9px 12px', color: DASH.textSub, whiteSpace: 'nowrap' }}>{yen(r.parking_revenue)}</td>
                      <td style={{ padding: '9px 12px', color: DASH.textMain, fontWeight: 700, whiteSpace: 'nowrap' }}>{yen(r.total_revenue)}</td>
                      <td style={{ padding: '9px 12px', color: DASH.textFaint, whiteSpace: 'nowrap' }}>{r.employees?.full_name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AsyncBoundary>
      </DarkPanel>

      {modalOpen && (
        <Modal title={todayRecord ? '本日の売上を編集' : '本日の売上を入力'} icon="ti-report-money" onClose={() => setModalOpen(false)} onSave={saveSales} saving={saving} width={440}>
          <DarkField label="客室売上" type="number" value={form.room_revenue} onChange={v => setForm({ ...form, room_revenue: v })} placeholder="0" />
          <DarkField label="朝食売上" type="number" value={form.breakfast_revenue} onChange={v => setForm({ ...form, breakfast_revenue: v })} placeholder="0" />
          <DarkField label="夕食売上" type="number" value={form.dinner_revenue} onChange={v => setForm({ ...form, dinner_revenue: v })} placeholder="0" />
          <DarkField label="駐車場売上" type="number" value={form.parking_revenue} onChange={v => setForm({ ...form, parking_revenue: v })} placeholder="0" />
          <DarkTextarea label="メモ(任意)" value={form.notes} onChange={v => setForm({ ...form, notes: v })} rows={2} />
        </Modal>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </DarkPage>
  )
}
