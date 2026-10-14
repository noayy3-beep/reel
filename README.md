# Reel — a fullscreen video library

A single-file site (`index.html`) that lists every video in this repo's `videos/` folder via the GitHub API and plays them in a borderless, fullscreen player.

## Setup
1. Create a repo, add `index.html` and a `videos/` folder (put at least one video in it).
2. Settings → Pages → deploy from `main` / root.
3. Open `https://<you>.github.io/<repo>/`. Owner and repo are auto-detected. Hosting elsewhere? Fill in `CONFIG` at the top of the script in `index.html`.

## Adding videos
- **Commit files to `videos/`** (or use GitHub's web "Upload files"). They show up for every visitor.
- **Upload button + token** (for you, the owner): paste a fine-grained GitHub token with *Contents: read & write* on this repo. Uploads are committed to `videos/` for everyone. The token stays in your browser's localStorage only.
- **Upload button without a token**: saves to that visitor's browser only (IndexedDB), marked "This device".

## Limits
- GitHub caps files at 100 MB (the API upload path is best under ~50 MB).
- "Any format" is bounded by the browser: MP4 (H.264/AAC), WebM, MOV (H.264), OGV play everywhere. MKV/AVI often won't; convert with `ffmpeg -i in.mkv -c:v libx264 -c:a aac out.mp4`.
- The unauthenticated GitHub API allows 60 requests/hour per visitor IP.

Shortcuts: `Space` play, `F` fullscreen, `M` mute, `←/→` seek, `↑/↓` volume, `N`/`P` next/previous.
