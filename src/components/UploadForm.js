import React, { useState } from 'react';

export default function UploadForm({ onUploadComplete, onFileSelect, fileName, result }) {
  const [inputType, setInputType] = useState('file');
  const [file, setFile] = useState(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [audioLanguage, setAudioLanguage] = useState('auto');
  const [blogLanguage, setBlogLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({
    upload: false,
    transcribe: false,
    generate: false,
  });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    if (selectedFile) {
      onFileSelect(selectedFile.name);
    }
    setError('');
    setProgress({ upload: false, transcribe: false, generate: false });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (inputType === 'file' && !file) {
      setError('Please select a video file');
      return;
    }
    
    if (inputType === 'youtube' && !youtubeUrl.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    setLoading(true);
    setError('');
    setProgress({ upload: true, transcribe: false, generate: false });

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      let response;

      if (inputType === 'file') {
        const formData = new FormData();
        formData.append('video', file);
        formData.append('language', blogLanguage);
        formData.append('audioLanguage', audioLanguage);

        response = await fetch(`${apiUrl}/upload`, {
          method: 'POST',
          body: formData,
        });
      } else {
        response = await fetch(`${apiUrl}/upload-youtube`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ youtubeUrl, language: blogLanguage, audioLanguage }),
        });
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Upload failed: ${response.status}`);
      }

      setProgress({ upload: true, transcribe: true, generate: false });
      
      const data = await response.json();
      
      setProgress({ upload: true, transcribe: true, generate: true });
      
      onUploadComplete({
        transcript: data.transcript,
        blog: data.blog,
        detectedLanguage: data.detectedLanguage,
        blogLanguage: data.blogLanguage,
      });
    } catch (err) {
      setError(err.message || 'Upload failed');
      setProgress({ upload: false, transcribe: false, generate: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-container">
      <div className="progress-panel">
        <div className="progress-steps">
          <div className={`progress-step ${progress.upload ? 'completed' : ''}`}>
            <div className="step-icon">✓</div>
            <div className="step-content">
              <div className="step-title">Uploading Video...</div>
              {fileName && <div className="step-detail">{fileName} uploaded</div>}
            </div>
          </div>

          <div className={`progress-step ${progress.transcribe ? 'completed' : ''}`}>
            <div className="step-icon">✓</div>
            <div className="step-content">
              <div className="step-title">Transcribing Audio...</div>
              {progress.transcribe && <div className="step-detail">Transcription Complete</div>}
            </div>
          </div>

          <div className={`progress-step ${progress.generate ? 'completed' : ''}`}>
            <div className="step-icon">✓</div>
            <div className="step-content">
              <div className="step-title">Generating Blog Post...</div>
              {progress.generate && <div className="step-detail">Blog Generated Successfully!</div>}
            </div>
          </div>
        </div>

        {result && (
          <button 
            className="regenerate-btn" 
            onClick={() => window.location.reload()}
            disabled={loading}
          >
            Generate A New Blog
          </button>
        )}
      </div>

      {!result && (
        <form onSubmit={handleSubmit} className="upload-form">
          <div className="form-group">
            <label>Input Type:</label>
            <div className="input-type-buttons">
              <button
                type="button"
                className={inputType === 'file' ? 'active' : ''}
                onClick={() => { setInputType('file'); setError(''); }}
                disabled={loading}
              >
                📁 Upload File
              </button>
              {/* TEMPORARILY DISABLED: YouTube support requires backend dependencies not available on free hosting */}
              {/* <button
                type="button"
                className={inputType === 'youtube' ? 'active' : ''}
                onClick={() => { setInputType('youtube'); setError(''); }}
                disabled={loading}
              >
                ▶️ YouTube URL
              </button> */}
            </div>
          </div>

          {inputType === 'file' && (
            <div className="form-group">
              <label htmlFor="video">Select Video File:</label>
              <input
                type="file"
                id="video"
                accept="video/*"
                onChange={handleFileChange}
                disabled={loading}
              />
            </div>
          )}

          {inputType === 'youtube' && (
            <div className="form-group">
              <label htmlFor="youtube">YouTube URL:</label>
              <input
                type="url"
                id="youtube"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="audioLanguage">Audio Language (for transcription):</label>
            <select
              id="audioLanguage"
              value={audioLanguage}
              onChange={(e) => setAudioLanguage(e.target.value)}
              disabled={loading}
            >
              <option value="auto">🔍 Auto-Detect</option>
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="te">Telugu</option>
              <option value="ta">Tamil</option>
            </select>
            <small>Leave as "Auto-Detect" to let AI identify the language. Choose manually if detection is incorrect.</small>
          </div>

          <div className="form-group">
            <label htmlFor="language">Blog Language:</label>
            <select
              id="language"
              value={blogLanguage}
              onChange={(e) => setBlogLanguage(e.target.value)}
              disabled={loading}
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="te">Telugu</option>
              <option value="ta">Tamil</option>
            </select>
          </div>

          <button type="submit" disabled={loading || (inputType === 'file' && !file) || (inputType === 'youtube' && !youtubeUrl)}>
            {loading ? 'Processing...' : 'Upload & Generate Blog'}
          </button>
        </form>
      )}

      {error && <div className="error-message">{error}</div>}

      {result && result.transcript && (
        <div className="transcription-section">
          <h3>Transcription</h3>

          <div className="language-info">
            <div className="language-badge">
              <strong>Detected Audio Language:</strong>
              <span className="badge">{result.detectedLanguage || 'N/A'}</span>
            </div>
            <div className="language-badge">
              <strong>Blog Language:</strong>
              <span className="badge">{result.blogLanguage || blogLanguage}</span>
            </div>
          </div>

          <div className="transcription-content">
            {result.transcript}
          </div>
        </div>
      )}
    </div>
  );
}
