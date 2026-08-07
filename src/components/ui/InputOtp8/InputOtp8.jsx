import { useEffect, useId, useRef, useState } from 'react';
import './InputOtp8.css';

function InputOtp8({ label = 'Digite o código', length = 4, onChange, value }) {
  const id = useId();
  const inputRefs = useRef([]);
  const [digits, setDigits] = useState(() => Array.from({ length }, (_, index) => value[index] || ''));
  const digitsRef = useRef(digits);

  useEffect(() => {
    if (value === digitsRef.current.join('')) return;
    const nextDigits = Array.from({ length }, (_, index) => value[index] || '');
    digitsRef.current = nextDigits;
    setDigits(nextDigits);
  }, [length, value]);

  const updateDigits = (nextDigits) => {
    digitsRef.current = nextDigits;
    setDigits(nextDigits);
    onChange(nextDigits.join('').slice(0, length));
  };

  const distributeDigits = (rawValue, startIndex = 0) => {
    const incoming = rawValue.replace(/\D/g, '').slice(0, length - startIndex);
    if (!incoming) return;

    const nextDigits = [...digitsRef.current];
    incoming.split('').forEach((digit, offset) => {
      nextDigits[startIndex + offset] = digit;
    });
    updateDigits(nextDigits);

    const nextIndex = Math.min(startIndex + incoming.length, length - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleChange = (event, index) => {
    const rawValue = event.target.value;
    if (rawValue.replace(/\D/g, '').length > 1) {
      distributeDigits(rawValue, index);
      return;
    }

    const nextDigits = [...digitsRef.current];
    nextDigits[index] = rawValue.replace(/\D/g, '').slice(-1);
    updateDigits(nextDigits);

    if (nextDigits[index] && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (event, index) => {
    if (event.key === 'Backspace' && !digitsRef.current[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowRight' && index < length - 1) {
      event.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    distributeDigits(event.clipboardData.getData('text'));
  };

  return (
    <div className="input-otp-08">
      <span className="input-otp-08__label" id={`${id}-label`}>{label}</span>
      <div className="input-otp-08__group" role="group" aria-labelledby={`${id}-label`} onPaste={handlePaste}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(element) => { inputRefs.current[index] = element; }}
            id={`${id}-${index}`}
            className={digit ? 'is-filled' : ''}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            value={digit}
            aria-label={`Dígito ${index + 1} de ${length}`}
            onChange={(event) => handleChange(event, index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          />
        ))}
      </div>
    </div>
  );
}

export default InputOtp8;
