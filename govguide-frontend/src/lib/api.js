const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export async function checkBackendHealth() {
  const res = await fetch(`${API_BASE_URL}/health`)
  if (!res.ok) {
    throw new Error(`Health check failed with status ${res.status}`)
  }
  return res.json()
}

export async function sendChatMessage({ accessToken, message, sessionId, serviceSlug }) {
  const res = await fetch(`${API_BASE_URL}/chat/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ message, sessionId, serviceSlug }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Chat request failed with status ${res.status}`)
  }
  return res.json()
}