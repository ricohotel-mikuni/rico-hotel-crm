// 数値サマリー用の小さなカード。Portal(会社ホーム)とPropertyHub
// (拠点ホーム/AI Today)の両方から使うため共有部品として切り出した。
// `dummy` は「まだ対応モジュールが無く実データを持たない」ことを示す
// 小さな角バッジ(AI開発憲章 第12条: 実データの裏付けがない数値は
// 創作しない/創作である旨を明示する、という原則に沿った既存の表現方法)。
export default function StatCard({ icon, label, value, unit, color, dummy }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 10, padding: '12px 14px',
      border: '1px solid #ECEFF1', boxShadow: '0 1px 4px rgba(0,0,0,.06)',
      position: 'relative',
    }}>
      {dummy && (
        <span style={{ position: 'absolute', top: 8, right: 10, fontSize: 9, color: '#BDBDBD', fontWeight: 700 }}>
          ダミー
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className={`ti ${icon}`} style={{ fontSize: 13, color }} />
        </div>
        <span style={{ fontSize: 10.5, color: '#90A4AE', lineHeight: 1.3 }}>{label}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color, lineHeight: 1 }}>
        {value}
        {unit && <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 3 }}>{unit}</span>}
      </div>
    </div>
  )
}
