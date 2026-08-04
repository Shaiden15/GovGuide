import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  Circle,
  FileText,
  GraduationCap,
  HeartHandshake,
  IdCard,
  LogOut,
  Paperclip,
  Plane,
  Search,
  Sparkles,
  Umbrella,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { fetchServices, fetchServiceDetail, searchFaq, uploadDocument } from '../lib/api'

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

const SERVICE_ICONS = {
  nsfas: GraduationCap,
  'id-application': IdCard,
  passport: Plane,
  'social-grant': HeartHandshake,
  'business-registration': Briefcase,
  uif: Umbrella,
}

function Chat() {
  const navigate = useNavigate()
  const { logout, session } = useAuth()
  const fileInputRef = useRef(null)

  const [services, setServices] = useState([])
  const [activeSlug, setActiveSlug] = useState(null)
  const [detail, setDetail] = useState(null)
  const [checkedReqs, setCheckedReqs] = useState(new Set())

  const [faqQuery, setFaqQuery] = useState('')
  const [conversation, setConversation] = useState([])
  const [searching, setSearching] = useState(false)

  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [uploadError, setUploadError] = useState('')

  useEffect(() => {
    fetchServices()
      .then((data) => setServices(data.services))
      .catch(() => setServices([]))
  }, [])

  useEffect(() => {
    if (!activeSlug) {
      setDetail(null)
      return
    }
    setDetail(null)
    setCheckedReqs(new Set())
    setUploadResult(null)
    setUploadError('')
    setConversation([])
    fetchServiceDetail(activeSlug)
      .then(setDetail)
      .catch(() => setDetail(null))
  }, [activeSlug])

  function handleLogout() {
    logout()
    navigate('/')
  }

  function toggleRequirement(id) {
    setCheckedReqs((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleFaqSearch(e) {
    e.preventDefault()
    const q = faqQuery.trim()
    if (!q || searching) return

    setConversation((prev) => [...prev, { role: 'user', content: q }])
    setFaqQuery('')
    setSearching(true)

    try {
      const { results } = await searchFaq({ query: q, serviceSlug: activeSlug })
      const best = results?.[0]
      if (best) {
        setConversation((prev) => [
          ...prev,
          { role: 'assistant', content: best.answer, sourceUrl: best.sourceUrl },
        ])
      } else {
        setConversation((prev) => [
          ...prev,
          {
            role: 'assistant',
            content:
              "I couldn't find an answer to that. Try rephrasing, or select a service from the sidebar for more specific results.",
          },
        ])
      }
    } catch (err) {
      setConversation((prev) => [
        ...prev,
        { role: 'assistant', content: `Something went wrong searching: ${err.message}` },
      ])
    } finally {
      setSearching(false)
    }
  }

  function handleAttachClick() {
    fileInputRef.current?.click()
  }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setUploadError('')
    setUploadResult(null)

    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError('That file is larger than the 10MB limit. Please upload a smaller file.')
      return
    }

    setUploading(true)
    try {
      const { analysis } = await uploadDocument({
        accessToken: session?.access_token,
        file,
        serviceSlug: activeSlug,
      })
      setUploadResult(analysis)
    } catch (err) {
      setUploadError(`Couldn't check that document: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <main className="flex h-screen flex-col bg-gray-950 text-gray-100">
      <header className="flex items-center justify-between border-b border-gray-800 bg-gray-900 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-govguide-green">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-base font-semibold leading-tight text-white">GovGuide SA</p>
            <p className="text-xs leading-tight text-gray-400">Government services, simplified</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-64 flex-col overflow-y-auto border-r border-gray-800 bg-gray-900 p-4 sm:flex">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Services</p>
          <div className="space-y-2.5">
            {services.map(({ slug, name }) => {
              const Icon = SERVICE_ICONS[slug] ?? FileText
              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() => setActiveSlug(slug)}
                  className={`flex w-full items-center gap-2.5 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors hover:border-govguide-green hover:bg-gray-800 ${
                    activeSlug === slug ? 'border-govguide-green bg-gray-800 text-white' : 'border-gray-700 text-gray-200'
                  }`}
                >
                  <Icon className="h-4.5 w-4.5 text-govguide-gold" />
                  {name}
                </button>
              )
            })}
          </div>
        </aside>

        <section className="flex flex-1 flex-col overflow-y-auto bg-black p-6">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
            {/* Ask anything — free-text search, no AI, works with or without a service selected */}
            <div className="pt-4 text-center">
              <h1 className="text-2xl font-semibold text-white">Ask anything about government services</h1>
              <p className="mt-1 text-sm text-gray-500">
                {activeSlug
                  ? `Searching ${detail?.service?.name ?? ''} questions, documents, and eligibility.`
                  : 'Type your question in your own words — we search our knowledge base for you.'}
              </p>
            </div>

            <form onSubmit={handleFaqSearch} className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={faqQuery}
                  onChange={(e) => setFaqQuery(e.target.value)}
                  placeholder="e.g. what documents do I need for NSFAS?"
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 py-3.5 pl-11 pr-3 text-base text-gray-100 placeholder:text-gray-500 focus:border-govguide-green focus:outline-none focus:ring-2 focus:ring-govguide-green/20"
                />
              </div>
              <button
                type="submit"
                disabled={!faqQuery.trim() || searching}
                className="rounded-xl bg-govguide-green px-5 py-3.5 text-sm font-semibold text-white hover:bg-govguide-green/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {searching ? 'Searching…' : 'Ask'}
              </button>
            </form>

            {conversation.length > 0 && (
              <div className="flex flex-col gap-4">
                {conversation.map((m, i) => (
                  <div
                    key={i}
                    className={
                      m.role === 'user'
                        ? 'ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-govguide-green px-4 py-2.5 text-sm text-white'
                        : 'mr-auto max-w-[85%] rounded-2xl rounded-bl-sm border border-gray-800 bg-gray-900 px-4 py-3 text-sm leading-relaxed text-gray-100'
                    }
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    {m.sourceUrl && (
                      <a
                        href={m.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-xs text-govguide-blue hover:underline"
                      >
                        Source
                      </a>
                    )}
                  </div>
                ))}
                {searching && (
                  <div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-sm border border-gray-800 bg-gray-900 px-4 py-2.5 text-sm text-gray-400">
                    Searching…
                  </div>
                )}
              </div>
            )}

            {!activeSlug && conversation.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-govguide-green/15">
                  <Sparkles className="h-6 w-6 text-govguide-green" />
                </div>
                <p className="text-sm text-gray-500 max-w-sm">
                  Tip: select a service from the sidebar to also see its eligibility rules, document checklist, and
                  to check your paperwork.
                </p>
              </div>
            )}

            {activeSlug && detail && (
              <>
                <div>
                  <h2 className="text-xl font-semibold text-white">{detail.service.name}</h2>
                  <p className="mt-1 text-sm text-gray-400">{detail.service.description}</p>
                </div>

                {detail.eligibilityRules.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
                      Eligibility
                    </h3>
                    <ul className="space-y-2">
                      {detail.eligibilityRules.map((r) => (
                        <li
                          key={r.id}
                          className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-2.5 text-sm text-gray-200"
                        >
                          <span className="text-gray-400">{r.rule_type.replace(/_/g, ' ')}:</span> {r.value}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {detail.requirements.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
                      Document checklist
                    </h3>
                    <ul className="space-y-2">
                      {detail.requirements.map((r) => {
                        const checked = checkedReqs.has(r.id)
                        return (
                          <li key={r.id}>
                            <button
                              type="button"
                              onClick={() => toggleRequirement(r.id)}
                              className="flex w-full items-start gap-3 rounded-lg border border-gray-800 bg-gray-900 px-4 py-3 text-left hover:border-gray-700"
                            >
                              {checked ? (
                                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-govguide-green" />
                              ) : (
                                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-gray-600" />
                              )}
                              <span>
                                <span className="text-sm font-medium text-gray-100">
                                  {r.doc_type}
                                  {!r.mandatory && <span className="ml-2 text-xs text-gray-500">(optional)</span>}
                                </span>
                                {r.description && <p className="mt-0.5 text-xs text-gray-500">{r.description}</p>}
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                    <p className="mt-2 text-xs text-gray-500">
                      {checkedReqs.size} of {detail.requirements.length} documents checked off
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
                    Check a document
                  </h3>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleFileSelected}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={handleAttachClick}
                    disabled={uploading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-700 px-4 py-4 text-sm text-gray-300 hover:border-govguide-green hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Paperclip className="h-4.5 w-4.5" />
                    {uploading ? 'Checking…' : 'Upload a document to check it'}
                  </button>

                  {uploadError && <p className="mt-2 text-sm text-govguide-red">{uploadError}</p>}
                  {uploadResult && <DocumentAnalysisCard analysis={uploadResult} />}
                </div>

                {detail.rejectionReasons.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
                      Common rejection reasons
                    </h3>
                    <ul className="space-y-2">
                      {detail.rejectionReasons.map((r) => (
                        <li key={r.id} className="rounded-lg border border-gray-800 bg-gray-900 p-4 text-sm">
                          <p className="font-medium text-gray-100">{r.description}</p>
                          <p className="mt-1 text-gray-400">{r.fix_instructions}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function DocumentAnalysisCard({ analysis }) {
  const hasIssues = analysis.issuesFound?.length > 0

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-gray-800 bg-gray-900 p-4 text-sm text-gray-100">
      <div className="flex items-center gap-2">
        <FileText className="h-4.5 w-4.5 text-govguide-gold" />
        <span className="font-medium text-white">{analysis.docTypeDetected || 'Document'}</span>
      </div>

      <p className="text-gray-300">{analysis.summary}</p>

      <div className="flex flex-wrap gap-2 text-xs">
        <StatusPill label="Complete" ok={analysis.isComplete} />
        {analysis.isCertified !== null && <StatusPill label="Certified" ok={analysis.isCertified} />}
        {analysis.isExpired !== null && <StatusPill label="Not expired" ok={!analysis.isExpired} />}
      </div>

      {hasIssues && (
        <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-3">
          <p className="mb-1 flex items-center gap-1.5 font-medium text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            Issues found
          </p>
          <ul className="list-inside list-disc space-y-1 text-amber-200/90">
            {analysis.issuesFound.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {analysis.rejectionMatch && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-3">
          <p className="mb-1 font-medium text-red-400">Why you were rejected</p>
          <p className="text-red-200/90">{analysis.rejectionMatch.explanation}</p>
          <p className="mt-2 mb-1 font-medium text-govguide-green">How to fix it</p>
          <p className="text-gray-300">{analysis.rejectionMatch.fixInstructions}</p>
        </div>
      )}
    </div>
  )
}

function StatusPill({ label, ok }) {
  return (
    <span
      className={`flex items-center gap-1 rounded-full px-2.5 py-1 ${
        ok ? 'bg-govguide-green/15 text-govguide-green' : 'bg-red-950/40 text-red-400'
      }`}
    >
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
      {label}
    </span>
  )
}

export default Chat
