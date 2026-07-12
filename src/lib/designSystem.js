// 大栄商事株式会社 UIデザインシステム v1.0(docs/ui-design-system.md、
// ERP開発憲章第十一章)の配色トークンの唯一の情報源。
//
// 2026-07-13改訂: 「ライトテーマを標準に、ダークは設定でのオプション
// に」という仕様変更(承認済み)に伴い、値を直書きの定数からCSSカスタム
// プロパティへの参照へ変更した。DASH.card 等の"キー"は一切変わらない
// ため、既存の全消費側(PropertyHub.jsx / Portal.jsx / 営業管理Home.jsx
// / Clients.jsx / HotelList.jsx / DesignSystemKit.jsx / ModuleLauncher
// .jsx / Modal.jsx)は1行も変更せずに済む — 実際の色は
// src/contexts/ThemeContext.jsx が書き出す<style>と、<html>の
// data-theme属性の組み合わせで決まる。既定(属性なし = ライト)。
export const DASH = {
  bg: 'var(--ds-bg)',
  card: 'var(--ds-card)',
  border: 'var(--ds-border)',
  gold: 'var(--ds-gold)',
  textMain: 'var(--ds-text-main)',
  textSub: 'var(--ds-text-sub)',
  textFaint: 'var(--ds-text-faint)',
  green: 'var(--ds-green)',
  purple: 'var(--ds-purple)',
  orange: 'var(--ds-orange)',
  blue: 'var(--ds-blue)',
  alert: 'var(--ds-alert)',
  // 「ゴールドの上に乗る文字」専用 — ボタンやバッジの地色がゴールドの
  // ときの文字色は、テーマに関わらず常にこの濃紺で固定する。
  onGold: 'var(--ds-on-gold)',
  // 入力欄の背景 — カード面より一段明るい/暗いレイヤー。
  inputBg: 'var(--ds-input-bg)',
  // カードの中でさらに一段沈める/浮かせるための薄いオーバーレイ(3段階)。
  surface1: 'var(--ds-surface-1)',
  surface2: 'var(--ds-surface-2)',
  surface3: 'var(--ds-surface-3)',
  // ライトテーマは背景とカードが近い色のため縁取りの補助として影を
  // 使う。ダークテーマは境界線だけで十分なため影なし。
  cardShadow: 'var(--ds-card-shadow)',
}

// 実際の色の定義 — ThemeProvider(src/contexts/ThemeContext.jsx)が
// これをCSSテキストへ書き出し、:root(ライト、既定)と
// [data-theme="dark"](ダーク、設定でのオプション)に割り当てる。
export const THEME_TOKENS = {
  light: {
    '--ds-bg': '#FFFFFF',
    '--ds-card': '#F9FAFB',
    '--ds-border': '#E5E7EB',
    '--ds-gold': '#D4AF37',
    '--ds-text-main': '#1F2937',
    '--ds-text-sub': '#6B7280',
    '--ds-text-faint': '#9CA3AF',
    '--ds-green': '#16A34A',
    '--ds-purple': '#9333EA',
    '--ds-orange': '#D97706',
    '--ds-blue': '#3A6DFF',
    '--ds-alert': '#DC2626',
    '--ds-on-gold': '#0B1C3A',
    '--ds-input-bg': '#FFFFFF',
    '--ds-surface-1': 'rgba(17,24,39,.03)',
    '--ds-surface-2': 'rgba(17,24,39,.045)',
    '--ds-surface-3': 'rgba(17,24,39,.055)',
    '--ds-card-shadow': '0 1px 3px rgba(17,24,39,.06)',
  },
  dark: {
    '--ds-bg': '#071C3A',
    '--ds-card': '#0F2A4D',
    '--ds-border': '#1A2A4A',
    '--ds-gold': '#D4AF37',
    '--ds-text-main': '#FFFFFF',
    '--ds-text-sub': '#C7D0E0',
    '--ds-text-faint': '#8A96AC',
    '--ds-green': '#4CD964',
    '--ds-purple': '#B366FF',
    '--ds-orange': '#F59E0B',
    '--ds-blue': '#3A6DFF',
    '--ds-alert': '#ff8a7a',
    '--ds-on-gold': '#0B1C3A',
    '--ds-input-bg': '#0B213F',
    '--ds-surface-1': 'rgba(255,255,255,.03)',
    '--ds-surface-2': 'rgba(255,255,255,.05)',
    '--ds-surface-3': 'rgba(255,255,255,.06)',
    '--ds-card-shadow': 'none',
  },
}
