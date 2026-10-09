const MOCKS = new URL('./next-mocks.mjs', import.meta.url).href;
const EMPTY = 'data:text/javascript,export {}';
const MOCKED = new Set(['next/headers', 'next/cache', 'next/server']);

export async function resolve(specifier, context, next) {
  if (MOCKED.has(specifier)) return { url: MOCKS, shortCircuit: true };
  if (specifier === 'server-only') return { url: EMPTY, shortCircuit: true };
  return next(specifier, context);
}
