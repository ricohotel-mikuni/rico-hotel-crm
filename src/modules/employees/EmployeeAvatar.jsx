import { C } from '../../lib/constants'

// Shared "who is this" display — photo if uploaded, initial otherwise.
// Reused in the directory list, the profile header, and anywhere else
// an employee reference needs a face (approval requester, evaluator,
// interviewer, etc.).
export default function EmployeeAvatar({ photoUrl, name, size = 36 }) {
  const initial = (name || '?').trim().charAt(0) || '?'

  if (photoUrl) {
    return (
      <img
        src={photoUrl} alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid #ECEFF1' }}
      />
    )
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `${C.navy}15`, color: C.navy, fontWeight: 700, fontSize: size * 0.42,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {initial}
    </div>
  )
}
