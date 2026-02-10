import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import express, { json, static as expressStatic } from 'express';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: resolve(__dirname, '.env.local') });
dotenv.config({ path: resolve(__dirname, '..', '.env.local') });
import cors from 'cors';
import uploadRoutes from './routes/upload.js';

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
