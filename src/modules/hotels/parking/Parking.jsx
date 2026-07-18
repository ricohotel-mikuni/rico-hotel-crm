import { useState } from 'react'
import { useParkingSpots, useParkingUsages, useStays } from '../../../hooks/useData'
import { useCurrentHotel } from '../HotelContext'
import { usePermission } from '../../../permissions/PermissionContext'
import Modal from '../../../ui/Modal'
import { Toast, AsyncBoundary, TableSkeleton } from '../../../ui'
import { DASH } from '../../../lib/designSystem'
import { DarkPage, KpiGrid, KpiCell, DarkField } from '../../../ui/DesignSystemKit'

const VEHICLE_TYPES = ['軽', '普通', '大型', 'バイク']
const todayStr = () => new Date().toISOString().slice(0, 10)
const EMPTY_FORM = { stay_id: '', vehicle_type: '普通', license_plate: '', checkin_date: todayStr(), checkout_date: todayStr(), notes: '' }
const dtStr = (iso) => iso ? new Date(iso).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''
const dStr = (d) => d ? new Date(d).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }) : ''

// 駐車場(承認済み提案書「駐車場管理モジュール再設計 Rev.2」)—
// 添付フロアプラン(リコホテル三国の実配置)をCSS Grid+SVGで再現した
// コンポーネント。位置・色・番号・矢印・建物内配置は添付図から直接
// 書き起こしており、変更していない。区画の種別(spot_type)・表示順
// (zone_order)はDBデータ(migration 026)から取得するため、他ホテルは
// 別のシードデータを投入するだけでこの画面をそのまま再利用できる
// (フロアプランの"外枠"=建物・ランドリー等の装飾要素のみリコホテル
// 三国固有としてこのファイルに残している)。
export default function Parking() {
  const hotel = useCurrentHotel()
  const { spots, loading: spotsLoading, error: spotsError, refresh: refreshSpots } = useParkingSpots(hotel?.hotelId)
  const { usages, loading: usagesLoading, error: usagesError, refresh: refreshUsages, add, endUsage } = useParkingUsages(hotel?.hotelId)
  const { stays } = useStays(hotel?.hotelId)
  const canEdit = usePermission('parking', 'edit')

  const [startSpot, setStartSpot] = useState(null)
  const [endTarget, setEndTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const showToast = (m, t = 'success') => { setToast({ message: m, type: t }); setTimeout(() => setToast(null), 3000) }

  const activeUsageBySpot = {}
  usages.filter(u => u.status === 'active').forEach(u => { activeUsageBySpot[u.spot_id] = u })

  const byType = (type) => spots.filter(s => s.spot_type === type)
  const occupiedCount = spots.filter(s => s.status === 'occupied').length
  const vacantCount = spots.filter(s => s.status === 'vacant').length
  const utilization = spots.length ? Math.round((occupiedCount / spots.length) * 100) : 0
  const guestOptions = stays.filter(s => ['reserved', 'checked_in'].includes(s.status))

  const openStart = (spot) => { if (!canEdit || spot.status !== 'vacant') return; setForm(EMPTY_FORM); setStartSpot(spot) }
  const openEnd = (spot) => { if (!canEdit || spot.status !== 'occupied') return; setEndTarget({ spot, usage: activeUsageBySpot[spot.id] }) }

  const saveStart = async () => {
    if (!form.stay_id) return showToast('宿泊者を選択してください', 'error')
    if (!form.checkout_date) return showToast('チェックアウト日を選択してください', 'error')
    setSaving(true)
    const { error } = await add({ spot_id: startSpot.id, ...form })
    setSaving(false)
    if (error) return showToast('登録に失敗しました: ' + error.message, 'error')
    showToast(`${startSpot.spot_number}の利用を開始しました`)
    setStartSpot(null)
  }

  const confirmEnd = async () => {
    const { error } = await endUsage(endTarget.usage)
    if (error) return showToast('終了に失敗しました: ' + error.message, 'error')
    showToast(`${endTarget.spot.spot_number}の利用を終了しました`)
    setEndTarget(null)
  }

  return (
    <DarkPage>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: DASH.gold, fontWeight: 700, letterSpacing: 2.5, marginBottom: 8 }}>ホテル業務</div>
        <h1 style={{ fontSize: 19, fontWeight: 700, color: DASH.textMain, margin: '0 0 3px' }}>駐車場</h1>
        <div style={{ fontSize: 12, color: DASH.textFaint }}>1台 ¥1,000・先着順(ご予約不可)</div>
      </div>

      <KpiGrid>
        <KpiCell icon="ti-car" color={DASH.blue} label="現在利用台数" value={occupiedCount} unit="台" sub={`/ ${spots.length}区画`} />
        <KpiCell icon="ti-square-rounded" color={DASH.green} label="空車台数" value={vacantCount} unit="区画" />
        <KpiCell icon="ti-chart-pie" color={DASH.purple} label="利用率" value={utilization} unit="%" />
      </KpiGrid>

      <AsyncBoundary
        loading={spotsLoading || usagesLoading} error={spotsError || usagesError}
        onRetry={() => { refreshSpots(); refreshUsages() }} skeleton={<TableSkeleton rows={6} columns={4} />}
      >
        <div className="pk-floorplan">
          <div className="pk-box pk-laundry">
            <div className="pk-laundry-icons"><span /><span /><span /><span /></div>
            <div>投幣式洗濯機<br />coin laundry</div>
          </div>

          <ParkingZone title="小型・コンパクトカー優先" color={DASH.gold} tint="245,197,24" spots={byType('compact').concat(byType('company'))} usageMap={activeUsageBySpot} canEdit={canEdit} onOpenStart={openStart} onOpenEnd={openEnd} area="pk-zone-compact" />

          <div className="pk-box pk-bikefree">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke={DASH.gold} strokeWidth="1.6"><circle cx="7" cy="18" r="2.3" /><circle cx="17" cy="18" r="2.3" /><path d="M7 18l3-8h6l2.5 4M10 10h5" /></svg>
            <div>無料駐輪場<br />自転車</div>
          </div>

          <div className="pk-box pk-disabled">
            <div className="pk-no-entry" />
            <div className="pk-zone-label" style={{ color: DASH.alert }}>● 身障者優先駐車スペース</div>
            <div className="pk-car-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              {byType('disabled').map(spot => (
                <ParkingSpotTile key={spot.id} spot={spot} usage={activeUsageBySpot[spot.id]} canEdit={canEdit} disabledRing onClick={() => spot.status === 'vacant' ? openStart(spot) : openEnd(spot)} />
              ))}
            </div>
          </div>

          <ParkingZone title="大型車優先スペース" color={DASH.blue} tint="58,109,255" spots={byType('large')} usageMap={activeUsageBySpot} canEdit={canEdit} onOpenStart={openStart} onOpenEnd={openEnd} area="pk-zone-large" cols={3} />

          <div className="pk-arrow"><svg viewBox="0 0 24 24" width="22" height="40" fill="none" stroke={DASH.gold} strokeWidth="2.2" opacity=".8"><path d="M12 3v18M6 9l6-6 6 6" /></svg></div>
          <div className="pk-box pk-bldg-rest">
            <div className="pk-rm"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="7" r="3" /><path d="M6 21v-2a6 6 0 0112 0v2" /></svg>WOMEN</div>
            <div className="pk-rm"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="7" r="3" /><path d="M6 21v-2a6 6 0 0112 0v2" /></svg>MEN</div>
          </div>

          <ParkingZone title="普通車優先スペース" color={DASH.green} tint="34,197,94" spots={byType('regular')} usageMap={activeUsageBySpot} canEdit={canEdit} onOpenStart={openStart} onOpenEnd={openEnd} area="pk-zone-regular" cols={4} />

          <div className="pk-arrow"><svg viewBox="0 0 24 24" width="22" height="40" fill="none" stroke={DASH.gold} strokeWidth="2.2" opacity=".8"><path d="M12 3v18M6 9l6-6 6 6" /></svg></div>
          <div className="pk-box pk-bldg-elev">
            <div className="pk-rm" style={{ flex: 1 }}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ display: 'block', margin: '0 auto 3px' }}><rect x="6" y="3" width="12" height="18" rx="1.5" /></svg>エレベーター</div>
            <div className="pk-rm" style={{ flex: 1 }}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ display: 'block', margin: '0 auto 3px' }}><circle cx="12" cy="6" r="1.5" /><path d="M12 8v5m0 0l-3 7m3-7l3 7M8 11h8" /></svg>車椅子対応</div>
          </div>

          <div className="pk-box pk-bldg-front" style={{ gridArea: 'pk-bldg-front' }}>フロント<br />front desk</div>
          <div className="pk-box pk-bldg-food" style={{ gridArea: 'pk-bldg-food' }}>レストラン<br />restaurant</div>

          <div className="pk-box pk-entrance">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={DASH.gold} strokeWidth="2.2"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
            <div style={{ fontSize: 12, fontWeight: 800, color: DASH.gold, letterSpacing: 1 }}>入口 ENTRANCE</div>
          </div>
          <ParkingZone title="バイク優先スペース" color={DASH.purple} tint="169,112,255" spots={byType('bike')} usageMap={activeUsageBySpot} canEdit={canEdit} onOpenStart={openStart} onOpenEnd={openEnd} area="pk-zone-bike" cols={4} />

          <div className="pk-box pk-smoke">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 12h16M14 8c0 2 2 2 2 4M18 8c0 2 2 2 2 4" /></svg>
            喫煙所
          </div>
          <div className="pk-box pk-vending">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="4" y="9" width="16" height="9" rx="1.5" /><path d="M8 9V6a4 4 0 018 0v3" /></svg>
            植木・自動販売機
          </div>
        </div>
      </AsyncBoundary>

      {startSpot && (
        <Modal title={`${startSpot.spot_number} の利用開始`} icon="ti-car" onClose={() => setStartSpot(null)} onSave={saveStart} saving={saving} width={440}>
          <div style={{ marginBottom: 9 }}>
            <label style={{ fontSize: 11, color: DASH.textFaint, display: 'block', marginBottom: 3, fontWeight: 500 }}>宿泊者(部屋番号) *</label>
            <select
              value={form.stay_id} onChange={e => setForm({ ...form, stay_id: e.target.value })}
              style={{ width: '100%', padding: '9px 10px', border: `1px solid ${DASH.border}`, borderRadius: 8, fontSize: 13, background: DASH.inputBg, color: DASH.textMain, fontFamily: 'inherit' }}
            >
              <option value="">選択してください</option>
              {guestOptions.map(s => <option key={s.id} value={s.id}>{s.guest_name}様{s.rooms?.room_number ? `(${s.rooms.room_number}号室)` : ''}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 9 }}>
            <label style={{ fontSize: 11, color: DASH.textFaint, display: 'block', marginBottom: 3, fontWeight: 500 }}>車種</label>
            <select
              value={form.vehicle_type} onChange={e => setForm({ ...form, vehicle_type: e.target.value })}
              style={{ width: '100%', padding: '9px 10px', border: `1px solid ${DASH.border}`, borderRadius: 8, fontSize: 13, background: DASH.inputBg, color: DASH.textMain, fontFamily: 'inherit' }}
            >
              {VEHICLE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <DarkField label="ナンバー(任意)" value={form.license_plate} onChange={v => setForm({ ...form, license_plate: v })} placeholder="三国 500 あ 12-34" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <DarkField label="チェックイン日" type="date" value={form.checkin_date} onChange={v => setForm({ ...form, checkin_date: v })} />
            <DarkField label="チェックアウト日 *" type="date" value={form.checkout_date} onChange={v => setForm({ ...form, checkout_date: v })} required />
          </div>
          <DarkField label="備考(任意)" value={form.notes} onChange={v => setForm({ ...form, notes: v })} />
        </Modal>
      )}

      {endTarget && (
        <Modal title={`${endTarget.spot.spot_number} の利用終了`} icon="ti-player-stop" onClose={() => setEndTarget(null)} onSave={confirmEnd} saveLabel="終了する(空車に戻す)" width={360}>
          <div style={{ textAlign: 'center', padding: '10px 0 4px' }}>
            <svg width="40" height="60" viewBox="0 0 40 70" style={{ margin: '0 auto 12px', display: 'block' }} className="pk-car-icon st-occupied"><use href="#pk-car-icon-symbol" /></svg>
            {endTarget.usage?.stays?.guest_name && (
              <div style={{ fontSize: 13, fontWeight: 700, color: DASH.textMain, marginBottom: 4 }}>
                {endTarget.usage.stays.rooms?.room_number ? `${endTarget.usage.stays.rooms.room_number}号室 ` : ''}{endTarget.usage.stays.guest_name}様
              </div>
            )}
            <div style={{ fontSize: 12.5, color: DASH.textSub }}>この区画の利用を終了しますか？</div>
          </div>
        </Modal>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* 車アイコン(上から見た形)を1回だけ定義して使い回す。<use>の
          参照先へはCSSカスタムプロパティ経由でのみ色を渡せる(通常の
          子孫セレクタはshadow相当の複製ツリーへ届かないため)。 */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <symbol id="pk-car-icon-symbol" viewBox="0 0 40 70">
          <rect x="3" y="3" width="34" height="64" rx="15" fill="var(--car-body, #E8ECF3)" stroke="var(--car-stroke, #C7D0E0)" strokeWidth="1.6" />
          <rect x="9" y="12" width="22" height="15" rx="4" fill="var(--car-window, #A9B4C9)" />
          <rect x="9" y="43" width="22" height="15" rx="4" fill="var(--car-window, #A9B4C9)" />
        </symbol>
      </svg>

      <style>{`
        .pk-floorplan {
          background: ${DASH.surface1}; border: 1px solid ${DASH.border}; border-radius: 14px; padding: 16px;
          display: grid; grid-template-columns: 100px 200px 90px 1fr; gap: 8px;
          grid-template-areas:
            "pk-laundry  pk-laundry   .    pk-zone-compact"
            "pk-bikefree pk-disabled  .    pk-zone-compact"
            "pk-bikefree pk-disabled  .    pk-zone-compact"
            "pk-arrow1   pk-bldg-rest .    pk-zone-large"
            "pk-arrow1   pk-bldg-rest .    pk-zone-large"
            "pk-arrow1   pk-bldg-elev .    pk-zone-large"
            ".           pk-bldg-front . pk-zone-regular"
            ".           pk-bldg-food .  pk-zone-regular"
            ".           pk-bldg-food .  pk-zone-regular"
            "pk-entrance pk-entrance  pk-zone-bike pk-zone-bike"
            ".           .            pk-smoke     pk-vending";
        }
        @media (max-width: 900px) {
          .pk-floorplan { grid-template-columns: 1fr; grid-template-areas:
            "pk-laundry" "pk-bikefree" "pk-disabled" "pk-bldg-rest" "pk-bldg-elev" "pk-bldg-front" "pk-bldg-food"
            "pk-zone-compact" "pk-zone-large" "pk-zone-regular" "pk-zone-bike" "pk-entrance" "pk-smoke" "pk-vending"; }
          .pk-arrow { display: none; }
        }
        .pk-box { background: ${DASH.card}; border: 1px solid ${DASH.border}; border-radius: 10px; padding: 9px 10px; font-size: 10.5px; color: ${DASH.textFaint}; }
        .pk-laundry { grid-area: pk-laundry; display: flex; align-items: center; gap: 8px; }
        .pk-laundry-icons { display: flex; gap: 4px; }
        .pk-laundry-icons span { width: 20px; height: 20px; border-radius: 5px; border: 1.5px solid ${DASH.textFaint}; }
        .pk-bikefree { grid-area: pk-bikefree; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 4px; }
        .pk-disabled { grid-area: pk-disabled; background: rgba(255,138,122,.08); border: 1.5px solid rgba(255,138,122,.5); border-radius: 10px; padding: 8px; position: relative; }
        .pk-no-entry { position: absolute; top: 6px; right: 8px; width: 16px; height: 16px; border-radius: 50%; border: 2px solid ${DASH.alert}; }
        .pk-no-entry::before { content: ''; position: absolute; inset: 2px; background: linear-gradient(45deg, transparent 46%, ${DASH.alert} 48%, ${DASH.alert} 52%, transparent 54%); }
        .pk-arrow { grid-area: pk-arrow1; display: flex; align-items: center; justify-content: center; }
        .pk-bldg-rest { grid-area: pk-bldg-rest; display: flex; gap: 6px; }
        .pk-bldg-elev { grid-area: pk-bldg-elev; display: flex; gap: 6px; }
        .pk-rm { flex: 1; text-align: center; }
        .pk-bldg-front { background: rgba(212,175,55,.08); border-color: rgba(212,175,55,.35); }
        .pk-entrance { grid-area: pk-entrance; background: linear-gradient(180deg, rgba(212,175,55,.14), rgba(212,175,55,.02)); border: 1.5px dashed rgba(212,175,55,.55); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; }
        .pk-smoke { grid-area: pk-smoke; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; }
        .pk-vending { grid-area: pk-vending; display: flex; align-items: center; justify-content: center; gap: 6px; }

        .pk-zone-label { display: flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: .4px; margin-bottom: 8px; }
        .pk-car-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); gap: 8px; }

        .pk-spot { position: relative; display: flex; flex-direction: column; align-items: center; gap: 3px; }
        .pk-spot.editable { cursor: pointer; }
        .pk-spot-car { width: 46px; height: 68px; position: relative; }
        .pk-spot-car .pk-car-icon { width: 100%; height: 100%; display: block; }
        .pk-spot-badge {
          position: absolute; top: -6px; left: 50%; transform: translateX(-50%);
          width: 17px; height: 17px; border-radius: 50%; background: ${DASH.card}; border: 1.4px solid ${DASH.textFaint};
          display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 800; color: ${DASH.textMain}; z-index: 3;
        }
        .pk-spot.occupied .pk-spot-badge { border-color: ${DASH.gold}; }
        .pk-spot-info { font-size: 7.5px; color: ${DASH.textFaint}; text-align: center; line-height: 1.3; max-width: 70px; }
        .pk-spot-info b { color: ${DASH.textSub}; display: block; font-weight: 700; }

        .pk-spot .pk-tooltip {
          display: none; position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%);
          background: ${DASH.card}; border: 1px solid ${DASH.border}; border-radius: 10px; padding: 10px 12px;
          width: 178px; box-shadow: 0 10px 30px rgba(0,0,0,.35); z-index: 30; text-align: left;
        }
        .pk-spot:hover .pk-tooltip { display: block; }
        .pk-tt-row { display: flex; justify-content: space-between; font-size: 10.5px; padding: 2px 0; gap: 8px; }
        .pk-tt-row span:first-child { color: ${DASH.textFaint}; flex-shrink: 0; }
        .pk-tt-row span:last-child { color: ${DASH.textMain}; font-weight: 600; text-align: right; }

        .st-vacant   { --car-body: #E8ECF3; --car-stroke: #C7D0E0; --car-window: #A9B4C9; }
        .st-occupied { --car-body: #0B0D12; --car-stroke: ${DASH.gold}; --car-window: #2A2E38; }
        .st-company  { --car-body: #E85DC0; --car-stroke: #C23FA0; --car-window: #F3A6DC; }
        .disabled-ring { --car-stroke: #3A6DFF; }
      `}</style>
    </DarkPage>
  )
}

function ParkingZone({ title, color, spots, usageMap, canEdit, onOpenStart, onOpenEnd, area, cols = 5 }) {
  return (
    <div className="pk-box" style={{ gridArea: area, background: `rgba(${zoneRgbOf(color)},.08)`, borderColor: `rgba(${zoneRgbOf(color)},.3)` }}>
      <div className="pk-zone-label" style={{ color }}>● {title}</div>
      <div className="pk-car-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {spots.map(spot => (
          <ParkingSpotTile
            key={spot.id} spot={spot} usage={usageMap[spot.id]} canEdit={canEdit}
            onClick={() => spot.status === 'vacant' ? onOpenStart(spot) : onOpenEnd(spot)}
          />
        ))}
      </div>
    </div>
  )
}

