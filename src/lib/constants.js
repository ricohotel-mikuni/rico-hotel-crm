export const C = {
  navy: '#1F3864', navyLight: '#2E5FA3', navyDark: '#162847',
  // Foundation v1.0是正: 以前は#C9A84Cという独自の金色で、Design
  // System v1.0のDASH.gold(#D4AF37)と実際に異なる色だった(認証画面
  // だけブランドゴールドがズレて見える不具合)。認証画面(AuthShell/
  // Login/PinLogin/PinPad/DeviceTrustSetup)はガラスモーフィズム調の
  // 独自ビジュアル(承認済み提案書Ver.2〜Ver.6)のためDASHトークン
  // 自体への全面移行はしないが、ゴールドの値そのものはDASH.goldと
  // 完全一致させる。
  gold: '#D4AF37', goldLight: '#FFF8E1',
  green: '#4CAF50', red: '#F44336', orange: '#FF9800',
  // DAIアシスタント(AI開発憲章 第五章)専用の追加トークン。既存の
  // navy/goldはそのまま流用し、キャラクターの目の発光にのみ必要な
  // 新規アクセント色をここへ追加する(ERP開発憲章第11条: 新しい色は
  // 画面ごとに個別定義せずC定数へ追加する)。
  daiEye: '#00E5FF',

  // Design tokens (v1.2.1) — the canonical scale for the shared
  // header ecosystem (Header/Breadcrumb/ProfileMenu/NotificationBell).
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
  sidebarWidth: 260,
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

// Foundation v1.0是正(⑤重複コード): employees.statusの表示ラベルが
// EmployeeDirectory.jsx/EmployeeProfile.jsxで別々に同じ内容を
// 定義していたため、ここへ集約する。
export const EMPLOYEE_STATUS_LABEL = { active: '在籍中', inactive: '退職済み' }
