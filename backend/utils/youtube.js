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

  console.log(`[YouTube] Downloading ${youtubeUrl}`);
  console.log(`[YouTube] Saving to ${videoPath}`);

  // Try each yt-dlp path until one works
  return tryDownloadWithPaths(youtubeUrl, videoPath, YT_DLP_PATHS);
}

async function tryDownloadWithPaths(youtubeUrl, videoPath, paths, pathIndex = 0) {
  if (pathIndex >= paths.length) {
    return Promise.reject(new Error(
      'yt-dlp not found. Please deploy using Docker to enable YouTube support. ' +
      'See Dockerfile in backend directory.'
    ));
  }

  const ytDlpPath = paths[pathIndex];
  console.log(`[YouTube] Trying yt-dlp at: ${ytDlpPath}`);

  return new Promise((resolve, reject) => {
    // Use Android client to bypass YouTube bot detection
    // Android client is more reliable and less likely to trigger bot detection
    const args = [
      '-f', 'best[ext=mp4][height<=720]/best[ext=mp4]/best',
      '--no-warnings',
      // Use ONLY Android client (most reliable for avoiding bot detection)
      '--extractor-args', 'youtube:player_client=android',
      '--extractor-retries', '5',
      '--no-check-certificates',
      // Add more retries and timeout
      '--socket-timeout', '30',
      '--retries', '3',
      '-o', videoPath,
      youtubeUrl
    ];

    execFile(ytDlpPath, args, { timeout: 300000, maxBuffer: 50 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        // If yt-dlp not found (ENOENT), try next path
        if (err.code === 'ENOENT') {
          console.warn(`[YouTube] yt-dlp not found at ${ytDlpPath}, trying next path...`);
          return tryDownloadWithPaths(youtubeUrl, videoPath, paths, pathIndex + 1)
            .then(resolve)
            .catch(reject);
        }
        console.error(`[YouTube] Download error: ${err.message}`);
        return reject(new Error(`YouTube download failed: ${err.message}`));
      }

      // Verify file was actually downloaded and has content
      fs.stat(videoPath).then((stats) => {
        if (stats.size === 0) {
          console.error(`[YouTube] File is empty, retrying with alternative format...`);
          // If file is empty, try with a completely different approach
          return attemptFallbackDownload(youtubeUrl, videoPath);
        }
        console.log(`[YouTube] Download complete: ${videoPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        resolve(videoPath);
      }).catch((statErr) => {
        reject(new Error(`YouTube download failed: Could not verify file: ${statErr.message}`));
      });
    });
  });
}

async function attemptFallbackDownload(youtubeUrl, videoPath) {
  return new Promise((resolve, reject) => {
    // Fallback: Try downloading with minimal options (Android client only)
    const fallbackArgs = [
      '-f', 'best',
      '--no-warnings',
      '--extractor-args', 'youtube:player_client=android',
      '--no-check-certificates',
      '--socket-timeout', '30',
      '--retries', '3',
      '-o', videoPath,
      youtubeUrl
    ];

    execFile('yt-dlp', fallbackArgs, { timeout: 300000, maxBuffer: 50 * 1024 * 1024 }, (err) => {
      if (err) {
        return reject(new Error(`YouTube download failed (both methods): ${err.message}`));
      }

      fs.stat(videoPath).then((stats) => {
        if (stats.size === 0) {
          throw new Error('Downloaded file is empty even with fallback format');
        }
        console.log(`[YouTube] Fallback download successful: ${videoPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        resolve(videoPath);
      }).catch((statErr) => {
        reject(new Error(`YouTube fallback failed: ${statErr.message}`));
      });
    });
  });
}

export { downloadYouTubeVideo };


