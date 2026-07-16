import { useEffect } from 'react'
import { DASH } from '../lib/designSystem'

// Foundation v1.0是正(共通化・Design System違反の解消): `dark`は元々
// 「新しいDASHトークン対応スキンへの移行中の画面だけが付ける」opt-in
// フラグだったが、確認したところ現存する全呼び出し元(Clients/Cases/
// Contracts/Reports/EmployeeForm/ApprovalCenter/AdminHotelManagement/
// AdminCompanies/AdminCommonMasters)がすでに`dark`を渡しており、
// 旧来の非DASHパス(生hex直書き)は到達不能なデッドコードになって
// いた。呼び出し元の挙動を一切変えずに旧パスを削除し、DASHトークン
// のみを参照する1本の実装へ統合した。
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
          background: DASH.card,
          border: `1px solid ${DASH.border}`,
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
          padding: '13px 18px', background: DASH.card,
          borderBottom: `1px solid ${DASH.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, zIndex: 1, borderRadius: '10px 10px 0 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, fontWeight: 600, color: DASH.textMain }}>
            {icon && <i className={`ti ${icon}`} style={{ fontSize: 15, color: DASH.gold }} />}
            {title}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: DASH.textFaint, cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 4px' }}
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
          padding: '10px 18px', borderTop: `1px solid ${DASH.border}`,
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          background: DASH.card, borderRadius: '0 0 10px 10px',
          position: 'sticky', bottom: 0,
        }}>
          <button onClick={onClose} className="ds-modal-btn">キャンセル</button>
          <button onClick={onSave} disabled={saving} className="ds-modal-btn primary">
            {saving ? '保存中…' : (saveLabel || '保存する')}
          </button>
          <style>{`
            .ds-modal-btn {
              font-size: 13px; font-weight: 600; padding: 8px 16px; border-radius: 8px; cursor: pointer;
              font-family: inherit; background: transparent; color: ${DASH.textSub}; border: 1px solid ${DASH.border};
            }
            .ds-modal-btn.primary { background: ${DASH.brandNavy}; color: #fff; border-color: ${DASH.brandNavy}; }
            .ds-modal-btn:disabled { opacity: .6; cursor: not-allowed; }
            .ds-modal-btn:active { transform: scale(.97); }
          `}</style>
        </div>
      </div>
    </div>
  )
}
