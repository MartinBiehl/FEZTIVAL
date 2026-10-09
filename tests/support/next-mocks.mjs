/*
 * O que o Next fornece as Server Actions, simulado para os testes: cookies()
 * le e grava no "navegador" atual (globalThis.testCookieJar, um Map trocado
 * pelo teste para agir como outra pessoa), e revalidatePath nao faz nada.
 */
export function cookies() {
  const jar = globalThis.testCookieJar;
  return {
    get: (name) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    has: (name) => jar.has(name),
    set: (name, value) => { jar.set(name, value); },
    delete: (name) => { jar.delete(name); },
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
  };
}

export function headers() {
  return new Headers({ origin: 'http://localhost:3000' });
}

export function revalidatePath() {}

export class NextResponse extends Response {
  static redirect(url) {
    return new Response(null, { status: 307, headers: { location: String(url) } });
  }
}
