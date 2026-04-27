'use strict'

const Joi = require('joi')

// ── Auth ───────────────────────────────────────────────────────────────────
const loginSchema = Joi.object({
  email:    Joi.string().email().required().messages({
    'string.email': 'Formato de correo inválido',
    'any.required': 'El correo es obligatorio',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min':   'Mínimo 6 caracteres',
    'any.required': 'La contraseña es obligatoria',
  }),
})

const recoverSchema = Joi.object({
  email: Joi.string().email().required(),
})

// ── Activity ───────────────────────────────────────────────────────────────
const activitySchema = Joi.object({
  categoryId:    Joi.string().max(50).required(),
  categoryLabel: Joi.string().max(100).required(),
  categoryColor: Joi.string().max(20).default('#3E5D9D'),
  subcategoryId: Joi.string().max(50).required(),
  name:          Joi.string().max(150).required(),
  model:         Joi.string().valid('RUN','BUILD','ADMIN','GROW','OFF').required(),
  durationMins:  Joi.number().integer().min(1).max(1440).required(),
  description:   Joi.string().max(1000).allow('', null).optional(),
  projectId:     Joi.number().integer().allow(null).optional(),
})

const updateActivitySchema = Joi.object({
  durationMins: Joi.number().integer().min(1).max(1440),
  description:  Joi.string().max(1000).allow('', null),
  projectId:    Joi.number().integer().allow(null),
}).min(1)

// ── Sprint ─────────────────────────────────────────────────────────────────
const sprintSchema = Joi.object({
  name:      Joi.string().max(50).required(),
  startDate: Joi.date().iso().required(),
  endDate:   Joi.date().iso().min(Joi.ref('startDate')).required().messages({
    'date.min': 'La fecha de fin debe ser posterior al inicio',
  }),
})

// ── Project ────────────────────────────────────────────────────────────────
const projectSchema = Joi.object({
  name:   Joi.string().max(150).required(),
  type:   Joi.string().valid('estrategico','operativo').required(),
  areaId: Joi.number().integer().required(),
})

const assignProjectSchema = Joi.object({
  userIds: Joi.array().items(Joi.number().integer()).min(0).required(),
})

// ── Approval ───────────────────────────────────────────────────────────────
const approvalSchema = Joi.object({
  comment: Joi.string().max(500).allow('', null).optional(),
})

const rejectSchema = Joi.object({
  comment: Joi.string().max(500).required().messages({
    'any.required': 'El comentario es obligatorio para rechazar',
    'string.empty': 'El comentario no puede estar vacío',
  }),
})

// ── Helpers ────────────────────────────────────────────────────────────────

/** Valida y lanza error con mensaje legible si falla */
function validate(schema, data) {
  const { error, value } = schema.validate(data, { abortEarly: false, stripUnknown: true })
  if (error) {
    const messages = error.details.map(d => d.message).join('; ')
    const err = new Error(messages)
    err.status = 400
    err.isValidation = true
    throw err
  }
  return value
}

module.exports = {
  schemas: {
    login: loginSchema,
    recover: recoverSchema,
    activity: activitySchema,
    updateActivity: updateActivitySchema,
    sprint: sprintSchema,
    project: projectSchema,
    assignProject: assignProjectSchema,
    approval: approvalSchema,
    reject: rejectSchema,
  },
  validate,
}
