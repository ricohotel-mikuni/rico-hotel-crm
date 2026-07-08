import { C } from '../lib/constants'

// AIアシスタント「DAI」— 会社専属AIの本体キャラクター。今回は「簡易版」
// (3Dモデルではなく軽量なSVG)としての実装(AI開発憲章 第17条: DAIの
// 名称・自認原則、第10章のロードマップで3D/イラスト差し替えはPhase 2
// 以降と位置づけ)。expr(表情)とpose(腕の動き)を差し替えるだけで
// ログイン画面・AI Today・チャットの全箇所から同じキャラクターとして
// 呼び出せる。
const EXPR = {
  normal:  { eye: 'hex',   mouth: 'flat' },
  smile:   { eye: 'hex',   mouth: 'smile' },
  think:   { eye: 'think', mouth: 'small', pose: 'think' },
  talk:    { eye: 'hex',   mouth: 'talk' },
  wink:    { eye: 'wink',  mouth: 'smile' },
  worried: { eye: 'worry', mouth: 'wavy' },
  clap:    { eye: 'hex',   mouth: 'smile', pose: 'clap' },
  joy:     { eye: 'joy',   mouth: 'open',  pose: 'joy' },
}
const POSE = {
  idle:  { l: 'rotate(10 50 132)',   r: 'rotate(-10 150 132)' },
  wave:  { l: 'rotate(10 50 132)',   r: 'rotate(-10 150 132)', rGesture: true },
  think: { l: 'rotate(10 50 132)',   r: 'rotate(-135 150 132)' },
  clap:  { l: 'rotate(-55 50 132)',  r: 'rotate(55 150 132)' },
  joy:   { l: 'rotate(-155 50 132)', r: 'rotate(155 150 132)' },
}

function hexOne(cx, cy, big) {
  const s = big ? 1.15 : 1
  const pts = [[0,-11],[9,-6],[9,6],[0,11],[-9,6],[-9,-6]]
    .map(p => `${cx + p[0]*s},${cy + p[1]*s}`).join(' ')
  return <polygon points={pts} fill={C.daiEye} stroke="#bdf3ff" strokeWidth="1" />
}
function closedEye(cx, cy) {
  return <rect x={cx - 9} y={cy - 2} width="18" height="4" rx="2" fill={C.daiEye} />
}

function FaceParts({ exprKey }) {
  const e = EXPR[exprKey] || EXPR.normal
  const cx1 = 86, cx2 = 114, cy = 74
  let eyes, mouth, mouthClass = ''

  if (e.eye === 'joy') eyes = <>{hexOne(cx1, cy, true)}{hexOne(cx2, cy, true)}</>
  else if (e.eye === 'wink') eyes = <>{closedEye(cx1, cy)}{hexOne(cx2, cy)}</>
  else if (e.eye === 'think') eyes = <>{hexOne(cx1, cy)}{closedEye(cx2, cy)}</>
  else if (e.eye === 'worry') eyes = (
    <>
      <g transform={`rotate(12 ${cx1} ${cy})`}>{hexOne(cx1, cy)}</g>
      <g transform={`rotate(-12 ${cx2} ${cy})`}>{hexOne(cx2, cy)}</g>
    </>
  )
  else eyes = <>{hexOne(cx1, cy)}{hexOne(cx2, cy)}</>

  if (e.mouth === 'flat') mouth = <line x1="92" y1="98" x2="108" y2="98" stroke={C.daiEye} strokeWidth="3" strokeLinecap="round" />
  else if (e.mouth === 'smile') mouth = <path d="M 87 94 Q 100 108 113 94" stroke={C.daiEye} strokeWidth="3" fill="none" strokeLinecap="round" />
  else if (e.mouth === 'small') mouth = <line x1="94" y1="98" x2="104" y2="98" stroke={C.daiEye} strokeWidth="3" strokeLinecap="round" />
  else if (e.mouth === 'talk') { mouth = <ellipse cx="100" cy="98" rx="7" ry="5" fill={C.daiEye} />; mouthClass = 'dai-p-mouth-talk' }
  else if (e.mouth === 'wavy') mouth = <path d="M 90 99 Q 95 95 100 99 Q 105 103 110 99" stroke={C.daiEye} strokeWidth="3" fill="none" strokeLinecap="round" />
  else if (e.mouth === 'open') mouth = <path d="M 84 92 Q 100 114 116 92 Q 100 100 84 92 Z" fill={C.daiEye} />

  return (
    <>
      <g className="dai-p-eyes">{eyes}</g>
      <g className={`dai-p-mouth ${mouthClass}`}>{mouth}</g>
    </>
  )
}

