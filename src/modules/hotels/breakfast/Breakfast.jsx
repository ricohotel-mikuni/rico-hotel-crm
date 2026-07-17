import { useMealService } from '../../../hooks/useData'
import { useCurrentHotel } from '../HotelContext'
import { usePermission } from '../../../permissions/PermissionContext'
import { Btn, Toast, AsyncBoundary, TableSkeleton, Empty } from '../../../ui'
import { useState } from 'react'
import { DASH } from '../../../lib/designSystem'
import { DarkPage, KpiGrid, KpiCell, DarkPanel } from '../../../ui/DesignSystemKit'

const timeStr = (iso) => iso ? new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : ''

// 朝食(Breakfast、HotelOS Phase 1)— フロント/清掃と同じDesign System
// 部品(DarkPage/KpiGrid/KpiCell/DarkPanel)のみで構成。対象者一覧は
// useMealService(migration 020)がstaysから算出、提供済み切替は
// meal_servicesを1行作成/更新するだけ(realtime購読済み・監査ログ
// 配線済み)。保存後は購読により一覧・KPIが即時反映されるため、
// F5・画面遷移は一切発生しない。
export default function Breakfast() {
  const hotel = useCurrentHotel()
  const { roster, loading, error, refresh, toggleServed } = useMealService(hotel?.hotelId, 'breakfast')
  const canEdit = usePermission('breakfast', 'edit')
  const [toast, setToast] = useState(null)
  const showToast = (m, t = 'success') => { setToast({ message: m, type: t }); setTimeout(() => setToast(null), 3000) }

  const servedCount = roster.filter(r => r.service?.served).length
  const totalGuests = roster.reduce((sum, r) => sum + (r.adults || 0) + (r.children || 0), 0)

  const doToggle = async (r) => {
    const { error } = await toggleServed(r, !r.service?.served)
    if (error) showToast('更新に失敗しました: ' + error.message, 'error')
    else showToast(r.service?.served ? '未提供に戻しました' : `${r.guest_name}様を提供済みにしました`)
  }

  return (
    <DarkPage>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: DASH.gold, fontWeight: 700, letterSpacing: 2.5, marginBottom: 8 }}>ホテル業務</div>
        <h1 style={{ fontSize: 19, fontWeight: 700, color: DASH.textMain, margin: '0 0 3px' }}>朝食</h1>
        <div style={{ fontSize: 12, color: DASH.textFaint }}>本日ご宿泊中のお客様の朝食提供状況を管理します</div>
      </div>

      <KpiGrid>
        <KpiCell icon="ti-users" color={DASH.gold} label="朝食対象" value={roster.length} unit="組" sub={`${totalGuests}名`} />
        <KpiCell icon="ti-check" color={DASH.green} label="提供済み" value={servedCount} unit="組" />
        <KpiCell icon="ti-clock" color={DASH.orange} label="未提供" value={roster.length - servedCount} unit="組" />
      </KpiGrid>

      <DarkPanel title="🍳 本日の朝食対象者">
        <AsyncBoundary loading={loading} error={error} onRetry={refresh} skeleton={<TableSkeleton rows={4} columns={5} />}>
          {roster.length === 0 ? (
            <Empty icon="ti-coffee" title="本日ご宿泊中のお客様はいません" />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'rgba(212,175,55,.08)' }}>
                    {['部屋', 'お客様名', '人数', '状態', '提供時刻', '提供スタッフ', ''].map(h => (
                      <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, color: DASH.gold, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roster.map((r, i) => (
                    <tr key={r.id} style={{ borderTop: i > 0 ? `1px solid ${DASH.border}` : 'none' }}>
                      <td style={{ padding: '9px 12px', color: DASH.textMain, fontWeight: 600, whiteSpace: 'nowrap' }}>{r.rooms?.room_number ? `${r.rooms.room_number}号室` : '—'}</td>
                      <td style={{ padding: '9px 12px', color: DASH.textMain }}>{r.guest_name}様</td>
                      <td style={{ padding: '9px 12px', color: DASH.textSub, whiteSpace: 'nowrap' }}>{r.adults}名{r.children ? `+子${r.children}` : ''}</td>
                      <td style={{ padding: '9px 12px' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 12,
                          background: r.service?.served ? 'rgba(22,163,74,.12)' : 'rgba(217,119,6,.12)',
                          color: r.service?.served ? DASH.green : DASH.orange,
                        }}>
                          {r.service?.served ? '提供済み' : '未提供'}
                        </span>
                      </td>
                      <td style={{ padding: '9px 12px', color: DASH.textFaint, whiteSpace: 'nowrap' }}>{timeStr(r.service?.served_at) || '—'}</td>
                      <td style={{ padding: '9px 12px', color: DASH.textFaint, whiteSpace: 'nowrap' }}>{r.service?.employees?.full_name || '—'}</td>
                      <td style={{ padding: '9px 12px' }}>
                        {canEdit && (
                          <Btn
                            onClick={() => doToggle(r)}
                            icon={r.service?.served ? 'ti-x' : 'ti-check'}
                            label={r.service?.served ? '取り消す' : '提供済みにする'}
                            color={r.service?.served ? DASH.textFaint : DASH.green}
                            sm outline={r.service?.served}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AsyncBoundary>
      </DarkPanel>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </DarkPage>
  )
}
