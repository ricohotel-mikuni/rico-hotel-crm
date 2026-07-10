import { useState, useMemo } from 'react'
import { useClients, useCases } from '../../../hooks/useData'
import { useAuth } from '../../../contexts/AuthContext'
import { Btn, Badge, G2, AsyncBoundary, TableSkeleton, Empty, Toast } from '../../../ui'
import Modal from '../../../ui/Modal'
import { DASH } from '../../../lib/designSystem'
import { DarkField, DarkSelect, DarkTextarea, DarkFieldView, DarkDivider, DarkImageUpload, DarkDocUpload } from '../../../ui/DesignSystemKit'
import { uploadClientFile, fileNameFromUrl, downloadFile } from '../../../lib/storage'
import { CLIENT_TYPES, RANKS, CLIENT_STATUS, CONTRACT_STATUS, PREFECTURES, PERSONS, today, fmt } from '../../../lib/constants'

// 営業先一覧・新規登録モーダル — Design System v1.0(承認済み提案書
// 「Design System v1.0 最終統一提案」Item B・C)。100dvh固定+内部
// スクロールというこの画面固有のレイアウト(ツールバー常時表示・
// レコードナビゲーター・タブ切替)はDarkPage(maxWidth中央寄せの
// ダッシュボード向けレイアウト)に馴染まないため、DarkPageは使わず
// ルート要素へ直接background: DASH.bgを重ねる、確立済みパターンの
// バリエーションとして実装している。データ取得・検索/絞り込み・
// CSV出力・ファイルアップロードのロジックは一切変更していない。
// モーダルはsrc/ui/Modal.jsxの`dark`指定(承認済みItem C)+
// src/ui/DesignSystemKit.jsxのDarkField/DarkSelect/DarkTextarea/
// DarkImageUpload/DarkDocUploadを使用 — 他画面(Cases/Contracts/
// Reports/ApprovalCenter/EmployeeForm)が使う共有のFI/FS/FT/
// ImageUpload/DocUpload(src/ui/index.jsx)は一切変更していない。

