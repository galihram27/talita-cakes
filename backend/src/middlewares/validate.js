// src/middlewares/validate.js
import { AppError } from '../utils/appError.js';

/**
 * Generic validator middleware berbasis Zod.
 * target: 'body' | 'params' | 'query'
 */
export const validate = (schema, target = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[target]);

  if (!result.success) {
    return next(new AppError('Validasi gagal', 422, result.error.flatten()));
  }

  req[target] = result.data;
  next();
};