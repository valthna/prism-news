/**
 * Sources domain module - Export principal
 */

export {
  CURATED_SOURCE_POOL,
  DEFAULT_POSITION_BY_BIAS,
  BIAS_ROTATION_ORDER,
  findKnownSourceProfile,
  getSourcesByBias,
} from './SourcePool';
export type { CuratedSourceProfile } from './SourcePool';

export {
  sanitizeBias,
  enrichCoverageSummary,
  hydrateRawSource,
  dedupeSources,
  ensureSourceFloor,
} from './SourceEnricher';

