import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';

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

  return new Promise((resolve, reject) => {
    // Comprehensive format selection for handling SABR streaming and other YouTube issues
    // Try: 1) best mp4, 2) best video+audio, 3) best available
    const args = [
      '-f', '(bv*[ext=mp4][height<=720]+ba[ext=m4a])/best[ext=mp4]/best',
      '--no-live-from-start',
      '--no-warnings',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      '--add-header', 'Referer:https://www.youtube.com',
      '--add-header', 'Accept-Language:en-US,en;q=0.9',
      '--extractor-args', 'youtube:player_client=android,web',
      '--extractor-retries', '3',
      '--no-check-certificates',
      '--geo-bypass',
      '-o', videoPath,
      youtubeUrl
    ];

    execFile('yt-dlp', args, { timeout: 300000, maxBuffer: 50 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
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
    // Try downloading just the best video available (no format restrictions)
    const fallbackArgs = [
      '-f', 'best',
      '--no-warnings',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      '--add-header', 'Referer:https://www.youtube.com',
      '--extractor-args', 'youtube:player_client=android',
      '--no-check-certificates',
      '--geo-bypass',
      '--socket-timeout', '30',
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


