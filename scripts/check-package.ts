// Typechecks a consumer against the package's PUBLISHED type surface.
//
// This exists because 0.0.1 shipped with `Vec3` unexported — the element type of
// the public `path` prop, so a TypeScript consumer was asked for a value they
// could not name. Every check inside the repo passed, because in here `Vec3`
// resolves from source. It only fails across the package boundary, which is the
// one place nothing was looking.
//
// Run by `npm run check:package`, and by prepublishOnly so it cannot ship again.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const root = process.cwd()
const work = mkdtempSync(join(tmpdir(), 'murmuration-pkg-'))

try {
  // Pack and unpack, so the check sees exactly the files npm would send.
  const tgz = execFileSync('npm', ['pack', '--silent', '--pack-destination', work], {
    cwd: root,
    encoding: 'utf8',
  }).trim()
  execFileSync('tar', ['-xzf', join(work, tgz), '-C', work])
  const pkg = join(work, 'package')

  // A consumer that names every type it is handed.
  writeFileSync(
    join(work, 'consumer.tsx'),
    `import { Murmuration, MURMURATION_DEFAULTS, createField, samplePath } from 'react-murmuration'
import type {
  MurmurationProps, MurmurationParams, MurmurationHandle, Palette, Vec3,
} from 'react-murmuration'

const palette: Palette = { background: '#000', stops: ['#111', '#eee'] }
const path: Vec3[] = [[0, 0.5, 0], [1, 0.5, 1]]

export function Consumer(props: MurmurationProps) {
  const params: MurmurationParams = { ...MURMURATION_DEFAULTS, path, palette }
  const make = (c: HTMLCanvasElement): MurmurationHandle => createField(c, params)
  void make
  void samplePath(path, 8)
  return <Murmuration path={path} palette={palette} {...props} />
}
`
  )

  writeFileSync(
    join(work, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        lib: ['ES2020', 'DOM'],
        module: 'ESNext',
        moduleResolution: 'bundler',
        jsx: 'react-jsx',
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        typeRoots: [join(root, 'node_modules', '@types')],
        baseUrl: '.',
        paths: { 'react-murmuration': [pkg], react: [join(root, 'node_modules', 'react')] },
      },
      files: ['consumer.tsx'],
    })
  )

  execFileSync(join(root, 'node_modules', '.bin', 'tsc'), ['-p', join(work, 'tsconfig.json')], {
    stdio: 'inherit',
  })

  const shipped = readdirSync(pkg, { recursive: true }) as string[]
  console.log(`package check passed — ${shipped.filter((f) => f.includes('.')).length} files, types resolve for a consumer`)
} finally {
  rmSync(work, { recursive: true, force: true })
}
