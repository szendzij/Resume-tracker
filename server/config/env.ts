import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  OUTLOOK_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID || process.env.OUTLOOK_CLIENT_ID || '',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  APP_URL: process.env.APP_URL || 'http://localhost:3000',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  DATABASE_URL: process.env.DATABASE_URL || 'file:./data/tracker.db',
};
