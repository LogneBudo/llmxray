#!/usr/bin/env node
// Regenerates the README screenshots and the demo GIF.
//
//   npm run screenshots
//
// 1. Runs the Playwright "screenshots" project against the dev server and the
//    local Ollama daemon (every PNG in docs/public/screenshots, plus demo.webm).
// 2. Converts demo.webm to demo.gif with ffmpeg (two-pass palette, 800px wide).
//
// Needs ffmpeg on PATH. Pass --gif-only to skip the capture and only re-encode.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const OUT = process.env.SHOTS_DIR ?? path.resolve('docs/public/screenshots')
const gifOnly = process.argv.includes('--gif-only')

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts })
  if (r.status !== 0) {
    console.error(`${cmd} ${args.join(' ')} exited with ${r.status}`)
    process.exit(r.status ?? 1)
  }
}

if (!gifOnly) {
  run('npx', ['playwright', 'test', '--project=screenshots'], { env: { ...process.env, SHOTS_DIR: OUT } })
}

const webm = path.join(OUT, 'demo.webm')
if (!fs.existsSync(webm)) {
  console.error(`No ${webm}; the "record a chat turn" test did not produce a video.`)
  process.exit(1)
}

const gif = path.join(OUT, 'demo.gif')
const palette = path.join(OUT, 'demo-palette.png')
const filters = 'fps=12,scale=800:-1:flags=lanczos'
run('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-vf', `${filters},palettegen=stats_mode=diff`, palette])
run('ffmpeg', [
  '-y', '-loglevel', 'error', '-i', webm, '-i', palette,
  '-lavfi', `${filters}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`,
  gif,
])
fs.rmSync(palette, { force: true })
fs.rmSync(webm, { force: true })
const mb = (fs.statSync(gif).size / 1e6).toFixed(1)
console.log(`demo.gif written (${mb} MB)`)
