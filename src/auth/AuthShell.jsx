import { useEffect, useRef } from 'react'
import { useBrand } from '../branding/BrandContext'
import { C } from '../lib/constants'
import Dai from '../ai/Dai'
import { daiGreeting } from '../ai/daiGreeting'

// 決め打ちの疑似ランダム配置 — 毎レンダーでMath.random()し直すと粒子が
// 飛び直して不自然になるため、インデックスから一度だけ計算する。
const PARTICLES = Array.from({ length: 18 }).map((_, i) => ({
  left: `${(i * 41 + 7) % 100}%`,
  bottom: `${(i * 17) % 46}px`,
  size: 1.4 + (i % 4) * 0.7,
  duration: 14 + (i % 7) * 2.6,
  delay: (i % 9) * 1.7,
}))

// ログイン画面とPIN画面の共通の「入れ物」(承認済み提案書 Ver.2〜Ver.4)。
// 背景の光の粒子・AIライン・ゆっくり流れる光沢・マウス視差・NEO・正式
// ロゴはすべてここに集約する。PC(≥860px)とスマホでレイアウトが大きく
// 異なるため、NEOは「大きい(PC専用)」「小さい(スマホ専用)」の2つを
// 用意し、CSSのメディアクエリで片方だけ表示する(1つのDaiインスタンスを
// レイアウトごと動かすより、責務が単純で見通しがよいため)。
//
// mode/onSelectPassword/onSelectPin — 画面下部(スマホ)・右上(PC)に出す
// 「パスワードでログイン/PINコードでログイン」切替ボタンの状態と挙動。
// onSelectPinを渡さない画面は無い想定(常に両方表示、Ver.4最終指示⑥)。
export default function AuthShell({
  children, daiExpr = 'smile', daiPose = 'wave', bubbleText,
  mode, onSelectPassword, onSelectPin,
}) {
  const brand = useBrand()
  const stageRef = useRef(null)
  const glow1Ref = useRef(null)
  const glow2Ref = useRef(null)
  const glow3Ref = useRef(null)
  const daiRef = useRef(null)

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const layers = [
      { ref: glow1Ref, depth: 10 },
      { ref: glow2Ref, depth: 14 },
      { ref: glow3Ref, depth: 22 },
      { ref: daiRef, depth: -6 },
    ]
    let raf = null
    const handleMove = (e) => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = null
        const rect = stage.getBoundingClientRect()
        const mx = (e.clientX - rect.left) / rect.width - 0.5
        const my = (e.clientY - rect.top) / rect.height - 0.5
        layers.forEach(({ ref, depth }) => {
          if (ref.current) ref.current.style.transform = `translate(${(mx * depth).toFixed(1)}px, ${(my * depth).toFixed(1)}px)`
        })
      })
    }
    const handleLeave = () => layers.forEach(({ ref }) => { if (ref.current) ref.current.style.transform = 'translate(0,0)' })
    stage.addEventListener('mousemove', handleMove)
    stage.addEventListener('mouseleave', handleLeave)
    return () => {
      stage.removeEventListener('mousemove', handleMove)
      stage.removeEventListener('mouseleave', handleLeave)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  const bubble = bubbleText || daiGreeting()

  const toggle = (
    <>
      <button
        type="button" onClick={onSelectPassword}
        className={`auth-toggle-btn${mode === 'password' ? ' active' : ''}`}
      >
        パスワードでログイン
      </button>
      <button
        type="button" onClick={onSelectPin}
        className={`auth-toggle-btn${mode === 'pin' ? ' active' : ''}`}
      >
        PINコードでログイン
      </button>
    </>
  )

  return (
    <div ref={stageRef} className="auth-stage" style={{
      minHeight: '100dvh', display: 'flex', position: 'relative', overflow: 'hidden',
      background: `linear-gradient(150deg, ${C.navyDark} 0%, #16233f 30%, ${C.navy} 60%, ${C.navyLight} 130%)`,
    }}>
      <div ref={glow1Ref} className="auth-glow g1" />
      <div ref={glow2Ref} className="auth-glow g2" />
      <div ref={glow3Ref} className="auth-glow g3" />
      <div className="auth-sheen" />
      <div className="auth-lines">
        <svg viewBox="0 0 800 600" preserveAspectRatio="none">
          <defs>
            <linearGradient id="authLineGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="rgba(201,168,76,0)" />
              <stop offset=".5" stopColor="rgba(201,168,76,.85)" />
              <stop offset="1" stopColor="rgba(201,168,76,0)" />
            </linearGradient>
          </defs>
          <path className="auth-line" d="M -50 480 L 300 380 L 850 420" style={{ animationDelay: '0s' }} />
          <path className="auth-line" d="M -50 120 L 250 200 L 850 80" style={{ animationDelay: '3s' }} />
          <path className="auth-line" d="M 100 -50 L 200 300 L 120 650" style={{ animationDelay: '6s' }} />
        </svg>
      </div>
      <div className="auth-particles">
        {PARTICLES.map((p, i) => (
          <span key={i} className="auth-particle" style={{
            left: p.left, bottom: p.bottom, width: p.size, height: p.size,
            animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s`,
          }} />
        ))}
      </div>

      {/* PC専用の切替ボタン(右上、常時2つ表示) */}
      <div className="auth-toggle-row auth-toggle-desktop">{toggle}</div>

      {/* 左パネル — NEOが時間帯挨拶とともに出迎える(PCのみ、大きめ) */}
      <div ref={daiRef} className="auth-side">
        <Dai expr={daiExpr} pose={daiPose} size={480} />
        <div className="auth-bubble">{bubble}</div>
      </div>

      {/* 右パネル(PC)/唯一のパネル(スマホ) */}
      <div className="auth-panel-wrap">
        <div className="auth-panel">
          <div className="auth-logo-row">
            <img src={brand.logo} alt={brand.name} style={{ height: 40, objectFit: 'contain', filter: 'drop-shadow(0 4px 14px rgba(0,0,0,.35))' }} />
          </div>

          {/* スマホ専用のNEO — 大きな外枠カードは持たず、ロゴの下・
              入力エリアの上に直接配置する(承認済み提案書Ver.4最終指示②③) */}
          <div className="auth-mobile-neo">
            <Dai expr={daiExpr} pose={daiPose} size={82} />
            <div className="auth-bubble auth-bubble-mobile">{bubble}</div>
          </div>

          {children}

          {/* スマホ専用の切替ボタン(入力エリアの下、常時2つ表示) */}
          <div className="auth-toggle-row auth-toggle-mobile">{toggle}</div>
        </div>
      </div>

      <style>{`
        .auth-side { display: none; flex-direction: column; align-items: center; justify-content: center; padding: 40px; position: relative; z-index: 2; }
        @media (min-width: 860px) { .auth-side { display: flex; flex: 1.15; } }
        .auth-bubble {
          margin-top: 16px; background: rgba(255,255,255,.09); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255,255,255,.16); border-radius: 16px; padding: 12px 18px; color: #fff; font-size: 13px;
          max-width: 280px; text-align: center; line-height: 1.65; white-space: pre-line;
        }
        .auth-bubble-mobile { padding: 6px 14px; font-size: 11.5px; line-height: 1.5; margin-top: 6px; }
        .auth-mobile-neo { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 4px 0 0; }
        @media (min-width: 860px) { .auth-mobile-neo { display: none; } }

        .auth-panel-wrap {
          width: 100%; max-width: 380px; display: flex; align-items: center; justify-content: center;
          padding: 30px 20px; margin: 0 auto; position: relative; z-index: 2;
        }
        @media (min-width: 860px) { .auth-panel-wrap { padding: 46px 40px; } }
        .auth-panel {
          width: 100%; border-radius: 26px; position: relative; overflow: hidden;
          padding: 18px 26px 30px;
        }
        @media (min-width: 860px) {
          .auth-panel {
            background: rgba(255,255,255,.10); backdrop-filter: blur(28px) saturate(150%); -webkit-backdrop-filter: blur(28px) saturate(150%);
            border: 1px solid rgba(255,255,255,.20);
            box-shadow: 0 30px 90px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.22);
            padding: 40px 34px;
          }
          .auth-panel::before {
            content: ""; position: absolute; top: 0; left: -60%; width: 40%; height: 100%;
            background: linear-gradient(100deg, transparent, rgba(255,255,255,.10), transparent);
            animation: authPanelSheen 8s ease-in-out infinite;
          }
        }
        @keyframes authPanelSheen { 0% { left: -60%; } 40%,100% { left: 130%; } }
        .auth-logo-row { text-align: center; padding: 18px 0 12px; }
        @media (min-width: 860px) { .auth-logo-row { padding: 0 0 26px; } }

        .auth-toggle-row { display: flex; gap: 10px; }
        .auth-toggle-btn {
          flex: 1; font-family: inherit; font-size: 11.5px; padding: 9px 10px; border-radius: 10px; cursor: pointer;
          border: 1px solid rgba(143,163,194,.4); background: rgba(74,90,115,.35); color: #c3cee0;
          transition: background .18s, color .18s, border-color .18s; text-align: center;
        }
        .auth-toggle-btn.active { background: linear-gradient(135deg,#dcc074,${C.gold}); border-color: ${C.gold}; color: ${C.navyDark}; font-weight: 700; }
        .auth-toggle-mobile { margin-top: 18px; }
        @media (min-width: 860px) { .auth-toggle-mobile { display: none; } }
        .auth-toggle-desktop { display: none; }
        @media (min-width: 860px) {
          .auth-toggle-desktop { display: flex; position: absolute; top: 18px; right: 18px; width: 300px; z-index: 3; }
        }

        .auth-glow { position: absolute; border-radius: 50%; filter: blur(46px); pointer-events: none; transition: transform .35s cubic-bezier(.2,.6,.3,1); will-change: transform; }
        .auth-glow.g1 { width: 400px; height: 400px; left: -90px; top: -70px; background: radial-gradient(circle, rgba(201,168,76,.22), transparent 70%); animation: authDriftA 27s ease-in-out infinite alternate; }
        .auth-glow.g2 { width: 340px; height: 340px; right: -70px; bottom: -50px; background: radial-gradient(circle, rgba(111,160,224,.20), transparent 70%); animation: authDriftB 33s ease-in-out infinite alternate; }
        .auth-glow.g3 { width: 240px; height: 240px; right: 18%; top: 8%; background: radial-gradient(circle, rgba(255,255,255,.10), transparent 70%); animation: authDriftC 23s ease-in-out infinite alternate; }
        @keyframes authDriftA { 0% { transform: translate(0,0); } 100% { transform: translate(60px, 40px); } }
        @keyframes authDriftB { 0% { transform: translate(0,0); } 100% { transform: translate(-50px, -30px); } }
        @keyframes authDriftC { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(-30px, 50px) scale(1.15); } }
        .auth-sheen {
          position: absolute; inset: -20% -60%; pointer-events: none; mix-blend-mode: screen; opacity: .5;
          background: linear-gradient(75deg, transparent 40%, rgba(255,255,255,.06) 48%, rgba(255,255,255,.13) 50%, rgba(255,255,255,.06) 52%, transparent 60%);
          animation: authSheenDrift 44s linear infinite;
        }
        @keyframes authSheenDrift { 0% { transform: translateX(-15%); } 100% { transform: translateX(15%); } }
        .auth-lines { position: absolute; inset: 0; opacity: .32; pointer-events: none; }
        .auth-lines svg { width: 100%; height: 100%; }
        .auth-line { stroke: url(#authLineGrad); stroke-width: 1; fill: none; opacity: 0; animation: authLineFade 9s ease-in-out infinite; }
        @keyframes authLineFade { 0%,100% { opacity: 0; } 40%,60% { opacity: .5; } }
        .auth-particles { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
        .auth-particle { position: absolute; border-radius: 50%; background: ${C.gold}; animation-name: authRiseUp; animation-timing-function: linear; animation-iteration-count: infinite; }
        @keyframes authRiseUp { 0% { transform: translateY(0); opacity: 0; } 10% { opacity: .85; } 90% { opacity: .4; } 100% { transform: translateY(-240px); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) {
          .auth-glow, .auth-sheen, .auth-line, .auth-particle, .auth-panel::before { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