export default function Dai({ expr = 'normal', pose, size = 120, waving = false, className = '' }) {
  const poseKey = EXPR[expr]?.pose || pose || 'idle'
  const p = POSE[poseKey] || POSE.idle
  const height = size
  const width = Math.round(size * (200 / 320))

  return (
    <div className={`dai-mount ${className}`} style={{ width, height, display: 'inline-block' }}>
      <svg viewBox="0 0 200 320" width="100%" height="100%" style={{ overflow: 'visible', display: 'block' }}>
        <g className="dai-p-figure">
          <ellipse cx="100" cy="308" rx="46" ry="8" fill="rgba(0,0,0,.22)" />
          <rect x="72" y="230" width="18" height="66" rx="9" fill="#cdd7ea" />
          <rect x="110" y="230" width="18" height="66" rx="9" fill="#cdd7ea" />
          <circle cx="81" cy="266" r="7" fill={C.gold} />
          <circle cx="119" cy="266" r="7" fill={C.gold} />
          <ellipse cx="81" cy="298" rx="14" ry="7" fill={C.navyDark} />
          <ellipse cx="119" cy="298" rx="14" ry="7" fill={C.navyDark} />

          <g className="dai-p-arm-l" transform={p.l}>
            <rect x="40" y="122" width="20" height="60" rx="10" fill="#cdd7ea" />
            <circle cx="50" cy="122" r="11" fill={C.gold} />
            <circle cx="50" cy="176" r="9" fill={C.navyDark} />
          </g>
          <g className={`dai-p-arm-r ${(waving || p.rGesture) ? 'dai-p-wave' : ''}`} transform={p.r}>
            <rect x="140" y="122" width="20" height="60" rx="10" fill="#cdd7ea" />
            <circle cx="150" cy="122" r="11" fill={C.gold} />
            <circle cx="150" cy="176" r="9" fill={C.navyDark} />
          </g>

          <g className="dai-p-torso">
            <rect x="55" y="118" width="90" height="112" rx="30" fill="#eef2fa" />
            <rect x="96" y="122" width="8" height="100" rx="4" fill={C.navyDark} opacity=".12" />
            <circle cx="100" cy="152" r="18" fill="#fff" stroke={C.gold} strokeWidth="2" />
            <image href="/brand-daiei-icon.png" x="86" y="138" width="28" height="28" />
          </g>

          <rect x="90" y="106" width="20" height="14" fill="#cdd7ea" />

          <g className="dai-p-head">
            <g className="dai-p-ring">
              <line x1="100" y1="18" x2="100" y2="36" stroke={C.gold} strokeWidth="4" />
              <ellipse cx="100" cy="14" rx="32" ry="10" fill="none" stroke={C.gold} strokeWidth="4" />
            </g>
            <circle cx="52" cy="72" r="11" fill={C.navyDark} /><circle cx="52" cy="72" r="4" fill={C.gold} />
            <circle cx="148" cy="72" r="11" fill={C.navyDark} /><circle cx="148" cy="72" r="4" fill={C.gold} />
            <rect x="58" y="34" width="84" height="78" rx="36" fill="#eef2fa" />
            <rect x="72" y="54" width="56" height="42" rx="18" fill="#0c1626" />
            <FaceParts exprKey={expr} />
          </g>
        </g>
      </svg>

      <style>{`
        .dai-p-ring   { transform-box: fill-box; transform-origin: 50% 50%; animation: daiRing 3.2s ease-in-out infinite; }
        .dai-p-head   { transform-box: fill-box; transform-origin: 50% 100%; animation: daiTilt 5.4s ease-in-out infinite; }
        .dai-p-eyes   { transform-box: fill-box; transform-origin: 50% 50%; animation: daiBlink 4.6s infinite; }
        .dai-p-torso  { transform-box: fill-box; transform-origin: 50% 100%; animation: daiBreathe 3.4s ease-in-out infinite; }
        .dai-p-figure { animation: daiFloat 4.4s ease-in-out infinite; }
        .dai-p-arm-l, .dai-p-arm-r { transform-box: fill-box; transform-origin: 50% 0%; }
        .dai-p-wave   { animation: daiWave 2.6s ease-in-out infinite; }
        .dai-p-mouth-talk { transform-box: fill-box; transform-origin: 50% 50%; animation: daiTalk .38s ease-in-out infinite; }
        @keyframes daiFloat   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4%); } }
        @keyframes daiTilt    { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(-2.5deg); } }
        @keyframes daiRing    { 0%,100% { transform: scaleX(1) rotate(0deg); } 50% { transform: scaleX(.42) rotate(2deg); } }
        @keyframes daiBlink   { 0%,90%,100% { transform: scaleY(1); } 94% { transform: scaleY(.12); } }
        @keyframes daiBreathe { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(1.015); } }
        @keyframes daiWave    { 0%,55%,100% { transform: rotate(6deg); } 65% { transform: rotate(-42deg); } 75% { transform: rotate(-6deg); } 85% { transform: rotate(-38deg); } }
        @keyframes daiTalk    { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(2.1); } }
        @media (prefers-reduced-motion: reduce) {
          .dai-p-ring, .dai-p-head, .dai-p-eyes, .dai-p-torso, .dai-p-figure, .dai-p-wave, .dai-p-mouth-talk { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
