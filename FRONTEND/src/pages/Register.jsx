import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { User, Mail, Lock, Trophy, AlertCircle } from 'lucide-react'
import { authApi } from '../api/auth'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { FormField } from '../components/ui/FormField'
import { Logo, Wordmark } from '../components/ui/Logo'
import { ThemeToggle } from '../components/ui/ThemeToggle'

export function Register() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { register, handleSubmit, watch, formState: { errors } } = useForm()

  const mutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      login(data.data.token, data.data.user)
      navigate('/dashboard')
    },
  })

  const onSubmit = (values) => {
    const { confirmPassword, nombreEquipo, ...rest } = values
    const payload = { ...rest }
    const teamName = (nombreEquipo || '').trim()
    if (teamName) payload.nombreEquipo = teamName
    mutation.mutate(payload)
  }

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
              Crear cuenta
            </h1>
            <p className="text-sm text-surface-600 dark:text-surface-400 mt-1.5">
              Empezá con $100M de presupuesto inicial
            </p>
          </div>

          <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-6 sm:p-8 shadow-soft">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <FormField label="Nombre" error={errors.nombre?.message} required>
                <Input
                  type="text"
                  autoComplete="name"
                  iconLeft={User}
                  placeholder="Tu nombre"
                  {...register('nombre', {
                    required: 'El nombre es requerido',
                    maxLength: { value: 100, message: 'Máximo 100 caracteres' },
                  })}
                />
              </FormField>

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

              <FormField label="Nombre del equipo" hint="Opcional — podés cambiarlo después" error={errors.nombreEquipo?.message}>
                <Input
                  type="text"
                  iconLeft={Trophy}
                  placeholder="Mi Equipo Fantasy"
                  {...register('nombreEquipo', {
                    maxLength: { value: 100, message: 'Máximo 100 caracteres' },
                  })}
                />
              </FormField>

              <FormField label="Contraseña" error={errors.password?.message} required>
                <Input
                  type="password"
                  autoComplete="new-password"
                  iconLeft={Lock}
                  placeholder="Mínimo 8 caracteres"
                  {...register('password', {
                    required: 'La contraseña es requerida',
                    minLength: { value: 8, message: 'Mínimo 8 caracteres' },
                  })}
                />
              </FormField>

              <FormField label="Confirmar contraseña" error={errors.confirmPassword?.message} required>
                <Input
                  type="password"
                  autoComplete="new-password"
                  iconLeft={Lock}
                  placeholder="Repetí la contraseña"
                  {...register('confirmPassword', {
                    required: 'Confirmá la contraseña',
                    validate: (v) => v === watch('password') || 'Las contraseñas no coinciden',
                  })}
                />
              </FormField>

              {apiError && (
                <div role="alert" className="flex items-start gap-2 p-3 rounded-lg bg-rose-500/10 ring-1 ring-inset ring-rose-500/20 text-rose-700 dark:text-rose-300 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{apiError}</span>
                </div>
              )}

              <Button type="submit" variant="primary" size="lg" loading={mutation.isPending} className="w-full mt-2">
                Crear cuenta
              </Button>
            </form>

            <p className="text-center text-sm text-surface-500 dark:text-surface-400 mt-6">
              ¿Ya tenés cuenta?{' '}
              <Link to="/login" className="font-medium text-brand-600 dark:text-brand-400 hover:underline">
                Iniciá sesión
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
