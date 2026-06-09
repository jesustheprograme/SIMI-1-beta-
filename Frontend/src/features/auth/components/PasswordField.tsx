import { useState } from 'react'
import { EyeIcon, EyeOffIcon, LockIcon } from './authIcons'

type PasswordFieldProps = {
  id: string
  label: string
  name: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  autoComplete?: string
  required?: boolean
}

export function PasswordField({
  id,
  label,
  name,
  placeholder = '••••••••',
  value,
  onChange,
  autoComplete = 'current-password',
  required = false,
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="field-group">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <span className="input-shell">
        <LockIcon />
        <input
          autoComplete={autoComplete}
          id={id}
          name={name}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          type={showPassword ? 'text' : 'password'}
          value={value}
        />
        <button
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          className="field-action"
          onClick={() => setShowPassword((value) => !value)}
          type="button"
        >
          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </span>
    </div>
  )
}
