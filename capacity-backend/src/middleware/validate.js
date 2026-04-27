'use strict'

/**
 * Middleware de validación de body con schemas Joi.
 * Uso: router.post('/', validate('login'), handler)
 */
const { schemas, validate: validateData } = require('../shared/validators')

function validate(schemaName) {
  return (req, res, next) => {
    try {
      req.body = validateData(schemas[schemaName], req.body)
      next()
    } catch (err) {
      res.status(400).json({ success: false, error: err.message })
    }
  }
}

module.exports = { validate }
