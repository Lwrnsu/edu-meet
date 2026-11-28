import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles/base.css'
import './styles/switcher.css'
import './styles/notepad.css'

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
