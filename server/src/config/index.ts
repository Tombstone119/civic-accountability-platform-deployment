import dotenv from 'dotenv';
import path from 'path';

// .env lives at the monorepo root (three levels up from server/src/config/)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Validate required environment variables in production
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be defined in production environment');
  }
}

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production',
  jwtExpire: process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRE || '7d',
};

// Warn about using default JWT secret in development
if (config.nodeEnv === 'development' && !process.env.JWT_SECRET) {
  console.warn('⚠️  Warning: Using default JWT secret. Set JWT_SECRET in .env for production use.');
}
