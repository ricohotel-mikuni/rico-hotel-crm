import { useMemo } from 'react'
import { C } from '../lib/constants'

// AIアシスタント「DAI」— 会社専属AIの本体キャラクター。
// 2026-07-10改訂: ちびキャラ・フラット2Dスタイルへ全面刷新
// (レビュー用プレビューで承認済み)。
//   ①左右対称: 肩・耳・脚は中心から等距離、ジェスチャーは必ず
//     左右ペアで定義し、同じdurationで逆符号の角度にする
//     (以前は右手だけにアニメーションクラスが付いており、左手が
//     ほとんど動かない不具合があった — 個別に値を決め打ちせず、
//     常にL/Rを同時に増やす構造にすることで再発を防ぐ)。
//   ②プレミアム感: 単色フラットではなく、頭・胴体・手足に淡い
//     グラデーション、目に放射グラデーション+発光、胸ロゴ周りに
//     ゴールドのリムを使う。
// 表情(expr)と腕のポーズ(pose)を差し替えるだけで、ログイン画面・
// AI Today・チャットの全箇所から同じキャラクターとして呼び出せる。
const EXPR = {
  normal:  { eye: 'round',  mouth: 'flat'  },
  smile:   { eye: 'round',  mouth: 'smile' },
  think:   { eye: 'side',   mouth: 'small', pose: 'think' },
  talk:    { eye: 'round',  mouth: 'talk',  pose: 'talk' },
  wink:    { eye: 'wink',   mouth: 'smile' },
  worried: { eye: 'worry',  mouth: 'wavy',  pose: 'worried' },
  clap:    { eye: 'happy',  mouth: 'smile', pose: 'clap' },
  joy:     { eye: 'happy',  mouth: 'open',  pose: 'joy'  },
}

// 肩の付け根は中心100から左右等距離(58/142) — ①左右対称。各ポーズは
// 左右をrRot=-lRotで完全に鏡写しにする。手を振る/話す/拍手/喜ぶは
// 「gesture」を持たせ、両腕に同じ長さ・同じタイミングの鏡写し
// アニメーションを適用する。
const SHOULDER_L = { x: 58, y: 150 }
const SHOULDER_R = { x: 142, y: 150 }
const POSE = {
  idle:    { lRot: 12,   rRot: -12 },
  wave:    { lRot: 12,   rRot: -12,  gesture: 'wave' },
  talk:    { lRot: 12,   rRot: -12,  gesture: 'talk' },
  think:   { lRot: -122, rRot: 122 },
  worried: { lRot: 30,   rRot: -30 },
  clap:    { lRot: -16,  rRot: 16,   gesture: 'clap' },
  joy:     { lRot: -150, rRot: 150,  gesture: 'joy' },
}

function roundEye(cx, cy, uid, big) {
  const r = big ? 17 : 14
  return (
    <g key={cx}>
      <circle cx={cx} cy={cy} r={r} fill={`url(#${uid}eye)`} />
      <circle cx={cx + 3.5} cy={cy - 3.5} r={r * 0.32} fill="#fff" opacity=".95" />
    </g>
  )
}
function closedEye(cx, cy) {
  return <path key={cx} d={`M ${cx - 10} ${cy} Q ${cx} ${cy + 8} ${cx + 10} ${cy}`} stroke={C.daiEye} strokeWidth="4" fill="none" strokeLinecap="round" />
}
function happyEye(cx, cy) {
  return <path key={cx} d={`M ${cx - 11} ${cy + 3} Q ${cx} ${cy - 11} ${cx + 11} ${cy + 3}`} stroke={C.daiEye} strokeWidth="4" fill="none" strokeLinecap="round" />
}

