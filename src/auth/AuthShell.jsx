import { useEffect, useMemo, useRef } from 'react'
import { useBrand } from '../branding/BrandContext'
import { C } from '../lib/constants'
import Dai from '../ai/Dai'
import { daiGreeting } from '../ai/daiGreeting'

// 粒ごとに速度・大きさ・不透明度をランダムにする(承認済み提案書Ver.6
// ⑤)。AuthShellは画面遷移のたびに新規マウントされるため、SSR一致等の
// 制約なくMath.random()をそのまま使ってよい — useMemoでマウント中だけ
// 値を固定し、再レンダーのたびに粒が飛び直すことは防ぐ。
function makeParticles(n) {
  return Array.from({ length: n }).map(() => ({
    left: `${Math.random() * 100}%`,
    bottom: `${Math.random() * 46}px`,
    size: 1 + Math.random() * 3.2,
    opacity: (0.5 + Math.random() * 0.5).toFixed(2),
    duration: 9 + Math.random() * 16,
    delay: Math.random() * 12,
  }))
}

// ログイン画面とPIN画面の共通の「入れ物」(承認済み提案書 Ver.2〜Ver.4)。
// 背景の光の粒子・AIライン・ゆっくり流れる光沢・マウス視差・NEO・正式
// ロゴはすべてここに集約する。PC(≥860px)とスマホでレイアウトが大きく
// 異なるため、NEOは「大きい(PC専用)」「小さい(スマホ専用)」の2つを
// 用意し、CSSのメディアクエリで片方だけ表示する(1つのDaiインスタンスを
// レイアウトごと動かすより、責務が単純で見通しがよいため)。
//
// mode/onSelectPassword/onSelectPin — 入力エリアの下(PC・スマホ共通)に
// 出す「パスワードでログイン/PINコードでログイン」切替ボタンの状態と
// 挙動。onSelectPinを渡さない画面は無い想定(常に両方表示、Ver.4最終
// 指示⑥)。PCの切替ボタンは以前は右上に固定表示していたが、Ver.5最終
// 指示①によりフォーム内(送信ボタンの下)へ統一した。
//
// desktopBubbleText — PC左側の大きいNEOだけに出す吹き出し文言の上書き
// (Ver.5最終指示③、自己紹介文はPC限定)。省略時はbubbleTextと同じ。
export default function AuthShell({
  children, daiExpr = 'smile', daiPose = 'wave', bubbleText, desktopBubbleText,
  mode, onSelectPassword, onSelectPin,
}) {
  const brand = useBrand()
  const PARTICLES = useMemo(() => makeParticles(18), [])
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
  const deskBubble = desktopBubbleText || bubble

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
    }}>
      <div ref={glow1Ref} className="auth-glow g1" />
      <div ref={glow2Ref} className="auth-glow g2" />
      <div ref={glow3Ref} className="auth-glow g3" />
      <div className="auth-aurora"><span className="a1" /><span className="a2" /></div>
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
            left: p.left, bottom: p.bottom, width: p.size, height: p.size, opacity: p.opacity,
            animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s`,
          }} />
        ))}
      </div>

      {/* 左パネル — NEOが時間帯挨拶とともに出迎える(PCのみ、大きめ) */}
      <div ref={daiRef} className="auth-side">
        <Dai expr={daiExpr} pose={daiPose} size={480} />
        <div className="auth-bubble">{deskBubble}</div>
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

          {/* 切替ボタン(入力エリアの下、PC・スマホ共通、常時2つ表示) */}
          <div className="auth-toggle-row auth-toggle-inline">{toggle}</div>
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
        @media (min-width: 860px) { .auth-panel-wrap { max-width: 430px; padding: 46px 40px; } }
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
        .auth-toggle-inline { margin-top: 18px; }
        @media (min-width: 860px) { .auth-toggle-inline { margin-top: 22px; } }

        .auth-stage {
          background: linear-gradient(150deg, ${C.navyDark} 0%, #16233f 30%, ${C.navy} 60%, ${C.navyLight} 130%);
          background-size: 200% 200%; animation: authBgShift 34s ease-in-out infinite alternate;
        }
        @keyframes authBgShift { 0% { background-position: 0% 30%; } 100% { background-position: 100% 70%; } }

        /* オーロラ — 極薄いシアン〜青の帯を大きくゆっくり流す(承認済み
           提案書Ver.6①)。screenブレンドで下の紺グラデーションを暗くせず
           光として重ねる。 */
        .auth-aurora { position: absolute; inset: -10%; pointer-events: none; mix-blend-mode: screen; filter: blur(2px); z-index: 1; }
        .auth-aurora span { position: absolute; border-radius: 50%; filter: blur(60px); }
        .auth-aurora .a1 {
          width: 70%; height: 60%; left: -10%; top: -15%;
          background: radial-gradient(ellipse at center, rgba(120,220,255,.09), transparent 70%);
          animation: authAuroraA 26s ease-in-out infinite alternate;
        }
        .auth-aurora .a2 {
          width: 60%; height: 55%; right: -12%; bottom: -10%;
          background: radial-gradient(ellipse at center, rgba(160,200,255,.07), transparent 70%);
          animation: authAuroraB 32s ease-in-out infinite alternate;
        }
        @keyframes authAuroraA { 0% { transform: translate(0,0) rotate(0deg); } 100% { transform: translate(6%,4%) rotate(6deg); } }
        @keyframes authAuroraB { 0% { transform: translate(0,0) rotate(0deg); } 100% { transform: translate(-5%,-6%) rotate(-5deg); } }

        /* 光のオーブ(承認済み提案書Ver.6②) — 大きく・低速に・呼吸する
           ような拡大縮小を追加。 */
        .auth-glow { position: absolute; border-radius: 50%; filter: blur(54px); pointer-events: none; transition: transform .35s cubic-bezier(.2,.6,.3,1); will-change: transform; }
        .auth-glow.g1 { width: 560px; height: 560px; left: -120px; top: -100px; background: radial-gradient(circle, rgba(201,168,76,.20), transparent 70%); animation: authDriftA 34s ease-in-out infinite alternate; }
        .auth-glow.g2 { width: 480px; height: 480px; right: -100px; bottom: -80px; background: radial-gradient(circle, rgba(111,160,224,.18), transparent 70%); animation: authDriftB 40s ease-in-out infinite alternate; }
        .auth-glow.g3 { width: 320px; height: 320px; right: 18%; top: 8%; background: radial-gradient(circle, rgba(255,255,255,.09), transparent 70%); animation: authDriftC 30s ease-in-out infinite alternate; }
        @keyframes authDriftA { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(7%,5%) scale(1.14); } }
        @keyframes authDriftB { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(-6%,-4%) scale(1.1); } }
        @keyframes authDriftC { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(-30px, 50px) scale(1.15); } }
        .auth-sheen {
          position: absolute; inset: -20% -60%; pointer-events: none; mix-blend-mode: screen; opacity: .5;
          background: linear-gradient(75deg, transparent 40%, rgba(255,255,255,.06) 48%, rgba(255,255,255,.13) 50%, rgba(255,255,255,.06) 52%, transparent 60%);
          animation: authSheenDrift 44s linear infinite;
        }
        @keyframes authSheenDrift { 0% { transform: translateX(-15%); } 100% { transform: translateX(15%); } }

        /* AIライン(承認済み提案書Ver.6④) — 全体をごくゆっくり漂わせつつ、
           線の上に淡い光を流す(stroke-dasharray/dashoffsetの移動)。 */
        .auth-lines { position: absolute; inset: 0; opacity: .32; pointer-events: none; animation: authLinesDrift 46s ease-in-out infinite alternate; }
        .auth-lines svg { width: 100%; height: 100%; }
        .auth-line {
          stroke: url(#authLineGrad); stroke-width: 1; fill: none; opacity: 0;
          animation: authLineFade 9s ease-in-out infinite, authLineTravel 5s linear infinite;
          stroke-dasharray: 40 400;
        }
        @keyframes authLinesDrift { 0% { transform: translate(0,0); } 100% { transform: translate(1.5%,-1%); } }
        @keyframes authLineFade { 0%,100% { opacity: 0; } 40%,60% { opacity: .5; } }
        @keyframes authLineTravel { 0% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: -440; } }

        .auth-particles { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
        .auth-particle { position: absolute; border-radius: 50%; background: ${C.gold}; animation-name: authRiseUp; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
        @keyframes authRiseUp { 0% { transform: translateY(0) translateX(0); opacity: 0; } 10% { opacity: .85; } 50% { transform: translateY(-140px) translateX(6px); } 90% { opacity: .35; } 100% { transform: translateY(-240px) translateX(-4px); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) {
          .auth-stage, .auth-aurora .a1, .auth-aurora .a2, .auth-glow, .auth-sheen, .auth-lines, .auth-line, .auth-particle, .auth-panel::before { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
