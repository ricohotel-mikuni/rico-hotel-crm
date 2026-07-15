import { useState } from 'react'
import { useHotels, useCompanies } from '../../hooks/useData'
import { usePermission } from '../../permissions/PermissionContext'
import { BRANDS } from '../../branding/brands'
import Modal from '../../ui/Modal'
import { Btn, Toast } from '../../ui'
import { DASH } from '../../lib/designSystem'
import { DarkPage, DarkField } from '../../ui/DesignSystemKit'

const STATUS_LABEL = { active: '稼働中', inactive: '準備中', suspended: '停止中' }
const BRAND_OPTIONS = Object.values(BRANDS).filter(b => b.id !== 'daiei')
const EMPTY_FORM = { company_id: '', name: '', slug: '', address: '', phone: '', brand_key: 'ricoHotel', room_count: '', status: 'active' }

// ホテル管理(画面①: 一覧・追加・編集・削除・停止) — 承認済み提案書
// 「統合ホテル管理モジュール」の画面①。1,000施設規模のSaaS展開を
// 前提に、以前はコードにハードコードしていたホテル一覧を
// locations×hotelsテーブルから直接CRUDする。②客室タイプ〜⑦アクセス
// 権設定は本画面の実装後、1つずつ個別レビューを経て追加する
// (第7条)。write_audit_log()への配線はuseHotels()側で完結している
// (第10条)。
export default function AdminHotelManagement() {
  const { hotels, loading, error, refresh, add, update, setStatus, softDelete } = useHotels()
  const { companies } = useCompanies()
  const canEdit = usePermission('hotel_management', 'edit')
  const canDelete = usePermission('hotel_management', 'delete')

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const showToast = (m, t = 'success') => { setToast({ message: m, type: t }); setTimeout(() => setToast(null), 3000) }

  const openNew = () => {
    setForm({ ...EMPTY_FORM, company_id: companies[0]?.id || '' })
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (h) => {
    setForm({
      company_id: h.company_id, name: h.name, slug: h.slug, address: h.address || '',
      phone: h.phone || '', brand_key: h.hotels?.brand_key || 'ricoHotel',
      room_count: h.hotels?.room_count ?? '', status: h.status,
    })
    setEditing({ locationId: h.id, hotelId: h.hotels?.id })
    setModalOpen(true)
  }

  const save = async () => {
    if (!form.name) return showToast('ホテル名は必須です', 'error')
    if (!form.slug) return showToast('スラッグは必須です', 'error')
    if (!form.company_id) return showToast('会社を選択してください', 'error')
    setSaving(true)
    try {
      const payload = { ...form, room_count: Number(form.room_count) || 0 }
      const { error } = editing
        ? await update(editing.locationId, editing.hotelId, payload)
        : await add(payload)
      if (error) { showToast('保存に失敗しました: ' + error, 'error'); return }
      showToast(editing ? '更新しました' : 'ホテルを追加しました')
      setModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const toggleSuspend = async (h) => {
    const next = h.status === 'suspended' ? 'active' : 'suspended'
    const { error } = await setStatus(h.id, next)
    if (error) showToast('変更に失敗しました: ' + error, 'error')
    else showToast(next === 'suspended' ? 'ホテルを停止しました' : 'ホテルを再開しました')
  }

  const remove = async (h) => {
    if (!window.confirm(`「${h.name}」を削除しますか？`)) return
    const { error } = await softDelete(h.id)
    if (error) showToast('削除に失敗しました: ' + error, 'error')
    else showToast('削除しました')
  }

  return (
    <DarkPage maxWidth={1040}>
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: DASH.gold, fontWeight: 700, letterSpacing: 2.5, marginBottom: 8 }}>管理者専用</div>
          <h1 style={{ fontSize: 21, fontWeight: 700, color: DASH.textMain, margin: '0 0 5px' }}>ホテル管理</h1>
          <div style={{ fontSize: 13, color: DASH.textFaint }}>大栄商事ERP配下の全ホテルを一覧・管理します</div>
        </div>
        {canEdit && <Btn onClick={openNew} icon="ti-plus" label="ホテルを追加" color={DASH.green} />}
      </div>

      <div style={{ background: DASH.card, borderRadius: 16, border: `1px solid ${DASH.border}`, boxShadow: DASH.cardShadow, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'rgba(212,175,55,.08)' }}>
                {['会社', 'ホテル名', 'スラッグ', '客室数', 'ステータス', '操作'].map(h => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, color: DASH.gold, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: DASH.textFaint, fontSize: 12 }}><i className="ti ti-loader-2" style={{ fontSize: 15, marginRight: 6 }} />読み込み中…</td></tr>
              ) : error ? (
                <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center' }}>
                  <div style={{ color: DASH.alert, fontSize: 12, marginBottom: 8 }}><i className="ti ti-alert-circle" style={{ fontSize: 15, marginRight: 6 }} />取得できませんでした</div>
                  <Btn onClick={refresh} icon="ti-refresh" label="再試行" color={DASH.brandNavy} sm />
                </td></tr>
              ) : hotels.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: DASH.textFaint, fontSize: 12 }}>ホテルが登録されていません</td></tr>
              ) : hotels.map((h, i) => (
                <tr key={h.id} style={{ borderTop: i > 0 ? `1px solid ${DASH.border}` : 'none' }}>
                  <td style={{ padding: '9px 14px', color: DASH.textSub }}>{h.companies?.name || '—'}</td>
                  <td style={{ padding: '9px 14px', fontWeight: 600, color: DASH.textMain }}>{h.name}</td>
                  <td style={{ padding: '9px 14px', color: DASH.textFaint }}>{h.slug}</td>
                  <td style={{ padding: '9px 14px', color: DASH.textSub }}>{h.hotels?.room_count ?? '—'}</td>
                  <td style={{ padding: '9px 14px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 12,
                      background: h.status === 'active' ? 'rgba(22,163,74,.12)' : h.status === 'suspended' ? 'rgba(217,119,6,.12)' : 'rgba(107,114,128,.1)',
                      color: h.status === 'active' ? DASH.green : h.status === 'suspended' ? DASH.orange : DASH.textFaint,
                    }}>{STATUS_LABEL[h.status] || h.status}</span>
                  </td>
                  <td style={{ padding: '9px 14px', whiteSpace: 'nowrap' }}>
                    {canEdit && (
                      <button onClick={() => openEdit(h)} title="編集" style={{ background: 'none', border: 'none', cursor: 'pointer', color: DASH.gold, padding: 4 }}>
                        <i className="ti ti-edit" style={{ fontSize: 15 }} />
                      </button>
                    )}
                    {canEdit && h.status !== 'inactive' && (
                      <button onClick={() => toggleSuspend(h)} title={h.status === 'suspended' ? '再開' : '停止'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: DASH.orange, padding: 4 }}>
                        <i className={`ti ${h.status === 'suspended' ? 'ti-player-play' : 'ti-player-pause'}`} style={{ fontSize: 15 }} />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => remove(h)} title="削除" style={{ background: 'none', border: 'none', cursor: 'pointer', color: DASH.alert, padding: 4 }}>
                        <i className="ti ti-trash" style={{ fontSize: 15 }} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <Modal
          title={editing ? 'ホテルを編集' : 'ホテルを追加'} icon="ti-building-store"
          onClose={() => setModalOpen(false)} onSave={save} saving={saving}
          saveLabel={editing ? '更新する' : '追加する'} dark width={480}
        >
          <div style={{ marginBottom: 9 }}>
            <label style={{ fontSize: 11, color: DASH.textFaint, display: 'block', marginBottom: 3, fontWeight: 500 }}>会社 *</label>
            <select
              value={form.company_id} onChange={e => setForm({ ...form, company_id: e.target.value })}
              style={{ width: '100%', padding: '9px 10px', border: `1px solid ${DASH.border}`, borderRadius: 8, fontSize: 13, background: DASH.inputBg, color: DASH.textMain, fontFamily: 'inherit' }}
            >
              <option value="">選択してください</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <DarkField label="ホテル名" value={form.name} onChange={v => setForm({ ...form, name: v })} required />
          <DarkField
            label="スラッグ(URL用、例: rico-mikuni)" value={form.slug}
            onChange={v => setForm({ ...form, slug: v.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} required
          />
          <DarkField label="住所" value={form.address} onChange={v => setForm({ ...form, address: v })} />
          <DarkField label="電話番号" value={form.phone} onChange={v => setForm({ ...form, phone: v })} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 9 }}>
            <div>
              <label style={{ fontSize: 11, color: DASH.textFaint, display: 'block', marginBottom: 3, fontWeight: 500 }}>ブランド</label>
              <select
                value={form.brand_key} onChange={e => setForm({ ...form, brand_key: e.target.value })}
                style={{ width: '100%', padding: '9px 10px', border: `1px solid ${DASH.border}`, borderRadius: 8, fontSize: 13, background: DASH.inputBg, color: DASH.textMain, fontFamily: 'inherit' }}
              >
                {BRAND_OPTIONS.map(b => <option key={b.id} value={b.id}>{b.shortNameJa || b.name}</option>)}
              </select>
            </div>
            <DarkField label="客室数目安" type="number" value={form.room_count} onChange={v => setForm({ ...form, room_count: v })} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: DASH.textFaint, display: 'block', marginBottom: 3, fontWeight: 500 }}>ステータス</label>
            <select
              value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
              style={{ width: '100%', padding: '9px 10px', border: `1px solid ${DASH.border}`, borderRadius: 8, fontSize: 13, background: DASH.inputBg, color: DASH.textMain, fontFamily: 'inherit' }}
            >
              {Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
        </Modal>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </DarkPage>
  )
}
