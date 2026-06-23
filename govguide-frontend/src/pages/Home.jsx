import { useEffect, useState } from 'react'
import { checkBackendHealth } from '../lib/api'

function Home() {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    checkBackendHealth()
      .then(() => setStatus('online'))
      .catch(() => setStatus('offline'))
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center">
      <h1 className="text-4xl font-semibold text-gray-900">GovGuide SA</h1>
      <p className="max-w-md text-gray-600">
        AI-powered assistant for navigating South African government services.
      </p>
      <span
        className={
          'rounded-full px-3 py-1 text-sm font-medium ' +
          (status === 'online'
            ? 'bg-green-100 text-green-700'
            : status === 'offline'
              ? 'bg-red-100 text-red-700'
              : 'bg-gray-100 text-gray-600')
        }
      >
        Backend: {status}
      </span>
    </main>
  )
}

export default Home