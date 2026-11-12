# Grabbit — Video Downloader

Paste a TikTok, Instagram or Twitter / X link and download the video as MP4.

## Run locally

1. Install [Node.js](https://nodejs.org) (v18+).
2. Download [yt-dlp](https://github.com/yt-dlp/yt-dlp/releases/latest) and put `yt-dlp.exe` (Windows) or `yt-dlp` (macOS/Linux) into the `bin/` folder — or have it on your `PATH`.
3. Start the server:

```bash
node server.js
```

Then open http://localhost:3000. On Windows you can just double-click `start.bat`.

Keep yt-dlp up to date when a platform changes: `bin/yt-dlp.exe -U`.

## Notes

- Only public videos are supported. Some Instagram Reels require login and can't be fetched.
- For personal use only — respect copyright and creators.
