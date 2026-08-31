import { MURMURATION_DEFAULTS, type MurmurationParams } from './Murmuration'

// Every parameter the component takes, with the palette expressed as an index
// into the swatch list the tool offers. Derived rather than restated, so adding
// a parameter to the component cannot leave the tool behind.
export type Controls = Omit<MurmurationParams, 'palette'> & { paletteIndex: number }

const { palette: _palette, ...numbers } = MURMURATION_DEFAULTS

export const DEFAULTS: Controls = { ...numbers, paletteIndex: 0 }
