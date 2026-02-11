# Use Node.js 22 LTS as base image
FROM node:22-slim

# Install system dependencies: ffmpeg, yt-dlp, and required libraries
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp (latest version)
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# Verify installations
RUN yt-dlp --version && ffmpeg -version && node --version

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create directories for uploads
RUN mkdir -p /tmp/video2blog/uploads /tmp/video2blog/audio

# Expose port (Render will override this with PORT env var)
EXPOSE 10000

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["node", "index.js"]
