import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 text-sm text-gray-400">
        Loading...
      </div>
    )
  }

  return isAuthenticated ? children : <Navigate to="/" replace />
}

export default ProtectedRoute
