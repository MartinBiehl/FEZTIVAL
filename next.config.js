import path from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fixa a raiz do Turbopack no projeto para que o package-lock.json do
  // diretório pai não seja considerado.
  turbopack: {
    root: path.resolve('.'),
  },
  // AGENTS.md é documentação canônica mantida à mão neste repo.
  // Impede o `next dev` de anexar o bloco nextjs-agent-rules automaticamente.
  agentRules: false,
  /*
   * Cabecalhos de seguranca em todas as respostas:
   *  - frame-ancestors / X-Frame-Options: outro site nao pode abrir o Feztival
   *    dentro de um iframe invisivel para induzir cliques (clickjacking);
   *  - nosniff: o navegador nao "adivinha" o tipo de um arquivo;
   *  - Referrer-Policy: links externos nao recebem o endereco completo da
   *    pagina (que pode ter ?next= e afins);
   *  - Permissions-Policy: camera, microfone e localizacao desligados.
   */
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }];
  },
  experimental: {
    serverActions: {
      // As fotos do editor sobem por Server Action (ate 5 MB, artistMedia.js).
      bodySizeLimit: '6mb',
    },
  },
};

export default nextConfig;