const FILE_FIELDS = [
  { key: 'card_link',     label: '名刺写真',   icon: 'ti-id',           kind: 'image', folder: 'business-cards' },
  { key: 'building_link', label: '会社外観',   icon: 'ti-building',     kind: 'image', folder: 'buildings' },
  { key: 'contract_link', label: '契約書',     icon: 'ti-file-check',   kind: 'doc',   folder: 'contracts' },
  { key: 'photo_link',    label: 'ホテル写真', icon: 'ti-camera',       kind: 'image', folder: 'hotel-photos' },
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
    const blob = new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'})
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `営業先一覧_${todayStr}.csv`; a.click()
  }

  const TABS = [
    { id: 'basic',   label: '基本情報' },
    { id: 'history', label: `営業履歴${cur?.client_history?.length ? ` (${cur.client_history.length})` : ''}` },
    { id: 'cases',   label: `関連案件${relCases.length ? ` (${relCases.length})` : ''}` },
    { id: 'photos',  label: '写真・資料' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: DASH.bg }}>
      {/* Toolbar */}
      <div className="no-print" style={{ padding: '8px 12px', background: DASH.card, borderBottom: `1px solid ${DASH.border}`, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
        {permissions.canWrite && <Btn onClick={openNew} icon="ti-plus" label="新規登録" color={DASH.green} sm />}
        {permissions.canWrite && <Btn onClick={openEdit} icon="ti-edit" label="編集" color={DASH.gold} outline sm />}
        {permissions.canDelete && <Btn onClick={doDelete} icon="ti-trash" label="削除" color={DASH.alert} outline sm />}
        <div style={{ height: 18, width: 1, background: DASH.border, margin: '0 2px' }} />
        <Btn onClick={() => setListMode(!listMode)} icon={listMode ? 'ti-layout-cards' : 'ti-table'} label={listMode ? 'フォーム表示' : '一覧表示'} color={DASH.textSub} outline sm />
        <Btn onClick={exportCSV} icon="ti-download" label="CSV" color={DASH.textFaint} outline sm />
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: 8, color: DASH.textFaint, fontSize: 13, pointerEvents: 'none' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setCidx(0) }} placeholder="会社名・担当者・電話" className="sales-tb-input" style={{ padding: '6px 8px 6px 27px', border: `1px solid ${DASH.border}`, borderRadius: 7, fontSize: 12, width: 190, outline: 'none', background: '#0B213F', color: DASH.textSub }} />
        </div>
        <select value={rankF} onChange={e => { setRankF(e.target.value); setCidx(0) }} className="sales-tb-input" style={{ fontSize: 12, padding: '6px 8px', border: `1px solid ${DASH.border}`, borderRadius: 7, background: '#0B213F', color: DASH.textSub }}>
          <option value="">ランク</option>
          {RANKS.map(r => <option key={r} value={r}>ランク{r}</option>)}
        </select>
        <select value={statusF} onChange={e => { setStatusF(e.target.value); setCidx(0) }} className="sales-tb-input" style={{ fontSize: 12, padding: '6px 8px', border: `1px solid ${DASH.border}`, borderRadius: 7, background: '#0B213F', color: DASH.textSub }}>
          <option value="">状況</option>
          {CLIENT_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <style>{`.sales-tb-input::placeholder { color: ${DASH.textFaint}; }`}</style>
      </div>

      {/* Content — only this region reacts to loading/error; the toolbar above always stays interactive. */}
      <AsyncBoundary loading={loading} error={error} onRetry={refresh} skeleton={<TableSkeleton rows={6} columns={5} />}>
      {listMode ? (
        <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
          <div style={{ fontSize: 11, color: DASH.textFaint, marginBottom: 8 }}>全 {filtered.length} 件</div>
          <div style={{ background: DASH.card, borderRadius: 12, overflow: 'hidden', border: `1px solid ${DASH.border}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'rgba(212,175,55,.08)' }}>
                  {['会社名','担当者','電話番号','ランク','状況','次回フォロー','売上実績'].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 700, fontSize: 10.5, color: DASH.gold, letterSpacing: .4, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id} onClick={() => { setCidx(i); setListMode(false) }} style={{ cursor: 'pointer', borderTop: i > 0 ? `1px solid ${DASH.border}` : 'none' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: DASH.textMain }}>{c.company}</td>
                    <td style={{ padding: '8px 12px', color: DASH.textSub }}>{c.contact}</td>
                    <td style={{ padding: '8px 12px', color: DASH.textSub }}>{c.phone}</td>
                    <td style={{ padding: '8px 12px' }}><Badge status={c.rank} /></td>
                    <td style={{ padding: '8px 12px' }}><Badge status={c.status} /></td>
                    <td style={{ padding: '8px 12px', color: c.next_follow_date && c.next_follow_date < todayStr ? DASH.alert : DASH.green, fontWeight: c.next_follow_date && c.next_follow_date < todayStr ? 700 : 400 }}>{c.next_follow_date || '—'}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: DASH.textMain }}>{c.revenue ? fmt(c.revenue) + '円' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : cur ? (
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Navigator */}
          <div className="no-print" style={{ padding: '7px 12px', background: DASH.card, borderBottom: `1px solid ${DASH.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setCidx(Math.max(0, cidx - 1))} disabled={cidx === 0} style={{ background: '#0B213F', border: `1px solid ${DASH.border}`, borderRadius: 6, padding: '3px 9px', cursor: 'pointer', color: DASH.textSub, opacity: cidx === 0 ? .4 : 1 }}>
              <i className="ti ti-chevron-left" style={{ fontSize: 13 }} />
            </button>
            <span style={{ fontSize: 12, color: DASH.textFaint, minWidth: 80, textAlign: 'center' }}>{cidx + 1} / {filtered.length} 件</span>
            <button onClick={() => setCidx(Math.min(filtered.length - 1, cidx + 1))} disabled={cidx >= filtered.length - 1} style={{ background: '#0B213F', border: `1px solid ${DASH.border}`, borderRadius: 6, padding: '3px 9px', cursor: 'pointer', color: DASH.textSub, opacity: cidx >= filtered.length - 1 ? .4 : 1 }}>
              <i className="ti ti-chevron-right" style={{ fontSize: 13 }} />
            </button>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: DASH.textFaint }}>最終訪問: {cur.last_visit_date || '未訪問'}</span>
          </div>

          {/* Record header */}
          <div style={{ padding: '14px 16px 0', background: DASH.card, borderBottom: `1px solid ${DASH.border}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
              <div style={{ width: 48, height: 48, background: 'rgba(212,175,55,.14)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="ti ti-building-store" style={{ fontSize: 22, color: DASH.gold }} />
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: DASH.textMain }}>{cur.company}</h2>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Badge status={cur.rank} />
                  <Badge status={cur.status} />
                  <Badge status={cur.contract_status} />
                  <span style={{ fontSize: 11, color: DASH.textFaint }}>/ {cur.client_type}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 19, fontWeight: 700, color: DASH.textMain }}>{cur.revenue ? fmt(cur.revenue) + '円' : '—'}</div>
                <div style={{ fontSize: 11, color: DASH.textFaint }}>宿泊実績: {cur.stays || 0}泊</div>
              </div>
            </div>
            <div className="no-print" style={{ display: 'flex', borderBottom: `2px solid ${DASH.border}` }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setCtab(t.id)} style={{ padding: '7px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, fontWeight: ctab === t.id ? 700 : 400, color: ctab === t.id ? DASH.textMain : DASH.textFaint, borderBottom: ctab === t.id ? `2px solid ${DASH.gold}` : '2px solid transparent', marginBottom: -2, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div style={{ padding: '14px 16px', background: DASH.card, flex: 1 }}>
            {ctab === 'basic' && (
              <div>
                <G2>
                  <DarkFieldView label="担当者名" value={cur.contact} />
                  <DarkFieldView label="部署" value={cur.dept} />
                  <DarkFieldView label="電話番号" value={cur.phone} highlight />
                  <DarkFieldView label="メールアドレス" value={cur.email} highlight />
                </G2>
                <div style={{ height: 8 }} />
                <DarkFieldView label="住所" value={`${cur.prefecture || ''} ${cur.address || ''}`.trim()} />
                <div style={{ height: 8 }} />
                <G2>
                  <DarkFieldView label="次回フォロー日" value={cur.next_follow_date} highlight={!!cur.next_follow_date} />
                  <DarkFieldView label="最終訪問日" value={cur.last_visit_date} />
                </G2>
                <div style={{ height: 8 }} />
                <div style={{ fontSize: 10, color: DASH.textFaint, marginBottom: 3, fontWeight: 600, letterSpacing: .8, textTransform: 'uppercase' }}>メモ・備考</div>
                <div style={{ fontSize: 13, padding: '9px 11px', borderRadius: 7, background: 'rgba(212,175,55,.08)', border: `1px solid ${DASH.border}`, minHeight: 50, color: DASH.textSub, lineHeight: 1.6 }}>{cur.notes || '備考なし'}</div>
              </div>
            )}
            {ctab === 'history' && (
              <div>
                <div className="no-print" style={{ marginBottom: 12 }}>
                  {permissions.canWrite && (
                    <Btn onClick={() => { setForm({ visit_date: todayStr, action: '', detail: '', person: PERSONS[0] }); setModal('history') }} icon="ti-plus" label="訪問記録を追加" color={DASH.gold} sm />
                  )}
                </div>
                {(!cur.client_history || cur.client_history.length === 0)
                  ? <Empty icon="ti-calendar" title="訪問履歴がありません" />
                  : <div style={{ position: 'relative', paddingLeft: 18 }}>
                    <div style={{ position: 'absolute', left: 6, top: 8, bottom: 8, width: 2, background: DASH.border }} />
                    {[...cur.client_history].sort((a, b) => b.visit_date?.localeCompare(a.visit_date)).map((h, i) => (
                      <div key={h.id || i} style={{ position: 'relative', marginBottom: 10, paddingLeft: 16 }}>
                        <div style={{ position: 'absolute', left: -5, top: 9, width: 10, height: 10, borderRadius: '50%', background: DASH.gold, border: `2px solid ${DASH.card}` }} />
                        <div style={{ background: 'rgba(255,255,255,.03)', borderRadius: 9, padding: '8px 12px', border: `1px solid ${DASH.border}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: DASH.textMain }}>{h.action}</span>
                            <span style={{ fontSize: 11, color: DASH.textFaint }}>{h.visit_date} / {h.person}</span>
                          </div>
                          <div style={{ fontSize: 12, color: DASH.textSub, lineHeight: 1.5 }}>{h.detail || '詳細なし'}</div>
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
                    <div key={c.id} style={{ background: 'rgba(255,255,255,.03)', borderRadius: 9, padding: '10px 12px', marginBottom: 8, border: `1px solid ${DASH.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: DASH.textMain }}>{c.title}</span>
                        <Badge status={c.status} />
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: DASH.textFaint, flexWrap: 'wrap' }}>
                        <span>📅 {c.check_in_date}〜{c.check_out_date}</span>
                        <span>👥 {c.guests}名/{c.rooms}室</span>
                        <span style={{ fontWeight: 700, color: DASH.textMain }}>💴 {fmt(c.revenue)}円</span>
                        <span style={{ color: DASH.green, fontWeight: 600 }}>報酬: {fmt(c.commission)}円</span>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
            {ctab === 'photos' && (
              <div>
                <div style={{ fontSize: 11, color: DASH.textFaint, marginBottom: 10, padding: '6px 10px', background: 'rgba(255,255,255,.03)', borderRadius: 7 }}>
                  画像はクリックすると拡大表示できます。ファイルの追加・変更は「編集」から行えます
                </div>
                {FILE_FIELDS.map(({ key: k, label: l, icon: ico, kind }) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, padding: '10px 12px', background: 'rgba(255,255,255,.03)', borderRadius: 9, border: `1px solid ${DASH.border}` }}>
                    {kind === 'image' && cur[k] ? (
                      <img
                        src={cur[k]} alt={l} onClick={() => setLightbox(cur[k])}
                        style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8, cursor: 'zoom-in', flexShrink: 0, border: `1px solid ${DASH.border}` }}
                      />
                    ) : (
                      <div style={{ width: 40, height: 40, background: 'rgba(212,175,55,.12)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className={`ti ${ico}`} style={{ fontSize: 18, color: DASH.gold }} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: DASH.textSub, marginBottom: 3 }}>{l}</div>
                      {!cur[k] ? (
                        <span style={{ fontSize: 11, color: DASH.textFaint }}>未登録（編集から追加）</span>
                      ) : kind === 'image' ? (
                        <span onClick={() => setLightbox(cur[k])} style={{ fontSize: 11, color: DASH.gold, cursor: 'pointer', fontWeight: 500 }}>クリックして拡大表示</span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, color: DASH.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{fileNameFromUrl(cur[k])}</span>
                          <a href={cur[k]} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: DASH.gold, fontWeight: 700 }}>開く</a>
                          <button type="button" onClick={() => downloadFile(cur[k], fileNameFromUrl(cur[k]))} style={{ fontSize: 11, color: DASH.gold, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>ダウンロード</button>
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
        <Empty icon="ti-building-store" title="営業先が見つかりません" action={permissions.canWrite && <Btn onClick={openNew} icon="ti-plus" label="最初の営業先を登録" color={DASH.gold} />} />
      )}
      </AsyncBoundary>

      {/* Client Modal */}
      {modal === 'client' && (
        <Modal dark title={form.id ? '編集: ' + form.company : '新規営業先登録'} icon="ti-building-store" onClose={() => setModal(null)} onSave={saveClient} saving={saving} width={580}>
          <div style={{ marginBottom: 12 }}>
            <DarkField label="会社名" value={form.company} onChange={set('company')} required placeholder="株式会社○○" />
          </div>
          <G2>
            <DarkField label="担当者名" value={form.contact} onChange={set('contact')} />
            <DarkField label="部署" value={form.dept} onChange={set('dept')} />
            <DarkField label="電話番号" value={form.phone} onChange={set('phone')} placeholder="06-XXXX-XXXX" />
            <DarkField label="メールアドレス" value={form.email} onChange={set('email')} type="email" />
            <DarkSelect label="都道府県" value={form.prefecture} onChange={set('prefecture')} options={PREFECTURES} />
            <DarkSelect label="営業区分" value={form.client_type} onChange={set('client_type')} options={CLIENT_TYPES} />
            <DarkSelect label="ランク" value={form.rank} onChange={set('rank')} options={RANKS} />
            <DarkSelect label="案件状況" value={form.status} onChange={set('status')} options={CLIENT_STATUS} />
            <DarkSelect label="契約状況" value={form.contract_status} onChange={set('contract_status')} options={CONTRACT_STATUS} />
            <DarkField label="宿泊実績（泊）" value={form.stays} onChange={v => set('stays')(Number(v))} type="number" />
            <DarkField label="最終訪問日" value={form.last_visit_date} onChange={set('last_visit_date')} type="date" />
            <DarkField label="次回フォロー日" value={form.next_follow_date} onChange={set('next_follow_date')} type="date" />
          </G2>
          <DarkField label="住所" value={form.address} onChange={set('address')} />
          <DarkTextarea label="メモ・備考" value={form.notes} onChange={set('notes')} />
          <DarkDivider />
          <div style={{ fontSize: 11, color: DASH.textFaint, marginBottom: 8, fontWeight: 500 }}>写真・資料のアップロード</div>
          <G2>
            {FILE_FIELDS.map(({ key, label, icon, kind }) => {
              const Comp = kind === 'image' ? DarkImageUpload : DarkDocUpload
              return (
                <Comp
                  key={key}
                  label={label}
                  icon={icon}
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
        <Modal dark title="訪問記録を追加" icon="ti-calendar-plus" onClose={() => setModal(null)} onSave={saveHistory} saving={saving} width={420}>
          <G2>
            <DarkField label="訪問日" value={form.visit_date} onChange={set('visit_date')} type="date" required />
            <DarkSelect label="担当営業" value={form.person} onChange={set('person')} options={PERSONS} />
          </G2>
          <DarkField label="アクション（例：初回訪問・見積提出・フォロー）" value={form.action} onChange={set('action')} required />
          <DarkTextarea label="詳細内容" value={form.detail} onChange={set('detail')} rows={4} />
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
