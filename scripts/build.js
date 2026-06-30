import esbuild from 'esbuild'
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'fs'

const dev = process.argv.includes('--dev')

rmSync('dist', { recursive: true, force: true })

const html = readFileSync('index.html', 'utf8').replace(
  '<script type="module" src="/src/main.ts"></script>',
  '<link rel="stylesheet" href="/assets/main.css" />\n    <script type="module" src="/assets/main.js"></script>'
)
mkdirSync('dist', { recursive: true })
writeFileSync('dist/index.html', html)

const ctx = await esbuild.context({
  entryPoints: ['src/main.ts'],
  bundle: true,
  minify: !dev,
  outdir: 'dist/assets',
  target: 'es2022',
  sourcemap: dev,
})

if (dev) {
  await ctx.watch()
  // esbuild serves static files on internal port; proxy sits on 5173
  const { port: ebPort } = await ctx.serve({ servedir: 'dist', port: 5174 })

  // Start Python API server
  const { spawn } = await import('child_process')
  const py = spawn('python3', ['server/stats.py'], { stdio: 'inherit' })
  py.on('error', e => console.error('Python server error:', e.message))

  // Proxy: /api/* → localhost:3001, everything else → esbuild
  const http = await import('http')
  const proxy = http.createServer((req, res) => {
    const target = req.url.startsWith('/api/')
      ? { host: '127.0.0.1', port: 3001 }
      : { host: '127.0.0.1', port: ebPort }
    const proxyReq = http.request(
      { ...target, path: req.url, method: req.method, headers: req.headers },
      proxyRes => { res.writeHead(proxyRes.statusCode, proxyRes.headers); proxyRes.pipe(res) }
    )
    proxyReq.on('error', () => { res.writeHead(502); res.end() })
    req.pipe(proxyReq)
  })
  proxy.listen(5173, () => console.log('Dev server → http://localhost:5173'))

  process.on('SIGINT', () => { py.kill(); process.exit() })
} else {
  await ctx.rebuild()
  await ctx.dispose()
  console.log('Build complete → dist/')
}
