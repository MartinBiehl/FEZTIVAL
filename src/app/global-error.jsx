'use client';

/*
 * Ultima rede de seguranca: erro no proprio layout raiz. Precisa desenhar o
 * <html> inteiro e nao pode contar com o CSS do site, por isso o estilo e local.
 */
export default function GlobalError({ reset }) {
  return (
    <html lang="pt-BR">
      <body style={{
        margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '2rem',
        background: '#f4f2ec', color: '#111', fontFamily: 'system-ui, sans-serif', textAlign: 'center',
      }}
      >
        <main>
          <h1 style={{ fontSize: '2rem', margin: '0 0 0.75rem' }}>O som falhou por um instante.</h1>
          <p style={{ color: '#65645f', margin: '0 0 2rem' }}>Não conseguimos carregar o Feztival agora.</p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: '0.9rem 1.6rem', border: 0, borderRadius: 999, background: '#111', color: '#fff',
              fontWeight: 700, cursor: 'pointer',
            }}
          >
            Tentar de novo
          </button>
        </main>
      </body>
    </html>
  );
}
