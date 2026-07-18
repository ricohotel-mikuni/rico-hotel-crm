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

// 駐車場(承認済み提案書「駐車場管理モジュール再設計 Rev.3 — 案内図
// トレース版」)— 添付の実駐車場案内図(白地・黒枠・単色塗り分けの
// 掲示物)を、色・行列構造・ピクトグラム・矢印までそのまま書き起こす
// 方針で実装。HotelOSのダークカード/角丸/ネイビーは診断図の中には
// 一切使わず、案内図そのものの見た目を保つ(周辺のヘッダー/KPIのみ
// 通常のDesign System)。区画の種別(spot_type)・番号はDBデータ
// (migration 026)から取得するが、案内図の"外枠"配置自体はこの建物
// 固有の描画のため、リコホテル三国の実際の番号(spot_number)で直接
// 位置を指定している — 他ホテルは別レイアウトのコンポーネントを
// 用意する前提(spot_type/zone_orderのデータ構造自体は使い回せる)。
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

  const byNum = (num) => spots.find(s => s.spot_number === num)
  const byType = (type) => spots.filter(s => s.spot_type === type)
  const occupiedCount = spots.filter(s => s.status === 'occupied').length
  const vacantCount = spots.filter(s => s.status === 'vacant').length
  const utilization = spots.length ? Math.round((occupiedCount / spots.length) * 100) : 0
  const guestOptions = stays.filter(s => ['reserved', 'checked_in'].includes(s.status))

  const openStart = (spot) => { if (!spot || !canEdit || spot.status !== 'vacant') return; setForm(EMPTY_FORM); setStartSpot(spot) }
  const openEnd = (spot) => { if (!spot || !canEdit || spot.status !== 'occupied') return; setEndTarget({ spot, usage: activeUsageBySpot[spot.id] }) }
  const onTileClick = (spot) => spot && (spot.status === 'vacant' ? openStart(spot) : openEnd(spot))

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

  const companySpot = byType('company')[0]

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
        {/* 案内図トレース(承認済みRev.3) — 白地・黒枠・添付図の色 */}
        <div className="pk-frame">
          <div className="pk-frame-title">駐車場のご案内　１台　1000円　先着順となります。ご予約は出来ません。</div>

          <div className="pk-lot">
            <div className="pk-g pk-laundry">
              <div className="pk-washers"><span /><span /><span /><span /></div>
              投幣式洗濯機　coin laundry　コインランドリー
            </div>

            <div className="pk-g pk-zone-y1">
              <div className="pk-zone-row">
                <PkTile spot={byNum('⑫')} usage={activeUsageBySpot[byNum('⑫')?.id]} onClick={onTileClick} canEdit={canEdit} />
                <PkTile spot={byNum('⑪')} usage={activeUsageBySpot[byNum('⑪')?.id]} onClick={onTileClick} canEdit={canEdit} />
              </div>
            </div>

            <div className="pk-g pk-bikefree">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.7"><circle cx="7" cy="18" r="2.3" /><circle cx="17" cy="18" r="2.3" /><path d="M7 18l3-8h6l2.5 4M10 10h5" /></svg>
              無料駐車スペース<br />自転車
            </div>

            <div className="pk-g pk-disabled">
              <div className="pk-disabled-cars"><PkTile spot={byNum('⑭')} usage={activeUsageBySpot[byNum('⑭')?.id]} onClick={onTileClick} canEdit={canEdit} /></div>
              <div className="pk-disabled-cars">
                <PkTile spot={byNum('⑮')} usage={activeUsageBySpot[byNum('⑮')?.id]} onClick={onTileClick} canEdit={canEdit} />
                <div className="pk-no-entry" />
              </div>
              <div className="pk-disabled-label">身障者優先<br />駐車スペース</div>
            </div>

            <div className="pk-g pk-zone-y2">
              <div className="pk-zone-row">
                <PkTile spot={byNum('⑬')} usage={activeUsageBySpot[byNum('⑬')?.id]} onClick={onTileClick} canEdit={canEdit} />
                <PkTile spot={companySpot} usage={activeUsageBySpot[companySpot?.id]} onClick={onTileClick} canEdit={canEdit} isCompany />
                <PkTile spot={byNum('⑨')} usage={activeUsageBySpot[byNum('⑨')?.id]} onClick={onTileClick} canEdit={canEdit} />
              </div>
            </div>

            <div className="pk-g pk-arrow-l1"><ArrowUp /></div>
            <div className="pk-g pk-restroom">
              <div className="pk-badge pk-women"><svg viewBox="0 0 24 24" fill="#fff"><circle cx="12" cy="6" r="3.4" /><path d="M12 10c-4 0-6 3-6 7v5h12v-5c0-4-2-7-6-7z" /></svg></div>
              <div className="pk-badge pk-men"><svg viewBox="0 0 24 24" fill="#fff"><circle cx="12" cy="6" r="3.4" /><path d="M8 10h8l1 12H7z" /></svg></div>
            </div>
            <div className="pk-g pk-zone-blue">
              <div className="pk-zone-col">
                <PkTile spot={byNum('⑧')} usage={activeUsageBySpot[byNum('⑧')?.id]} onClick={onTileClick} canEdit={canEdit} />
                <PkTile spot={byNum('⑦')} usage={activeUsageBySpot[byNum('⑦')?.id]} onClick={onTileClick} canEdit={canEdit} />
                <PkTile spot={byNum('⑥')} usage={activeUsageBySpot[byNum('⑥')?.id]} onClick={onTileClick} canEdit={canEdit} />
              </div>
            </div>

            <div className="pk-g pk-arrow-l2"><ArrowLeft /></div>
            <div className="pk-g pk-elevator">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3C8A3C" strokeWidth="1.8"><circle cx="12" cy="6" r="1.6" /><path d="M12 8v5m0 0l-3 7m3-7l3 7M8 11h8" /></svg>
              <div>エレベーター<br />電梯<br />elevator</div>
            </div>

            <div className="pk-g pk-arrow-l3"><ArrowUp /></div>
            <div className="pk-g pk-zone-green">
              <div className="pk-zone-col">
                <PkTile spot={byNum('⑤')} usage={activeUsageBySpot[byNum('⑤')?.id]} onClick={onTileClick} canEdit={canEdit} />
                <PkTile spot={byNum('④')} usage={activeUsageBySpot[byNum('④')?.id]} onClick={onTileClick} canEdit={canEdit} />
                <PkTile spot={byNum('③')} usage={activeUsageBySpot[byNum('③')?.id]} onClick={onTileClick} canEdit={canEdit} />
                <PkTile spot={byNum('②')} usage={activeUsageBySpot[byNum('②')?.id]} onClick={onTileClick} canEdit={canEdit} />
              </div>
            </div>

            <div className="pk-g pk-front">フロント　front desk</div>
            <div className="pk-g pk-restaurant">レストラン　餐廳<br />restaurant</div>

            <div className="pk-g pk-entrance"><div className="pk-entrance-label">入口</div></div>
            <div className="pk-g pk-zone-pink">
              <div className="pk-zone-row">
                <div className="pk-vcaption">バイク優先駐車スペース</div>
                <PkTile spot={byNum('①')} usage={activeUsageBySpot[byNum('①')?.id]} onClick={onTileClick} canEdit={canEdit} />
              </div>
            </div>

            <div className="pk-g pk-arrow-b"><ArrowUp big /></div>
            <div className="pk-g pk-smoke">
              <div className="pk-smoke-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="1.8"><path d="M2 12h16M14 8c0 2 2 2 2 4M18 8c0 2 2 2 2 4" /></svg></div>
              <div className="pk-smoke-label">禁煙エリア<br />SMOKING AREA</div>
            </div>
            <div className="pk-g pk-vending">植木<br />自動販売機<br />vending machine</div>
          </div>

          <div className="pk-frame-note">※ 番号は現地案内図に忠実(⑩は現地案内図にも存在しないため欠番)。クリックで利用登録・終了ができます。</div>
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
            <svg width="30" height="48" viewBox="0 0 26 42" style={{ margin: '0 auto 12px', display: 'block' }}><use href="#pk-trace-car" className="pk-tc-occupied" /></svg>
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
          参照先へはCSSカスタムプロパティ経由でのみ色を渡せる。 */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <symbol id="pk-trace-car" viewBox="0 0 26 42">
          <rect x="2" y="2" width="22" height="38" rx="8" fill="var(--tc-body, #F2F4F7)" stroke="var(--tc-stroke, #999)" strokeWidth="1.3" />
          <rect x="6" y="7" width="14" height="9" rx="2.5" fill="var(--tc-window, #9FB4CE)" />
          <rect x="6" y="25" width="14" height="9" rx="2.5" fill="var(--tc-window, #9FB4CE)" />
        </symbol>
      </svg>

      <style>{`
        .pk-frame { background: #FFFFFF; border-radius: 6px; padding: 16px; }
        .pk-frame-title { font-size: 12px; color: #111; margin-bottom: 10px; }
        .pk-frame-note { font-size: 9.5px; color: #555; margin-top: 8px; }

        .pk-lot {
          border: 2px solid #111; position: relative; display: grid; gap: 0;
          grid-template-columns: minmax(96px,108px) minmax(140px,168px) minmax(46px,66px) 1fr;
          grid-template-rows: 54px 54px 54px 54px 54px 54px 50px 50px 44px 74px 44px;
          font-size: 10px; color: #111;
        }
        .pk-lot .pk-g { border: 1px solid #333; overflow: hidden; }

        .pk-laundry   { grid-column: 1 / 3; grid-row: 1; padding: 5px 7px; background: #fff; }
        .pk-zone-y1   { grid-column: 4; grid-row: 1 / 3; background: #FFF200; }
        .pk-bikefree  { grid-column: 1; grid-row: 2 / 4; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 3px; padding: 4px; }
        .pk-disabled  { grid-column: 2; grid-row: 2 / 5; border: 2.5px solid #E53935; background: #FBE4D0; display: flex; flex-direction: column; padding: 4px; gap: 2px; }
        .pk-zone-y2   { grid-column: 4; grid-row: 3; background: #FFF200; }
        .pk-arrow-l1  { grid-column: 1; grid-row: 4; display: flex; align-items: center; justify-content: center; }
        .pk-restroom  { grid-column: 2; grid-row: 5; display: flex; align-items: center; gap: 6px; padding: 4px 6px; }
        .pk-zone-blue { grid-column: 4; grid-row: 4 / 7; background: #AEE0F5; }
        .pk-arrow-l2  { grid-column: 1; grid-row: 5; display: flex; align-items: center; justify-content: center; }
        .pk-elevator  { grid-column: 2; grid-row: 6; display: flex; align-items: center; gap: 6px; padding: 4px 6px; }
        .pk-arrow-l3  { grid-column: 1; grid-row: 6; display: flex; align-items: center; justify-content: center; }
        .pk-zone-green{ grid-column: 4; grid-row: 7 / 10; background: #A8E6A0; }
        .pk-front     { grid-column: 1 / 3; grid-row: 7; display: flex; align-items: center; padding: 6px 10px; background: #fff; }
        .pk-restaurant{ grid-column: 1 / 3; grid-row: 8 / 10; display: flex; align-items: center; padding: 6px 10px; background: #fff; }
        .pk-entrance  { grid-column: 1 / 3; grid-row: 10; display: flex; align-items: center; justify-content: center; }
        .pk-zone-pink { grid-column: 3 / 5; grid-row: 10; background: #F2C9E0; }
        .pk-arrow-b   { grid-column: 1 / 3; grid-row: 11; display: flex; align-items: center; justify-content: center; }
        .pk-smoke     { grid-column: 3; grid-row: 11; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
        .pk-vending   { grid-column: 4; grid-row: 11; background: #A8E6A0; display: flex; align-items: center; justify-content: center; text-align: center; padding: 2px; }

        @media (max-width: 820px) {
          .pk-lot { grid-template-columns: 1fr 1fr; grid-template-rows: auto; }
          .pk-lot .pk-g { grid-column: auto !important; grid-row: auto !important; min-height: 60px; }
          .pk-arrow-l1, .pk-arrow-l2, .pk-arrow-l3, .pk-arrow-b { display: none !important; }
        }

        .pk-washers { display: flex; gap: 3px; margin-bottom: 2px; }
        .pk-washers span { flex: 1; height: 18px; border: 1.3px solid #111; }

        .pk-badge { width: 22px; height: 22px; border-radius: 3px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .pk-women { background: #C0392B; }
        .pk-men { background: #2E5FA3; }
        .pk-badge svg { width: 14px; height: 14px; }

        .pk-no-entry { width: 15px; height: 15px; border-radius: 50%; border: 2px solid #C0392B; position: relative; flex-shrink: 0; }
        .pk-no-entry::before { content: ''; position: absolute; inset: 1.5px; background: linear-gradient(45deg, transparent 45%, #C0392B 47%, #C0392B 53%, transparent 55%); }
        .pk-disabled-cars { display: flex; align-items: center; gap: 6px; flex: 1; justify-content: center; }
        .pk-disabled-label { font-size: 8px; color: #C0392B; font-weight: 700; text-align: center; line-height: 1.3; }

        .pk-zone-row { display: flex; align-items: center; justify-content: center; gap: 6px; height: 100%; flex-wrap: nowrap; padding: 2px; }
        .pk-zone-col { display: flex; flex-direction: column; align-items: center; justify-content: space-evenly; height: 100%; padding: 2px; }
        .pk-vcaption { writing-mode: vertical-rl; font-size: 9px; font-weight: 800; letter-spacing: 1px; flex-shrink: 0; }

        .pk-entrance-label { font-size: 12px; font-weight: 800; color: #111; }
        .pk-smoke-icon { width: 22px; height: 22px; border: 1.5px solid #2E7D32; border-radius: 3px; display: flex; align-items: center; justify-content: center; }
        .pk-smoke-label { font-size: 6.5px; text-align: center; }

        .pk-tile { display: flex; flex-direction: column; align-items: center; gap: 1px; flex-shrink: 0; }
        .pk-tile.clickable { cursor: pointer; }
        .pk-tile-car { width: 24px; height: 38px; position: relative; }
        .pk-tile-car svg { width: 100%; height: 100%; display: block; }
        .pk-tile-num { font-size: 8px; font-weight: 800; color: #111; }
        .pk-tile-num.gold { color: ${DASH.gold}; }
        .pk-tile-num.red { color: #C0392B; }

        .pk-tile-wrap { position: relative; }
        .pk-tooltip {
          display: none; position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%);
          background: ${DASH.card}; border: 1px solid ${DASH.border}; border-radius: 10px; padding: 10px 12px;
          width: 178px; box-shadow: 0 10px 30px rgba(0,0,0,.35); z-index: 30; text-align: left; font-size: 10.5px;
        }
        .pk-tile-wrap:hover .pk-tooltip { display: block; }
        .pk-tt-row { display: flex; justify-content: space-between; padding: 2px 0; gap: 8px; }
        .pk-tt-row span:first-child { color: ${DASH.textFaint}; flex-shrink: 0; }
        .pk-tt-row span:last-child { color: ${DASH.textMain}; font-weight: 600; text-align: right; }

        .pk-tc-vacant   { --tc-body: #F2F4F7; --tc-stroke: #999; --tc-window: #9FB4CE; }
        .pk-tc-occupied { --tc-body: #111318; --tc-stroke: ${DASH.gold}; --tc-window: #333; }
        .pk-tc-company  { --tc-body: #E8299A; --tc-stroke: #A81C6E; --tc-window: #F5A9D8; }
      `}</style>
    </DarkPage>
  )
}

