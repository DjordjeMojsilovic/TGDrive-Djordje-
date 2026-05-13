import asyncio
import shutil
from pathlib import Path

import yt_dlp
from utils.logger import Logger

logger = Logger(__name__)

YTDLP_PROGRESS = {}

cache_dir = Path("./cache")
cache_dir.mkdir(parents=True, exist_ok=True)


def _make_progress_hook(id: str):
    def hook(d):
        if d["status"] == "downloading":
            downloaded = d.get("downloaded_bytes") or 0
            total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
            YTDLP_PROGRESS[id] = ("downloading", downloaded, total)
        elif d["status"] == "finished":
            YTDLP_PROGRESS[id] = ("processing", 0, 0)

    return hook


async def ytdlp_download_and_upload(url: str, id: str, drive_path: str):
    from config import MAX_FILE_SIZE
    from utils.uploader import start_file_uploader

    YTDLP_PROGRESS[id] = ("downloading", 0, 0)

    tmpdir = cache_dir / f"ytdlp_{id}"
    tmpdir.mkdir(parents=True, exist_ok=True)

    try:
        ydl_opts = {
            "outtmpl": str(tmpdir / "%(title)s.%(ext)s"),
            # Prefer a single merged mp4; fall back to best single-stream mp4; fall back to anything
            "format": "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            "merge_output_format": "mp4",
            "quiet": True,
            "no_warnings": True,
            "progress_hooks": [_make_progress_hook(id)],
            # Limit to one item so playlists don't explode
            "playlist_items": "1",
            "noplaylist": True,
        }

        loop = asyncio.get_event_loop()

        def _download():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])

        await loop.run_in_executor(None, _download)

        files = [f for f in tmpdir.iterdir() if f.is_file()]
        if not files:
            YTDLP_PROGRESS[id] = ("error", "Download failed – no output file produced", 0)
            return

        filepath = files[0]
        file_size = filepath.stat().st_size
        filename = filepath.name

        if file_size > MAX_FILE_SIZE:
            limit_gb = MAX_FILE_SIZE / (1024 ** 3)
            YTDLP_PROGRESS[id] = (
                "error",
                f"File is too large ({file_size / (1024**3):.2f} GB). Limit is {limit_gb:.2f} GB.",
                0,
            )
            return

        YTDLP_PROGRESS[id] = ("uploading", 0, file_size)

        await start_file_uploader(filepath, id, drive_path, filename, file_size, delete=True)

        YTDLP_PROGRESS[id] = ("completed", file_size, file_size)
        logger.info(f"ytdlp import completed for {url} ({filename})")

    except Exception as e:
        logger.error(f"ytdlp import failed for {url}: {e}")
        YTDLP_PROGRESS[id] = ("error", str(e)[:300], 0)
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)
