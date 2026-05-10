import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '../api/auth'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'

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

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏀</div>
          <h1 className="text-2xl font-bold text-white">Crear cuenta</h1>
          <p className="text-gray-400 mt-1">Comenzá con $100M de presupuesto</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Nombre</label>
              <input
                type="text"
                autoComplete="name"
                {...register('nombre', { required: 'El nombre es requerido', maxLength: { value: 100, message: 'Máximo 100 caracteres' } })}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Tu nombre"
              />
              {errors.nombre && <p className="text-xs text-red-400 mt-1">{errors.nombre.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <input
                type="email"
                autoComplete="email"
                {...register('email', { required: 'El email es requerido' })}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="tu@email.com"
              />
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Nombre del equipo (opcional)</label>
              <input
                type="text"
                {...register('nombreEquipo', { maxLength: { value: 100, message: 'Máximo 100 caracteres' } })}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Mi Equipo Fantasy"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Contraseña</label>
              <input
                type="password"
                autoComplete="new-password"
                {...register('password', { required: 'La contraseña es requerida', minLength: { value: 8, message: 'Mínimo 8 caracteres' } })}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Mínimo 8 caracteres"
              />
              {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirmar contraseña</label>
              <input
                type="password"
                autoComplete="new-password"
                {...register('confirmPassword', {
                  required: 'Confirmá la contraseña',
                  validate: (v) => v === watch('password') || 'Las contraseñas no coinciden',
                })}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Repetí la contraseña"
              />
              {errors.confirmPassword && <p className="text-xs text-red-400 mt-1">{errors.confirmPassword.message}</p>}
            </div>

            {mutation.error && (
              <div className="p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-300 text-sm">
                {mutation.error.response?.data?.message || 'Error al crear la cuenta'}
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" loading={mutation.isPending} className="w-full mt-2">
              Crear cuenta
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            ¿Ya tenés cuenta?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300">Iniciá sesión</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
