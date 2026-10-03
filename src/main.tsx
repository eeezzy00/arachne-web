import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ArchiveProvider } from './state/ArchiveContext.tsx'
import { ChatProvider } from './state/ChatContext.tsx'
import { LanguageProvider } from './state/LanguageContext.tsx'
import { WalletProvider } from './state/WalletContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <ArchiveProvider>
        <WalletProvider>
          <ChatProvider>
            <App />
          </ChatProvider>
        </WalletProvider>
      </ArchiveProvider>
    </LanguageProvider>
  </StrictMode>,
)
