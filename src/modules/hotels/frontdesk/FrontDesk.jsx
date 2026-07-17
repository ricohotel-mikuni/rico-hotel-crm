import { useState } from 'react'
import { useRooms, useStays } from '../../../hooks/useData'
import { useCurrentHotel } from '../HotelContext'
import { usePermission } from '../../../permissions/PermissionContext'
import Modal from '../../../ui/Modal'
import { Btn, Toast, AsyncBoundary, TableSkeleton, Empty } from '../../../ui'
import { DASH } from '../../../lib/designSystem'
import { DarkPage, KpiGrid, KpiCell, DarkPanel, DarkField } from '../../../ui/DesignSystemKit'

const ROOM_STATUS = {
  vacant_clean:   { label: '空室・清掃済', color: DASH.green },
  vacant_dirty:   { label: '空室・清掃前', color: DASH.orange },
  occupied:       { label: '使用中',       color: DASH.blue },
  maintenance:    { label: '修繕中',       color: DASH.purple },
  out_of_order:   { label: '客室停止',     color: DASH.alert },
}
const todayStr = () => new Date().toISOString().slice(0, 10)

const EMPTY_STAY = { guest_name: '', guest_phone: '', room_id: '', adults: 1, children: 0, checkin_date: todayStr(), checkout_date: todayStr(), notes: '' }
const EMPTY_ROOM = { room_number: '', floor: '' }

