import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { PermissionProvider } from './permissions/PermissionContext'
import { CompanyProvider } from './contexts/CompanyContext'
import { BrandProvider } from './branding/BrandContext'
import { BRANDS } from './branding/brands'
import ErrorBoundary from './ui/ErrorBoundary'
import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <PermissionProvider>
              <CompanyProvider>
                <BrandProvider brand={BRANDS.daiei}>
                  <App />
                </BrandProvider>
              </CompanyProvider>
            </PermissionProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
