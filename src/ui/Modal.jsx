import { useEffect } from 'react'
import { C } from '../lib/constants'
import { Btn } from './index'

export default function Modal({ title, icon, onClose, onSave, saveLabel, width = 520, children, saving }) {
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
          background: '#fff', borderRadius: 10,
          width: '100%', maxWidth: width,
          maxHeight: '88vh', overflow: 'auto',
          margin: '0 12px 20px',
          boxShadow: '0 20px 60px rgba(0,0,0,.3)',
          animation: 'fadeIn .15s ease-out',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '13px 18px', background: C.navy,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, zIndex: 1, borderRadius: '10px 10px 0 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, fontWeight: 600, color: '#fff' }}>
            {icon && <i className={`ti ${icon}`} style={{ fontSize: 15 }} />}
            {title}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.8)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 4px' }}
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
          padding: '10px 18px', borderTop: '1px solid #ECEFF1',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          background: '#FAFAFA', borderRadius: '0 0 10px 10px',
          position: 'sticky', bottom: 0,
        }}>
          <Btn onClick={onClose} icon="ti-x" label="キャンセル" color="#607D8B" outline />
          <Btn onClick={onSave} icon={saving ? 'ti-loader' : 'ti-device-floppy'} label={saving ? '保存中…' : (saveLabel || '保存する')} color="#4CAF50" disabled={saving} />
        </div>
      </div>
    </div>
  )
}
