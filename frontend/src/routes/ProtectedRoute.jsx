import { Navigate } from 'react-router-dom'
import { getAuthToken } from '../utils/auth'

// Blocks any user with no JWT token — sends them to login
export default function ProtectedRoute({ children }) {
  const token = getAuthToken()

  if (!token) {
    return <Navigate to="/auth/login" replace />
  }

  return children
}