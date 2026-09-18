const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export async function checkBackendHealth() {
  const res = await fetch(`${API_BASE_URL}/health`)
  if (!res.ok) {
    throw new Error(`Health check failed with status ${res.status}`)
  }
  return res.json()
}

export async function fetchServices() {
  const res = await fetch(`${API_BASE_URL}/services`)
  if (!res.ok) throw new Error(`Failed to load services (status ${res.status})`)
  return res.json()
}

export async function fetchServiceDetail(slug) {
  const res = await fetch(`${API_BASE_URL}/services/${slug}`)
  if (!res.ok) throw new Error(`Failed to load service (status ${res.status})`)
  return res.json()
}

export async function searchFaq({ query, serviceSlug }) {
  const params = new URLSearchParams({ q: query })
  if (serviceSlug) params.set('serviceSlug', serviceSlug)
  const res = await fetch(`${API_BASE_URL}/faq?${params.toString()}`)
  if (!res.ok) throw new Error(`Search failed (status ${res.status})`)
  return res.json()
}

export async function uploadDocument({ accessToken, file, serviceSlug }) {
  const formData = new FormData()
  formData.append('file', file)
  if (serviceSlug) formData.append('serviceSlug', serviceSlug)

  const res = await fetch(`${API_BASE_URL}/documents/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Upload failed with status ${res.status}`)
  }
  return res.json()
}
