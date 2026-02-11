import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';

// Try to find yt-dlp in common locations
const YT_DLP_PATHS = [
  'yt-dlp',                    // PATH
  '/usr/local/bin/yt-dlp',    // Docker/Linux install
  '/usr/bin/yt-dlp',          // System install
];

function createError(message, code, details) {
  const err = new Error(message);
  if (code) err.code = code;
  if (details) err.details = details;
  return err;
}

function isAuthRequiredError(output = '') {
  const normalized = output.toLowerCase();
  return (
    normalized.includes('sign in to confirm') ||
    normalized.includes('use --cookies-from-browser or --cookies') ||
    normalized.includes('login required') ||
    normalized.includes('authentication required')
  );
}

function parseYtDlpFailure(execErr, stderr = '', stdout = '') {
  const output = `${execErr?.message || ''}\n${stderr || ''}\n${stdout || ''}`.trim();
  if (isAuthRequiredError(output)) {
    return createError(
      'YouTube requires authentication cookies for this video.',
      'YOUTUBE_AUTH_REQUIRED',
      output.slice(0, 1500)
    );
  }
  return createError(
    `YouTube download failed: ${(execErr && execErr.message) ? execErr.message : 'Unknown yt-dlp error'}`,
    'YOUTUBE_DOWNLOAD_FAILED',
    output.slice(0, 1500)
  );
}

async function createCookieFile(tempDir) {
  const cookiesFileEnv = process.env.YTDLP_COOKIES_FILE?.trim();
  if (cookiesFileEnv) {
    return { path: cookiesFileEnv, temporary: false };
  }

  const base64Cookies = process.env.YTDLP_COOKIES_BASE64?.trim();
  const rawCookies = process.env.YTDLP_COOKIES?.trim();
  if (!base64Cookies && !rawCookies) {
    return null;
  }

  const cookieFilePath = join(tempDir, `${uuidv4()}.cookies.txt`);

  let content = rawCookies || '';
  if (base64Cookies) {
    content = Buffer.from(base64Cookies, 'base64').toString('utf8');
  }

  // Allow escaped line breaks when env values are provided in single-line format.
  if (content.includes('\\n')) {
    content = content.replace(/\\n/g, '\n');
  }

  await fs.writeFile(cookieFilePath, content, { encoding: 'utf8', mode: 0o600 });
  return { path: cookieFilePath, temporary: true };
}

function buildProfileArgs(youtubeUrl, videoPath, cookiesPath) {
  const baseArgs = [
    '--no-warnings',
    '--no-playlist',
    '--extractor-retries', '5',
    '--socket-timeout', '30',
    '--retries', '3',
    '--no-check-certificates',
    '-o', videoPath,
  ];

  if (cookiesPath) {
    baseArgs.push('--cookies', cookiesPath);
  }

  return [
    [
      ...baseArgs,
      '-f', 'best[ext=mp4][height<=720]/best[ext=mp4]/best',
      '--extractor-args', 'youtube:player_client=android,web',
      youtubeUrl,
    ],
    [
      ...baseArgs,
      '-f', 'best[height<=720]/best',
      '--extractor-args', 'youtube:player_client=web',
      youtubeUrl,
    ],
    [
      ...baseArgs,
      '-f', 'best',
      youtubeUrl,
    ],
  ];
}

function runYtDlpCommand(ytDlpPath, args) {
  return new Promise((resolve, reject) => {
    execFile(
      ytDlpPath,
      args,
      { timeout: 300000, maxBuffer: 50 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          return reject({ execErr: err, stdout, stderr });
        }
        resolve({ stdout, stderr });
      }
    );
  });
}

async function runWithBinaryFallback(args) {
  let lastError = null;

  for (const ytDlpPath of YT_DLP_PATHS) {
    console.log(`[YouTube] Trying yt-dlp at: ${ytDlpPath}`);
    try {
      await runYtDlpCommand(ytDlpPath, args);
      return;
    } catch (failure) {
      const execErr = failure?.execErr;
      if (execErr?.code === 'ENOENT') {
        console.warn(`[YouTube] yt-dlp not found at ${ytDlpPath}, trying next path...`);
        continue;
      }
      lastError = parseYtDlpFailure(execErr, failure?.stderr, failure?.stdout);
      throw lastError;
    }
  }

  throw lastError || createError(
    'yt-dlp not found. Please deploy using Docker to enable YouTube support. See Dockerfile in backend directory.',
    'YTDLP_NOT_FOUND'
  );
}

async function ensureDownloadedFile(videoPath) {
  const stats = await fs.stat(videoPath).catch(() => null);
  if (!stats || stats.size === 0) {
    throw createError('Downloaded file is empty or missing', 'YOUTUBE_EMPTY_DOWNLOAD');
  }
  console.log(`[YouTube] Download complete: ${videoPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
}

/**
 * Download YouTube video using yt-dlp CLI
 * Handles SABR streaming and various YouTube format issues
 * Requires yt-dlp to be installed and in PATH
 * @param {string} youtubeUrl - YouTube URL
 * @returns {Promise<string>} - Path to downloaded video file
 */
async function downloadYouTubeVideo(youtubeUrl) {
  const TEMP_DIR = join(tmpdir(), 'video2blog', 'youtube');
  await fs.mkdir(TEMP_DIR, { recursive: true });

  const videoFileName = `${uuidv4()}.mp4`;
  const videoPath = join(TEMP_DIR, videoFileName);
  let cookies = null;

  console.log(`[YouTube] Downloading ${youtubeUrl}`);
  console.log(`[YouTube] Saving to ${videoPath}`);
  try {
    cookies = await createCookieFile(TEMP_DIR);
    if (cookies?.path) {
      console.log(`[YouTube] Using cookies from ${cookies.temporary ? 'environment variable' : 'file path'}`);
    }

    const profiles = buildProfileArgs(youtubeUrl, videoPath, cookies?.path);
    let lastErr = null;

    for (let i = 0; i < profiles.length; i += 1) {
      try {
        console.log(`[YouTube] Download profile ${i + 1}/${profiles.length}`);
        await runWithBinaryFallback(profiles[i]);
        await ensureDownloadedFile(videoPath);
        return videoPath;
      } catch (err) {
        lastErr = err;
        console.warn(`[YouTube] Profile ${i + 1} failed: ${err.message}`);

        // Auth challenges will not improve with format/client fallback.
        if (err.code === 'YOUTUBE_AUTH_REQUIRED') {
          throw err;
        }
      }
    }

    throw lastErr || createError('YouTube download failed after all fallback attempts', 'YOUTUBE_DOWNLOAD_FAILED');
  } finally {
    if (cookies?.temporary) {
      await fs.unlink(cookies.path).catch(() => {});
    }
  }
}

export { downloadYouTubeVideo };


