import { useRooms } from '../../../hooks/useData'
import { useCurrentHotel } from '../HotelContext'
import { usePermission } from '../../../permissions/PermissionContext'
import { Btn, Toast, AsyncBoundary, TableSkeleton, Empty } from '../../../ui'
import { useState } from 'react'
import { DASH } from '../../../lib/designSystem'
import { DarkPage, KpiGrid, KpiCell, DarkPanel } from '../../../ui/DesignSystemKit'

const ROOM_STATUS_LABEL = {
  vacant_clean: '空室・清掃済', vacant_dirty: '空室・清掃前', occupied: '使用中', maintenance: '修繕中', out_of_order: '客室停止',
}

// 清掃(Housekeeping、HotelOS Phase 1)— 新しいテーブルは一切追加せず、
// フロント(migration 018)のroomsテーブルを唯一の真実の情報源として
// 再利用する。「清掃完了」操作はuseRooms().setRoomStatusをそのまま
// 呼ぶだけ(フロント側のステータス変更モーダルと同一のミューテーション
// 経路)— チェックアウト→清掃待ち→清掃完了→空室、のライフサイクルが
// 常に同じrooms.status列1つだけで完結し、手動同期や二重管理は発生
// しない。PropertyHub.jsxと同じDesign System部品のみで構成。
export default function Housekeeping() {
  const hotel = useCurrentHotel()
  const { rooms, loading, error, refresh, setRoomStatus } = useRooms(hotel?.hotelId)
  const canEdit = usePermission('cleaning', 'edit')
  const [toast, setToast] = useState(null)
  const showToast = (m, t = 'success') => { setToast({ message: m, type: t }); setTimeout(() => setToast(null), 3000) }

  const queue = rooms.filter(r => r.status === 'vacant_dirty')
  const clean = rooms.filter(r => r.status === 'vacant_clean')
  const maintenance = rooms.filter(r => r.status === 'maintenance' || r.status === 'out_of_order')

  const markClean = async (room) => {
    const { error } = await setRoomStatus(room.id, 'vacant_clean')
    if (error) showToast('更新に失敗しました: ' + error.message, 'error')
    else showToast(`${room.room_number}号室を清掃完了にしました`)
  }

  return (
    <DarkPage>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: DASH.gold, fontWeight: 700, letterSpacing: 2.5, marginBottom: 8 }}>ホテル業務</div>
        <h1 style={{ fontSize: 19, fontWeight: 700, color: DASH.textMain, margin: '0 0 3px' }}>清掃</h1>
        <div style={{ fontSize: 12, color: DASH.textFaint }}>客室の清掃待ちキューを管理します(フロントと同じ客室データを共有)</div>
      </div>

      <KpiGrid>
        <KpiCell icon="ti-brush" color={DASH.orange} label="清掃待ち" value={queue.length} unit="室" />
        <KpiCell icon="ti-check" color={DASH.green} label="清掃済(販売可)" value={clean.length} unit="室" />
        <KpiCell icon="ti-tools" color={DASH.purple} label="修繕中・客室停止" value={maintenance.length} unit="室" />
        <KpiCell icon="ti-bed" color={DASH.blue} label="総客室数" value={rooms.length} unit="室" />
      </KpiGrid>

      <DarkPanel title="🧹 清掃待ちキュー">
        <AsyncBoundary loading={loading} error={error} onRetry={refresh} skeleton={<TableSkeleton rows={3} columns={3} />}>
          {queue.length === 0 ? (
            <Empty icon="ti-sparkles" title="清掃待ちの客室はありません" />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
              {queue.map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: `1px solid ${DASH.border}`, borderRadius: 12, padding: '12px 14px' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: DASH.textMain }}>{r.room_number}号室</div>
                    <div style={{ fontSize: 11, color: DASH.textFaint, marginTop: 2 }}>{r.floor ? `${r.floor}階・` : ''}{ROOM_STATUS_LABEL[r.status]}</div>
                  </div>
                  {canEdit && <Btn onClick={() => markClean(r)} icon="ti-check" label="清掃完了" color={DASH.green} sm />}
                </div>
              ))}
            </div>
          )}
        </AsyncBoundary>
      </DarkPanel>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </DarkPage>
  )
}
