import { startTransition, useCallback } from 'react';

/*
 * onSubmit que dispara uma Server Action de useActionState sem o reset
 * automatico do React 19.
 *
 * Com <form action={...}>, o React limpa os campos nao controlados ao fim de
 * cada envio: um login com senha errada apagaria o e-mail digitado, e o
 * editor de perfil voltaria aos valores antigos. O submitter vai junto para
 * que botoes com name/value (aceitar, recusar...) cheguem a action.
 */
export default function useActionSubmit(formAction) {
  return useCallback((event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget, event.nativeEvent.submitter);
    startTransition(() => formAction(formData));
  }, [formAction]);
}
