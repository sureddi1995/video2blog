import React, { useState } from 'react';
import './App.css';
import UploadForm from './components/UploadForm';
import BlogOutput from './components/BlogOutput';

function App() {
  const [result, setResult] = useState(null);
  const [fileName, setFileName] = useState(null);

  const handleUploadComplete = (data) => {
    setResult(data);
  };

  const handleFileSelect = (filename) => {
    setFileName(filename);
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <h1>Video to <span className="highlight">SEO</span> Blog Generator</h1>
          <p>Convert your video into an SEO-optimized blog post</p>
        </div>
      </header>
      <main className="App-main">
        <div className="main-container">
          <UploadForm 
            onUploadComplete={handleUploadComplete} 
            onFileSelect={handleFileSelect}
            fileName={fileName}
            result={result}
          />
          {result && <BlogOutput data={result} />}
        </div>
      </main>
    </div>
  );
}

export default App;
