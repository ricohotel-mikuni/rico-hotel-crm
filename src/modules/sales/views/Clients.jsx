import { useState, useMemo } from 'react'
import { useClients, useCases } from '../../../hooks/useData'
import { useAuth } from '../../../contexts/AuthContext'
import { Btn, Badge, FI, FT, FS, FV, G2, Dvd, PageLoader, Empty, Toast, ImageUpload, DocUpload, ErrorState } from '../../../ui'
import Modal from '../../../ui/Modal'
import { uploadClientFile, fileNameFromUrl, downloadFile } from '../../../lib/storage'
import { C, CLIENT_TYPES, RANKS, CLIENT_STATUS, CONTRACT_STATUS, PREFECTURES, PERSONS, today, fmt } from '../../../lib/constants'

const FILE_FIELDS = [
  { key: 'card_link',     label: '名刺写真',   icon: 'ti-id',           color: '#3F51B5', kind: 'image', folder: 'business-cards' },
  { key: 'building_link', label: '会社外観',   icon: 'ti-building',     color: '#009688', kind: 'image', folder: 'buildings' },
  { key: 'contract_link', label: '契約書',     icon: 'ti-file-check',   color: '#FF5722', kind: 'doc',   folder: 'contracts' },
  { key: 'photo_link',    label: 'ホテル写真', icon: 'ti-camera',       color: '#607D8B', kind: 'image', folder: 'hotel-photos' },
]

const EMPTY_CLIENT = {
  company: '', contact: '', dept: '', phone: '', email: '',
  address: '', prefecture: '大阪府', client_type: '旅行会社',
  rank: 'B', status: '未訪問', contract_status: '未着手',
  last_visit_date: null, next_follow_date: null, revenue: 0, stays: 0,
  notes: '', card_link: '', building_link: '', contract_link: '', photo_link: '',
}

