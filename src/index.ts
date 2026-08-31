// Package entry point. Every type that appears in the public props has to be
// exported too, or a consumer cannot write the value they are being asked for.
export {
  Murmuration,
  MURMURATION_DEFAULTS,
  createField,
  samplePath,
  type MurmurationProps,
  type MurmurationParams,
  type MurmurationHandle,
  type Palette,
  type Vec3,
} from './Murmuration'
