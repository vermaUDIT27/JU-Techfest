import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

// General API rate limiter (200 requests per minute)
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.NODE_ENV === 'test' ? 10000 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP. Please try again after 1 minute.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

// Strict authentication endpoint rate limiter (15 requests per 15 minutes)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'test' ? 10000 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
});

// Public complaint submission rate limiter (5 submissions per 15 minutes per IP)
export const complaintLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'test' ? 10000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many complaint submissions from this network. Please wait 15 minutes.',
    code: 'COMPLAINT_RATE_LIMIT_EXCEEDED',
  },
});
