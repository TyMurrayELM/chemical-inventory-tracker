import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { GoogleOAuthProvider } from '@react-oauth/google';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId="568572655140-2p6q3l1k8le57vd1n1286d1f34rvc2t5.apps.googleusercontent.com">
      <App />
    </GoogleOAuthProvider>
  </StrictMode>
)