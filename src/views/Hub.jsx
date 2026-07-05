import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import HubShell from '../layout/HubShell'
import { MODULES } from '../modules/registry'
import { C, today } from '../lib/constants'

function ModuleTile({ module, onClick }) {
  const soon = module.status !== 'active'
  const border = soon ? '#ECEFF1' : 'rgba(201,168,76,.4)'

  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff', borderRadius: 14, padding: '22px 20px',
        border: `1px solid ${border}`,
        boxShadow: '0 2px 10px rgba(0,0,0,.05)',
        cursor: 'pointer', position: 'relative',
        display: 'flex', flexDirection: 'column', gap: 14,
        transition: 'transform .18s ease, box-shadow .18s ease, border-color .18s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)'
        e.currentTarget.style.boxShadow = '0 12px 28px rgba(31,56,100,.14)'
        e.currentTarget.style.borderColor = C.gold
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'none'
        e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,.05)'
        e.currentTarget.style.borderColor = border
      }}
    >
      {soon && (
        <span style={{
          position: 'absolute', top: 14, right: 14,
          fontSize: 10, fontWeight: 700, letterSpacing: .5,
          color: '#9E9E9E', background: '#F5F5F5',
          padding: '3px 9px', borderRadius: 20,
        }}>
          準備中
        </span>
      )}

      <div style={{
        width: 46, height: 46, borderRadius: 12,
        background: soon ? '#ECEFF1' : `${C.gold}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className={`ti ${module.icon}`} style={{ fontSize: 21, color: soon ? '#90A4AE' : '#B4933D' }} />
      </div>

      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 4 }}>
          {module.label}
        </div>
        <div style={{ fontSize: 12, color: '#90A4AE', lineHeight: 1.5 }}>
          {module.desc}
        </div>
      </div>
    </div>
  )
}

export default function Hub() {
  const navigate = useNavigate()
  const { profile } = useAuth()

  return (
    <HubShell>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 20px 56px' }}>
        <div style={{ marginBottom: 26 }}>
          <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, letterSpacing: 2.5, marginBottom: 8 }}>
            WELCOME
          </div>
          <h1 style={{ fontSize: 21, fontWeight: 700, color: C.navy, margin: '0 0 5px' }}>
            こんにちは、{profile?.full_name || '—'} さん
          </h1>
          <div style={{ fontSize: 13, color: '#90A4AE' }}>
            ご利用になる管理メニューを選択してください — {today()}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
            gap: 16,
          }}
        >
          {MODULES.map(m => (
            <ModuleTile key={m.id} module={m} onClick={() => navigate(m.path)} />
          ))}
        </div>
      </div>
    </HubShell>
  )
}
