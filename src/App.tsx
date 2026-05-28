import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AskPage from './pages/AskPage'
import ScreenPage from './pages/ScreenPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AskPage />} />
        <Route path="/screen" element={<ScreenPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
