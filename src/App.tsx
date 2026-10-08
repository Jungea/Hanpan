import { Navigate, Route, Routes } from 'react-router-dom'
import GamePage from './pages/GamePage'
import Home from './pages/Home'

export default function App() {
  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-6">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/games/:id" element={<GamePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
