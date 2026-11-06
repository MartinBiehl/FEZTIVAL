'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import BrandLogo from '../components/BrandLogo/BrandLogo.jsx';
import './not-found.css';

/*
 * Tela de erro inesperado (banco fora do ar, falha ao carregar uma pagina).
 * Sem ela o Next mostra "Application error: a client-side exception has
 * occurred" em fundo branco. "Tentar de novo" recarrega so o trecho que falhou.
 */
export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="site-shell">
      <main>
        <section className="not-found page-container">
          <div style={{ marginBottom: '3rem' }}><BrandLogo /></div>
          <p className="eyebrow">Algo deu errado</p>
          <h1>O som falhou por um instante.</h1>
          <p className="not-found__lead">
            Não conseguimos carregar esta página agora. Tente de novo em alguns segundos.
          </p>
          <div className="not-found__actions">
            <button className="not-found__primary" type="button" onClick={() => reset()} style={{ border: 0, cursor: 'pointer' }}>
              Tentar de novo
            </button>
            <Link className="not-found__secondary" href="/">
              Voltar ao início <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
