import { Component } from 'react'
import { C } from '../lib/constants'

// Last-resort net so an unexpected render-time crash shows a retry
// screen instead of a silent blank page (which reads to the user as
// "the app doesn't work" with zero clue why).
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled render error:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16, padding: '20px', textAlign: 'center',
        background: '#F5F7FA',
      }}>
        <img src="/logo.png" alt="" style={{ width: 48, height: 48, objectFit: 'contain' }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>
          予期しないエラーが発生しました
        </div>
        <div style={{ fontSize: 13, color: '#90A4AE', maxWidth: 320, lineHeight: 1.7 }}>
          お手数ですが、再読み込みしてもう一度お試しください。
        </div>
        <button
          onClick={() => { this.setState({ hasError: false }); window.location.href = '/' }}
          style={{
            padding: '11px 22px', borderRadius: 8, border: 'none',
            background: C.navy, color: '#fff', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          ホームへ戻って再読み込み
        </button>
      </div>
    )
  }
}
