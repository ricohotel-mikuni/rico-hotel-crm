import { useState, useEffect, useRef } from 'react'
import { BRANDS } from '../branding/brands'

// The two official full logos, rotating 3D left → next → left → back,
// looping forever. Always daiei ⇄ ricoHotel regardless of which brand
// context the caller is mounted under (login happens before a
// property is chosen, so this is a company-wide branding moment, not
// tied to `useBrand()`). Shared by Login.jsx (initial) and
// PinLogin.jsx (returning-device) — both are pre-property-selection
// screens, and CLAUDE.md's brand rule requires the full official logo
// (never the icon-only crop) on any screen that isn't a small
// button/favicon, so this one component is the single source both
// screens reuse rather than each growing its own copy.
//
// Face A always shows daiei, face B always shows ricoHotel — with
// exactly 2 logos, "which logo is on which face" never needs to
// change, only "which face is currently at rest vs rotated away" does.
export default function LogoCarousel() {
  const [front, setFront] = useState('a')
  const reduceMotion = useRef(typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches).current

  useEffect(() => {
    if (reduceMotion) return
    const id = setInterval(() => setFront(f => (f === 'a' ? 'b' : 'a')), 2000)
    return () => clearInterval(id)
  }, [reduceMotion])

  return (
    <div className="login-logo-stage">
      <img
        src={BRANDS.daiei.logo} alt={BRANDS.daiei.name}
        className={`login-logo-face ${front === 'a' ? 'is-entering' : 'is-leaving'}`}
      />
      <img
        src={BRANDS.ricoHotel.logo} alt={BRANDS.ricoHotel.name}
        className={`login-logo-face ${front === 'b' ? 'is-entering' : 'is-leaving'}`}
      />
      <style>{`
        .login-logo-stage {
          width: 100%; max-width: 300px; height: 200px; position: relative;
          perspective: 1200px;
        }
        .login-logo-face {
          position: absolute; inset: 0; margin: auto;
          max-width: 100%; max-height: 100%; object-fit: contain;
          filter: drop-shadow(0 10px 30px rgba(0,0,0,.4));
          transition: transform .8s cubic-bezier(.65,0,.35,1), opacity .5s ease;
          transform: rotateY(0deg); backface-visibility: hidden;
        }
        .login-logo-face.is-leaving { transform: rotateY(-100deg); }
        .login-logo-face.is-entering { animation: logoEnter .8s cubic-bezier(.65,0,.35,1); }
        @keyframes logoEnter { from { transform: rotateY(100deg); } to { transform: rotateY(0deg); } }
        @media (prefers-reduced-motion: reduce) {
          .login-logo-face { transition: none; animation: none !important; }
        }
      `}</style>
    </div>
  )
}
