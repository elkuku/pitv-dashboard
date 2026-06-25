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
  const { host, port } = await ctx.serve({ servedir: 'dist', port: 5173 })
  console.log(`Dev server → http://${host}:${port}`)
} else {
  await ctx.rebuild()
  await ctx.dispose()
  console.log('Build complete → dist/')
}
