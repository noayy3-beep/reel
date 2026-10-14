# 10 GB free uploads (Cloudflare R2 + Worker)

R2's free tier = 10 GB storage, no egress fees, no credit card needed for the Worker (R2 itself asks for a card but only bills past the free tier).

```bash
npm i -g wrangler && wrangler login
wrangler r2 bucket create reel-videos
cd worker && wrangler deploy
wrangler secret put UPLOAD_PASSWORD   # optional but recommended: stops strangers filling your 10 GB
```
Copy the printed `https://reel-uploads.<you>.workers.dev` URL into `CONFIG.api` in `index.html`.
Uploads are chunked (50 MB parts, auto-retry), so a 10 GB file works; the Worker refuses uploads past ~9.8 GB total.
