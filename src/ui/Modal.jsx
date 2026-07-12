import { useEffect } from 'react'
import { C } from '../lib/constants'
import { DASH } from '../lib/designSystem'
import { Btn } from './index'

// `dark` is opt-in and defaults to the original white modal — Modal is
// shared by Clients/Cases/Contracts/Reports/ApprovalCenter/EmployeeForm,
// and only screens that have themselves been migrated to Design System
// v1.0(承認済み提案書「Design System v1.0 最終統一提案」Item C)pass
// `dark`, so unconverted callers render exactly as before.
export default function Modal({ title, icon, onClose, onSave, saveLabel, width = 520, children, saving, dark }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,.55)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 40, paddingBottom: 20,
        overflowY: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: dark ? DASH.card : '#fff',
          border: dark ? `1px solid ${DASH.border}` : 'none',
          borderRadius: 10,
          width: '100%', maxWidth: width,
          maxHeight: '88vh', overflow: 'auto',
          margin: '0 12px 20px',
          boxShadow: '0 20px 60px rgba(0,0,0,.3)',
          animation: 'fadeIn .15s ease-out',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '13px 18px', background: dark ? DASH.card : C.navy,
          borderBottom: dark ? `1px solid ${DASH.border}` : 'none',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, zIndex: 1, borderRadius: '10px 10px 0 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, fontWeight: 600, color: dark ? DASH.textMain : '#fff' }}>
            {icon && <i className={`ti ${icon}`} style={{ fontSize: 15, color: dark ? DASH.gold : 'inherit' }} />}
            {title}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: dark ? DASH.textFaint : 'rgba(255,255,255,.8)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 4px' }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 18px 8px' }}>
          {children}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 18px', borderTop: dark ? `1px solid ${DASH.border}` : '1px solid #ECEFF1',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          background: dark ? DASH.card : '#FAFAFA', borderRadius: '0 0 10px 10px',
          position: 'sticky', bottom: 0,
        }}>
          {dark ? (
            <>
              <button onClick={onClose} className="ds-modal-btn">キャンセル</button>
              <button onClick={onSave} disabled={saving} className="ds-modal-btn primary">
                {saving ? '保存中…' : (saveLabel || '保存する')}
              </button>
              <style>{`
                .ds-modal-btn {
                  font-size: 13px; font-weight: 600; padding: 8px 16px; border-radius: 8px; cursor: pointer;
                  font-family: inherit; background: transparent; color: ${DASH.textSub}; border: 1px solid ${DASH.border};
                }
                .ds-modal-btn.primary { background: ${DASH.gold}; color: ${DASH.onGold}; border-color: ${DASH.gold}; }
                .ds-modal-btn:disabled { opacity: .6; cursor: not-allowed; }
                .ds-modal-btn:active { transform: scale(.97); }
              `}</style>
            </>
          ) : (
            <>
              <Btn onClick={onClose} icon="ti-x" label="キャンセル" color="#607D8B" outline />
              <Btn onClick={onSave} icon={saving ? 'ti-loader' : 'ti-device-floppy'} label={saving ? '保存中…' : (saveLabel || '保存する')} color="#4CAF50" disabled={saving} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
