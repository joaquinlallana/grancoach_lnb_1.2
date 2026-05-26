import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Mail, Lock, AlertCircle } from 'lucide-react'
import { authApi } from '../api/auth'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { FormField } from '../components/ui/FormField'
import { Logo, Wordmark } from '../components/ui/Logo'
import { ThemeToggle } from '../components/ui/ThemeToggle'

export function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { register, handleSubmit, formState: { errors } } = useForm()

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      login(data.data.token, data.data.user)
      navigate('/dashboard')
    },
  })

  const onSubmit = (values) => mutation.mutate(values)
  const apiError = mutation.error?.response?.data?.message

  return (
    <div className="min-h-screen flex flex-col bg-surface-50 dark:bg-surface-950">
      <header className="border-b border-surface-200 dark:border-surface-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <Logo size={28} withMark />
            <Wordmark className="text-base" />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-surface-900 dark:text-surface-50">
              Iniciar sesión
            </h1>
            <p className="text-sm text-surface-600 dark:text-surface-400 mt-1.5">
              Accedé a tu equipo de Gran Coach LNB
            </p>
          </div>

          <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-6 sm:p-8 shadow-soft">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <FormField label="Email" error={errors.email?.message} required>
                <Input
                  type="email"
                  autoComplete="email"
                  iconLeft={Mail}
                  placeholder="tu@email.com"
                  {...register('email', {
                    required: 'El email es requerido',
                    pattern: { value: /\S+@\S+\.\S+/, message: 'Formato de email inválido' },
                  })}
                />
              </FormField>

              <FormField label="Contraseña" error={errors.password?.message} required>
                <Input
                  type="password"
                  autoComplete="current-password"
                  iconLeft={Lock}
                  placeholder="••••••••"
                  {...register('password', { required: 'La contraseña es requerida' })}
                />
              </FormField>

              {apiError && (
                <div role="alert" className="flex items-start gap-2 p-3 rounded-lg bg-rose-500/10 ring-1 ring-inset ring-rose-500/20 text-rose-700 dark:text-rose-300 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{apiError}</span>
                </div>
              )}

              <Button type="submit" variant="primary" size="lg" loading={mutation.isPending} className="w-full">
                Ingresar
              </Button>
            </form>

            <p className="text-center text-sm text-surface-500 dark:text-surface-400 mt-6">
              ¿No tenés cuenta?{' '}
              <Link to="/register" className="font-medium text-brand-600 dark:text-brand-400 hover:underline">
                Registrate
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
