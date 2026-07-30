import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles, Languages } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI-guided applications',
    description: 'Step-by-step help with IDs, grants, licences and more.',
  },
  {
    icon: ShieldCheck,
    title: 'Document checks',
    description: 'Catch missing or incorrect documents before you submit.',
  },
  {
    icon: Languages,
    title: 'Multilingual support',
    description: 'Get help in English, isiZulu, Afrikaans and more.',
  },
]

function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const success = login(email, password)
    if (success) {
      navigate('/chat')
    } else {
      setError('Invalid email or password.')
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-govguide-black px-10 py-12 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-govguide-green/30 blur-3xl" />
          <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-govguide-gold/20 blur-3xl" />
          <div className="absolute -bottom-24 left-1/4 h-96 w-96 rounded-full bg-govguide-blue/40 blur-3xl" />
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
            <Sparkles className="h-5 w-5 text-govguide-gold" />
          </div>
          <span className="text-lg font-semibold tracking-tight">GovGuide SA</span>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Government services, made simple.
          </h1>
          <p className="mt-4 text-base text-white/70">
            An AI assistant that helps every South African navigate applications,
            documents and government processes with confidence.
          </p>

          <ul className="mt-10 space-y-5">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-4.5 w-4.5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{title}</p>
                  <p className="text-sm text-white/60">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 flex h-1.5 overflow-hidden rounded-full">
          <span className="flex-1 bg-govguide-green" />
          <span className="flex-1 bg-govguide-gold" />
          <span className="flex-1 bg-govguide-blue" />
          <span className="flex-1 bg-govguide-red" />
        </div>
      </section>

      <section className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-govguide-black">
              <Sparkles className="h-5 w-5 text-govguide-gold" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-gray-900">
              GovGuide SA
            </span>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
            Welcome back
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Sign in to continue to your assistant.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Email address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-govguide-blue focus:outline-none focus:ring-2 focus:ring-govguide-blue/20"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <a
                  href="#"
                  className="text-sm font-medium text-govguide-blue hover:text-govguide-green"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-govguide-blue focus:outline-none focus:ring-2 focus:ring-govguide-blue/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4.5 w-4.5" />
                  ) : (
                    <Eye className="h-4.5 w-4.5" />
                  )}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-govguide-red">{error}</p>}

            <button
              type="submit"
              className="w-full rounded-lg bg-govguide-green px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-govguide-green/90 focus:outline-none focus:ring-2 focus:ring-govguide-green/30"
            >
              Sign in
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400">
            Demo credentials: test@gmail.com / 123456
          </p>
          <p className="mt-2 text-center text-xs text-gray-400">
            Protected by Supabase Auth · GovGuide SA
          </p>
        </div>
      </section>
    </main>
  )
}

export default Login
