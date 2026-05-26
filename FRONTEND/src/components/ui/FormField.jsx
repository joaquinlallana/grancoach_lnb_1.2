import { useId, cloneElement, isValidElement } from 'react'

/**
 * FormField — wrapper consistente para label + control + hint/error.
 *
 * Uso:
 *   <FormField label="Email" error={errors.email?.message}>
 *     <Input type="email" {...register('email')} />
 *   </FormField>
 */
export function FormField({ label, hint, error, required, children, className = '' }) {
  const generatedId = useId()
  const inputId = isValidElement(children) && children.props.id ? children.props.id : generatedId

  const controlWithProps = isValidElement(children)
    ? cloneElement(children, {
        id: inputId,
        invalid: !!error || children.props.invalid,
        'aria-invalid': !!error,
        'aria-describedby': error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined,
      })
    : children

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-surface-800 dark:text-surface-200 mb-1.5">
          {label}
          {required && <span className="text-rose-500 ml-0.5" aria-hidden="true">*</span>}
        </label>
      )}
      {controlWithProps}
      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-surface-500 dark:text-surface-400">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
