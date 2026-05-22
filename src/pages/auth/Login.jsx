import { useState } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('requesting_party')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    // API connection comes tomorrow — Day 3
    console.log('Login clicked:', email, role)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">

        {/* Header */}
        <h1 className="text-3xl font-bold text-center text-blue-600 mb-2">
          NLU Mediation
        </h1>
        <p className="text-center text-gray-500 mb-6">
          Sign in to your account
        </p>

        {/* Email */}
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 p-2 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        {/* Password */}
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-300 p-2 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        {/* Role Selector */}
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Login As
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full border border-gray-300 p-2 rounded mb-6 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="requesting_party">Requesting Party</option>
          <option value="against_party">Against Party</option>
          <option value="mediator">Mediator</option>
        </select>

        {/* Error Message */}
        {error && (
          <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
        )}

        {/* Submit Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold p-2 rounded transition duration-200"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

      </div>
    </div>
  )
}