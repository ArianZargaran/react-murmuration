// Regenerates the props tables in README.md from the control spec, so the
// package's landing page cannot drift from the parameters the component takes.
// Run with `npm run docs`. Everything outside the markers is left alone.
import { readFileSync, writeFileSync } from 'node:fs'
import { MURMURATION_DEFAULTS } from '../src/Murmuration'
import { GROUPS, EXTRA_PROPS } from '../src/params'


const rows = (r: [string, string, string][]) =>
  ['| Prop | Default | |', '|---|---|---|', ...r.map((c) => `| \`${c[0]}\` | \`${c[1]}\` | ${c[2]} |`)].join('\n')

const body = [
  ...GROUPS.map((g) =>
    [
      `### ${g.title}`,
      '',
      rows(
        g.items.map((s) => [
          s.key,
          String(MURMURATION_DEFAULTS[s.key]),
          `${s.hint} Range \`${s.min}\`–\`${s.max}\`.`,
        ])
      ),
    ].join('\n')
  ),
  ['### Other', '', rows(EXTRA_PROPS.map((r) => [r[0], r[1], r[2]] as [string, string, string]))].join('\n'),
].join('\n\n')

const START = '<!-- props:start -->'
const END = '<!-- props:end -->'
const readme = readFileSync('README.md', 'utf8')
const a = readme.indexOf(START)
const b = readme.indexOf(END)
if (a === -1 || b === -1) throw new Error(`README.md is missing the ${START} / ${END} markers`)

writeFileSync('README.md', `${readme.slice(0, a + START.length)}\n\n${body}\n\n${readme.slice(b)}`)
console.log(`README props tables regenerated: ${GROUPS.reduce((n, g) => n + g.items.length, 0) + EXTRA_PROPS.length} rows`)
