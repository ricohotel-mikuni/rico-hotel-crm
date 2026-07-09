import { C } from '../lib/constants'

// 前日比・スパークライン付きのKPIカード(承認済み提案書Ver.2 ⑦⑧)。
// StatCardを置き換えるものではなく、拠点ホームの「今日の判断材料」
// カード専用 — 配色はネイビー/ゴールド/ホワイトを基本とし、赤は
// `alert`(対応が必要なカード、例: 未承認)のときのみ使用する。
function Sparkline({ points, color }) {
  const w = 60, h = 22
  const max = Math.max(...points), min = Math.min(...points)
  const range = (max - min) || 1
  const step = w / (points.length - 1)
  const coords = points.map((v, i) => [i * step, h - ((v - min) / range) * h])
  const poly = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const [lastX, lastY] = coords[coords.length - 1]
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ flexShrink: 0 }}>
      <polyline points={poly} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="2" fill={color} />
    </svg>
  )
}

// deltaUnit: 'pt'(%ポイント表示) or ''(値そのまま+unit系はラベル側で表現)
export default function KpiCard({ label, value, unit, delta, deltaUnit = '', trend, alert, dummy }) {
  const up = delta >= 0
  const isAlertUp = alert && up
  const sparkColor = alert ? C.red : C.navy
  const deltaColor = isAlertUp ? C.red : (up ? C.gold : C.red)

  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: '18px 20px',
      border: `1px solid ${alert ? 'rgba(164,64,47,.3)' : '#ECEFF1'}`,
      boxShadow: '0 4px 16px rgba(22,35,60,.05)', position: 'relative',
    }}>
      {dummy && (
        <span style={{ position: 'absolute', top: 10, right: 12, fontSize: 9, color: '#BDBDBD', fontWeight: 700 }}>
          ダミー
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11.5, color: alert ? C.red : '#90A4AE', fontWeight: 600 }}>{label}</span>
        {typeof delta === 'number' && (
          <span style={{ fontSize: 11, fontWeight: 700, color: deltaColor, display: 'flex', alignItems: 'center', gap: 2 }}>
            {up ? '▲' : '▼'} {Math.abs(delta)}{deltaUnit}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.navy, fontVariantNumeric: 'tabular-nums' }}>
          {value}
          {unit && <span style={{ fontSize: 11, fontWeight: 500, color: '#90A4AE', marginLeft: 3 }}>{unit}</span>}
        </div>
        {trend && <Sparkline points={trend} color={sparkColor} />}
      </div>
    </div>
  )
}
