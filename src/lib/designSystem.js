// 大栄商事株式会社 UIデザインシステム v1.0(docs/ui-design-system.md、
// ERP開発憲章第十一章)の配色トークンの唯一の情報源。以前は
// PropertyHub.jsx / Portal.jsx / ModuleLauncher.jsx がそれぞれ同じ値を
// 個別にハードコードしており、1箇所を直しても他が追従しない「見た目の
// ズレ」の原因になっていた(ユーザーからの指摘: 「画面ごとに色を変え
// ないでください」)。今後、拠点ダッシュボードの世界観を使う画面は
// 必ずこの`DASH`を直接importし、独自のコピーを作らない。
export const DASH = {
  bg: '#071C3A',
  card: '#0F2A4D',
  border: '#1A2A4A',
  gold: '#D4AF37',
  textMain: '#FFFFFF',
  textSub: '#C7D0E0',
  textFaint: '#8A96AC',
  green: '#4CD964',
  purple: '#B366FF',
  orange: '#F59E0B',
  blue: '#3A6DFF',
  alert: '#ff8a7a',
}
