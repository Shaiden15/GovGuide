import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  FileText,
  GraduationCap,
  HeartHandshake,
  IdCard,
  LogOut,
  Paperclip,
  Plane,
  Send,
  Sparkles,
  Umbrella,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { sendChatMessage, uploadDocument } from '../lib/api'

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

const SERVICES = [
  { label: 'NSFAS', slug: 'nsfas', icon: GraduationCap, prompt: 'How do I apply for NSFAS funding?' },
  { label: 'ID Application', slug: 'id-application', icon: IdCard, prompt: 'How do I apply for a South African ID?' },
  { label: 'Passport', slug: 'passport', icon: Plane, prompt: 'What documents do I need for a passport application?' },
  { label: 'Social Grant', slug: 'social-grant', icon: HeartHandshake, prompt: 'How do I apply for a social grant from SASSA?' },
  { label: 'Business Reg.', slug: 'business-registration', icon: Briefcase, prompt: 'How do I register a business with CIPC?' },
  { label: 'UIF', slug: 'uif', icon: Umbrella, prompt: 'How do I claim UIF benefits?' },
]

function Chat() {
  const navigate = useNavigate()
  const { logout, session } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [activeService, setActiveService] = useState(null)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  function handleLogout() {
    logout()
    navigate('/')
  }

  function handleAttachClick() {
    fileInputRef.current?.click()
  }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (file.size > MAX_UPLOAD_BYTES) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'That file is larger than the 10MB limit. Please upload a smaller file.' },
      ])
      return
    }

    setMessages((prev) => [...prev, { role: 'user', content: `📎 Uploaded: ${file.name}`, isDocument: true }])
    setUploading(true)

    try {
      const { analysis } = await uploadDocument({
        accessToken: session?.access_token,
        file,
        sessionId,
      })
      setMessages((prev) => [...prev, { role: 'assistant', content: '', analysis }])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Sorry, I couldn't check that document: ${err.message}` },
      ])
    } finally {
      setUploading(false)
    }
  }

  async function sendMessage(text, serviceSlug) {
    const trimmed = text.trim()
    if (!trimmed || sending) return

    setMessages((prev) => [...prev, { role: 'user', content: trimmed }])
    setInput('')
    setSending(true)

    try {
      const result = await sendChatMessage({
        accessToken: session?.access_token,
        message: trimmed,
        sessionId,
        serviceSlug: serviceSlug ?? activeService,
      })
      setSessionId(result.sessionId)
      if (serviceSlug) setActiveService(serviceSlug)
      setMessages((prev) => [...prev, { role: 'assistant', content: result.reply }])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Sorry, something went wrong: ${err.message}` },
      ])
    } finally {
      setSending(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    sendMessage(input)
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

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-800"
          >
            English
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-64 flex-col overflow-y-auto border-r border-gray-800 bg-gray-900 p-4 sm:flex">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Services
          </p>
          <div className="space-y-2.5">
            {SERVICES.map(({ label, slug, icon: Icon, prompt }) => (
              <button
                key={label}
                type="button"
                onClick={() => sendMessage(prompt, slug)}
                className={`flex w-full items-center gap-2.5 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors hover:border-govguide-green hover:bg-gray-800 ${
                  activeService === slug ? 'border-govguide-green bg-gray-800 text-white' : 'border-gray-700 text-gray-200'
                }`}
              >
                <Icon className="h-4.5 w-4.5 text-govguide-gold" />
                {label}
              </button>
            ))}
          </div>
        </aside>

        <section className="flex flex-1 flex-col bg-black">
          <div className="flex-1 overflow-y-auto p-6">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-govguide-green/15">
                  <Sparkles className="h-6 w-6 text-govguide-green" />
                </div>
                <p className="text-lg font-medium text-gray-200">
                  Ask me anything about government services
                </p>
                <p className="mt-1 max-w-sm text-sm text-gray-500">
                  Try a topic from the sidebar, or type your own question below.
                </p>
              </div>
            ) : (
              <div className="mx-auto flex max-w-3xl flex-col gap-4">
                {messages.map((message, i) =>
                  message.analysis ? (
                    <DocumentAnalysisCard key={i} analysis={message.analysis} />
                  ) : (
                    <div
                      key={i}
                      className={
                        message.role === 'user'
                          ? 'ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-govguide-green px-4 py-2.5 text-sm text-white'
                          : 'mr-auto max-w-[80%] rounded-2xl rounded-bl-sm border border-gray-800 bg-gray-900 px-4 py-2.5 text-sm text-gray-100'
                      }
                    >
                      {message.content}
                    </div>
                  )
                )}
                {(sending || uploading) && (
                  <div className="mr-auto max-w-[80%] rounded-2xl rounded-bl-sm border border-gray-800 bg-gray-900 px-4 py-2.5 text-sm text-gray-400">
                    {uploading ? 'Checking document…' : 'Thinking…'}
                  </div>
                )}
              </div>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-3 border-t border-gray-800 bg-gray-900 p-4"
          >
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
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Attach file"
            >
              <Paperclip className="h-4.5 w-4.5" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about any government service..."
              disabled={sending}
              className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-gray-100 placeholder:text-gray-500 focus:border-govguide-green focus:outline-none focus:ring-2 focus:ring-govguide-green/20 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-govguide-green text-white transition-colors hover:bg-govguide-green/90 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Send message"
            >
              <Send className="h-4.5 w-4.5" />
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}

function DocumentAnalysisCard({ analysis }) {
  const hasIssues = analysis.issuesFound?.length > 0

  return (
    <div className="mr-auto flex w-full max-w-[85%] flex-col gap-3 rounded-2xl rounded-bl-sm border border-gray-800 bg-gray-900 p-4 text-sm text-gray-100">
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
