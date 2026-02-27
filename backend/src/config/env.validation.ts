/**
 * Validation des variables d'environnement avec Joi
 * Échoue au démarrage si des variables requises sont manquantes ou invalides
 */
 
const Joi = require('joi');

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  PORT: Joi.number().port().default(3000),

  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgres', 'postgresql'] })
    .required()
    .messages({
      'string.uri': 'DATABASE_URL doit être une URL PostgreSQL valide',
    }),

  JWT_SECRET: Joi.string().min(32).required().messages({
    'string.min': 'JWT_SECRET doit faire au moins 32 caractères',
  }),

  JWT_REFRESH_SECRET: Joi.string().min(32).required().messages({
    'string.min': 'JWT_REFRESH_SECRET doit faire au moins 32 caractères',
  }),

  JWT_ACCESS_TTL: Joi.number().integer().min(60).default(900),
  JWT_REFRESH_TTL: Joi.number().integer().min(3600).default(604800),

  CORS_ORIGINS: Joi.string().default('http://localhost:5173'),

  APP_ENV: Joi.string().valid('local', 'staging', 'production').optional(),

  API_BASE_URL: Joi.string().uri().required().messages({
    'string.uri': 'API_BASE_URL doit être une URL valide (ex: https://api.ton-domaine.com)',
  }),
  APP_DEEP_LINK: Joi.string().optional().default('yourapp://'),
  LOCAL_IP: Joi.string().optional(),

  MOCK_PAYMENT_DELAY_MS: Joi.number().optional(),
  MOCK_PAYMENT_SUCCESS_RATE: Joi.number().optional(),
  MOCK_TRANSFER_DELAY_MS: Joi.number().optional(),

  MTN_ENVIRONMENT: Joi.string().valid('sandbox', 'production').optional(),
  MTN_API_USER_COLLECTION: Joi.string().optional(),
  MTN_API_KEY_COLLECTION: Joi.string().optional(),
  MTN_COLLECTION_SUBSCRIPTION_KEY: Joi.string().optional(),
  MTN_API_USER_DISBURSEMENT: Joi.string().optional(),
  MTN_API_KEY_DISBURSEMENT: Joi.string().optional(),
  MTN_DISBURSEMENT_SUBSCRIPTION_KEY: Joi.string().optional(),
  MTN_WEBHOOK_SECRET: Joi.string().optional(),

  CINETPAY_API_KEY: Joi.string().optional(),
  CINETPAY_SITE_ID: Joi.string().optional(),
  CINETPAY_SECRET_KEY: Joi.string().optional(),

  WAVE_API_KEY: Joi.string().optional(),
  WAVE_WEBHOOK_SECRET: Joi.string().optional(),

  CLOUDINARY_CLOUD_NAME: Joi.string().optional(),
  CLOUDINARY_API_KEY: Joi.string().optional(),
  CLOUDINARY_API_SECRET: Joi.string().optional(),
});
