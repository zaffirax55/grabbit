# Grabbit — завантаження відео

Вставте посилання з TikTok, Instagram або Twitter / X і завантажте відео у форматі MP4.

## Локальний запуск

1. Встановіть [Node.js](https://nodejs.org) (v18+).
2. Завантажте [yt-dlp](https://github.com/yt-dlp/yt-dlp/releases/latest) і покладіть `yt-dlp.exe` (Windows) або `yt-dlp` (macOS/Linux) у папку `bin/` — або додайте його в `PATH`.
3. Запустіть сервер:

```bash
node server.js
```

Потім відкрийте http://localhost:3000. На Windows можна просто двічі клацнути `start.bat`.

Якщо платформа щось змінила і відео перестали завантажуватися, оновіть yt-dlp: `bin/yt-dlp.exe -U`.

## Примітки

- Підтримуються лише публічні відео. Деякі Reels в Instagram потребують входу в акаунт і не завантажуються.
- Лише для особистого використання — поважайте авторські права.