function ArrowUp({ big }) {
  return <svg viewBox="0 0 24 40" width={big ? 20 : 16} height={big ? 34 : 28} fill="none" stroke="#111" strokeWidth="3"><path d="M12 38V4M4 12l8-8 8 8" /></svg>
}
function ArrowLeft() {
  return <svg viewBox="0 0 40 24" width="28" height="18" fill="none" stroke="#111" strokeWidth="3"><path d="M38 12H4M12 4l-8 8 8 8" /></svg>
}

function PkTile({ spot, usage, canEdit, isCompany, onClick }) {
  if (!spot) return null
  const isOccupied = spot.status === 'occupied'
  const clickable = canEdit && (spot.status === 'vacant' || spot.status === 'occupied')
  const stateClass = isCompany ? 'pk-tc-company' : (isOccupied ? 'pk-tc-occupied' : 'pk-tc-vacant')
  const numClass = isCompany ? 'red' : (isOccupied ? 'gold' : '')
  return (
    <div className="pk-tile-wrap">
      <div className={`pk-tile ${clickable ? 'clickable' : ''}`} onClick={clickable ? () => onClick(spot) : undefined}>
        <div className="pk-tile-car"><svg viewBox="0 0 26 42"><use href="#pk-trace-car" className={stateClass} /></svg></div>
        <div className={`pk-tile-num ${numClass}`}>{isCompany ? '社用' : spot.spot_number}</div>
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
