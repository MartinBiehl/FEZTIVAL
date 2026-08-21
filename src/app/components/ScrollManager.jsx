'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/*
 * Restaura o scroll ao topo em cada navegação, e rola até o hash quando há um.
 * useLocation() do React Router virou usePathname() do Next.
 * O hash não é exposto no servidor, então lemos window.location.hash no cliente.
 */
function ScrollManager() {
  const pathname = usePathname();

  useEffect(() => {
    const { hash } = window.location;

    if (hash) {
      window.requestAnimationFrame(() => {
        document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return;
    }

    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}

export default ScrollManager;
