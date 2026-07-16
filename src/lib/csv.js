// Foundation v1.0是正(⑤重複コード) — CSV出力ロジックがAdminAuditLog.jsx
// とClients.jsxにそれぞれ個別実装されていた(エスケープ+Blob+ダウン
// ロード処理がほぼ同一)。共通ユーティリティへ統合する。
function csvEscape(v) {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

export function downloadCsv(filename, headers, rows) {
  const lines = [headers.map(csvEscape).join(',')]
  rows.forEach(row => lines.push(row.map(csvEscape).join(',')))
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
