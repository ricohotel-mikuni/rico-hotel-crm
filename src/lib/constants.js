export const C = {
  navy: '#1F3864', navyLight: '#2E5FA3', navyDark: '#162847',
  gold: '#C9A84C', goldLight: '#FFF8E1',
  green: '#4CAF50', red: '#F44336', orange: '#FF9800',

  // Design tokens (v1.2.1) — the canonical scale for the shared
  // header ecosystem (Header/BackButton/ProfileMenu/NotificationBell).
  // Existing page-level UI (Btn, cards, etc. in individual views) is
  // intentionally left on its own established sizing for this round —
  // only the header family was reported as inconsistent, so only it
  // was unified here rather than rewriting every screen.
  radius: { sm: 6, md: 10, lg: 14, pill: 999 },
  shadow: {
    sm: '0 1px 4px rgba(0,0,0,.06)',
    md: '0 4px 14px rgba(0,0,0,.12)',
    lg: '0 12px 28px rgba(31,56,100,.14)',
  },
  headerHeight: 56,
  sidebarWidth: 200,
  breakpoint: { sm: 480, md: 768, lg: 1024 },
}

export const ROLES = {
  admin:   { label: '管理者',   canWrite: true,  canDelete: true,  canManageUsers: true },
  manager: { label: 'マネージャー', canWrite: true,  canDelete: true,  canManageUsers: false },
  sales:   { label: '営業担当', canWrite: true,  canDelete: false, canManageUsers: false },
  viewer:  { label: '閲覧のみ', canWrite: false, canDelete: false, canManageUsers: false },
}

export const PREFECTURES = [
  '大阪府','東京都','兵庫県','京都府','神奈川県','愛知県',
  '福岡県','北海道','宮城県','広島県','その他'
]

export const CLIENT_TYPES = ['旅行会社','学校','企業','スポーツ団体','行政','医療','その他']
export const RANKS        = ['A','B','C']
export const CLIENT_STATUS = ['未訪問','初回訪問済','継続商談中','提案中','成約','失注']
export const CONTRACT_STATUS = ['未着手','営業中','見積提出','検討中','成約','キャンセル']
export const CASE_STATUS  = ['営業中','見積提出','検討中','成約','キャンセル']
export const COMM_RATES   = ['5%','8%','10%','12%','15%','その他']
export const PURPOSES     = ['新規開拓','フォロー','見積説明','クレーム対応','契約更新','その他']
export const PERSONS      = ['平井','石川','その他']

export const fmt = (n) => new Intl.NumberFormat('ja-JP').format(n || 0)
export const today = () => new Date().toISOString().split('T')[0]

export const BADGE_STYLES = {
  '成約':      { bg: '#E8F5E9', c: '#1B5E20' },
  '契約締結':  { bg: '#E8F5E9', c: '#1B5E20' },
  '本予約':    { bg: '#E8F5E9', c: '#1B5E20' },
  '確認済':    { bg: '#E8F5E9', c: '#1B5E20' },
  'あり':      { bg: '#E8F5E9', c: '#1B5E20' },
  '見積提出':  { bg: '#FFF3E0', c: '#E65100' },
  '検討中':    { bg: '#FFF9C4', c: '#F57F17' },
  '仮予約':    { bg: '#FFF9C4', c: '#F57F17' },
  '継続商談中':{ bg: '#E3F2FD', c: '#1565C0' },
  '提案中':    { bg: '#E3F2FD', c: '#1565C0' },
  '初回訪問済':{ bg: '#F3E5F5', c: '#6A1B9A' },
  '営業中':    { bg: '#F3E5F5', c: '#6A1B9A' },
  '未訪問':    { bg: '#F5F5F5', c: '#9E9E9E' },
  '未着手':    { bg: '#F5F5F5', c: '#9E9E9E' },
  'キャンセル':{ bg: '#FFEBEE', c: '#C62828' },
  '失注':      { bg: '#FFEBEE', c: '#C62828' },
  'A':         { bg: '#FFEBEE', c: '#C62828' },
  'B':         { bg: '#FFF3E0', c: '#E65100' },
  'C':         { bg: '#F5F5F5', c: '#616161' },
  'なし':      { bg: '#F5F5F5', c: '#9E9E9E' },
  '未確認':    { bg: '#FFF3E0', c: '#E65100' },
  '管理者':    { bg: '#E8EAF6', c: '#3949AB' },
  'マネージャー':{ bg: '#E3F2FD', c: '#1565C0' },
  '営業担当':  { bg: '#E8F5E9', c: '#1B5E20' },
  '閲覧のみ':  { bg: '#F5F5F5', c: '#9E9E9E' },
  '承認待ち':  { bg: '#FFF3E0', c: '#E65100' },
  '承認済み':  { bg: '#E8F5E9', c: '#1B5E20' },
  '却下':      { bg: '#FFEBEE', c: '#C62828' },
  '取消':      { bg: '#F5F5F5', c: '#9E9E9E' },
  '在籍中':    { bg: '#E8F5E9', c: '#1B5E20' },
  '退職済み':  { bg: '#F5F5F5', c: '#9E9E9E' },
}
