import { config } from './config';
import { connectDB } from './config/db';
import app from './app';

// Local development entry point — not used by Vercel serverless
connectDB()
  .then(() => {
    app.listen(config.port, () => {
      console.log(`Server is running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });

export default app;
