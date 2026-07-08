import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { C } from '../lib/constants'
import LogoCarousel from './LogoCarousel'
import PinPad from './PinPad'
import { currentGreeting, WELCOME_WORDS } from '../modules/portal/WelcomeHero'
import { getDeviceId, getRoster, removeRosterEntry, updateRosterToken } from './deviceTrust'

const INTRO_MS = 4200
const WORD_CYCLE_MS = 900

// 2回目以降のログイン画面(信頼済み端末)。ロゴ演出 → 時間帯の挨拶 →
// 〇〇様 → 世界の「ようこそ」→ (共有端末なら)ユーザー選択 → PIN入力 →
// 6桁揃った時点で自動ログイン、の順で提案書⑪⑫の仕様通りに進む。
// PINはサーバー(verify_employee_pin RPC)でのみ照合し、成功したら
// この端末に保存済みのrefresh_tokenでSupabaseセッションを復元する —
// PIN自体が新しいセッションを発行するわけではない(提案書「改善案」
// の設計判断を参照)。
export default function PinLogin({ onUsePassword }) {
  const [roster] = useState(getRoster)
  const [stage, setStage] = useState('intro') // intro | pick | pin | locked | error
  const [wordIdx, setWordIdx] = useState(0)
  const [wordPhase, setWordPhase] = useState('in')
  const [activeUser, setActiveUser] = useState(roster.length === 1 ? roster[0] : null)
  const [shakeToken, setShakeToken] = useState(null)
  const [pinMsg, setPinMsg] = useState('')
  const [failCount, setFailCount] = useState(0)
  const [lockCount, setLockCount] = useState(0)
  const [lockSeconds, setLockSeconds] = useState(0)
  const [busy, setBusy] = useState(false)
  const reduceMotion = useRef(typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches).current
  const greeting = useRef(currentGreeting()).current

  const advanceFromIntro = () => setStage(roster.length > 1 ? 'pick' : 'pin')

  useEffect(() => {
    if (stage !== 'intro') return
    if (reduceMotion) { advanceFromIntro(); return }
    const wordTimer = setInterval(() => {
      setWordPhase('out')
      setTimeout(() => { setWordIdx(i => (i + 1) % WELCOME_WORDS.length); setWordPhase('in') }, 300)
    }, WORD_CYCLE_MS)
    const advanceTimer = setTimeout(advanceFromIntro, INTRO_MS)
    return () => { clearInterval(wordTimer); clearTimeout(advanceTimer) }
  }, [stage]) // eslint-disable-line

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
      setStage('success')
      const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession({ refresh_token: activeUser.refresh_token })
      if (refreshErr || !refreshed?.session) {
        // PINは通ったが、端末に保存済みのセッションそのものが使えない
        // (パスワード変更・管理者による強制サインアウト等、稀なケース)。
        // 通常のログアウトではここに来ない — signOut()はscope:'local'を
        // 使っており、この端末のrefresh_tokenを道連れにしないため。
        removeRosterEntry(activeUser.employee_id)
        onUsePassword('この端末の保存情報が無効になっています。もう一度パスワードでログインしてください。')
        return
      }
      updateRosterToken(activeUser.employee_id, refreshed.session.refresh_token)
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
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px 16px', position: 'relative',
      background: `linear-gradient(135deg, ${C.navyDark} 0%, ${C.navy} 60%, #2E5FA3 100%)`,
      color: '#fff',
    }}>
      <button
        type="button"
        onClick={() => onUsePassword()}
        style={{
          position: 'absolute', top: 18, right: 18, background: 'rgba(255,255,255,.1)', border: 'none',
          color: '#fff', fontSize: 11.5, padding: '7px 13px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        パスワードでログイン
      </button>

      {stage === 'intro' && (
        <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={advanceFromIntro}>
          <LogoCarousel />
          <div style={{ fontSize: 13, letterSpacing: 2, color: '#cfd9ec', marginTop: 6 }}>{greeting.emoji} {greeting.text}</div>
          {roster.length === 1 && (
            <div style={{ fontSize: 20, fontWeight: 600, margin: '8px 0 18px' }}>{roster[0].full_name} 様</div>
          )}
          <div style={{
            fontSize: 15, color: C.gold, minHeight: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: wordPhase === 'in' ? 1 : 0, transform: wordPhase === 'in' ? 'translateY(0)' : 'translateY(4px)',
            transition: 'opacity .3s, transform .3s', marginTop: roster.length === 1 ? 0 : 18,
          }}>
            <span>{WELCOME_WORDS[wordIdx].flag}</span><span>{WELCOME_WORDS[wordIdx].text}</span>
          </div>
          <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.4)', marginTop: 26 }}>タップして進む</div>
        </div>
      )}

      {stage === 'pick' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#cfd9ec', marginBottom: 20 }}>この端末に登録されている方を選んでください</div>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 380 }}>
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
          <div style={{ fontSize: 13, color: '#cfd9ec', marginBottom: 2 }}>{activeUser.full_name}{activeUser.department_name ? `（${activeUser.department_name}）` : ''}</div>
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
          <div style={{ fontSize: 26, fontVariantNumeric: 'tabular-nums', margin: '14px 0' }}>
            00:{String(lockSeconds).padStart(2, '0')}
          </div>
        </div>
      )}

      {stage === 'success' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 30, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 14 }}>{activeUser?.full_name} さん、おかえりなさい</div>
        </div>
      )}
    </div>
  )
}
