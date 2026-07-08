import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { C } from '../lib/constants'
import { Spinner } from '../ui'
import PinPad from './PinPad'
import { getDeviceId, findRosterEntry, upsertRosterEntry, updateRosterToken } from './deviceTrust'

function guessDeviceLabel() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua)) return 'iPad'
  if (/Android/.test(ua)) return 'Android端末'
  if (/Macintosh/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows PC'
  return 'この端末'
}

// パスワードでログインした直後に一度だけ挟まる画面(App.jsxが
// sessionStorageのJUST_PASSWORD_SIGNED_INフラグを見て表示を判断する)。
// この端末が既にPIN登録済みの本人であれば、画面を出さずrefresh_token
// だけ静かに更新してすぐ onDone() する(毎回聞かれると煩わしいため)。
export default function DeviceTrustSetup({ onDone }) {
  const { user } = useAuth()
  const [stage, setStage] = useState('checking') // checking | prompt | pin-setup | pin-confirm | done
  const [employee, setEmployee] = useState(null)
  const [trust, setTrust] = useState(true)
  const [firstPin, setFirstPin] = useState('')
  const [mismatch, setMismatch] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    let cancelled = false
    async function init() {
      if (!user) { onDone(); return }
      const { data: emp } = await supabase.from('employees').select('id, full_name').eq('user_id', user.id).maybeSingle()
      if (!emp) { onDone(); return }
      const { data: dir } = await supabase.from('v_employee_directory').select('department_name, position').eq('id', emp.id).maybeSingle()
      if (cancelled) return
      const full = { employee_id: emp.id, full_name: emp.full_name, department_name: dir?.department_name || '', position: dir?.position || '' }
      setEmployee(full)

      const existing = findRosterEntry(emp.id)
      if (existing) {
        // この端末は既に信頼済み — 最新のrefresh_tokenだけ更新して終了
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.refresh_token) updateRosterToken(emp.id, session.refresh_token)
        onDone()
        return
      }
      setStage('prompt')
    }
    init()
    return () => { cancelled = true }
  }, [user]) // eslint-disable-line

  const finishWithoutTrust = () => onDone()

  const finishWithTrust = async (pin) => {
    setSaving(true)
    setErrorMsg('')
    try {
      const { error: pinErr } = await supabase.rpc('set_employee_pin', { p_pin: pin })
      if (pinErr) { setErrorMsg('PINの登録に失敗しました: ' + pinErr.message); setSaving(false); return }

      const deviceId = getDeviceId()
      const { error: devErr } = await supabase.rpc('register_trusted_device', {
        p_device_id: deviceId, p_device_label: guessDeviceLabel(),
      })
      if (devErr) { setErrorMsg('端末の登録に失敗しました: ' + devErr.message); setSaving(false); return }

      const { data: { session } } = await supabase.auth.getSession()
      upsertRosterEntry({ ...employee, refresh_token: session?.refresh_token })
      setStage('done')
      setTimeout(onDone, 1400)
    } finally {
      setSaving(false)
    }
  }

  const handleFirstComplete = (digits) => {
    setFirstPin(digits)
    setMismatch(false)
    setStage('pin-confirm')
  }

  const handleConfirmComplete = (digits) => {
    if (digits !== firstPin) {
      setMismatch(true)
      setFirstPin('')
      setStage('pin-setup')
      return
    }
    finishWithTrust(digits)
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px 16px',
      background: `linear-gradient(135deg, ${C.navyDark} 0%, ${C.navy} 60%, #2E5FA3 100%)`,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 380,
        boxShadow: '0 24px 80px rgba(0,0,0,.3)', textAlign: 'center',
      }}>
        {stage === 'checking' && (
          <div style={{ padding: '30px 0' }}><Spinner size={26} /></div>
        )}

        {stage === 'prompt' && (
          <>
            <div style={{ color: C.gold, marginBottom: 10 }}><i className="ti ti-circle-check" style={{ fontSize: 30 }} /></div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: C.navy, margin: '0 0 6px' }}>ログインしました</h2>
            <p style={{ fontSize: 12.5, color: '#607D8B', marginBottom: 20, lineHeight: 1.7 }}>
              {employee?.full_name} 様、次回からは6桁のPINで素早くログインできます。この端末を信頼しますか？
            </p>
            <label style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              fontSize: 13, color: '#37474F', background: '#F4F6F8', padding: '12px 14px', borderRadius: 9, marginBottom: 18, cursor: 'pointer',
            }}>
              <span>この端末を信頼する</span>
              <input type="checkbox" checked={trust} onChange={e => setTrust(e.target.checked)} style={{ width: 18, height: 18, accentColor: C.navy }} />
            </label>
            <button
              type="button"
              onClick={() => trust ? setStage('pin-setup') : finishWithoutTrust()}
              style={{
                width: '100%', padding: '13px', background: C.navy, color: '#fff', border: 'none',
                borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              続ける
            </button>
            {!trust && (
              <div style={{ fontSize: 11, color: '#90A4AE', marginTop: 10 }}>
                信頼しない場合、次回以降も毎回メールアドレスとパスワードの入力が必要です
              </div>
            )}
          </>
        )}

        {(stage === 'pin-setup' || stage === 'pin-confirm') && (
          <>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: C.navy, margin: '0 0 6px' }}>
              {stage === 'pin-setup' ? '6桁のPINを設定してください' : 'もう一度同じPINを入力してください'}
            </h2>
            {mismatch && (
              <div style={{ fontSize: 12, color: '#C62828', marginBottom: 10 }}>PINが一致しませんでした。もう一度設定してください</div>
            )}
            {errorMsg && <div style={{ fontSize: 12, color: '#C62828', marginBottom: 10 }}>{errorMsg}</div>}
            <div style={{ margin: '18px 0 4px' }}>
              {stage === 'pin-setup'
                ? <PinPad key="setup" theme="light" disabled={saving} onComplete={handleFirstComplete} />
                : <PinPad key="confirm" theme="light" disabled={saving} onComplete={handleConfirmComplete} />
              }
            </div>
            {saving && <div style={{ marginTop: 14 }}><Spinner size={20} /></div>}
          </>
        )}

        {stage === 'done' && (
          <div style={{ padding: '20px 0' }}>
            <div style={{ fontSize: 34, marginBottom: 10 }}>✅</div>
            <div style={{ fontSize: 13.5, color: '#37474F' }}>PINを登録しました。次回からはPINでログインできます。</div>
          </div>
        )}
      </div>
    </div>
  )
}
