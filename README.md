# Video to Blog

Generate an SEO blog article from a video: upload an .mp4 → extract audio (FFmpeg) → transcribe (OpenAI Whisper) → generate blog (Google Gemini). Runs locally with no database.

## Local setup

### 1. FFmpeg

Install [FFmpeg](https://ffmpeg.org/) and ensure `ffmpeg` is on your PATH.

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env and set GEMINI_API_KEY=your-key-from-https://aistudio.google.com/app/apikey
npm install
npm start
```

Backend runs at `http://localhost:3001` (or set `PORT` in `.env`).

### 3. Frontend

From the project root:

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000). Use "Choose video (.mp4)" to upload; the app will return the transcript and generated blog. Use "Copy article" to copy the markdown.

### Environment

- **Backend** (in `backend/` or project root): `GEMINI_API_KEY` (required, get it from [Google AI Studio](https://aistudio.google.com/app/apikey)), optional `PORT`, optional `REQUEST_TIMEOUT_MS`.
- **Frontend**: optional `REACT_APP_API_URL` (default `http://localhost:3001`).

### Setup: Get your Gemini API key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Click **Create API key** → **Create API key in new project**.
3. Copy the generated API key and paste it into `backend/.env`:
   ```env
   GEMINI_API_KEY=your-copied-key-here
   ```
4. Restart the backend and try uploading a video.

The app uses Google's **Gemini 2.5 Flash Lite** model for blog generation and **OpenAI Whisper** for audio transcription (handled transparently).

---

# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
