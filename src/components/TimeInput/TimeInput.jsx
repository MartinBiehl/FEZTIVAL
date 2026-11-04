'use client';

import { Clock } from 'lucide-react';
import {
  TIME_LENGTH, TIME_PATTERN, completeTime, shapeTime,
} from '../../lib/timeOfDay.js';
import './TimeInput.css';

/* Posicao no texto logo depois do n-esimo digito. */
function caretAfterDigits(text, count) {
  let seen = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (seen === count) return index;
    if (/\d/.test(text[index])) seen += 1;
  }
  return text.length;
}

/*
 * Campo de horario para digitar, no lugar do seletor do navegador (type="time"),
 * que escondia a digitacao atras de uma lista com scroll. Continua nao
 * controlado e entrega HH:MM no FormData, como o campo anterior. O relogio
 * nao recebe clique: quem clica nele esta clicando no proprio campo.
 *
 * "pattern" fica para a validacao: em um formulario com noValidate, ela aparece
 * em validity.patternMismatch; nos demais, no aviso do navegador. Com
 * validate={false} (dia desligado) o valor nao importa e nao trava o envio.
 */
export default function TimeInput({ onChange, validate = true, ...props }) {
  function handleChange(event) {
    const input = event.currentTarget;
    const { value, selectionStart } = input;
    const shaped = shapeTime(value);
    if (shaped !== value) {
      const digitsBefore = value.slice(0, selectionStart).replace(/\D/g, '').length;
      const digitsAdded = shaped.replace(/\D/g, '').length - value.replace(/\D/g, '').length;
      const caret = caretAfterDigits(shaped, digitsBefore + Math.max(digitsAdded, 0));
      input.value = shaped;
      input.setSelectionRange(caret, caret);
    }
    onChange?.(event);
  }

  /*
   * O setter nativo e necessario: o React ignora um evento "input" depois de
   * value = ..., e o formulario em volta nao saberia do valor completado.
   */
  function commit(input) {
    const completed = completeTime(input.value);
    if (completed === input.value) return;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, completed);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /* Depois do quadro: o clique do mouse poe o cursor no lugar logo apos o foco. */
  function selectAll(event) {
    const input = event.currentTarget;
    requestAnimationFrame(() => {
      if (document.activeElement === input) input.select();
    });
  }

  return (
    <span className="time-input">
      <input
        {...props}
        className="time-input__field"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={TIME_LENGTH}
        pattern={validate ? TIME_PATTERN : undefined}
        title={validate ? 'Use um horário entre 00:00 e 23:59' : undefined}
        onChange={handleChange}
        onFocus={selectAll}
        onBlur={(event) => commit(event.currentTarget)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit(event.currentTarget);
        }}
      />
      <Clock size={17} aria-hidden="true" />
    </span>
  );
}
