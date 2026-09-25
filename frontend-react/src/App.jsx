import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import LandingPage from './pages/LandingPage'
import FacultyDashboard from './pages/faculty/FacultyDashboard'
import StudentPortal from './pages/student/StudentPortal'
import ProtectedRoute from './components/auth/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/faculty" element={
              <ProtectedRoute role="faculty">
                <FacultyDashboard />
              </ProtectedRoute>
            } />
            <Route path="/student" element={
              <ProtectedRoute role="student">
                <StudentPortal />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
