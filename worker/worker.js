// Cloudflare Worker + R2 bucket (binding: BUCKET). Free tier: 10 GB storage, zero egress fees.
// Optional secret UPLOAD_PASSWORD gates uploads. MAX_BYTES caps total storage (default 9.8 GB).
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,POST,PUT,OPTIONS",
  "Access-Control-Allow-Headers": "X-Password,Content-Type,Range",
  "Access-Control-Expose-Headers": "Content-Length,Content-Range,Accept-Ranges",
};
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const err = (m, s = 400) => new Response(m, { status: s, headers: CORS });
const VIDEO = /\.(mp4|m4v|mov|webm|ogv|ogg|mkv|avi|3gp|mpg|mpeg|ts)$/i;

export default {
  async fetch(req, env) {
    const url = new URL(req.url), p = url.pathname;
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

    if (p === "/list") {
      const out = []; let cursor;
      do {
        const r = await env.BUCKET.list({ cursor, include: ["customMetadata"] });
        for (const o of r.objects) out.push({ key: o.key, name: o.customMetadata?.name || o.key, size: o.size, at: +o.uploaded });
        cursor = r.truncated ? r.cursor : undefined;
      } while (cursor);
      return json(out.sort((a, b) => b.at - a.at));
    }

    if (p.startsWith("/v/")) {
      const key = decodeURIComponent(p.slice(3));
      const head = await env.BUCKET.head(key);
      if (!head) return err("not found", 404);
      const total = head.size, range = req.headers.get("Range");
      const h = new Headers(CORS);
      h.set("Content-Type", head.httpMetadata?.contentType || "video/mp4");
      h.set("Accept-Ranges", "bytes"); h.set("Cache-Control", "public, max-age=86400");
      if (req.method === "HEAD") { h.set("Content-Length", total); return new Response(null, { headers: h }); }
      const m = range && /bytes=(\d*)-(\d*)/.exec(range);
      if (m) {
        let start = m[1] === "" ? total - +m[2] : +m[1];
        let end = m[1] !== "" && m[2] !== "" ? Math.min(+m[2], total - 1) : total - 1;
        if (start > end || start >= total) return new Response(null, { status: 416, headers: { ...CORS, "Content-Range": `bytes */${total}` } });
        const o = await env.BUCKET.get(key, { range: { offset: start, length: end - start + 1 } });
        h.set("Content-Range", `bytes ${start}-${end}/${total}`); h.set("Content-Length", end - start + 1);
        return new Response(o.body, { status: 206, headers: h });
      }
      const o = await env.BUCKET.get(key); h.set("Content-Length", total);
      return new Response(o.body, { headers: h });
    }

    if (p.startsWith("/upload/")) {
      if (env.UPLOAD_PASSWORD && req.headers.get("X-Password") !== env.UPLOAD_PASSWORD) return err("wrong password", 401);

      if (p === "/upload/start" && req.method === "POST") {
        const name = (url.searchParams.get("name") || "video").slice(0, 200), size = +url.searchParams.get("size") || 0;
        if (!VIDEO.test(name)) return err("not a video file");
        let used = 0, cursor;
        do { const r = await env.BUCKET.list({ cursor }); r.objects.forEach(o => used += o.size); cursor = r.truncated ? r.cursor : undefined; } while (cursor);
        if (used + size > +(env.MAX_BYTES || 9.8e9)) return err("library is full (10 GB free limit)", 507);
        const key = crypto.randomUUID() + name.slice(name.lastIndexOf(".")).toLowerCase();
        const mp = await env.BUCKET.createMultipartUpload(key, {
          httpMetadata: { contentType: url.searchParams.get("type") || "video/mp4" }, customMetadata: { name } });
        return json({ key, uploadId: mp.uploadId });
      }
      const key = url.searchParams.get("key"), uploadId = url.searchParams.get("uploadId");
      if (p === "/upload/part" && req.method === "PUT") {
        const part = await env.BUCKET.resumeMultipartUpload(key, uploadId).uploadPart(+url.searchParams.get("n"), req.body);
        return json({ partNumber: part.partNumber, etag: part.etag });
      }
      if (p === "/upload/finish" && req.method === "POST") {
        const b = await req.json();
        await env.BUCKET.resumeMultipartUpload(b.key, b.uploadId).complete(b.parts);
        return json({ ok: true });
      }
    }
    return err("not found", 404);
  },
};
