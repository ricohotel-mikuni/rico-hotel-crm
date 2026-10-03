import { useState } from 'react'
import { useAllWorkReports, WORK_REPORT_CATEGORY_LABELS } from '../../hooks/useData'
import { DarkPage } from '../../ui/DesignSystemKit'
import { DASH } from '../../lib/designSystem'

// 業務日報の一覧(今回のご依頼「システム構成の整理」②) — 全スタッフの
// 登録済み日報を日付・区分で絞り込んで確認する。最低限、日付・担当者・
// 区分・業務内容・結果を表示する。
const inputStyle = {
  padding: '7px 10px', border: `1px solid ${DASH.border}`, borderRadius: 7, fontSize: 12.5,
  background: DASH.inputBg, color: DASH.textMain, fontFamily: 'inherit', outline: 'none',
}

export default function AdminWorkReports() {
  const [date, setDate] = useState('')
  const [category, setCategory] = useState('')
  const { reports, loading } = useAllWorkReports({ date, category })

  return (
    <DarkPage maxWidth={960}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, color: DASH.gold, fontWeight: 700, letterSpacing: 2.5, marginBottom: 8 }}>管理者専用</div>
        <h1 style={{ fontSize: 21, fontWeight: 700, color: DASH.textMain, margin: '0 0 5px' }}>業務日報一覧</h1>
        <div style={{ fontSize: 13, color: DASH.textFaint }}>全スタッフが登録した業務日報を確認できます。</div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
        <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
          <option value="">区分: 全部</option>
          {Object.entries(WORK_REPORT_CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ padding: 30, textAlign: 'center', color: DASH.textFaint, fontSize: 13 }}>読み込み中…</div>
      ) : reports.length === 0 ? (
        <div style={{ padding: 30, textAlign: 'center', color: DASH.textFaint, fontSize: 13 }}>該当する日報がありません。</div>
      ) : (
        <div style={{ background: DASH.card, borderRadius: 16, border: `1px solid ${DASH.border}`, boxShadow: DASH.cardShadow, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(212,175,55,.08)' }}>
                  {['日付', '担当者', '区分', '業務内容', '結果'].map(c => (
                    <th key={c} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, color: DASH.gold, fontWeight: 700, whiteSpace: 'nowrap' }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r.id} style={{ borderTop: `1px solid ${DASH.border}` }}>
                    <td style={{ padding: '9px 14px', fontWeight: 600, color: DASH.textMain, whiteSpace: 'nowrap' }}>{r.report_date}</td>
                    <td style={{ padding: '9px 14px', color: DASH.textSub, whiteSpace: 'nowrap' }}>{r.employees?.full_name || '—'}</td>
                    <td style={{ padding: '9px 14px' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: DASH.surface2, color: DASH.textSub }}>
                        {WORK_REPORT_CATEGORY_LABELS[r.category] || r.category}
                      </span>
                    </td>
                    <td style={{ padding: '9px 14px', color: DASH.textFaint, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.content?.summary || '—'}</td>
                    <td style={{ padding: '9px 14px', color: DASH.textFaint, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.content?.result || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DarkPage>
  )
}
