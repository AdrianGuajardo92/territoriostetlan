import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export default defineConfig({
  plugins: [
    react(),
    // Bridge local de desarrollo: permite que el inspector copie PNG al portapapeles
    // del sistema aunque el preview embebido bloquee navigator.clipboard.write().
    {
      name: 'dev-inspector-clipboard',
      apply: 'serve',
      configureServer(server) {
        server.middlewares.use('/api/dev-inspector-clipboard', async (req, res) => {
          if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'method_not_allowed' }));
            return;
          }

          const remoteAddress = req.socket.remoteAddress || '';
          const isLoopback = remoteAddress === '::1'
            || remoteAddress === '127.0.0.1'
            || remoteAddress === '::ffff:127.0.0.1';
          if (!isLoopback) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'local_only' }));
            return;
          }

          if (process.platform !== 'darwin') {
            res.writeHead(501, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'unsupported_platform' }));
            return;
          }

          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
            if (body.length > 12 * 1024 * 1024) {
              req.destroy();
            }
          });

          req.on('end', async () => {
            let tmpPath = null;
            try {
              const payload = JSON.parse(body || '{}');
              const rawImage = String(payload.imageBase64 || '');
              const base64 = rawImage.includes(',')
                ? rawImage.slice(rawImage.indexOf(',') + 1)
                : rawImage;
              const imageBuffer = Buffer.from(base64, 'base64');

              if (!imageBuffer.length || imageBuffer.length > 8 * 1024 * 1024) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: 'invalid_image' }));
                return;
              }

              tmpPath = path.join(os.tmpdir(), `territoriostetlan-inspector-${Date.now()}.png`);
              fs.writeFileSync(tmpPath, imageBuffer);

              const escapedPath = tmpPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
              await execFileAsync('osascript', [
                '-e',
                `set the clipboard to (read (POSIX file "${escapedPath}") as «class PNGf»)`
              ]);

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: true, bytes: imageBuffer.length }));
            } catch (err) {
              console.error('[dev-inspector-clipboard] Error:', err);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: false, error: err.message }));
            } finally {
              if (tmpPath) fs.unlink(tmpPath, () => {});
            }
          });
        });
      }
    }
  ],
  server: {
    port: 3500,
    strictPort: false,
    open: true,
    host: true,
    hmr: {
      overlay: true
    }
  },
  resolve: {
    extensions: ['.js', '.jsx'],
    dedupe: ['react', 'react-dom']
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime']
  },
  build: {
    sourcemap: true,
    outDir: 'dist',
    commonjsOptions: {
      transformMixedEsModules: true
    }
  }
})
