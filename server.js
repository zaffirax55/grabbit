// Grabbit — tiny video downloader server for TikTok / Instagram / Twitter (X).
// No npm dependencies: needs only Node.js and yt-dlp (bin/yt-dlp.exe or on PATH).
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const localBin = path.join(ROOT, "bin", process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp");
const YTDLP = fs.existsSync(localBin) ? localBin : "yt-dlp";

const ALLOWED = [
  { re: /(^|\.)tiktok\.com$/i, name: "TikTok" },
  { re: /(^|\.)instagram\.com$/i, name: "Instagram" },
  { re: /(^|\.)(twitter|x)\.com$/i, name: "Twitter / X" },
];

function detectPlatform(raw) {
  let u;
  try {
    u = new URL(String(raw || "").trim());
  } catch {
    return null;
  }
  if (!/^https?:$/.test(u.protocol)) return null;
  const p = ALLOWED.find((a) => a.re.test(u.hostname));
  return p ? { url: u.toString(), name: p.name } : null;
}

function runYtDlp(args, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const proc = spawn(YTDLP, args, { windowsHide: true });
    let out = "";
    let err = "";
    const timer = setTimeout(() => proc.kill(), timeoutMs);
    proc.stdout.on("data", (d) => (out += d));
    proc.stderr.on("data", (d) => (err += d));
    proc.on("error", (e) => {
      clearTimeout(timer);
      reject(new Error(e.code === "ENOENT" ? "yt-dlp не знайдено. Покладіть yt-dlp.exe у папку bin." : e.message));
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(out);
      else {
        const line = err.split("\n").reverse().find((l) => l.includes("ERROR")) || err.trim().split("\n").pop() || "невідома помилка";
        reject(new Error(line.replace(/^ERROR:\s*/, "")));
      }
    });
  });
}

// Only formats with video + audio in one file (no ffmpeg needed).
const FORMAT = "b[ext=mp4][vcodec!=none][acodec!=none]/b[vcodec!=none][acodec!=none]/b";

function sendJson(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve) => {
    let b = "";
    req.on("data", (c) => {
      b += c;
      if (b.length > 1e5) req.destroy();
    });
    req.on("end", () => resolve(b));
  });
}

function safeName(s) {
  return (s || "video").replace(/[\\/:*?"<>|\r\n\t#]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "video";
}

async function handleInfo(req, res) {
  let body = {};
  try {
    body = JSON.parse(await readBody(req));
  } catch {}
  const p = detectPlatform(body.url);
  if (!p) return sendJson(res, 400, { error: "Вставте посилання з TikTok, Instagram або Twitter / X." });
  try {
    const raw = await runYtDlp(["-J", "--no-playlist", "--no-warnings", "--", p.url]);
    const j = JSON.parse(raw);
    const v = j.entries ? j.entries.find((e) => e && e.formats) || j.entries[0] : j;
    sendJson(res, 200, {
      platform: p.name,
      url: p.url,
      title: v.title || v.description || "Відео",
      uploader: v.uploader || v.channel || "",
      duration: v.duration || null,
      thumbnail: v.thumbnail || null,
      width: v.width || null,
      height: v.height || null,
    });
  } catch (e) {
    sendJson(res, 422, { error: "Не вдалося отримати відео: " + e.message });
  }
}

async function handleDownload(req, res, query) {
  const p = detectPlatform(query.get("url"));
  if (!p) return sendJson(res, 400, { error: "Невірне посилання." });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vdl-"));
  const cleanup = () => fs.rm(dir, { recursive: true, force: true }, () => {});
  try {
    await runYtDlp(
      ["-f", FORMAT, "--no-playlist", "--no-warnings", "--no-part", "-o", path.join(dir, "%(id)s.%(ext)s"), "--", p.url],
      300000
    );
    const file = fs.readdirSync(dir).map((f) => path.join(dir, f)).find((f) => fs.statSync(f).isFile());
    if (!file) throw new Error("файл не завантажився");
    const ext = path.extname(file) || ".mp4";
    const name = safeName(query.get("name")) + ext;
    res.writeHead(200, {
      "Content-Type": ext === ".mp4" ? "video/mp4" : "application/octet-stream",
      "Content-Length": fs.statSync(file).size,
      "Content-Disposition": `attachment; filename="video${ext}"; filename*=UTF-8''${encodeURIComponent(name)}`,
    });
    const s = fs.createReadStream(file);
    s.pipe(res);
    s.on("close", cleanup);
    res.on("close", cleanup);
  } catch (e) {
    cleanup();
    sendJson(res, 422, { error: "Помилка завантаження: " + e.message });
  }
}

http
  .createServer((req, res) => {
    const u = new URL(req.url, "http://localhost");
    if (req.method === "GET" && (u.pathname === "/" || u.pathname === "/index.html")) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return fs.createReadStream(path.join(ROOT, "public", "index.html")).pipe(res);
    }
    if (req.method === "POST" && u.pathname === "/api/info") return handleInfo(req, res);
    if (req.method === "GET" && u.pathname === "/api/download") return handleDownload(req, res, u.searchParams);
    sendJson(res, 404, { error: "Not found" });
  })
  .listen(PORT, () => console.log(`Ready: http://localhost:${PORT}  (yt-dlp: ${YTDLP})`));
