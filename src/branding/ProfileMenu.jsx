import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useMyEmployee } from '../hooks/useData'
import { C, ROLES } from '../lib/constants'

// Replaces the old cramped "name / role / bell / logout" row (which
// broke as soon as a real name+role got long, e.g. "銭 自強 / ホテル
// 責任者") with a single trigger + dropdown, mirroring the same
// backdrop+panel pattern already used by NotificationBell. Name/role
// text is hidden below `C.breakpoint.sm` so only the avatar shows on
// narrow screens — the dropdown itself never depends on that text
// being visible.
export default function ProfileMenu({ compact }) {
  const [open, setOpen] = useState(false)
  const { profile, role, signOut } = useAuth()
  const { employee } = useMyEmployee()
  const navigate = useNavigate()

  const go = (path) => { navigate(path); setOpen(false) }

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
            <button onClick={signOut} className="profile-menu-item profile-menu-item-danger">
              <i className="ti ti-logout" /> ログアウト
            </button>
          </div>
        </>
      )}

      <style>{`
        .profile-menu-trigger {
          display: flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.14);
          border-radius: ${C.radius.pill}px; padding: 4px 10px 4px 4px;
          cursor: pointer; transition: background .15s; flex-shrink: 0;
          min-height: 34px;
        }
        .profile-menu-trigger:active { background: rgba(255,255,255,.18); }
        @media (hover: hover) and (pointer: fine) {
          .profile-menu-trigger:hover { background: rgba(255,255,255,.14); }
        }
        .profile-menu-avatar {
          border-radius: 50%; background: rgba(201,168,76,.25); color: ${C.gold};
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
          background: #fff; border-radius: ${C.radius.md}px; overflow: hidden;
          box-shadow: ${C.shadow.lg}; border: 1px solid #ECEFF1;
          min-width: 180px; padding: 6px;
        }
        .profile-menu-item {
          display: flex; align-items: center; gap: 9px; width: 100%;
          padding: 9px 10px; border: none; background: none; cursor: pointer;
          font-size: 13px; color: #455A64; font-family: inherit; border-radius: ${C.radius.sm}px;
          text-align: left;
        }
        .profile-menu-item i { font-size: 14px; color: #90A4AE; width: 16px; text-align: center; }
        @media (hover: hover) and (pointer: fine) {
          .profile-menu-item:hover { background: #F5F7FA; }
        }
        .profile-menu-item-danger { color: #C62828; }
        .profile-menu-item-danger i { color: #E57373; }
        .profile-menu-divider { height: 1px; background: #ECEFF1; margin: 4px 2px; }
      `}</style>
    </div>
  )
}
