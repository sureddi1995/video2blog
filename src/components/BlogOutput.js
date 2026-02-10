import React from 'react';

export default function BlogOutput({ data }) {
  if (!data) return null;

  const { blog, blogLanguage } = data;
  const languageNames = { en: 'English', hi: 'Hindi', te: 'Telugu', ta: 'Tamil' };

  const handleCopyBlog = () => {
    navigator.clipboard.writeText(blog);
    alert('Blog copied to clipboard!');
  };

  return (
    <div className="blog-panel">
      <div className="blog-container">
        <div className="blog-content">
          {blog.split('\n').map((line, idx) => {
            // Heading 1
            if (line.startsWith('# ')) {
              return <h1 key={idx} className="blog-h1">{line.replace('# ', '')}</h1>;
            }
            // Heading 2
            if (line.startsWith('## ')) {
              return <h2 key={idx} className="blog-h2">{line.replace('## ', '')}</h2>;
            }
            // Heading 3
            if (line.startsWith('### ')) {
              return <h3 key={idx} className="blog-h3">{line.replace('### ', '')}</h3>;
            }
            // Bold text
            if (line.includes('**')) {
              const parts = line.split('**');
              return (
                <p key={idx} className="blog-p">
                  {parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part))}
                </p>
              );
            }
            // Italic text
            if (line.includes('_') && !line.startsWith('_')) {
              const parts = line.split('_');
              return (
                <p key={idx} className="blog-p">
                  {parts.map((part, i) => (i % 2 === 1 ? <em key={i}>{part}</em> : part))}
                </p>
              );
            }
            // Empty lines
            if (line.trim() === '') {
              return null;
            }
            // Regular paragraph
            return <p key={idx} className="blog-p">{line}</p>;
          })}
        </div>

        <button className="copy-blog-btn" onClick={handleCopyBlog}>
          Copy Blog
        </button>
      </div>
    </div>
  );
}
