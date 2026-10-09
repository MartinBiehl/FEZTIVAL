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
  experimental: {
    serverActions: {
      // As fotos do editor sobem por Server Action (ate 5 MB, artistMedia.js).
      bodySizeLimit: '6mb',
    },
  },
};

export default nextConfig;
