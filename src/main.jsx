import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { sentryBaslat, Sentry } from './utils/sentry'

// Sentry — DSN yoksa NO-OP. Production'da PII redact ile aktif.
sentryBaslat()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={({ resetError }) => (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #4c1d95, #312e81)',
        color: 'white',
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        padding: '20px',
      }}>
        <div style={{ maxWidth: 480, textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>⚠️</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Bir şey ters gitti</h1>
          <p style={{ color: '#c4b5fd', fontSize: 14, marginBottom: 24 }}>
            Sayfayı yenilemek genelde çözer. Devam ederse bize bildir.
          </p>
          <button
            onClick={resetError}
            style={{
              background: '#fbbf24',
              color: '#3b1772',
              fontWeight: 700,
              padding: '12px 24px',
              borderRadius: 12,
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
            }}>
            Tekrar dene
          </button>
        </div>
      </div>
    )}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
)
