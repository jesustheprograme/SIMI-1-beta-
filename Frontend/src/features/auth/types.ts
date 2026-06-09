export type User = {
  id: string
  dni?: string
  name: string
  nombre?: string
  apellido?: string
  email: string
  role: string
  estado?: string
  area_id?: string
  area_trabajo?: string
  cargo?: string
  celular?: string
  telegram_correo?: string
  telegram_id?: string
  ult_activo?: string | null
}

export type AuthResponse = {
  token: string
  user: User
}

export type LoginPayload = {
  email: string
  password: string
}

export type RegisterPayload = {
  name: string
  apellido?: string
  cargo?: string
  celular?: string
  dni?: string
  email: string
  id_rol?: 'tecnico' | 'admin'
  password: string
}
