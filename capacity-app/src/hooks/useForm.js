/**
 * useForm.js
 * Hook de formularios con validación integrada.
 *
 * Uso:
 *   const { values, errors, handleChange, handleSubmit, isSubmitting } =
 *     useForm({ initialValues: { email: '', password: '' }, validate: validateLogin, onSubmit })
 */

import { useState, useCallback } from 'react'

export function useForm({ initialValues = {}, validate, onSubmit }) {
  const [values,      setValues]      = useState(initialValues)
  const [errors,      setErrors]      = useState({})
  const [touched,     setTouched]     = useState({})
  const [isSubmitting,setIsSubmitting]= useState(false)

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target
    setValues(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    // Limpia el error del campo al escribir
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }))
  }, [errors])

  const handleBlur = useCallback((e) => {
    const { name } = e.target
    setTouched(prev => ({ ...prev, [name]: true }))
    if (validate) {
      const { errors: newErrors } = validate(values)
      if (newErrors[name]) setErrors(prev => ({ ...prev, [name]: newErrors[name] }))
    }
  }, [validate, values])

  const setValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }))
  }, [])

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault()

    // Marca todos los campos como tocados
    const allTouched = Object.keys(values).reduce((acc, k) => ({ ...acc, [k]: true }), {})
    setTouched(allTouched)

    // Valida
    if (validate) {
      const { valid, errors: newErrors } = validate(values)
      if (!valid) { setErrors(newErrors); return }
    }

    setIsSubmitting(true)
    try {
      await onSubmit?.(values)
    } finally {
      setIsSubmitting(false)
    }
  }, [values, validate, onSubmit])

  const reset = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
    setIsSubmitting(false)
  }, [initialValues])

  /** Retorna props listos para pasar a un <input name="field"> */
  const register = (name) => ({
    name,
    value: values[name] ?? '',
    onChange: handleChange,
    onBlur: handleBlur,
  })

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setValue,
    reset,
    register,
    setErrors,
  }
}
