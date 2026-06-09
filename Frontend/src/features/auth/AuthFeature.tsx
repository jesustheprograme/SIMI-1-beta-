import { useEffect, useMemo, useState } from 'react'
import { BrandPanel } from '../../components/BrandPanel'
import { AuthModeTabs } from './components/AuthModeTabs'
import { LoginForm } from './components/LoginForm'
import { RegisterForm } from './components/RegisterForm'
import { SessionCard } from './components/SessionCard'
import { ApiConnectionError, login, register, verifySession } from './services/authApi'
import type { AuthResponse, LoginPayload, RegisterPayload, User } from './types'

type AuthMode = 'login' | 'register'

const TEMP_DISABLE_LOGIN = false
const guestUser: User = {
  id: 'guest',
  name: 'Invitado SIMI',
  email: 'invitado@simi.local',
  role: 'guest',
}

function getIsPhoneLogin() {
  const coarsePointer = window.matchMedia('(hover: none) and (pointer: coarse)').matches
  const isPortraitPhone = window.innerWidth <= 760
  const isLandscapePhone = window.innerWidth <= 932 && window.innerHeight <= 480

  return coarsePointer && (isPortraitPhone || isLandscapePhone)
}

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [token, setToken] = useState(() => localStorage.getItem('simi_token') ?? '')
  const [user, setUser] = useState<User | null>(null)
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isPhoneLogin, setIsPhoneLogin] = useState(getIsPhoneLogin)

  const initials = useMemo(() => {
    if (!user?.name) return 'SI'
    return user.name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }, [user])

  useEffect(() => {
    if (TEMP_DISABLE_LOGIN) return
    if (!token) return

    async function checkSession() {
      try {
        const data = await verifySession(token)
        setUser(data.user)
        setMessage('Sesion verificada con el backend.')
        if (window.location.pathname === '/') {
          window.history.replaceState(null, '', '/dashboard')
        }
      } catch (error) {
        console.error('No se pudo verificar la sesion.', error)
        if (!(error instanceof ApiConnectionError)) {
          localStorage.removeItem('simi_token')
          setToken('')
          setUser(null)
          setMessage(error instanceof Error ? error.message : 'No se pudo verificar la sesion.')
        }
      }
    }

    checkSession()
  }, [token])

  useEffect(() => {
    const coarsePointer = window.matchMedia('(hover: none) and (pointer: coarse)')

    function updatePhoneLogin() {
      setIsPhoneLogin(getIsPhoneLogin())
    }

    updatePhoneLogin()
    coarsePointer.addEventListener('change', updatePhoneLogin)
    window.addEventListener('resize', updatePhoneLogin)
    window.addEventListener('orientationchange', updatePhoneLogin)

    return () => {
      coarsePointer.removeEventListener('change', updatePhoneLogin)
      window.removeEventListener('resize', updatePhoneLogin)
      window.removeEventListener('orientationchange', updatePhoneLogin)
    }
  }, [])

  function persistSession(data: AuthResponse, successMessage: string) {
    localStorage.setItem('simi_token', data.token)
    setToken(data.token)
    setUser(data.user)
    setMessage(successMessage)
    window.history.pushState(null, '', '/dashboard')
  }

  async function handleLogin(payload: LoginPayload) {
    setIsLoading(true)
    setMessage('')

    try {
      const data = await login(payload)
      persistSession(data, 'Acceso concedido. Token guardado y verificado.')
    } catch (error) {
      console.error('No se pudo iniciar sesion.', error)
      if (!(error instanceof ApiConnectionError)) {
        setMessage(error instanceof Error ? error.message : 'Error inesperado.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleRegister(payload: RegisterPayload) {
    setIsLoading(true)
    setMessage('')

    try {
      const data = await register(payload)
      persistSession(data, 'Cuenta creada correctamente. Sesion iniciada.')
    } catch (error) {
      console.error('No se pudo crear la cuenta.', error)
      if (!(error instanceof ApiConnectionError)) {
        setMessage(error instanceof Error ? error.message : 'Error inesperado.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem('simi_token')
    setToken('')
    setUser(null)
    setMessage('Sesion cerrada correctamente.')
    window.history.pushState(null, '', '/')
  }

  function handleModeChange(nextMode: AuthMode) {
    setMode(nextMode)
    setMessage('')
  }

  if (TEMP_DISABLE_LOGIN) {
    return <SessionCard initials="SI" onLogout={handleLogout} user={guestUser} />
  }

  if (user) {
    return <SessionCard initials={initials} onLogout={handleLogout} user={user} />
  }

  return (
    <main className={`login-page${isPhoneLogin ? ' is-phone-login' : ''}`}>
      <BrandPanel />

      <section className="auth-panel" aria-label="Autenticacion">
        <>
          {mode === 'login' ? (
            <LoginForm isLoading={isLoading} onSubmit={handleLogin} />
          ) : (
            <RegisterForm isLoading={isLoading} onError={setMessage} onSubmit={handleRegister} />
          )}
          <AuthModeTabs mode={mode} onModeChange={handleModeChange} />
        </>

        {message && (
          <p
            className={
              message.includes('incorrectas') ||
              message.includes('expiro') ||
              message.includes('coinciden') ||
              message.includes('existe')
                ? 'alert error'
                : 'alert'
            }
          >
            {message}
          </p>
        )}
      </section>

      {isLoading ? <AuthLoadingOverlay /> : null}
    </main>
  )
}

function AuthLoadingOverlay() {
  return (
    <div className="auth-loading-overlay" role="status" aria-live="polite" aria-label="Cargando datos">
      <div className="auth-loading-dialog">
        <span className="auth-loading-spinner" aria-hidden="true" />
        <strong>Cargando datos</strong>
        <small>Conectando con el servidor...</small>
      </div>
    </div>
  )
}