// DASHトークンはvar(--ds-*)参照のため、rgba()の元になるRGB値をJS側で
// 別途保持する(このファイル内の装飾用途のみ、DASHの値自体は変更しない)。
function zoneRgbOf(color) {
  if (color === DASH.gold) return '212,175,55'
  if (color === DASH.blue) return '58,109,255'
  if (color === DASH.green) return '34,197,94'
  if (color === DASH.purple) return '169,112,255'
  return '138,150,172'
}

function ParkingSpotTile({ spot, usage, canEdit, disabledRing, onClick }) {
  const isOccupied = spot.status === 'occupied'
  const isCompany = spot.spot_type === 'company'
  const stateClass = isCompany ? 'st-company' : (isOccupied ? 'st-occupied' : 'st-vacant')
  const clickable = canEdit && (spot.status === 'vacant' || spot.status === 'occupied')
  return (
    <div className={`pk-spot ${isOccupied ? 'occupied' : ''} ${clickable ? 'editable' : ''}`} onClick={clickable ? onClick : undefined}>
      <div className="pk-spot-car">
        <div className="pk-spot-badge">{isCompany ? '社' : spot.spot_number}</div>
        <svg className={`pk-car-icon ${stateClass} ${disabledRing ? 'disabled-ring' : ''}`} viewBox="0 0 40 70"><use href="#pk-car-icon-symbol" /></svg>
      </div>
      <div className="pk-spot-info">
        {isOccupied && usage
          ? <><b>{usage.stays?.rooms?.room_number ? `${usage.stays.rooms.room_number}号室` : ''}</b>{usage.stays?.guest_name}</>
          : (isCompany ? '社用車' : '空車')}
      </div>
      {isOccupied && usage && (
        <div className="pk-tooltip">
          <div className="pk-tt-row"><span>部屋</span><span>{usage.stays?.rooms?.room_number ? `${usage.stays.rooms.room_number}号室` : '—'}</span></div>
          <div className="pk-tt-row"><span>宿泊者</span><span>{usage.stays?.guest_name || '—'}様</span></div>
          <div className="pk-tt-row"><span>車種</span><span>{usage.vehicle_type || '—'}</span></div>
          <div className="pk-tt-row"><span>ナンバー</span><span>{usage.license_plate || '—'}</span></div>
          <div className="pk-tt-row"><span>利用開始</span><span>{dtStr(usage.start_at)}</span></div>
          <div className="pk-tt-row"><span>Cアウト予定</span><span>{dStr(usage.stays?.checkout_date)}</span></div>
        </div>
      )}
    </div>
  )
}
