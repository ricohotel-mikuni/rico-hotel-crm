import { useState } from 'react'
import { useParkingSpots, useParkingUsages, useStays } from '../../../hooks/useData'
import { useCurrentHotel } from '../HotelContext'
import { usePermission } from '../../../permissions/PermissionContext'
import Modal from '../../../ui/Modal'
import { Btn, Toast, AsyncBoundary, TableSkeleton, Empty } from '../../../ui'
import { DASH } from '../../../lib/designSystem'
import { DarkPage, KpiGrid, KpiCell, DarkPanel, DarkField } from '../../../ui/DesignSystemKit'

const SPOT_STATUS = {
  vacant:       { label: '空車',       color: DASH.green },
  reserved:     { label: '予約済',     color: DASH.gold },
  occupied:     { label: '利用中',     color: DASH.blue },
  out_of_order: { label: '使用不可',   color: DASH.alert },
}
const USAGE_STATUS_LABEL = { reserved: '予約済', active: '利用中', completed: '利用終了', cancelled: 'キャンセル' }

const dtStr = (iso) => iso ? new Date(iso).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

const EMPTY_USAGE = { stay_id: '', spot_id: '', vehicle_type: '', license_plate: '', notes: '' }
const EMPTY_SPOT = { spot_number: '' }

// 駐車場(HotelOS Phase 1)— フロント/朝食と同じDesign System部品
// (DarkPage/KpiGrid/KpiCell/DarkPanel)のみで構成。parking_spots
// (区画、rooms相当)とparking_usages(利用、stays相当、migration 021)
// をuseParkingSpots/useParkingUsages(realtime購読込み)で扱う。
// 区画は同時刻1台が前提のため、rooms/staysと異なり利用登録の時点で
// 区画を'reserved'にする設計 — 保存後は購読により一覧・KPIが即時
// 反映されるため、F5・画面遷移は一切発生しない。
export default function Parking() {
  const hotel = useCurrentHotel()
  const { spots, loading: spotsLoading, error: spotsError, refresh: refreshSpots, add: addSpot, setSpotStatus } = useParkingSpots(hotel?.hotelId)
  const { usages, loading: usagesLoading, error: usagesError, refresh: refreshUsages, add, startUsage, endUsage } = useParkingUsages(hotel?.hotelId)
  const { stays } = useStays(hotel?.hotelId)
  const canEdit = usePermission('parking', 'edit')

  const [spotModal, setSpotModal] = useState(null)
  const [spotAddModal, setSpotAddModal] = useState(false)
  const [spotForm, setSpotForm] = useState(EMPTY_SPOT)
  const [usageModal, setUsageModal] = useState(false)
  const [form, setForm] = useState(EMPTY_USAGE)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const showToast = (m, t = 'success') => { setToast({ message: m, type: t }); setTimeout(() => setToast(null), 3000) }

  const counts = spots.reduce((acc, s) => { acc[s.status] = (acc[s.status] || 0) + 1; return acc }, {})
  const utilizationRate = spots.length ? Math.round(((counts.occupied || 0) / spots.length) * 100) : 0
  const reservedUsages = usages.filter(u => u.status === 'reserved')
  const activeUsages = usages.filter(u => u.status === 'active')
  const historyUsages = usages.filter(u => ['completed', 'cancelled'].includes(u.status)).slice(0, 20)
  const guestOptions = stays.filter(s => ['reserved', 'checked_in'].includes(s.status))

  const doStart = async (usage) => {
    const { error } = await startUsage(usage)
    if (error) showToast('開始処理に失敗しました: ' + error.message, 'error')
    else showToast(`${usage.license_plate}様の駐車利用を開始しました`)
  }
  const doEnd = async (usage) => {
    const { error } = await endUsage(usage)
    if (error) showToast('終了処理に失敗しました: ' + error.message, 'error')
    else showToast(`${usage.license_plate}様の駐車利用を終了しました`)
  }
  const changeSpotStatus = async (status) => {
    const { error } = await setSpotStatus(spotModal.id, status)
    if (error) showToast('更新に失敗しました: ' + error.message, 'error')
    else showToast('駐車位置ステータスを更新しました')
    setSpotModal(null)
  }

  const saveUsage = async () => {
    if (!form.stay_id) return showToast('宿泊者を選択してください', 'error')
    if (!form.spot_id) return showToast('駐車位置を選択してください', 'error')
    if (!form.license_plate) return showToast('ナンバーは必須です', 'error')
    setSaving(true)
    const { error } = await add(form)
    setSaving(false)
    if (error) return showToast('登録に失敗しました: ' + error.message, 'error')
    showToast('駐車利用を登録しました')
    setUsageModal(false)
    setForm(EMPTY_USAGE)
  }

  const saveSpot = async () => {
    if (!spotForm.spot_number) return showToast('駐車位置番号は必須です', 'error')
    setSaving(true)
    const { error } = await addSpot({ ...spotForm, hotel_id: hotel?.hotelId })
    setSaving(false)
    if (error) return showToast('登録に失敗しました: ' + error.message, 'error')
    showToast(`${spotForm.spot_number}を登録しました`)
    setSpotAddModal(false)
    setSpotForm(EMPTY_SPOT)
  }

  return (
    <DarkPage>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: DASH.gold, fontWeight: 700, letterSpacing: 2.5, marginBottom: 8 }}>ホテル業務</div>
          <h1 style={{ fontSize: 19, fontWeight: 700, color: DASH.textMain, margin: '0 0 3px' }}>駐車場</h1>
          <div style={{ fontSize: 12, color: DASH.textFaint }}>駐車位置の状況・宿泊者の駐車利用を管理します</div>
        </div>
        {canEdit && <Btn onClick={() => { setForm(EMPTY_USAGE); setUsageModal(true) }} icon="ti-plus" label="駐車利用を登録" color={DASH.green} />}
      </div>

      <KpiGrid>
        <KpiCell icon="ti-square-rounded" color={DASH.green} label="空車" value={counts.vacant || 0} unit="区画" />
        <KpiCell icon="ti-car" color={DASH.blue} label="利用中" value={counts.occupied || 0} unit="区画" />
        <KpiCell icon="ti-clock" color={DASH.gold} label="予約済" value={counts.reserved || 0} unit="区画" />
        <KpiCell icon="ti-chart-pie" color={DASH.purple} label="利用率" value={utilizationRate} unit="%" sub={`${spots.length}区画中`} />
      </KpiGrid>

      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 20, marginBottom: 20 }} className="pk-panel-grid">
        <DarkPanel
          title="🅿️ 駐車位置状況"
          action={canEdit && <span onClick={() => { setSpotForm(EMPTY_SPOT); setSpotAddModal(true) }}>+ 区画を追加</span>}
        >
          <AsyncBoundary loading={spotsLoading} error={spotsError} onRetry={refreshSpots} skeleton={<TableSkeleton rows={3} columns={4} />}>
            {spots.length === 0 ? (
              <Empty
                icon="ti-parking" title="駐車位置が登録されていません"
                action={canEdit && <Btn onClick={() => { setSpotForm(EMPTY_SPOT); setSpotAddModal(true) }} icon="ti-plus" label="最初の区画を登録" color={DASH.brandNavy} sm />}
              />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 8 }}>
                {spots.map(s => {
                  const st = SPOT_STATUS[s.status] || SPOT_STATUS.vacant
                  return (
                    <button
                      key={s.id}
                      onClick={() => canEdit && setSpotModal(s)}
                      title={st.label}
                      style={{
                        border: `1.5px solid ${st.color}`, background: `${st.color}14`, borderRadius: 10,
                        padding: '10px 4px', cursor: canEdit ? 'pointer' : 'default', textAlign: 'center', fontFamily: 'inherit',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: DASH.textMain }}>{s.spot_number}</div>
                      <div style={{ fontSize: 9, color: st.color, fontWeight: 600, marginTop: 2 }}>{st.label}</div>
                    </button>
                  )
                })}
              </div>
            )}
          </AsyncBoundary>
        </DarkPanel>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <DarkPanel title="📝 予約済み">
            <AsyncBoundary loading={usagesLoading} error={usagesError} onRetry={refreshUsages} skeleton={<TableSkeleton rows={2} columns={3} />}>
              {reservedUsages.length === 0 ? <Empty icon="ti-clock" title="予約済みの駐車利用はありません" /> : reservedUsages.map(u => (
                <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderTop: `1px solid ${DASH.border}` }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: DASH.textMain }}>{u.stays?.guest_name}様・{u.license_plate}</div>
                    <div style={{ fontSize: 11, color: DASH.textFaint }}>{u.parking_spots?.spot_number}{u.vehicle_type ? `・${u.vehicle_type}` : ''}</div>
                  </div>
                  {canEdit && <Btn onClick={() => doStart(u)} icon="ti-player-play" label="利用開始" color={DASH.brandNavy} sm />}
                </div>
              ))}
            </AsyncBoundary>
          </DarkPanel>

          <DarkPanel title="🚗 利用中">
            <AsyncBoundary loading={usagesLoading} error={usagesError} onRetry={refreshUsages} skeleton={<TableSkeleton rows={2} columns={3} />}>
              {activeUsages.length === 0 ? <Empty icon="ti-car" title="現在利用中の車両はありません" /> : activeUsages.map(u => (
                <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderTop: `1px solid ${DASH.border}` }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: DASH.textMain }}>{u.stays?.guest_name}様・{u.license_plate}</div>
                    <div style={{ fontSize: 11, color: DASH.textFaint }}>{u.parking_spots?.spot_number}・{dtStr(u.start_at)}〜</div>
                  </div>
                  {canEdit && <Btn onClick={() => doEnd(u)} icon="ti-player-stop" label="利用終了" color={DASH.orange} sm />}
                </div>
              ))}
            </AsyncBoundary>
          </DarkPanel>
        </div>
      </div>
      <style>{`@media (max-width: 900px) { .pk-panel-grid { grid-template-columns: 1fr !important; } }`}</style>

      <DarkPanel title="🕘 利用履歴">
        <AsyncBoundary loading={usagesLoading} error={usagesError} onRetry={refreshUsages} skeleton={<TableSkeleton rows={3} columns={6} />}>
          {historyUsages.length === 0 ? <Empty icon="ti-history" title="利用履歴はまだありません" /> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'rgba(212,175,55,.08)' }}>
                    {['駐車位置', '宿泊者', 'ナンバー', '車種', '開始', '終了', '状態'].map(h => (
                      <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, color: DASH.gold, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historyUsages.map((u, i) => (
                    <tr key={u.id} style={{ borderTop: i > 0 ? `1px solid ${DASH.border}` : 'none' }}>
                      <td style={{ padding: '9px 12px', color: DASH.textMain, fontWeight: 600, whiteSpace: 'nowrap' }}>{u.parking_spots?.spot_number || '—'}</td>
                      <td style={{ padding: '9px 12px', color: DASH.textMain }}>{u.stays?.guest_name}様</td>
                      <td style={{ padding: '9px 12px', color: DASH.textSub, whiteSpace: 'nowrap' }}>{u.license_plate}</td>
                      <td style={{ padding: '9px 12px', color: DASH.textFaint, whiteSpace: 'nowrap' }}>{u.vehicle_type || '—'}</td>
                      <td style={{ padding: '9px 12px', color: DASH.textFaint, whiteSpace: 'nowrap' }}>{dtStr(u.start_at)}</td>
                      <td style={{ padding: '9px 12px', color: DASH.textFaint, whiteSpace: 'nowrap' }}>{dtStr(u.end_at)}</td>
                      <td style={{ padding: '9px 12px', color: DASH.textFaint, whiteSpace: 'nowrap' }}>{USAGE_STATUS_LABEL[u.status]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AsyncBoundary>
      </DarkPanel>

      {spotAddModal && (
        <Modal title="駐車位置を追加" icon="ti-parking" onClose={() => setSpotAddModal(false)} onSave={saveSpot} saving={saving} width={380}>
          <DarkField label="駐車位置番号" value={spotForm.spot_number} onChange={v => setSpotForm({ ...spotForm, spot_number: v })} required placeholder="P-01" />
        </Modal>
      )}

      {spotModal && (
        <Modal title={`${spotModal.spot_number}のステータス変更`} icon="ti-parking" onClose={() => setSpotModal(null)} onSave={() => setSpotModal(null)} saveLabel="閉じる">
          <div style={{ fontSize: 11, color: DASH.textFaint, marginBottom: 10, lineHeight: 1.6 }}>
            通常は駐車利用の登録・利用開始・利用終了操作で自動的に変わります。ここでの変更は、特別対応(使用不可への切替など)のときだけ行ってください。
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(SPOT_STATUS).map(([key, s]) => (
              <button
                key={key}
                onClick={() => changeSpotStatus(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                  border: `1px solid ${spotModal.status === key ? s.color : DASH.border}`,
                  background: spotModal.status === key ? `${s.color}14` : DASH.card, color: DASH.textMain, fontSize: 13, fontWeight: 600,
                }}
              >
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                {s.label}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {usageModal && (
        <Modal title="駐車利用を登録" icon="ti-car" onClose={() => setUsageModal(false)} onSave={saveUsage} saving={saving} width={480}>
          <div style={{ marginBottom: 9 }}>
            <label style={{ fontSize: 11, color: DASH.textFaint, display: 'block', marginBottom: 3, fontWeight: 500 }}>宿泊者 *</label>
            <select
              value={form.stay_id} onChange={e => setForm({ ...form, stay_id: e.target.value })}
              style={{ width: '100%', padding: '9px 10px', border: `1px solid ${DASH.border}`, borderRadius: 8, fontSize: 13, background: DASH.inputBg, color: DASH.textMain, fontFamily: 'inherit' }}
            >
              <option value="">選択してください</option>
              {guestOptions.map(s => <option key={s.id} value={s.id}>{s.guest_name}様{s.rooms?.room_number ? `(${s.rooms.room_number}号室)` : ''}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 9 }}>
            <label style={{ fontSize: 11, color: DASH.textFaint, display: 'block', marginBottom: 3, fontWeight: 500 }}>駐車位置 *</label>
            <select
              value={form.spot_id} onChange={e => setForm({ ...form, spot_id: e.target.value })}
              style={{ width: '100%', padding: '9px 10px', border: `1px solid ${DASH.border}`, borderRadius: 8, fontSize: 13, background: DASH.inputBg, color: DASH.textMain, fontFamily: 'inherit' }}
            >
              <option value="">選択してください</option>
              {spots.filter(s => s.status === 'vacant').map(s => <option key={s.id} value={s.id}>{s.spot_number}</option>)}
            </select>
          </div>
          <DarkField label="ナンバー" value={form.license_plate} onChange={v => setForm({ ...form, license_plate: v })} required placeholder="三国 500 あ 12-34" />
          <DarkField label="車種(任意)" value={form.vehicle_type} onChange={v => setForm({ ...form, vehicle_type: v })} placeholder="普通乗用車" />
        </Modal>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </DarkPage>
  )
}
