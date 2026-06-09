type AuthMode = 'login' | 'register'

type AuthModeTabsProps = {
  mode: AuthMode
  onModeChange: (mode: AuthMode) => void
}

export function AuthModeTabs({ mode, onModeChange }: AuthModeTabsProps) {
  if (mode === 'register') {
    return (
      <button className="mode-link" onClick={() => onModeChange('login')} type="button">
        Ya tienes una cuenta? <strong>Inicia Sesion</strong>
      </button>
    )
  }

  return (
    <button className="mode-link" onClick={() => onModeChange('register')} type="button">
      No tienes cuenta? <strong>Crea una cuenta</strong>
    </button>
  )
}
