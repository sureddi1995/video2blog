import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import express, { json, static as expressStatic } from 'express';
import cors from 'cors';
import uploadRoutes from './routes/upload.js';

// Load dotenv only in development (production uses platform env vars)
const __dirname = dirname(fileURLToPath(import.meta.url));
if (process.env.NODE_ENV !== 'production') {
  try {
    const dotenv = await import('dotenv');
    dotenv.default.config();
    dotenv.default.config({ path: resolve(__dirname, '.env.local') });
    dotenv.default.config({ path: resolve(__dirname, '..', '.env.local') });
  } catch (err) {
    console.warn('[Server] dotenv not available, using platform environment variables');
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(json());

// Serve public audio files (stored in project root /public/audio)
const publicAudioPath = resolve(__dirname, '..', 'public', 'audio');
app.use('/audio', expressStatic(publicAudioPath));
console.log(`[Server] Audio files served from: ${publicAudioPath}`);

app.use('/', uploadRoutes);

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