function FaceParts({ exprKey, uid }) {
  const e = EXPR[exprKey] || EXPR.normal
  const cx1 = 82, cx2 = 118, cy = 105
  let eyes, mouth, mouthClass = ''

  if (e.eye === 'happy') eyes = <>{happyEye(cx1, cy)}{happyEye(cx2, cy)}</>
  else if (e.eye === 'wink') eyes = <>{closedEye(cx1, cy)}{roundEye(cx2, cy, uid)}</>
  else if (e.eye === 'side') eyes = <>{roundEye(cx1, cy, uid)}{closedEye(cx2, cy)}</>
  else if (e.eye === 'worry') eyes = (
    <>
      <g transform={`rotate(10 ${cx1} ${cy})`}>{roundEye(cx1, cy, uid)}</g>
      <g transform={`rotate(-10 ${cx2} ${cy})`}>{roundEye(cx2, cy, uid)}</g>
    </>
  )
  else eyes = <>{roundEye(cx1, cy, uid)}{roundEye(cx2, cy, uid)}</>

  // 笑顔の曲線は浅め(柔らかく) — 幼児向けにならない、上品な弧に調整。
  if (e.mouth === 'flat') mouth = <line x1="90" y1="130" x2="110" y2="130" stroke={C.daiEye} strokeWidth="4" strokeLinecap="round" />
  else if (e.mouth === 'smile') mouth = <path d="M 85 124 Q 100 136 115 124" stroke={C.daiEye} strokeWidth="4" fill="none" strokeLinecap="round" />
  else if (e.mouth === 'small') mouth = <line x1="93" y1="130" x2="103" y2="130" stroke={C.daiEye} strokeWidth="4" strokeLinecap="round" />
  else if (e.mouth === 'talk') { mouth = <ellipse cx="100" cy="130" rx="9" ry="7" fill={C.daiEye} />; mouthClass = 'dai-p-mouth-talk' }
  else if (e.mouth === 'wavy') mouth = <path d="M 88 131 Q 94 126 100 131 Q 106 136 112 131" stroke={C.daiEye} strokeWidth="4" fill="none" strokeLinecap="round" />
  else if (e.mouth === 'open') mouth = <path d="M 83 120 Q 100 146 117 120 Q 100 130 83 120 Z" fill={C.daiEye} />

  return (
    <>
      <g className="dai-p-eyes">{eyes}</g>
      <g className={`dai-p-mouth ${mouthClass}`}>{mouth}</g>
    </>
  )
}

let daiUidCounter = 0

