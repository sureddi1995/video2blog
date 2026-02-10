import { exec } from 'child_process';
import { basename, extname, join } from 'path';
import { promises as fs } from 'fs';

/**
 * Extract audio from video file using FFmpeg.
 * @param {string} videoPath - Full path to input video (e.g. .mp4)
 * @param {string} outputDir - Directory for output (e.g. os.tmpdir())
 * @returns {Promise<string>} - Full path to the created audio file (.mp3)
 */
async function extractAudio(videoPath, outputDir) {
  const baseName = basename(videoPath, extname(videoPath));
  const audioPath = join(outputDir, `${baseName}.mp3`);

  return new Promise(async (resolve, reject) => {
    const cmd = `ffmpeg -i "${videoPath}" -vn -acodec libmp3lame -q:a 2 "${audioPath}"`;
    console.log(`[FFmpeg] Running: ${cmd}`);
    
    exec(cmd, async (err, stdout, stderr) => {
      if (err) {
        console.error(`[FFmpeg] Error:`, stderr || err.message);
        return reject(new Error(`FFmpeg failed: ${stderr || err.message}`));
      }
      
      try {
        const stat = await fs.stat(audioPath);
        console.log(`[FFmpeg] Output file size: ${stat.size} bytes`);
        
        if (stat.size < 1000) {
          console.warn(`[FFmpeg] Warning: Audio file is very small (${stat.size} bytes) - may be empty or invalid`);
        }
        
        console.log(`[FFmpeg] Audio extraction successful: ${audioPath}`);
        resolve(audioPath);
      } catch (statErr) {
        reject(new Error(`Audio file not created: ${statErr.message}`));
      }
    });
  });
}

export { extractAudio };
