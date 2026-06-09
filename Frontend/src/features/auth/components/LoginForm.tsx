import { useState } from 'react'
import type { LoginPayload } from '../types'
import { MailIcon, ArrowRightIcon, GoogleIcon } from './authIcons'
import { PasswordField } from './PasswordField'

type LoginFormProps = {
  isLoading: boolean
  onSubmit: (payload: LoginPayload) => Promise<void>
}

export function LoginForm({ isLoading, onSubmit }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSubmit({ email, password })
  }

  return (
    <form autoComplete="off" className="login-form" onSubmit={handleSubmit}>
      <div className="mobile-login-hero" aria-hidden="true">
        <img src="./mobile-fields-hero.png" alt="" />
        <div className="mobile-login-hero-content">
          <span className="mobile-login-leaf">
            <img src="./logo-solo.jpg" alt="" />
          </span>
          <strong>InkaCrops</strong>
          </div>
      </div>

      <div className="login-form-card">
        <div className="desktop-login-heading">
          <div className="mobile-brand">
            <img className="mobile-brand-mark" src="./logo-img.png"/>
          </div>
          <h2>Iniciar Sesion</h2>
          <p className="muted">Escribe tus credenciales para acceder a la plataforma.</p>
        </div>

        <div className="mobile-login-heading">
          <h2>¡Bienvenido de vuelta!</h2>
          <p>Inicia sesion para gestionar tus productos y procesos.</p>
        </div>

        <label className="field-label">
          CORREO ELECTRONICO
          <span className="input-shell">
            <MailIcon />
            <input
              autoComplete="email"
              name="simi-login-email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@company.com"
              required
              type="email"
              value={email}
            />
          </span>
        </label>

        <div className="field-group">
          <div className="field-row">
            <label className="field-label" htmlFor="simi-login-password">
              CONTRASEÑA
            </label>
            <button className="text-button" type="button">
              Olvidaste tu contraseña?
            </button>
          </div>
          <PasswordField
            id="simi-login-password"
            label=""
            name="simi-login-password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            required
          />
        </div>

        <label className="check-row">
          <input type="checkbox" />
          <span>Mantener la sesion iniciada</span>
        </label>

        <button className="primary-button" disabled={isLoading} type="submit">
          {isLoading ? (
            'Iniciando Sesion'
          ) : (
            <>
              Inicia Sesion
              <ArrowRightIcon />
            </>
          )}
        </button>

        <div className="divider">
          <span>O entrar con</span>
        </div>

        <button className="secondary-button sso-button" type="button">
          <GoogleIcon />
          Continue with SSO
        </button>

        <div className="mobile-login-stats" aria-hidden="true">
          <span>
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18" />
              <path d="M12 3a14 14 0 0 1 0 18" />
              <path d="M12 3a14 14 0 0 0 0 18" />
            </svg>
            <strong>25+</strong>
            Paises
          </span>
          <i />
          <span>
            <svg viewBox="0 0 24 24">
              <path d="M12 3 19 6v5c0 4.8-2.8 8.2-7 10-4.2-1.8-7-5.2-7-10V6Z" />
            </svg>
            <strong>100%</strong>
            Trazabilidad
          </span>
          <i />
          <span>
            <svg viewBox="0 0 24 24">
              <path d="M3 12h4l2-6 4 12 2-6h6" />
            </svg>
            <strong>24/7</strong>
            Monitoreo
          </span>
        </div>

        <p className="mobile-login-footer">© 2026 Inkacrops · Todos los derechos reservados</p>
      </div>
    </form>
  )
}
