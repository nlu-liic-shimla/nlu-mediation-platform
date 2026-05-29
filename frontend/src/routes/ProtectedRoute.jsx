import { Navigate } from 'react-router-dom'

// Blocks any user with no JWT token — sends them to login
export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem('nlu_token')

  if (!token) {
    return <Navigate to="/auth/login" replace />
  }

  return children
}