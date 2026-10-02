import { useState } from 'react'
import { useExternalLinks } from '../../hooks/useData'
import { usePermission } from '../../permissions/PermissionContext'
import { Toast } from '../../ui'
import { DASH } from '../../lib/designSystem'
import { DarkPage } from '../../ui/DesignSystemKit'

// 外部サービス設定(承認済み提案書「Phase1: 外部サービスへの
// ワンクリックアクセス」) — Dropbox/ホテルスマート/公式LINEのURLを
// ここで管理する(コードにURLを書かない)。行の追加・削除は今回の
// Phaseの範囲外(3件固定、将来Freee等を増やす場合は別migrationで
// 行を増やす)。書き込み権限はcommon-masters等と同じ
// usePermission('hotel_management','edit')を流用する。
const inputStyle = {
  width: '100%', padding: '7px 10px', border: `1px solid ${DASH.border}`, borderRadius: 7,
  fontSize: 13, background: DASH.inputBg, color: DASH.textMain, fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box',
}

export default function AdminExternalServices() {
  const { links, loading, update } = useExternalLinks()
  const canEdit = usePermission('hotel_management', 'edit')
  const [drafts, setDrafts] = useState({})
  const [savingId, setSavingId] = useState(null)
  const [toast, setToast] = useState(null)
  const showToast = (m, t = 'success') => { setToast({ message: m, type: t }); setTimeout(() => setToast(null), 3000) }

  const draftFor = (link) => drafts[link.id] ?? { label: link.label, url: link.url || '', is_visible: link.is_visible, sort_order: link.sort_order }
  const setDraft = (link, patch) => setDrafts(d => ({ ...d, [link.id]: { ...draftFor(link), ...patch } }))

  const save = async (link) => {
    const draft = draftFor(link)
    if (!draft.label.trim()) return showToast('サービス名は必須です', 'error')
    setSavingId(link.id)
    const { error } = await update(link.id, {
      label: draft.label.trim(),
      url: draft.url.trim() || null,
      is_visible: draft.is_visible,
      sort_order: Number(draft.sort_order) || 0,
    })
    setSavingId(null)
    if (error) return showToast('保存に失敗しました: ' + error.message, 'error')
    showToast('保存しました。ダッシュボードのボタンに反映されます')
    setDrafts(d => { const next = { ...d }; delete next[link.id]; return next })
  }

  return (
    <DarkPage maxWidth={860}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, color: DASH.gold, fontWeight: 700, letterSpacing: 2.5, marginBottom: 8 }}>管理者専用</div>
        <h1 style={{ fontSize: 21, fontWeight: 700, color: DASH.textMain, margin: '0 0 5px' }}>外部サービス設定</h1>
        <div style={{ fontSize: 13, color: DASH.textFaint }}>
          ここで設定したURLが、全社員のダッシュボードのクイックアクセスボタンにそのまま反映されます。API連携は行わず、新しいタブで開くだけの外部リンクです。
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 30, textAlign: 'center', color: DASH.textFaint, fontSize: 13 }}>読み込み中…</div>
      ) : (
        <div style={{ background: DASH.card, borderRadius: 16, border: `1px solid ${DASH.border}`, boxShadow: DASH.cardShadow, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(212,175,55,.08)' }}>
                  {['サービス名', 'URL', '表示', '表示順', ''].map(c => (
                    <th key={c} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, color: DASH.gold, fontWeight: 700, whiteSpace: 'nowrap' }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {links.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: DASH.textFaint, fontSize: 12 }}>データがありません</td></tr>
                ) : links.map(link => {
                  const draft = draftFor(link)
                  return (
                    <tr key={link.id} style={{ borderTop: `1px solid ${DASH.border}` }}>
                      <td style={{ padding: '9px 14px', minWidth: 140 }}>
                        <input style={inputStyle} value={draft.label} disabled={!canEdit}
                          onChange={e => setDraft(link, { label: e.target.value })} />
                      </td>
                      <td style={{ padding: '9px 14px', minWidth: 260 }}>
                        <input style={inputStyle} value={draft.url} placeholder="https://" disabled={!canEdit}
                          onChange={e => setDraft(link, { url: e.target.value })} />
                      </td>
                      <td style={{ padding: '9px 14px' }}>
                        <input type="checkbox" checked={draft.is_visible} disabled={!canEdit}
                          onChange={e => setDraft(link, { is_visible: e.target.checked })}
                          style={{ width: 17, height: 17, cursor: canEdit ? 'pointer' : 'default' }} />
                      </td>
                      <td style={{ padding: '9px 14px', width: 70 }}>
                        <input style={{ ...inputStyle, textAlign: 'center' }} type="number" value={draft.sort_order} disabled={!canEdit}
                          onChange={e => setDraft(link, { sort_order: e.target.value })} />
                      </td>
                      <td style={{ padding: '9px 14px' }}>
                        {canEdit && (
                          <button onClick={() => save(link)} disabled={savingId === link.id}
                            style={{
                              background: DASH.gold, color: DASH.onGold, border: 'none', borderRadius: 7,
                              padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                              opacity: savingId === link.id ? 0.6 : 1,
                            }}>
                            {savingId === link.id ? '保存中…' : '保存'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, color: DASH.textFaint, marginTop: 10 }}>
        URLが未入力、または「表示」をOFFにした場合、ダッシュボードにボタンは表示されません(URL入力済みかつ表示ONの場合のみクイックアクセスに出ます)。
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </DarkPage>
  )
}
