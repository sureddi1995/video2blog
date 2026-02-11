import { Router, json } from 'express';
import multer from 'multer';
import { join, extname } from 'path';
import { tmpdir } from 'os';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { extractAudio } from '../utils/ffmpeg.js';
import { transcribeAudio } from '../utils/whisper.js';
import { generateBlog } from '../utils/blogGenerator.js';
import { downloadYouTubeVideo } from '../utils/youtube.js';

const router = Router();

const TEMP_DIR = join(tmpdir(), 'video2blog');
const UPLOAD_DIR = join(TEMP_DIR, 'uploads');
const PUBLIC_AUDIO_DIR = join(process.cwd(), 'public', 'audio');

async function ensureDirs() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.mkdir(PUBLIC_AUDIO_DIR, { recursive: true });
}

async function processVideo(videoPath, blogLanguage, audioLanguage = 'auto') {
  let audioPath = null;

  try {
    const audioDir = join(TEMP_DIR, 'audio');
    await fs.mkdir(audioDir, { recursive: true });

    audioPath = await extractAudio(videoPath, audioDir);
    
    try {
      const audioFileName = `${uuidv4()}.mp3`;
      const publicAudioPath = join(PUBLIC_AUDIO_DIR, audioFileName);
      await fs.copyFile(audioPath, publicAudioPath);
      console.log(`[Upload] Audio saved to: ${publicAudioPath}`);
    } catch (copyErr) {
      console.warn('[Upload] Could not save audio:', copyErr.message);
    }
    
    const transcriptionResult = await transcribeAudio(audioPath, audioLanguage);
    const transcript = transcriptionResult.transcript;
    const detectedLanguage = transcriptionResult.language;
    
    const finalBlogLanguage = blogLanguage || detectedLanguage || 'en';
    console.log(`[Upload] Detected: ${detectedLanguage}, Audio hint: ${audioLanguage}, Blog: ${finalBlogLanguage}`);
    
    const blog = await generateBlog(transcript, finalBlogLanguage);

    return { transcript, blog, detectedLanguage, blogLanguage: finalBlogLanguage };
  } finally {
    if (audioPath) await fs.unlink(audioPath).catch(() => {});
  }
}

// Ensure directories exist on startup
await ensureDirs();

// Configure multer for file upload
const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file) {
      return cb(new Error('No file uploaded'));
    }
    const allowed = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.flv', '.wmv'];
    const ext = extname(file.originalname || '').toLowerCase();
    if (!ext) {
      return cb(new Error('File must have an extension'));
    }
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Supported: ${allowed.join(', ')}`));
    }
  },
});

// File upload endpoint
router.post('/upload', upload.single('video'), async (req, res) => {
  let videoPath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    videoPath = req.file.path;
    const blogLanguage = req.body?.language || undefined;
    const audioLanguage = req.body?.audioLanguage || 'auto';

    console.log(`[Upload] Processing file: ${req.file.originalname}`);
    const result = await processVideo(videoPath, blogLanguage, audioLanguage);
    res.json(result);
  } catch (err) {
    console.error('[Upload] Error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to process video' });
  } finally {
    if (videoPath) {
      await fs.unlink(videoPath).catch(() => {});
    }
  }
});

// YouTube URL endpoint (enabled with Docker + yt-dlp + ffmpeg)
router.post('/upload-youtube', json(), async (req, res) => {
  const { youtubeUrl, language, audioLanguage } = req.body;
  let videoPath = null;

  try {
    if (!youtubeUrl || typeof youtubeUrl !== 'string' || !youtubeUrl.trim()) {
      return res.status(400).json({ error: 'YouTube URL required' });
    }

    console.log(`[YouTube] Processing: ${youtubeUrl}`);
    videoPath = await downloadYouTubeVideo(youtubeUrl);

    if (!videoPath || !(await fs.stat(videoPath).catch(() => null))) {
      throw new Error('Failed to download YouTube video');
    }

    const result = await processVideo(videoPath, language, audioLanguage || 'auto');
    res.json(result);
  } catch (err) {
    console.error('[YouTube] Error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to process YouTube video' });
  } finally {
    if (videoPath) {
      await fs.unlink(videoPath).catch(() => {});
    }
  }
});

export default router;
