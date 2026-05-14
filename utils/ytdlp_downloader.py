import asyncio
import os
import shutil
from pathlib import Path

import yt_dlp
from utils.logger import Logger

logger = Logger(__name__)

YTDLP_PROGRESS = {}

cache_dir = Path("./cache")
cache_dir.mkdir(parents=True, exist_ok=True)

# Optional path to a Netscape-format cookies file (e.g. exported from a browser).
# Set the YTDLP_COOKIES_FILE environment variable to the absolute path of the file.
# Required for Instagram reels/posts that need a logged-in session.
_COOKIES_FILE = os.environ.get("YTDLP_COOKIES_FILE", "")


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
            "format": "best[filesize<1900M]/best",
            "quiet": True,
            "no_warnings": True,
            "progress_hooks": [_make_progress_hook(id)],
            # tv_embedded bypasses YouTube's bot-protection: the embedded TV
            # client is whitelisted and doesn't require sign-in or PO tokens.
            # player_skip=['webpage'] avoids fetching the full watch page,
            # which is where most bot-detection happens.
            "extractor_args": {
                "youtube": {
                    "player_client": ["tv_embedded"],
                    "player_skip": ["webpage"],
                }
            },
            # oauth2 plugin (yt-dlp-youtube-oauth2) — provides PO tokens via
            # device-flow OAuth so age-restricted / sign-in-required videos
            # also work. Silently ignored if the plugin is not installed.
            "use_oauth2": True,
            "allow_unplayable_formats": True,
            # Limit to one item so playlists don't explode
            "playlist_items": "1",
            "noplaylist": True,
        }

        # Attach cookies file if configured — needed for Instagram, Twitter/X,
        # and other platforms that require a logged-in session.
        if _COOKIES_FILE and Path(_COOKIES_FILE).is_file():
            ydl_opts["cookiefile"] = _COOKIES_FILE
            logger.info(f"ytdlp: using cookies file {_COOKIES_FILE}")

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
        error_msg = str(e)
        # Provide clearer messages for the two most common failure modes
        if "ffmpeg is not installed" in error_msg:
            error_msg = "ffmpeg fehlt auf dem Server. Bitte im Dockerfile installieren."
        elif "empty media response" in error_msg or "cookies" in error_msg.lower():
            error_msg = (
                "Login erforderlich. Setze YTDLP_COOKIES_FILE auf einen Pfad zu einer "
                "Netscape-cookies.txt (z.B. mit der Browser-Extension 'Get cookies.txt')."
            )
        logger.error(f"ytdlp import failed for {url}: {e}")
        YTDLP_PROGRESS[id] = ("error", error_msg[:400], 0)
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)
