import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Briefcase,
  ChevronDown,
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
import { sendChatMessage } from '../lib/api'

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

  function handleLogout() {
    logout()
    navigate('/')
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
                {messages.map((message, i) => (
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
                ))}
                {sending && (
                  <div className="mr-auto max-w-[80%] rounded-2xl rounded-bl-sm border border-gray-800 bg-gray-900 px-4 py-2.5 text-sm text-gray-400">
                    Thinking…
                  </div>
                )}
              </div>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-3 border-t border-gray-800 bg-gray-900 p-4"
          >
            <button
              type="button"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800"
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

export default Chat
