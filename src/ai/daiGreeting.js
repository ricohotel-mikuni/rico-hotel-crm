// DAIの時間帯挨拶 — WelcomeHero.jsx の時間帯区分(5/11/17/22時)と同じ
// 境界を用いるが、文面はDAI人格用(上品な関西弁、AI開発憲章第15条)の
// ものを別途持つ。境界だけ共有し、文面は用途ごとに独立させておく。
const BANDS = [
  { from: 5, to: 11, text: 'おはようございます！\n今日も一緒に頑張りましょうね！😊' },
  { from: 11, to: 17, text: 'こんにちは！\n今日も最高の一日にしていきましょう✨' },
  { from: 17, to: 22, text: 'お疲れさまです！\nもうひと頑張りしましょう💪' },
  { from: 22, to: 29, text: '遅くまでお疲れさまです！\n無理せず、頑張っていきましょうね😊' },
]

export function daiGreeting() {
  const h = new Date().getHours()
  const hh = h < 5 ? h + 24 : h
  const band = BANDS.find(b => hh >= b.from && hh < b.to) || BANDS[3]
  return band.text
}
