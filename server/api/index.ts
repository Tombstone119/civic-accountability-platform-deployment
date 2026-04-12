import { connectDB } from '../src/config/db';
import app from '../src/app';
import { IncomingMessage, ServerResponse } from 'http';

// Reuse the MongoDB connection across warm serverless invocations
let isConnected = false;

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
  // Delegate to the Express app
  return app(req as any, res as any);
}
