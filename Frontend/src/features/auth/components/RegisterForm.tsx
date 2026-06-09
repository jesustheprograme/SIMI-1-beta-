import { useState } from 'react'
import type { RegisterPayload } from '../types'
import { UserIcon, MailIcon, ArrowRightIcon } from './authIcons'
import { PasswordField } from './PasswordField'

type RegisterFormProps = {
  isLoading: boolean
  onError: (message: string) => void
  onSubmit: (payload: RegisterPayload) => Promise<void>
}

export function RegisterForm({ isLoading, onError, onSubmit }: RegisterFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (password !== confirmPassword) {
      onError('Las contrasenas no coinciden.')
      return
    }

    await onSubmit({ name, email, password })
  }

  return (
    <form autoComplete="off" className="login-form" onSubmit={handleSubmit}>
      <div>
        <div className="mobile-brand">
          <span className="mobile-brand-mark" aria-hidden="true" />
          <span>ACME</span>
        </div>
        <h2>Request access</h2>
        <p className="muted">Create your workspace credentials to continue.</p>
      </div>

      <label className="field-label">
        Full name
        <span className="input-shell no-action">
          <UserIcon />
          <input
            autoComplete="name"
            name="simi-register-name"
            onChange={(event) => setName(event.target.value)}
            placeholder="Jane Cooper"
            required
            type="text"
            value={name}
          />
        </span>
      </label>

      <label className="field-label">
        Work email
        <span className="input-shell no-action">
          <MailIcon />
          <input
            autoComplete="email"
            name="simi-register-email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@company.com"
            required
            type="email"
            value={email}
          />
        </span>
      </label>

      <PasswordField
        id="simi-register-password"
        label="Password"
        name="simi-register-password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        required
      />

      <PasswordField
        id="simi-register-confirm-password"
        label="Confirm password"
        name="simi-register-confirm-password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        autoComplete="new-password"
        required
      />

      <button className="primary-button" disabled={isLoading} type="submit">
        {isLoading ? (
          'Creating account...'
        ) : (
          <>
            Request access
            <ArrowRightIcon />
          </>
        )}
      </button>
    </form>
  )
}
