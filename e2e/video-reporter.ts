import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter'

// Copies each test's video to recordings/<file>--<test-title>.(mp4|webm).
// Converts to mp4 when ffmpeg is on PATH (plays everywhere GitHub renders
// attachments); otherwise keeps Playwright's native webm.
const outDir = 'recordings'

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const hasFfmpeg = (() => {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
})()

export default class VideoReporter implements Reporter {
  private saved: string[] = []

  onBegin() {
    rmSync(outDir, { recursive: true, force: true })
    mkdirSync(outDir, { recursive: true })
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const video = result.attachments.find((a) => a.name === 'video' && a.path)
    if (!video?.path) return

    // titlePath: ['', project, file, ...describes, title]
    const name = slug(test.titlePath().slice(2).join(' '))
    const suffix = result.retry ? `-retry${result.retry}` : ''
    const base = join(outDir, `${name}${suffix}`)

    if (hasFfmpeg) {
      const out = `${base}.mp4`
      execFileSync(
        'ffmpeg',
        ['-y', '-loglevel', 'error', '-i', video.path, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out],
        { stdio: 'inherit' },
      )
      this.saved.push(out)
    } else {
      const out = `${base}.webm`
      copyFileSync(video.path, out)
      this.saved.push(out)
    }
  }

  onEnd() {
    if (!this.saved.length) return
    console.log(`\n🎬 ${this.saved.length} recording(s) — drag into the PR description:`)
    for (const f of this.saved) console.log(`   ${f}`)
  }
}