// フロント業務(HotelOS Phase 1、承認済み実装指示)— リコホテル三国
// ダッシュボード(PropertyHub.jsx)と同じDesign System部品(DarkPage/
// KpiGrid/KpiCell/DarkPanel)のみで構成し、独自のマークアップは
// 客室グリッド(HotelOS標準にまだ無い表現のため最小限で新設)だけに
// 留める。データはuseRooms/useStays(realtime購読込み、migration 018)
// を使用 — 保存後の一覧・KPIは購読により自動更新されるため、F5・
// 画面遷移は一切発生しない。
export default function FrontDesk() {
  const hotel = useCurrentHotel()
  const { rooms, loading: roomsLoading, error: roomsError, refresh: refreshRooms, add: addRoom, setRoomStatus } = useRooms(hotel?.hotelId)
  const { stays, loading: staysLoading, error: staysError, refresh: refreshStays, add, checkIn, checkOut } = useStays(hotel?.hotelId)
  const canEdit = usePermission('front', 'edit')

  const [roomModal, setRoomModal] = useState(null)
  const [stayModal, setStayModal] = useState(false)
  const [roomAddModal, setRoomAddModal] = useState(false)
  const [roomForm, setRoomForm] = useState(EMPTY_ROOM)
  const [form, setForm] = useState(EMPTY_STAY)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const showToast = (m, t = 'success') => { setToast({ message: m, type: t }); setTimeout(() => setToast(null), 3000) }

  const today = todayStr()
  const arrivals = stays.filter(s => s.checkin_date === today && s.status === 'reserved')
  const departures = stays.filter(s => s.checkout_date === today && s.status === 'checked_in')
  const counts = rooms.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc }, {})

  const doCheckIn = async (stay) => {
    const { error } = await checkIn(stay)
    if (error) showToast('チェックインに失敗しました: ' + error.message, 'error')
    else showToast(`${stay.guest_name}様がチェックインしました`)
  }
  const doCheckOut = async (stay) => {
    const { error } = await checkOut(stay)
    if (error) showToast('チェックアウトに失敗しました: ' + error.message, 'error')
    else showToast(`${stay.guest_name}様がチェックアウトしました`)
  }
  const changeRoomStatus = async (status) => {
    const { error } = await setRoomStatus(roomModal.id, status)
    if (error) showToast('更新に失敗しました: ' + error.message, 'error')
    else showToast('客室ステータスを更新しました')
    setRoomModal(null)
  }
  // Foundation最終監査是正(Priority A): 客室未定のまま宿泊登録が
  // できてしまうと、チェックイン時にcheckIn()が客室ステータスを
  // 更新できず(room_id無し)、以後その客室を割り当てる手段も無い
  // ため「使用中のはずが空室表示のまま」という不整合に陥っていた。
  // 客室選択を必須化し、この不整合が発生する経路自体を無くす。
  const saveStay = async () => {
    if (!form.guest_name) return showToast('お客様名は必須です', 'error')
    if (!form.room_id) return showToast('客室を選択してください', 'error')
    setSaving(true)
    const { error } = await add({ ...form, room_id: form.room_id || null })
    setSaving(false)
    if (error) return showToast('登録に失敗しました: ' + error.message, 'error')
    showToast('宿泊予約を登録しました')
    setStayModal(false)
    setForm(EMPTY_STAY)
  }

  // Foundation最終監査是正(Priority S): 客室を登録するUIがどこにも
  // 無く、rooms一覧が永久に空のままフロント・清掃とも運用不可能
  // だった(useRooms().addは以前から存在したが呼び出し元が無かった)。
  const saveRoom = async () => {
    if (!roomForm.room_number) return showToast('部屋番号は必須です', 'error')
    setSaving(true)
    const { error } = await addRoom({ ...roomForm, hotel_id: hotel?.hotelId })
    setSaving(false)
    if (error) return showToast('登録に失敗しました: ' + error.message, 'error')
    showToast(`${roomForm.room_number}号室を登録しました`)
    setRoomAddModal(false)
    setRoomForm(EMPTY_ROOM)
  }

  return (
    <DarkPage>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: DASH.gold, fontWeight: 700, letterSpacing: 2.5, marginBottom: 8 }}>ホテル業務</div>
          <h1 style={{ fontSize: 19, fontWeight: 700, color: DASH.textMain, margin: '0 0 3px' }}>フロント</h1>
          <div style={{ fontSize: 12, color: DASH.textFaint }}>客室状況・チェックイン/アウトを管理します</div>
        </div>
        {canEdit && <Btn onClick={() => { setForm(EMPTY_STAY); setStayModal(true) }} icon="ti-plus" label="宿泊予約を登録" color={DASH.green} />}
      </div>

      <KpiGrid>
        <KpiCell icon="ti-door-enter" color={DASH.gold} label="本日到着予定" value={arrivals.length} unit="組" />
        <KpiCell icon="ti-door-exit" color={DASH.gold} label="本日出発予定" value={departures.length} unit="組" />
        <KpiCell icon="ti-bed" color={DASH.green} label="空室・清掃済" value={counts.vacant_clean || 0} unit="室" />
        <KpiCell icon="ti-brush" color={DASH.orange} label="空室・清掃前" value={counts.vacant_dirty || 0} unit="室" />
      </KpiGrid>

      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 20, marginBottom: 20 }} className="fd-panel-grid">
        <DarkPanel
          title="📋 客室状況"
          action={canEdit && <span onClick={() => { setRoomForm(EMPTY_ROOM); setRoomAddModal(true) }}>+ 客室を追加</span>}
        >
          <AsyncBoundary loading={roomsLoading} error={roomsError} onRetry={refreshRooms} skeleton={<TableSkeleton rows={3} columns={4} />}>
            {rooms.length === 0 ? (
              <Empty
                icon="ti-bed" title="客室が登録されていません"
                action={canEdit && <Btn onClick={() => { setRoomForm(EMPTY_ROOM); setRoomAddModal(true) }} icon="ti-plus" label="最初の客室を登録" color={DASH.brandNavy} sm />}
              />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 8 }}>
                {rooms.map(r => {
                  const s = ROOM_STATUS[r.status] || ROOM_STATUS.vacant_clean
                  return (
                    <button
                      key={r.id}
                      onClick={() => canEdit && setRoomModal(r)}
                      title={s.label}
                      style={{
                        border: `1.5px solid ${s.color}`, background: `${s.color}14`, borderRadius: 10,
                        padding: '10px 4px', cursor: canEdit ? 'pointer' : 'default', textAlign: 'center', fontFamily: 'inherit',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: DASH.textMain }}>{r.room_number}</div>
                      <div style={{ fontSize: 9, color: s.color, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
                    </button>
                  )
                })}
              </div>
            )}
          </AsyncBoundary>
        </DarkPanel>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <DarkPanel title="🚪 本日のチェックイン">
            <AsyncBoundary loading={staysLoading} error={staysError} onRetry={refreshStays} skeleton={<TableSkeleton rows={2} columns={3} />}>
              {arrivals.length === 0 ? <Empty icon="ti-door-enter" title="本日の到着予定はありません" /> : arrivals.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderTop: `1px solid ${DASH.border}` }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: DASH.textMain }}>{s.guest_name}様</div>
                    <div style={{ fontSize: 11, color: DASH.textFaint }}>{s.rooms?.room_number ? `${s.rooms.room_number}号室・` : ''}{s.adults}名{s.children ? `+子${s.children}` : ''}</div>
                  </div>
                  {canEdit && <Btn onClick={() => doCheckIn(s)} icon="ti-door-enter" label="チェックイン" color={DASH.brandNavy} sm />}
                </div>
              ))}
            </AsyncBoundary>
          </DarkPanel>

          <DarkPanel title="🚶 本日のチェックアウト">
            <AsyncBoundary loading={staysLoading} error={staysError} onRetry={refreshStays} skeleton={<TableSkeleton rows={2} columns={3} />}>
              {departures.length === 0 ? <Empty icon="ti-door-exit" title="本日の出発予定はありません" /> : departures.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderTop: `1px solid ${DASH.border}` }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: DASH.textMain }}>{s.guest_name}様</div>
                    <div style={{ fontSize: 11, color: DASH.textFaint }}>{s.rooms?.room_number ? `${s.rooms.room_number}号室` : ''}</div>
                  </div>
                  {canEdit && <Btn onClick={() => doCheckOut(s)} icon="ti-door-exit" label="チェックアウト" color={DASH.orange} sm />}
                </div>
              ))}
            </AsyncBoundary>
          </DarkPanel>
        </div>
      </div>
      <style>{`@media (max-width: 900px) { .fd-panel-grid { grid-template-columns: 1fr !important; } }`}</style>

      {roomAddModal && (
        <Modal dark title="客室を追加" icon="ti-bed" onClose={() => setRoomAddModal(false)} onSave={saveRoom} saving={saving} width={380}>
          <DarkField label="部屋番号" value={roomForm.room_number} onChange={v => setRoomForm({ ...roomForm, room_number: v })} required placeholder="101" />
          <DarkField label="階(任意)" value={roomForm.floor} onChange={v => setRoomForm({ ...roomForm, floor: v })} placeholder="1" />
        </Modal>
      )}

      {roomModal && (
        <Modal title={`${roomModal.room_number}号室のステータス変更`} icon="ti-bed" onClose={() => setRoomModal(null)} onSave={() => setRoomModal(null)} saveLabel="閉じる">
          <div style={{ fontSize: 11, color: DASH.textFaint, marginBottom: 10, lineHeight: 1.6 }}>
            通常はチェックイン/チェックアウト操作で自動的に変わります。ここでの変更は、清掃完了の手動反映や特別対応(修繕・客室停止)のときだけ行ってください。
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(ROOM_STATUS).map(([key, s]) => (
              <button
                key={key}
                onClick={() => changeRoomStatus(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                  border: `1px solid ${roomModal.status === key ? s.color : DASH.border}`,
                  background: roomModal.status === key ? `${s.color}14` : DASH.card, color: DASH.textMain, fontSize: 13, fontWeight: 600,
                }}
              >
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                {s.label}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {stayModal && (
        <Modal dark title="宿泊予約を登録" icon="ti-calendar-plus" onClose={() => setStayModal(false)} onSave={saveStay} saving={saving} width={480}>
          <DarkField label="お客様名" value={form.guest_name} onChange={v => setForm({ ...form, guest_name: v })} required />
          <DarkField label="電話番号" value={form.guest_phone} onChange={v => setForm({ ...form, guest_phone: v })} />
          <div style={{ marginBottom: 9 }}>
            <label style={{ fontSize: 11, color: DASH.textFaint, display: 'block', marginBottom: 3, fontWeight: 500 }}>客室 *</label>
            <select
              value={form.room_id} onChange={e => setForm({ ...form, room_id: e.target.value })}
              style={{ width: '100%', padding: '9px 10px', border: `1px solid ${DASH.border}`, borderRadius: 8, fontSize: 13, background: DASH.inputBg, color: DASH.textMain, fontFamily: 'inherit' }}
            >
              <option value="">選択してください</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.room_number}号室</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <DarkField label="チェックイン予定日" type="date" value={form.checkin_date} onChange={v => setForm({ ...form, checkin_date: v })} />
            <DarkField label="チェックアウト予定日" type="date" value={form.checkout_date} onChange={v => setForm({ ...form, checkout_date: v })} />
            <DarkField label="大人" type="number" value={form.adults} onChange={v => setForm({ ...form, adults: Number(v) || 1 })} />
            <DarkField label="子供" type="number" value={form.children} onChange={v => setForm({ ...form, children: Number(v) || 0 })} />
          </div>
        </Modal>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </DarkPage>
  )
}
