export type DemoRole = 'user' | 'admin'

export type DemoSession = {
  id?: string
  name: string
  role: DemoRole
  email: string
}