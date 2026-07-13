import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useMyEmployee } from '../hooks/useData'
import { hasTrustedRoster } from '../auth/deviceTrust'
import { C, ROLES } from '../lib/constants'
import { DASH } from '../lib/designSystem'

// Replaces the old cramped "name / role / bell / logout" row (which
// broke as soon as a real name+role got long, e.g. "銭 自強 / ホテル
// 責任者") with a single trigger + dropdown, mirroring the same
// backdrop+panel pattern already used by NotificationBell. Name/role
// text is hidden below `C.breakpoint.sm` so only the avatar shows on
// narrow screens — the dropdown itself never depends on that text
// being visible.
export default function ProfileMenu({ compact }) {
  const [open, setOpen] = useState(false)
  const { profile, role, signOut, lock } = useAuth()
  const { employee } = useMyEmployee()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  const go = (path) => { navigate(path); setOpen(false) }

  // この端末にPINが登録済みなら「ログアウト」はロック画面へ戻すだけ
  // (Supabaseセッションは破棄しない、次回はPINで即再開できる)。
  // PIN未登録の端末では、そもそもPINで復帰できないため通常どおり
  // 本当のサインアウトを行う。
  const handleLogout = () => {
    setOpen(false)
    if (hasTrustedRoster()) lock()
    else signOut()
  }

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} className="profile-menu-trigger">
        <div className="profile-menu-avatar" style={{ width: compact ? 26 : 30, height: compact ? 26 : 30 }}>
          <i className="ti ti-user" style={{ fontSize: compact ? 12 : 14 }} />
        </div>
        <div className="profile-menu-info">
          <div className="profile-menu-name">{profile?.full_name || '—'}</div>
          <div className="profile-menu-role">{ROLES[role]?.label || '—'}</div>
        </div>
        <i className="ti ti-chevron-down" style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', flexShrink: 0 }} />
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} className="profile-menu-backdrop" />
          <div className="profile-menu-dropdown">
            {employee && (
              <button onClick={() => go(`/employees/${employee.id}`)} className="profile-menu-item">
                <i className="ti ti-user-circle" /> プロフィール
              </button>
            )}
            <button onClick={() => go('/hotels/rico-mikuni/sales/settings')} className="profile-menu-item">
              <i className="ti ti-settings" /> 設定
            </button>
            <div className="profile-menu-divider" />
            <div className="profile-menu-theme">
              <span><i className="ti ti-sun-moon" /> 表示テーマ</span>
              <div className="profile-menu-theme-switch">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={theme === 'light' ? 'on' : ''}
                >ライト</button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={theme === 'dark' ? 'on' : ''}
                >ダーク</button>
              </div>
            </div>
            <div className="profile-menu-divider" />
            <button onClick={handleLogout} className="profile-menu-item profile-menu-item-danger">
              <i className="ti ti-logout" /> ログアウト
            </button>
          </div>
        </>
      )}

      <style>{`
        .profile-menu-trigger {
          display: flex; align-items: center; gap: 8px;
          background: none; border: none;
          border-radius: ${C.radius.pill}px; padding: 4px 6px 4px 4px;
          cursor: pointer; transition: background .15s; flex-shrink: 0;
          min-height: 34px;
        }
        .profile-menu-trigger:active { background: rgba(255,255,255,.12); }
        @media (hover: hover) and (pointer: fine) {
          .profile-menu-trigger:hover { background: rgba(255,255,255,.08); }
        }
        .profile-menu-avatar {
          border-radius: 50%; background: rgba(212,175,55,.22); color: ${DASH.gold};
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .profile-menu-info { display: none; text-align: left; min-width: 0; }
        .profile-menu-name {
          font-size: 12px; font-weight: 600; color: #fff; line-height: 1.3;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px;
        }
        .profile-menu-role { font-size: 10px; color: rgba(255,255,255,.55); line-height: 1.3; }
        @media (min-width: ${C.breakpoint.sm}px) {
          .profile-menu-info { display: block; }
        }
        .profile-menu-backdrop { position: fixed; inset: 0; z-index: 998; background: transparent; }
        .profile-menu-dropdown {
          position: absolute; top: calc(100% + 8px); right: 0; z-index: 999;
          background: ${DASH.card}; border-radius: ${C.radius.md}px; overflow: hidden;
          box-shadow: ${C.shadow.lg}; border: 1px solid ${DASH.border};
          min-width: 180px; padding: 6px;
        }
        .profile-menu-item {
          display: flex; align-items: center; gap: 9px; width: 100%;
          padding: 9px 10px; border: none; background: none; cursor: pointer;
          font-size: 13px; color: ${DASH.textSub}; font-family: inherit; border-radius: ${C.radius.sm}px;
          text-align: left;
        }
        .profile-menu-item i { font-size: 14px; color: ${DASH.textFaint}; width: 16px; text-align: center; }
        @media (hover: hover) and (pointer: fine) {
          .profile-menu-item:hover { background: ${DASH.surface2}; }
        }
        .profile-menu-item-danger { color: #C62828; }
        .profile-menu-item-danger i { color: #E57373; }
        .profile-menu-divider { height: 1px; background: ${DASH.border}; margin: 4px 2px; }
        .profile-menu-theme {
          display: flex; align-items: center; justify-content: space-between;
          padding: 6px 10px; font-size: 12px; color: ${DASH.textSub}; gap: 8px;
        }
        .profile-menu-theme span { display: flex; align-items: center; gap: 7px; }
        .profile-menu-theme i { font-size: 14px; color: ${DASH.textFaint}; }
        .profile-menu-theme-switch {
          display: flex; background: ${DASH.surface2}; border-radius: 999px; padding: 2px; flex-shrink: 0;
        }
        .profile-menu-theme-switch button {
          font-size: 10.5px; font-weight: 600; padding: 4px 9px; border-radius: 999px;
          border: none; background: none; cursor: pointer; color: ${DASH.textFaint}; font-family: inherit;
        }
        .profile-menu-theme-switch button.on { background: ${DASH.gold}; color: ${DASH.onGold}; }
      `}</style>
    </div>
  )
}