export default function Clients() {
  const { clients, loading, error, refresh, add, update, softDelete, addHistory } = useClients()
  const { cases } = useCases()
  const { permissions } = useAuth()

  const [cidx, setCidx] = useState(0)
  const [ctab, setCtab] = useState('basic')
  const [search, setSearch] = useState('')
  const [rankF, setRankF] = useState('')
  const [statusF, setStatusF] = useState('')
  const [listMode, setListMode] = useState(false)
  const [modal, setModal] = useState(null) // 'client' | 'history'
  const [form, setForm] = useState({})
  const [pendingFiles, setPendingFiles] = useState({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [lightbox, setLightbox] = useState(null)

  const sf = v => s => setForm(p => ({ ...p, ...v(p, s) }))
  const set = k => v => setForm(p => ({ ...p, [k]: v }))
  const onFile = k => f => setPendingFiles(p => ({ ...p, [k]: f }))
  const showToast = (message, type = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000) }

  const filtered = useMemo(() => clients.filter(c =>
    (!search || c.company?.includes(search) || c.contact?.includes(search) || c.phone?.includes(search)) &&
    (!rankF || c.rank === rankF) &&
    (!statusF || c.status === statusF)
  ), [clients, search, rankF, statusF])

  const cur = filtered[Math.min(cidx, Math.max(0, filtered.length - 1))] ?? null
  const relCases = cur ? cases.filter(c => c.client_id === cur.id) : []
  const todayStr = today()

  const openNew = () => { setForm(EMPTY_CLIENT); setPendingFiles({}); setModal('client') }
  const openEdit = () => { if (cur) { setForm({ ...cur }); setPendingFiles({}); setModal('client') } }

  const saveClient = async () => {
    if (!form.company) return showToast('会社名は必須です', 'error')
    setSaving(true)
    try {
      const updates = { ...form }
      for (const { key, folder } of FILE_FIELDS) {
        const file = pendingFiles[key]
        if (file) updates[key] = await uploadClientFile(file, folder)
      }
      const isNew = !form.id
      const { error } = isNew ? await add(updates) : await update(updates.id, { ...updates, client_history: undefined })
      if (error) { showToast('保存に失敗しました: ' + error, 'error'); return }
      showToast(isNew ? '営業先を登録しました' : '更新しました')
      setModal(null)
      setPendingFiles({})
    } catch (e) {
      showToast('ファイルのアップロードに失敗しました: ' + e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const doDelete = async () => {
    if (!cur || !confirm(`「${cur.company}」を削除しますか？`)) return
    const { error } = await softDelete(cur.id)
    if (error) { showToast('削除に失敗しました', 'error'); return }
    setCidx(Math.max(0, cidx - 1))
    showToast('削除しました')
  }

  const saveHistory = async () => {
    if (!form.action) return showToast('アクションを入力してください', 'error')
    setSaving(true)
    const { error } = await addHistory(cur.id, {
      visit_date: form.visit_date || todayStr,
      action: form.action,
      detail: form.detail,
      person: form.person,
    })
    setSaving(false)
    if (error) { showToast('保存に失敗しました: ' + error, 'error'); return }
    showToast('訪問記録を追加しました')
    setModal(null)
  }

  const exportCSV = () => {
    const h = ['会社名','担当者','部署','電話','メール','都道府県','住所','区分','ランク','状況','契約状況','最終訪問日','次回フォロー日','売上','宿泊数','備考']
    const rows = filtered.map(c => [c.company,c.contact,c.dept,c.phone,c.email,c.prefecture,c.address,c.client_type,c.rank,c.status,c.contract_status,c.last_visit_date,c.next_follow_date,c.revenue,c.stays,c.notes])
    const csv = [h,...rows].map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `営業先一覧_${todayStr}.csv`; a.click()
  }

  const TABS = [
    { id: 'basic',   label: '基本情報' },
    { id: 'history', label: `営業履歴${cur?.client_history?.length ? ` (${cur.client_history.length})` : ''}` },
    { id: 'cases',   label: `関連案件${relCases.length ? ` (${relCases.length})` : ''}` },
    { id: 'photos',  label: '写真・資料' },
  ]

  if (loading) return <PageLoader />
  if (error) return <ErrorState message={error} onRetry={refresh} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div className="no-print" style={{ padding: '8px 12px', background: '#fff', borderBottom: '1px solid #ECEFF1', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
        {permissions.canWrite && <Btn onClick={openNew} icon="ti-plus" label="新規登録" color="#4CAF50" sm />}
        {permissions.canWrite && <Btn onClick={openEdit} icon="ti-edit" label="編集" color={C.navyLight} sm />}
        {permissions.canDelete && <Btn onClick={doDelete} icon="ti-trash" label="削除" color="#F44336" outline sm />}
        <div style={{ height: 18, width: 1, background: '#ECEFF1', margin: '0 2px' }} />
        <Btn onClick={() => setListMode(!listMode)} icon={listMode ? 'ti-layout-cards' : 'ti-table'} label={listMode ? 'フォーム表示' : '一覧表示'} color={C.navy} outline sm />
        <Btn onClick={exportCSV} icon="ti-download" label="CSV" color="#607D8B" outline sm />
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: 8, color: '#BDBDBD', fontSize: 13, pointerEvents: 'none' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setCidx(0) }} placeholder="会社名・担当者・電話" style={{ padding: '6px 8px 6px 27px', border: '1px solid #E0E0E0', borderRadius: 6, fontSize: 12, width: 190, outline: 'none', background: '#FAFAFA' }} />
        </div>
        <select value={rankF} onChange={e => { setRankF(e.target.value); setCidx(0) }} style={{ fontSize: 12, padding: '6px 8px', border: '1px solid #E0E0E0', borderRadius: 6, background: '#FAFAFA' }}>
          <option value="">ランク</option>
          {RANKS.map(r => <option key={r} value={r}>ランク{r}</option>)}
        </select>
        <select value={statusF} onChange={e => { setStatusF(e.target.value); setCidx(0) }} style={{ fontSize: 12, padding: '6px 8px', border: '1px solid #E0E0E0', borderRadius: 6, background: '#FAFAFA' }}>
          <option value="">状況</option>
          {CLIENT_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Content */}
      {listMode ? (
        <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
          <div style={{ fontSize: 11, color: '#90A4AE', marginBottom: 8 }}>全 {filtered.length} 件</div>
          <div style={{ background: '#fff', borderRadius: 8, overflow: 'hidden', border: '1px solid #ECEFF1', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: C.navy, color: '#fff' }}>
                  {['会社名','担当者','電話番号','ランク','状況','次回フォロー','売上実績'].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 500, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id} onClick={() => { setCidx(i); setListMode(false) }} style={{ background: i % 2 ? '#FAFAFA' : '#fff', cursor: 'pointer', borderBottom: '1px solid #F5F5F5' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: C.navy }}>{c.company}</td>
                    <td style={{ padding: '8px 12px' }}>{c.contact}</td>
                    <td style={{ padding: '8px 12px', color: C.navyLight }}>{c.phone}</td>
                    <td style={{ padding: '8px 12px' }}><Badge status={c.rank} /></td>
                    <td style={{ padding: '8px 12px' }}><Badge status={c.status} /></td>
                    <td style={{ padding: '8px 12px', color: c.next_follow_date && c.next_follow_date < todayStr ? '#C62828' : '#2E7D32', fontWeight: c.next_follow_date && c.next_follow_date < todayStr ? 700 : 400 }}>{c.next_follow_date || '—'}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: C.navy }}>{c.revenue ? fmt(c.revenue) + '円' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : cur ? (
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Navigator */}
          <div className="no-print" style={{ padding: '7px 12px', background: '#F5F7FA', borderBottom: '1px solid #ECEFF1', display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setCidx(Math.max(0, cidx - 1))} disabled={cidx === 0} style={{ background: '#F5F5F5', border: '1px solid #E0E0E0', borderRadius: 4, padding: '3px 9px', cursor: 'pointer', color: C.navy, opacity: cidx === 0 ? .4 : 1 }}>
              <i className="ti ti-chevron-left" style={{ fontSize: 13 }} />
            </button>
            <span style={{ fontSize: 12, color: '#607D8B', minWidth: 80, textAlign: 'center' }}>{cidx + 1} / {filtered.length} 件</span>
            <button onClick={() => setCidx(Math.min(filtered.length - 1, cidx + 1))} disabled={cidx >= filtered.length - 1} style={{ background: '#F5F5F5', border: '1px solid #E0E0E0', borderRadius: 4, padding: '3px 9px', cursor: 'pointer', color: C.navy, opacity: cidx >= filtered.length - 1 ? .4 : 1 }}>
              <i className="ti ti-chevron-right" style={{ fontSize: 13 }} />
            </button>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: '#90A4AE' }}>最終訪問: {cur.last_visit_date || '未訪問'}</span>
          </div>

          {/* Record header */}
          <div style={{ padding: '14px 16px 0', background: '#fff', borderBottom: '1px solid #ECEFF1' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
              <div style={{ width: 48, height: 48, background: `${C.navy}10`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="ti ti-building-store" style={{ fontSize: 22, color: C.navy }} />
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: C.navy }}>{cur.company}</h2>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Badge status={cur.rank} />
                  <Badge status={cur.status} />
                  <Badge status={cur.contract_status} />
                  <span style={{ fontSize: 11, color: '#90A4AE' }}>/ {cur.client_type}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 19, fontWeight: 700, color: C.navy }}>{cur.revenue ? fmt(cur.revenue) + '円' : '—'}</div>
                <div style={{ fontSize: 11, color: '#90A4AE' }}>宿泊実績: {cur.stays || 0}泊</div>
              </div>
            </div>
            <div className="no-print" style={{ display: 'flex', borderBottom: '2px solid #ECEFF1' }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setCtab(t.id)} style={{ padding: '7px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, fontWeight: ctab === t.id ? 700 : 400, color: ctab === t.id ? C.navy : '#90A4AE', borderBottom: ctab === t.id ? `2px solid ${C.gold}` : '2px solid transparent', marginBottom: -2, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div style={{ padding: '14px 16px', background: '#fff', flex: 1 }}>
            {ctab === 'basic' && (
              <div>
                <G2>
                  <FV label="担当者名" value={cur.contact} />
                  <FV label="部署" value={cur.dept} />
                  <FV label="電話番号" value={cur.phone} highlight />
                  <FV label="メールアドレス" value={cur.email} highlight />
                </G2>
                <div style={{ height: 8 }} />
                <FV label="住所" value={`${cur.prefecture || ''} ${cur.address || ''}`.trim()} />
                <div style={{ height: 8 }} />
                <G2>
                  <FV label="次回フォロー日" value={cur.next_follow_date} highlight={!!cur.next_follow_date} />
                  <FV label="最終訪問日" value={cur.last_visit_date} />
                </G2>
                <div style={{ height: 8 }} />
                <div style={{ fontSize: 10, color: '#90A4AE', marginBottom: 3, fontWeight: 600, letterSpacing: .8, textTransform: 'uppercase' }}>メモ・備考</div>
                <div style={{ fontSize: 13, padding: '9px 11px', borderRadius: 5, background: '#FFFDE7', border: '1px solid #FFF176', minHeight: 50, color: '#455A64', lineHeight: 1.6 }}>{cur.notes || '備考なし'}</div>
              </div>
            )}
            {ctab === 'history' && (
              <div>
                <div className="no-print" style={{ marginBottom: 12 }}>
                  {permissions.canWrite && (
                    <Btn onClick={() => { setForm({ visit_date: todayStr, action: '', detail: '', person: PERSONS[0] }); setModal('history') }} icon="ti-plus" label="訪問記録を追加" color={C.navy} sm />
                  )}
                </div>
                {(!cur.client_history || cur.client_history.length === 0)
                  ? <Empty icon="ti-calendar" title="訪問履歴がありません" />
                  : <div style={{ position: 'relative', paddingLeft: 18 }}>
                    <div style={{ position: 'absolute', left: 6, top: 8, bottom: 8, width: 2, background: '#E0E0E0' }} />
                    {[...cur.client_history].sort((a, b) => b.visit_date?.localeCompare(a.visit_date)).map((h, i) => (
                      <div key={h.id || i} style={{ position: 'relative', marginBottom: 10, paddingLeft: 16 }}>
                        <div style={{ position: 'absolute', left: -5, top: 9, width: 10, height: 10, borderRadius: '50%', background: C.navy, border: '2px solid #fff' }} />
                        <div style={{ background: '#F8F9FA', borderRadius: 7, padding: '8px 12px', border: '1px solid #ECEFF1' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: C.navy }}>{h.action}</span>
                            <span style={{ fontSize: 11, color: '#90A4AE' }}>{h.visit_date} / {h.person}</span>
                          </div>
                          <div style={{ fontSize: 12, color: '#455A64', lineHeight: 1.5 }}>{h.detail || '詳細なし'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                }
              </div>
            )}
            {ctab === 'cases' && (
              <div>
                {relCases.length === 0
                  ? <Empty icon="ti-clipboard-list" title="関連案件がありません" />
                  : relCases.map(c => (
                    <div key={c.id} style={{ background: '#F8F9FA', borderRadius: 7, padding: '10px 12px', marginBottom: 8, border: '1px solid #ECEFF1' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{c.title}</span>
                        <Badge status={c.status} />
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#607D8B', flexWrap: 'wrap' }}>
                        <span>📅 {c.check_in_date}〜{c.check_out_date}</span>
                        <span>👥 {c.guests}名/{c.rooms}室</span>
                        <span style={{ fontWeight: 700, color: C.navy }}>💴 {fmt(c.revenue)}円</span>
                        <span style={{ color: '#2E7D32', fontWeight: 600 }}>報酬: {fmt(c.commission)}円</span>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
            {ctab === 'photos' && (
              <div>
                <div style={{ fontSize: 11, color: '#90A4AE', marginBottom: 10, padding: '6px 10px', background: '#F5F7FA', borderRadius: 5 }}>
                  画像はクリックすると拡大表示できます。ファイルの追加・変更は「編集」から行えます
                </div>
                {FILE_FIELDS.map(({ key: k, label: l, icon: ico, color: c, kind }) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, padding: '10px 12px', background: '#F8F9FA', borderRadius: 7, border: '1px solid #ECEFF1' }}>
                    {kind === 'image' && cur[k] ? (
                      <img
                        src={cur[k]} alt={l} onClick={() => setLightbox(cur[k])}
                        style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8, cursor: 'zoom-in', flexShrink: 0, border: '1px solid #ECEFF1' }}
                      />
                    ) : (
                      <div style={{ width: 40, height: 40, background: `${c}18`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className={`ti ${ico}`} style={{ fontSize: 18, color: c }} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#455A64', marginBottom: 3 }}>{l}</div>
                      {!cur[k] ? (
                        <span style={{ fontSize: 11, color: '#BDBDBD' }}>未登録（編集から追加）</span>
                      ) : kind === 'image' ? (
                        <span onClick={() => setLightbox(cur[k])} style={{ fontSize: 11, color: C.navyLight, cursor: 'pointer', fontWeight: 500 }}>クリックして拡大表示</span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, color: '#455A64', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{fileNameFromUrl(cur[k])}</span>
                          <a href={cur[k]} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: C.navy, fontWeight: 700 }}>開く</a>
                          <button type="button" onClick={() => downloadFile(cur[k], fileNameFromUrl(cur[k]))} style={{ fontSize: 11, color: C.navy, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>ダウンロード</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <Empty icon="ti-building-store" title="営業先が見つかりません" action={permissions.canWrite && <Btn onClick={openNew} icon="ti-plus" label="最初の営業先を登録" color={C.navy} />} />
      )}

      {/* Client Modal */}
      {modal === 'client' && (
        <Modal title={form.id ? '編集: ' + form.company : '新規営業先登録'} icon="ti-building-store" onClose={() => setModal(null)} onSave={saveClient} saving={saving} width={580}>
          <div style={{ marginBottom: 12 }}>
            <FI label="会社名" value={form.company} onChange={set('company')} required placeholder="株式会社○○" />
          </div>
          <G2>
            <FI label="担当者名" value={form.contact} onChange={set('contact')} />
            <FI label="部署" value={form.dept} onChange={set('dept')} />
            <FI label="電話番号" value={form.phone} onChange={set('phone')} placeholder="06-XXXX-XXXX" />
            <FI label="メールアドレス" value={form.email} onChange={set('email')} type="email" />
            <FS label="都道府県" value={form.prefecture} onChange={set('prefecture')} options={PREFECTURES} />
            <FS label="営業区分" value={form.client_type} onChange={set('client_type')} options={CLIENT_TYPES} />
            <FS label="ランク" value={form.rank} onChange={set('rank')} options={RANKS} />
            <FS label="案件状況" value={form.status} onChange={set('status')} options={CLIENT_STATUS} />
            <FS label="契約状況" value={form.contract_status} onChange={set('contract_status')} options={CONTRACT_STATUS} />
            <FI label="宿泊実績（泊）" value={form.stays} onChange={v => set('stays')(Number(v))} type="number" />
            <FI label="最終訪問日" value={form.last_visit_date} onChange={set('last_visit_date')} type="date" />
            <FI label="次回フォロー日" value={form.next_follow_date} onChange={set('next_follow_date')} type="date" />
          </G2>
          <FI label="住所" value={form.address} onChange={set('address')} />
          <FT label="メモ・備考" value={form.notes} onChange={set('notes')} />
          <Dvd />
          <div style={{ fontSize: 11, color: '#90A4AE', marginBottom: 8, fontWeight: 500 }}>写真・資料のアップロード</div>
          <G2>
            {FILE_FIELDS.map(({ key, label, icon, color, kind }) => {
              const Comp = kind === 'image' ? ImageUpload : DocUpload
              return (
                <Comp
                  key={key}
                  label={label}
                  icon={icon}
                  color={color}
                  value={form[key]}
                  file={pendingFiles[key]}
                  onFile={onFile(key)}
                />
              )
            })}
          </G2>
        </Modal>
      )}

      {/* History Modal */}
      {modal === 'history' && (
        <Modal title="訪問記録を追加" icon="ti-calendar-plus" onClose={() => setModal(null)} onSave={saveHistory} saving={saving} width={420}>
          <G2>
            <FI label="訪問日" value={form.visit_date} onChange={set('visit_date')} type="date" required />
            <FS label="担当営業" value={form.person} onChange={set('person')} options={PERSONS} />
          </G2>
          <FI label="アクション（例：初回訪問・見積提出・フォロー）" value={form.action} onChange={set('action')} required />
          <FT label="詳細内容" value={form.detail} onChange={set('detail')} rows={4} />
        </Modal>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Image lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9500,
            background: 'rgba(0,0,0,.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24, cursor: 'zoom-out',
          }}
        >
          <img src={lightbox} alt="" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 6, boxShadow: '0 10px 40px rgba(0,0,0,.5)' }} />
          <button
            onClick={() => setLightbox(null)}
            style={{ position: 'fixed', top: 16, right: 20, background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', fontSize: 26, width: 40, height: 40, borderRadius: '50%', cursor: 'pointer', lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
