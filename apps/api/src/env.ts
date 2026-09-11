const NON_PRODUCTION_ENVS = new Set(['development', 'test']);

// Unset or misspelled NODE_ENV is treated as production: fail closed on
// required secrets/origins instead of silently using dev defaults.
export function isNonProductionEnv(): boolean {
  return NON_PRODUCTION_ENVS.has(process.env.NODE_ENV ?? '');
}
