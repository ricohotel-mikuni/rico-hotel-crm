import { createContext, useContext, useEffect, useState } from 'react'
import { THEME_TOKENS } from '../lib/designSystem'

const STORAGE_KEY = 'daiei-theme'
const ThemeContext = createContext(null)

// テーマ("light"|"dark")の保持・切替・端末への保存を担当(承認済み
// 提案書「Design System v1.0 仕様変更」— 既定はライト、ダークは
// プロフィールメニューから切り替えられるオプション)。実際の色の
// 適用は<html>のdata-theme属性 + 下記<style>のCSSカスタムプロパティ
// だけで完結するため、DASHトークンを使う既存コンポーネント側は
//一切変更が要らない。保存は端末のlocalStorage単位(アカウントを
// 跨いだ同期は対象外 — 提案書に明記済み)。
function readInitialTheme() {
  if (typeof window === 'undefined') return 'light'
  const saved = window.localStorage.getItem(STORAGE_KEY)
  return saved === 'dark' ? 'dark' : 'light'
}

const themeCss = `
  :root {
${Object.entries(THEME_TOKENS.light).map(([k, v]) => `    ${k}: ${v};`).join('\n')}
  }
  [data-theme="dark"] {
${Object.entries(THEME_TOKENS.dark).map(([k, v]) => `    ${k}: ${v};`).join('\n')}
  }
`

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      <style>{themeCss}</style>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
