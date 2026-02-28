import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import StarMap from './StarMap.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StarMap />
  </StrictMode>,
)
