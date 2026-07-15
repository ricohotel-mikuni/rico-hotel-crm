import { useMemo, useState } from 'react'
import { useTable } from '../../hooks/useData'
import { AsyncBoundary, TableSkeleton, Empty, Btn } from '../../ui'
import { DASH } from '../../lib/designSystem'
import { DarkPage } from '../../ui/DesignSystemKit'

function ResultBadge({ success }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 9px', borderRadius: 12, fontSize: 11, fontWeight: 700,
      background: success ? 'rgba(22,163,74,.12)' : 'rgba(220,38,38,.12)', color: success ? DASH.green : DASH.alert,
    }}>
      {success ? '成功' : '失敗'}
    </span>
  )
}

const ACTION_LABEL = {
  login: 'ログイン', logout: 'ログアウト',
  employee_created: '社員登録', employee_updated: '社員編集', employee_deleted: '社員削除',
  role_changed: '権限変更', pin_changed: 'PIN変更', hotel_assignment_changed: 'ホテル所属変更',
  sales_case_created: '営業案件追加', contract_updated: '契約変更',
}
const CATEGORY_FILTERS = [
  { key: 'all', label: 'すべて' },
  { key: 'user', label: 'ユーザー' },
  { key: 'hotel_ops', label: 'ホテル運営' },
  { key: 'ai', label: 'AI' },
]

function diffText(before, after) {
  if (before == null && after == null) return '—'
  if (before == null) return '(新規)'
  try {
    const b = typeof before === 'string' ? before : JSON.stringify(before)
    const a = typeof after === 'string' ? after : JSON.stringify(after)
    return `${b} → ${a}`
  } catch {
    return '—'
  }
}

