import { createReadStream, statSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
export function filmReviewPlugin() {
  return {
    name: 'private-founder-film-review',
    configureServer(server) {
      const file = process.env.FILM_REVIEW_SOURCE;
      if (!file) return;
      const expected = process.env.FILM_REVIEW_SHA256;
      if (!expected || createHash('sha256').update(readFileSync(file)).digest('hex') !== expected) throw new Error('Private film source does not match its review manifest');
      const original = statSync(file);
      server.middlewares.use('/review-media/founder-film.mp4', (req, res) => {
        const current = statSync(file);
        if (current.mtimeMs !== original.mtimeMs || current.size !== original.size) { res.writeHead(409); res.end('Film changed; restart the reviewed preview'); return; }
        if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
        const size = current.size;
        const range = req.headers.range;
        let start = 0, end = size - 1;
        if (range) {
          const m = /^bytes=(\d*)-(\d*)$/.exec(range);
          if (!m || (!m[1] && !m[2])) { res.writeHead(416, {'Content-Range':`bytes */${size}`});res.end();return; }
          if (!m[1]) start = Math.max(0, size - Number(m[2]));
          else { start = Number(m[1]);if(m[2])end=Math.min(end,Number(m[2])); }
          if (!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=size) { res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return; }
        }
        res.writeHead(range ? 206 : 200, {'Content-Type':'video/mp4','Content-Length':end-start+1,'Accept-Ranges':'bytes','Cache-Control':'private, no-store',...(range?{'Content-Range':`bytes ${start}-${end}/${size}`}:{})});
        if (req.method==='HEAD')res.end();else createReadStream(file,{start,end}).pipe(res);
      });
    }
  };
}
