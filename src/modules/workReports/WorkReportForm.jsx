import { useState, useEffect } from 'react'
import { useMyWorkReportForm, useMyWorkReportHistory, WORK_REPORT_CATEGORY_LABELS } from '../../hooks/useData'
import { DarkPage, TodayCard, TodayCardTitle } from '../../ui/DesignSystemKit'
import { Toast } from '../../ui'
import { DASH } from '../../lib/designSystem'

// 業務日報の入力画面(今回のご依頼「システム構成の整理」②)。
// 最初に区分(営業/通常業務)を選び、共通項目+(営業の場合のみ)営業
// 項目を入力する。日付・担当者は自動設定、区分は本人がその場で選ぶ
// (社員属性からの自動判定はしない)。登録済みの自分の日報は画面下部
// に一覧表示する。
const COMMON_FIELDS = [
  { key: 'summary', label: '本日の業務内容', type: 'text' },
  { key: 'result',  label: '実施結果・成果', type: 'textarea' },
  { key: 'issues',  label: '問題・課題', type: 'textarea' },
  { key: 'next_plan', label: '明日の予定', type: 'textarea' },
  { key: 'attachment', label: '添付ファイル(URL・ファイル名等)', type: 'text' },
]
const SALES_FIELDS = [
  { key: 'visit_target', label: '訪問先／営業先', type: 'text' },
  { key: 'negotiation', label: '商談内容', type: 'textarea' },
  { key: 'contact_person', label: '相手先担当者', type: 'text' },
  { key: 'negotiation_result', label: '商談結果', type: 'textarea' },
  { key: 'next_action', label: '次回アクション', type: 'text' },
]

const fieldBoxStyle = {
  width: '100%', padding: '9px 11px', border: `1px solid ${DASH.border}`, borderRadius: 8,
  fontSize: 13, background: DASH.inputBg, color: DASH.textMain, fontFamily: 'inherit', boxSizing: 'border-box',
}

function emptyValues() {
  const v = {}
  for (const f of [...COMMON_FIELDS, ...SALES_FIELDS]) v[f.key] = ''
  return v
}

export default function WorkReportForm() {
  const form = useMyWorkReportForm()
  const { reports: history } = useMyWorkReportHistory()
  const [values, setValues] = useState(emptyValues())
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    setValues({ ...emptyValues(), ...(form.report?.content || {}) })
  }, [form.report, form.category])

  if (form.loading) {
    return <DarkPage maxWidth={600}><div style={{ padding: 40, textAlign: 'center', color: DASH.textFaint, fontSize: 13 }}>読み込み中…</div></DarkPage>
  }
  if (form.notFound) {
    return (
      <DarkPage maxWidth={600}>
        <div style={{ padding: 40, textAlign: 'center', color: DASH.textFaint, fontSize: 13 }}>
          社員情報が見つかりませんでした。管理者にご確認ください。
        </div>
      </DarkPage>
    )
  }

  const fields = form.category === 'sales' ? [...COMMON_FIELDS, ...SALES_FIELDS] : COMMON_FIELDS

  const save = async () => {
    setSaving(true)
    const { error } = await form.submit(values)
    setSaving(false)
    if (error) { setToast({ message: '保存に失敗しました: ' + error.message, type: 'error' }); return }
    setToast({ message: form.report ? '更新しました' : '登録しました', type: 'success' })
  }

  return (
    <DarkPage maxWidth={600}>
      <TodayCard>
        <TodayCardTitle title="📋 業務日報" daiExpr="talk" daiSize={60} />
        <div style={{ fontSize: 13, color: DASH.textSub, lineHeight: 1.8 }}>
          {form.employeeName}さん<span className="wr-auto-chip">自動取得</span><br />
          {form.date}(本日)<span className="wr-auto-chip">自動設定</span>
        </div>
      </TodayCard>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: DASH.textFaint, marginBottom: 6, fontWeight: 600 }}>区分を選んでください</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {Object.entries(WORK_REPORT_CATEGORY_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => form.selectCategory(key)}
              style={{
                flex: 1, fontSize: 13, fontWeight: 700, padding: '10px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                border: `1px solid ${key === form.category ? DASH.gold : DASH.border}`,
                background: key === form.category ? DASH.gold : DASH.card,
                color: key === form.category ? DASH.onGold : DASH.textSub,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {form.report && (
        <div style={{ fontSize: 12, color: DASH.green, marginBottom: 14, fontWeight: 700 }}>
          ✓ 本日(この区分)はすでに登録済みです(内容を変更して再登録できます)
        </div>
      )}

      <div style={{ background: DASH.card, border: `1px solid ${DASH.border}`, borderRadius: 16, padding: 20, boxShadow: DASH.cardShadow, marginBottom: 24 }}>
        {fields.map(f => (
          <div key={f.key} style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11.5, color: DASH.textFaint, marginBottom: 5, fontWeight: 600 }}>{f.label}</label>
            {f.type === 'textarea' ? (
              <textarea
                value={values[f.key] || ''}
                onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                style={{ ...fieldBoxStyle, minHeight: 70, resize: 'vertical' }}
              />
            ) : (
              <input
                value={values[f.key] || ''}
                onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                style={fieldBoxStyle}
              />
            )}
          </div>
        ))}
        <button
          onClick={save} disabled={saving}
          style={{
            width: '100%', marginTop: 4, background: DASH.gold, color: DASH.onGold, border: 'none', borderRadius: 10,
            padding: '12px', fontSize: 14, fontWeight: 800, cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? '保存中…' : (form.report ? '更新する' : '登録する')}
        </button>
      </div>

      <div style={{ fontSize: 11, color: DASH.gold, fontWeight: 700, letterSpacing: 2.5, marginBottom: 10 }}>登録済みの日報</div>
      <div style={{ background: DASH.card, borderRadius: 16, border: `1px solid ${DASH.border}`, boxShadow: DASH.cardShadow, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: 'rgba(212,175,55,.08)' }}>
                {['日付', '担当者', '区分', '業務内容', '結果'].map(c => (
                  <th key={c} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10.5, color: DASH.gold, fontWeight: 700, whiteSpace: 'nowrap' }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 18, textAlign: 'center', color: DASH.textFaint }}>まだ登録がありません</td></tr>
              ) : history.map(r => (
                <tr key={r.id} style={{ borderTop: `1px solid ${DASH.border}` }}>
                  <td style={{ padding: '8px 12px', color: DASH.textMain, whiteSpace: 'nowrap' }}>{r.report_date}</td>
                  <td style={{ padding: '8px 12px', color: DASH.textSub, whiteSpace: 'nowrap' }}>{r.employees?.full_name || '—'}</td>
                  <td style={{ padding: '8px 12px', color: DASH.textSub, whiteSpace: 'nowrap' }}>{WORK_REPORT_CATEGORY_LABELS[r.category] || r.category}</td>
                  <td style={{ padding: '8px 12px', color: DASH.textFaint, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.content?.summary || '—'}</td>
                  <td style={{ padding: '8px 12px', color: DASH.textFaint, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.content?.result || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .wr-auto-chip {
          display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; font-weight: 700; color: ${DASH.green};
          background: color-mix(in srgb, ${DASH.green} 14%, transparent); padding: 2px 8px; border-radius: 999px; margin-left: 6px;
        }
      `}</style>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </DarkPage>
  )
}
