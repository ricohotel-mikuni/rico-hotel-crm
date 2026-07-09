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

// ログイン画面とPIN画面の共通の「入れ物」(承認済み提案書Ver.2 ①〜③・
// ⑨)。背景の光の粒子・AIライン・ゆっくり流れる光沢・マウス視差・NEO・
// ガラス調パネル・正式ロゴはすべてここに集約し、画面ごとに異なるのは
// children で渡す入力エリア(パスワード欄 or PINパッド)だけにする。
// cornerAction はPIN画面の「パスワードでログイン」のような右上の
// 小さいリンクボタン用のスロット。
export default function AuthShell({ children, cornerAction, daiExpr = 'smile', daiPose = 'wave', bubbleText }) {
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

      {/* 左パネル — NEOが時間帯挨拶とともに出迎える(PCのみ) */}
      <div ref={daiRef} className="auth-side">
        <Dai expr={daiExpr} pose={daiPose} size={310} />
        <div className="auth-bubble">{bubbleText || daiGreeting()}</div>
      </div>

      {/* 右パネル — 入力エリア(children) */}
      <div className="auth-panel-wrap">
        <div className="auth-panel">
          {cornerAction && <div className="auth-corner">{cornerAction}</div>}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <img src={brand.logo} alt={brand.name} style={{ height: 52, objectFit: 'contain', filter: 'drop-shadow(0 4px 14px rgba(0,0,0,.35))' }} />
          </div>
          {children}
        </div>
      </div>

      <style>{`
        .auth-side { display: none; flex-direction: column; align-items: center; justify-content: center; padding: 40px; position: relative; z-index: 2; }
        @media (min-width: 860px) { .auth-side { display: flex; flex: 1; } }
        .auth-bubble {
          margin-top: 20px; background: rgba(255,255,255,.09); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255,255,255,.16); border-radius: 16px; padding: 15px 22px; color: #fff; font-size: 14px;
          max-width: 280px; text-align: center; line-height: 1.7; white-space: pre-line;
        }
        .auth-panel-wrap { width: 100%; max-width: 440px; display: flex; align-items: center; justify-content: center; padding: 30px 20px; margin: 0 auto; position: relative; z-index: 2; }
        .auth-panel {
          width: 100%; background: rgba(255,255,255,.10); backdrop-filter: blur(28px) saturate(150%); -webkit-backdrop-filter: blur(28px) saturate(150%);
          border: 1px solid rgba(255,255,255,.20); border-radius: 26px; padding: 42px 38px;
          box-shadow: 0 30px 90px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.22);
          position: relative; overflow: hidden;
        }
        .auth-panel::before {
          content: ""; position: absolute; top: 0; left: -60%; width: 40%; height: 100%;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,.10), transparent);
          animation: authPanelSheen 8s ease-in-out infinite;
        }
        @keyframes authPanelSheen { 0% { left: -60%; } 40%,100% { left: 130%; } }
        .auth-corner { position: absolute; top: 16px; right: 16px; z-index: 1; }
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