function csvEscape(v) {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

function downloadCsv(rows) {
  const headers = ['日時', '実行ユーザー', '対象ユーザー', '会社', 'ホテル', 'IP', '種別', '内容', '変更前', '変更後', '結果']
  const lines = [headers.join(',')]
  rows.forEach(r => {
    lines.push([
      new Date(r.created_at).toLocaleString('ja-JP'),
      r.actor?.full_name || '',
      r.target?.full_name || r.target_label || '',
      r.company?.name || '',
      r.hotel?.name || '',
      r.ip_address || '',
      ACTION_LABEL[r.action] || r.action,
      r.description || '',
      r.before_state ? JSON.stringify(r.before_state) : '',
      r.after_state ? JSON.stringify(r.after_state) : '',
      r.success ? '成功' : '失敗',
    ].map(csvEscape).join(','))
  })
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// 監査ログ(/admin/audit-logs) — HotelOS全社共通の監査ログ画面
// (承認済み提案書「監査ログ機能の全社拡張」)。書き込みは
// migration 015 write_audit_log()経由に統一されており、この画面は
// audit_logsを新しい順に表示するだけの読み取り専用ビュー。
//
// 現時点で実際にイベントが記録されるのは、既存機能に紐づく9種類
// (ログイン・ログアウト・社員登録/編集/削除・権限変更・PIN変更・
// ホテル所属変更・営業案件追加・契約変更)のみ。料金・在庫・OTA・
// 競合ホテル・設備・予約・チェックイン/アウト・AI価格提案は、
// その機能自体がまだ実装されていないため今はイベントが発生しない
// (機能実装時にwrite_audit_log()を1呼び出し足すだけで乗る設計)。
export default function AdminAuditLog() {
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data: rows, loading, error, refresh } = useTable(
    'audit_logs',
    q => q.select(`
      *,
      actor:employees!audit_logs_actor_employee_id_fkey(full_name),
      target:employees!audit_logs_target_employee_id_fkey(full_name),
      company:companies(name),
      hotel:locations(name)
    `).order('created_at', { ascending: false }).limit(500),
  )

  const filtered = useMemo(() => {
    const from = dateFrom ? new Date(dateFrom + 'T00:00:00') : null
    const to = dateTo ? new Date(dateTo + 'T23:59:59') : null
    const term = search.trim().toLowerCase()
    return rows.filter(r => {
      if (category !== 'all' && r.category !== category) return false
      const created = new Date(r.created_at)
      if (from && created < from) return false
      if (to && created > to) return false
      if (term) {
        const hay = [
          r.description, r.action, r.actor?.full_name, r.target?.full_name, r.target_label,
        ].filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(term)) return false
      }
      return true
    })
  }, [rows, category, dateFrom, dateTo, search])

  return (
    <DarkPage maxWidth={1120}>
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: DASH.gold, fontWeight: 700, letterSpacing: 2.5, marginBottom: 8 }}>管理者専用</div>
          <h1 style={{ fontSize: 21, fontWeight: 700, color: DASH.textMain, margin: '0 0 5px' }}>監査ログ</h1>
          <div style={{ fontSize: 13, color: DASH.textFaint }}>
            誰が・いつ・誰に対して・何を行ったかを新しい順に表示しています(直近500件)
          </div>
        </div>
        <Btn onClick={() => downloadCsv(filtered)} icon="ti-download" label="CSV出力" color={DASH.brandNavy} outline />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
        {CATEGORY_FILTERS.map(c => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${category === c.key ? DASH.brandNavy : DASH.border}`,
              background: category === c.key ? DASH.brandNavy : DASH.card,
              color: category === c.key ? '#fff' : DASH.textSub,
            }}
          >
            {c.label}
          </button>
        ))}
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="氏名・内容で検索"
          style={{ padding: '7px 12px', border: `1px solid ${DASH.border}`, borderRadius: 8, fontSize: 12.5, minWidth: 180, background: DASH.inputBg, color: DASH.textMain, fontFamily: 'inherit' }}
        />
        <input
          type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          style={{ padding: '6px 10px', border: `1px solid ${DASH.border}`, borderRadius: 8, fontSize: 12, background: DASH.inputBg, color: DASH.textMain, fontFamily: 'inherit' }}
        />
        <span style={{ fontSize: 12, color: DASH.textFaint }}>〜</span>
        <input
          type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          style={{ padding: '6px 10px', border: `1px solid ${DASH.border}`, borderRadius: 8, fontSize: 12, background: DASH.inputBg, color: DASH.textMain, fontFamily: 'inherit' }}
        />
      </div>

      <div style={{ background: DASH.card, borderRadius: 16, border: `1px solid ${DASH.border}`, boxShadow: DASH.cardShadow, overflow: 'hidden' }}>
        <AsyncBoundary loading={loading} error={error} onRetry={refresh} skeleton={<div style={{ padding: 16 }}><TableSkeleton rows={8} columns={9} /></div>}>
          {filtered.length === 0 ? (
            <Empty icon="ti-list-check" title="該当する記録がありません" />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: 'rgba(212,175,55,.08)', textAlign: 'left' }}>
                    {['日時', '実行ユーザー', '対象', '会社/ホテル', 'IP', '種別', '内容', '変更前 → 変更後', '結果'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', color: DASH.gold, fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r.id} style={{ borderTop: i > 0 ? `1px solid ${DASH.border}` : 'none' }}>
                      <td style={{ padding: '9px 14px', color: DASH.textSub, whiteSpace: 'nowrap' }}>
                        {new Date(r.created_at).toLocaleString('ja-JP')}
                      </td>
                      <td style={{ padding: '9px 14px', color: DASH.textMain, fontWeight: 600, whiteSpace: 'nowrap' }}>{r.actor?.full_name || '—'}</td>
                      <td style={{ padding: '9px 14px', color: DASH.textSub, whiteSpace: 'nowrap' }}>{r.target?.full_name || r.target_label || '—'}</td>
                      <td style={{ padding: '9px 14px', color: DASH.textFaint, whiteSpace: 'nowrap' }}>{[r.company?.name, r.hotel?.name].filter(Boolean).join(' / ') || '—'}</td>
                      <td style={{ padding: '9px 14px', color: DASH.textFaint, whiteSpace: 'nowrap' }}>{r.ip_address || '—'}</td>
                      <td style={{ padding: '9px 14px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: DASH.blue, background: 'rgba(58,109,255,.08)', padding: '2px 8px', borderRadius: 10 }}>
                          {ACTION_LABEL[r.action] || r.action}
                        </span>
                      </td>
                      <td style={{ padding: '9px 14px', color: DASH.textSub }}>{r.description || '—'}</td>
                      <td style={{ padding: '9px 14px', color: DASH.textFaint, fontSize: 11.5, maxWidth: 260 }}>{diffText(r.before_state, r.after_state)}</td>
                      <td style={{ padding: '9px 14px' }}><ResultBadge success={r.success} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AsyncBoundary>
      </div>
    </DarkPage>
  )
}
