import Home from '../../views/Home/Home.jsx';

export const metadata = {
  /*
   * A landing usa o título padrão definido no layout raiz (sem o template),
   * porque é a página que representa a marca inteira.
   */
  alternates: { canonical: '/' },
};

export default function Page() {
  return <Home />;
}
