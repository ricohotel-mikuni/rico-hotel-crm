import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { C } from '../lib/constants'
import AuthShell from './AuthShell'
import PinPad from './PinPad'
import { getDeviceId, getRoster, removeRosterEntry } from './deviceTrust'

// 2回目以降の画面(信頼済み端末) — AuthShellが背景・NEO・時間帯挨拶を
// 常設で表示するため、以前ここにあった「ロゴ演出→世界のようこそ巡回」
// のイントロは廃止し(承認済み提案書Ver.2 ⑧⑨)、共有端末ならユーザー
// 選択 → PIN入力 → 6桁揃った時点で自動的に画面を開く、という最短の
// 流れにした。
//
// 設計(2026-07-09確定): PINは新しいSupabaseセッションを作らない。
// App.jsxがすでに生きたセッション(user)の上にロック画面として重ねて
// いるだけなので、PINが一致したらAuthContextのunlock()を呼んで
// ロックを外すだけでよい — refresh_tokenの保存・再提示は一切不要
// (以前の設計はsignOut()がscopeに関わらずrefresh tokenを失効させる
// ため原理的に成立しなかった。詳細はAuthContext.jsx冒頭のコメント)。
export default function PinLogin({ onUnlocked, onUsePassword }) {
  const [roster] = useState(getRoster)
  const [stage, setStage] = useState(() => (roster.length > 1 ? 'pick' : 'pin'))
  const [activeUser, setActiveUser] = useState(roster.length === 1 ? roster[0] : null)
  const [shakeToken, setShakeToken] = useState(null)
  const [pinMsg, setPinMsg] = useState('')
  const [failCount, setFailCount] = useState(0)
  const [lockCount, setLockCount] = useState(0)
  const [lockSeconds, setLockSeconds] = useState(0)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (stage !== 'locked' || lockSeconds <= 0) return
    const t = setTimeout(() => setLockSeconds(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [stage, lockSeconds])

  useEffect(() => {
    if (stage === 'locked' && lockSeconds === 0) {
      const nextLockCount = lockCount + 1
      setLockCount(nextLockCount)
      if (nextLockCount >= 2) {
        // 一定回数以上の失敗 — 提案書⑪のセキュリティ要件通り、PINでの
        // 再試行を促さずパスワード認証へ差し戻す。
        onUsePassword('PINでの認証が繰り返し失敗したため、パスワードでログインしてください。')
      } else {
        setFailCount(0)
        setStage('pin')
      }
    }
  }, [stage, lockSeconds]) // eslint-disable-line

  useEffect(() => {
    // 通常はApp.jsx側がroster空なら最初からLoginを出すため起きないが、
    // 念のための保険(レンダー中に副作用を起こさないようeffect内で行う)
    if (roster.length === 0) onUsePassword()
  }, []) // eslint-disable-line

  const pickUser = (u) => { setActiveUser(u); setFailCount(0); setPinMsg(''); setShakeToken(null); setStage('pin') }

  const handlePinComplete = async (pin) => {
    if (!activeUser) return
    setBusy(true)
    setPinMsg('')
    const { data, error } = await supabase.rpc('verify_employee_pin', {
      p_employee_id: activeUser.employee_id, p_device_id: getDeviceId(), p_pin: pin,
    })
    setBusy(false)

    if (error) { setPinMsg('通信エラーが発生しました。もう一度お試しください'); setShakeToken(Date.now()); return }

    if (data?.ok) {
      // このブラウザに今実際に生きているSupabaseセッションが、選んだ
      // 本人のものかを確認する。共有端末で複数人がrosterに載っている
      // 場合、PINが合っていても「今のセッションの持ち主」と選んだ人が
      // 違えば、unlock()では別人のセッションを見せてしまう(このタブは
      // 一度に1人分のセッションしか保持していないため、まだPINだけで
      // 別人へ安全に切り替える手段が無い) — その場合は安全側に倒し、
      // パスワードでの再ログインを求める。
      const { data: { session } } = await supabase.auth.getSession()
      const { data: liveEmp } = session?.user
        ? await supabase.from('employees').select('id').eq('user_id', session.user.id).maybeSingle()
        : { data: null }

      if (!liveEmp || liveEmp.id !== activeUser.employee_id) {
        onUsePassword(`${activeUser.full_name}様としてこの端末を使うには、一度パスワードでログインしてください。`)
        return
      }

      setStage('success')
      // セッションはApp.jsx側で既に生きている — ロックを外すだけでよい。
      setTimeout(onUnlocked, 550)
      return
    }

    if (data?.reason === 'locked') {
      const secs = Math.max(1, Math.ceil((new Date(data.locked_until).getTime() - Date.now()) / 1000))
      setLockSeconds(secs)
      setStage('locked')
      return
    }

    if (data?.reason === 'device_expired') {
      removeRosterEntry(activeUser.employee_id)
      onUsePassword('この端末の信頼登録は30日間利用が無かったため期限切れになりました。もう一度パスワードでログインしてください。')
      return
    }

    if (data?.reason === 'device_not_trusted' || data?.reason === 'not_enrolled') {
      removeRosterEntry(activeUser.employee_id)
      onUsePassword('この端末ではPINログインを利用できません。パスワードでログインしてください。')
      return
    }

    setFailCount(data?.failed_attempts ?? failCount + 1)
    setPinMsg(`PINが正しくありません（失敗 ${data?.failed_attempts ?? failCount + 1}/5）`)
    setShakeToken(Date.now())
  }

  if (roster.length === 0) return null

  return (
    <AuthShell
      mode="pin"
      onSelectPassword={() => onUsePassword()}
      onSelectPin={() => {}}
      daiExpr={stage === 'success' ? 'joy' : 'smile'}
      bubbleText={stage === 'success' ? `${activeUser?.full_name} さん、おかえりなさい` : undefined}
    >
      {stage === 'pick' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.75)', marginBottom: 20 }}>この端末に登録されている方を選んでください</div>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            {roster.map(u => (
              <button
                key={u.employee_id}
                type="button"
                onClick={() => pickUser(u)}
                style={{
                  background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 14,
                  padding: '16px 18px', cursor: 'pointer', textAlign: 'center', width: 128, fontFamily: 'inherit', color: '#fff',
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', margin: '0 auto 8px',
                  background: `linear-gradient(135deg, ${C.gold}, #a5822e)`, color: C.navyDark,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15,
                }}>
                  {u.full_name?.[0] || '?'}
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{u.full_name}</div>
                <div style={{ fontSize: 10.5, color: '#b9c6df', marginTop: 2 }}>{u.department_name || u.position || ''}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {stage === 'pin' && activeUser && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.85)', marginBottom: 2 }}>{activeUser.full_name}{activeUser.department_name ? `（${activeUser.department_name}）` : ''}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginBottom: 18 }}>6桁のPINを入力してください</div>
          <PinPad theme="dark" disabled={busy} shakeToken={shakeToken} onComplete={handlePinComplete} />
          <div style={{ fontSize: 12, color: '#f4b5a8', minHeight: 18, marginTop: 8 }}>{pinMsg}</div>
          {roster.length > 1 && (
            <button
              type="button"
              onClick={() => { setActiveUser(null); setStage('pick') }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', fontSize: 11.5, marginTop: 10, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              別の人を選ぶ
            </button>
          )}
        </div>
      )}

      {stage === 'locked' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🔒</div>
          <div style={{ fontSize: 13.5, color: '#f4b5a8', marginBottom: 6 }}>5回連続で間違えたため、しばらくお待ちください</div>
          <div style={{ fontSize: 26, color: '#fff', fontVariantNumeric: 'tabular-nums', margin: '14px 0' }}>
            00:{String(lockSeconds).padStart(2, '0')}
          </div>
        </div>
      )}

      {stage === 'success' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 30, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 14, color: '#fff' }}>{activeUser?.full_name} さん、おかえりなさい</div>
        </div>
      )}
    </AuthShell>
  )
}
