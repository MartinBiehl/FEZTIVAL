/*
 * Permite importar as Server Actions fora do Next: next/headers, next/cache e
 * next/server viram os simulados de next-mocks.mjs, e server-only vira vazio.
 */
import { register } from 'node:module';

register('./hooks.mjs', import.meta.url);