export default function Dai({ expr = 'normal', pose, size = 120, waving = false, className = '' }) {
  // 1ページに複数体表示しても<defs>のidが衝突しないよう、
  // インスタンスごとに一意な接頭辞を割り当てる。
  const uid = useMemo(() => `dai${daiUidCounter++}-`, [])
  const poseKey = EXPR[expr]?.pose || pose || 'idle'
  const p = POSE[poseKey] || POSE.idle
  const gesture = waving ? 'wave' : p.gesture
  const gL = gesture ? `dai-g-${gesture}-l` : ''
  const gR = gesture ? `dai-g-${gesture}-r` : ''
  const height = size
  const width = Math.round(size * (200 / 264))

  return (
    <div className={`dai-mount ${className}`} style={{ width, height, display: 'inline-block' }}>
      <svg viewBox="0 0 200 264" width="100%" height="100%" style={{ overflow: 'visible', display: 'block' }}>
        <defs>
          <linearGradient id={`${uid}head`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#f1efe8" />
          </linearGradient>
          <linearGradient id={`${uid}body`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#efede4" />
          </linearGradient>
          <linearGradient id={`${uid}limb`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.navyLight} /><stop offset="1" stopColor={C.navyDark} />
          </linearGradient>
          <radialGradient id={`${uid}eye`} cx="35%" cy="30%" r="75%">
            <stop offset="0" stopColor="#eafcff" /><stop offset=".55" stopColor={C.daiEye} /><stop offset="1" stopColor="#1f9fc9" />
          </radialGradient>
          <radialGradient id={`${uid}ring`} cx="50%" cy="30%" r="75%">
            <stop offset="0" stopColor={C.gold} /><stop offset="1" stopColor="#a5822e" />
          </radialGradient>
        </defs>

        <g className="dai-p-figure">
          <ellipse className="dai-p-shadow" cx="100" cy="255" rx="44" ry="8" fill="rgba(16,26,44,.16)" />

          {/* legs — symmetric, rounded feet, gradient for volume */}
          <rect x="70" y="212" width="16" height="30" rx="8" fill={`url(#${uid}limb)`} />
          <rect x="114" y="212" width="16" height="30" rx="8" fill={`url(#${uid}limb)`} />
          <ellipse cx="78" cy="244" rx="17" ry="11" fill={`url(#${uid}limb)`} />
          <ellipse cx="122" cy="244" rx="17" ry="11" fill={`url(#${uid}limb)`} />

          {/* arms — same shoulder height, same length, mitten hands.
              外側のgは肩位置+静止角度(SVG属性=固定)、内側のgはジェス
              チャー用CSS transform(keyframesが左右対称に回転を足す)。 */}
          <g transform={`translate(${SHOULDER_L.x},${SHOULDER_L.y}) rotate(${p.lRot})`}>
            <g className={`dai-p-arm-l ${gL}`}>
              <rect x="-11" y="0" width="22" height="46" rx="11" fill={`url(#${uid}limb)`} />
            </g>
          </g>
          <g transform={`translate(${SHOULDER_R.x},${SHOULDER_R.y}) rotate(${p.rRot})`}>
            <g className={`dai-p-arm-r ${gR}`}>
              <rect x="-11" y="0" width="22" height="46" rx="11" fill={`url(#${uid}limb)`} />
            </g>
          </g>

          {/* body */}
          <g className="dai-p-body">
            <rect x="52" y="146" width="96" height="84" rx="42" fill={`url(#${uid}body)`} stroke="rgba(201,168,76,.3)" />
            <circle cx="100" cy="186" r="24" fill={C.navy} stroke={`url(#${uid}ring)`} strokeWidth="3.5" />
            <image href="/brand-daiei-icon.png" x="81" y="167" width="38" height="38" />
          </g>

          <rect x="86" y="136" width="28" height="16" fill={`url(#${uid}body)`} />

          {/* head */}
          <g className="dai-p-head">
            <g className="dai-p-ring">
              <line x1="100" y1="6" x2="100" y2="22" stroke={`url(#${uid}ring)`} strokeWidth="3" />
              <ellipse cx="100" cy="4" rx="22" ry="7" fill="none" stroke={`url(#${uid}ring)`} strokeWidth="3" />
              <circle cx="100" cy="4" r="3" fill={`url(#${uid}ring)`} />
            </g>
            {/* ears — symmetric rounded bumps, tucked mostly behind the head
                shell so only a soft rounded edge shows (drawn first, head
                shell painted on top clips the inner half) */}
            <ellipse cx="28" cy="98" rx="16" ry="22" fill={`url(#${uid}limb)`} />
            <ellipse cx="172" cy="98" rx="16" ry="22" fill={`url(#${uid}limb)`} />
            <rect x="30" y="18" width="140" height="136" rx="64" fill={`url(#${uid}head)`} stroke="rgba(201,168,76,.3)" />
            <rect x="54" y="70" width="92" height="68" rx="34" fill="#101a2c" />
            <FaceParts exprKey={expr} uid={uid} />
          </g>
        </g>
      </svg>

      <style>{`
        .dai-p-ring   { transform-box: fill-box; transform-origin: 50% 50%; animation: daiRing 3.2s ease-in-out infinite; }
        .dai-p-head   { transform-box: fill-box; transform-origin: 50% 100%; animation: daiTilt 5.4s ease-in-out infinite; }
        .dai-p-eyes   { transform-box: fill-box; transform-origin: 50% 50%; animation: daiBlink 4.6s infinite; filter: drop-shadow(0 0 3px rgba(79,216,255,.55)); }
        .dai-p-body   { transform-box: fill-box; transform-origin: 50% 100%; animation: daiBreathe 3.4s ease-in-out infinite; }
        .dai-p-figure { animation: daiFloat 4.4s ease-in-out infinite; }
        .dai-p-arm-l, .dai-p-arm-r { transform-box: fill-box; transform-origin: 50% 0%; }
        .dai-p-mouth-talk { transform-box: fill-box; transform-origin: 50% 50%; animation: daiTalk .38s ease-in-out infinite; }
        .dai-p-shadow { transform-box: fill-box; transform-origin: 50% 50%; animation: daiShadow 4.4s ease-in-out infinite; filter: blur(3px); }
        @keyframes daiFloat   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4%); } }
        @keyframes daiTilt    { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(-3deg); } }
        @keyframes daiRing    { 0%,100% { transform: scaleX(1) rotate(0deg); } 50% { transform: scaleX(.5) rotate(3deg); } }
        @keyframes daiBlink   { 0%,90%,100% { transform: scaleY(1); } 94% { transform: scaleY(.1); } }
        @keyframes daiBreathe { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(1.02); } }
        @keyframes daiTalk    { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(1.8); } }
        @keyframes daiShadow  { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(.88); opacity: .65; } }

        /* ジェスチャーは必ず左右ペアで定義し、同じdurationで逆符号の
           角度にする(2026-07-10、右手だけ動く不具合の修正 — 個別に
           値を決め打ちせず、常にL/Rを同時に増やす)。肩の静止角度
           (SVG transform属性)の上に相対回転を足すだけなので、
           0degが「静止姿勢のまま」。 */
        .dai-g-wave-l { animation: daiWaveL 2.6s ease-in-out infinite; }
        .dai-g-wave-r { animation: daiWaveR 2.6s ease-in-out infinite; }
        @keyframes daiWaveR { 0%,55%,100% { transform: rotate(0deg); } 65% { transform: rotate(-46deg); } 75% { transform: rotate(-4deg); } 85% { transform: rotate(-42deg); } }
        @keyframes daiWaveL { 0%,55%,100% { transform: rotate(0deg); } 65% { transform: rotate(46deg); }  75% { transform: rotate(4deg); }  85% { transform: rotate(42deg); } }

        .dai-g-talk-l { animation: daiTalkL 1.6s ease-in-out infinite; }
        .dai-g-talk-r { animation: daiTalkR 1.6s ease-in-out infinite; }
        @keyframes daiTalkR { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(-11deg); } }
        @keyframes daiTalkL { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(11deg); } }

        .dai-g-clap-l { animation: daiClapL 1.7s ease-in-out infinite; }
        .dai-g-clap-r { animation: daiClapR 1.7s ease-in-out infinite; }
        @keyframes daiClapR { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(-64deg); } 35% { transform: rotate(-54deg); } 45% { transform: rotate(-64deg); } 55% { transform: rotate(-54deg); } 75% { transform: rotate(0deg); } }
        @keyframes daiClapL { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(64deg); }  35% { transform: rotate(54deg); }  45% { transform: rotate(64deg); }  55% { transform: rotate(54deg); }  75% { transform: rotate(0deg); } }

        .dai-g-joy-l  { animation: daiJoyL 2.2s ease-in-out infinite; }
        .dai-g-joy-r  { animation: daiJoyR 2.2s ease-in-out infinite; }
        @keyframes daiJoyR { 0%,100% { transform: rotate(0deg) translateY(0); } 50% { transform: rotate(-9deg) translateY(-3px); } }
        @keyframes daiJoyL { 0%,100% { transform: rotate(0deg) translateY(0); } 50% { transform: rotate(9deg) translateY(-3px); } }

        @media (prefers-reduced-motion: reduce) {
          .dai-p-ring, .dai-p-head, .dai-p-eyes, .dai-p-body, .dai-p-figure, .dai-p-mouth-talk, .dai-p-shadow,
          .dai-g-wave-l, .dai-g-wave-r, .dai-g-talk-l, .dai-g-talk-r, .dai-g-clap-l, .dai-g-clap-r, .dai-g-joy-l, .dai-g-joy-r
            { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
