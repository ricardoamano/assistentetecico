import { useState } from 'react';
import { PIN_ADMIN } from '../config';
import { irPara, voltar } from '../lib/store';

/** Teclado de PIN do menu local de manutenção (PIN local, padrão 4321). */
export default function TelaPin() {
  const [digitado, setDigitado] = useState('');
  const [erro, setErro] = useState(false);

  const tecla = (d: string) => {
    setErro(false);
    const novo = (digitado + d).slice(0, 8);
    setDigitado(novo);
    if (novo.length >= PIN_ADMIN.length) {
      if (novo === PIN_ADMIN) {
        setDigitado('');
        irPara({ nome: 'admin' });
      } else {
        setDigitado('');
        setErro(true);
      }
    }
  };

  return (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-fundo-base"
      style={{ bottom: '12%' }}
    >
      <p className="mb-2 text-2xl font-bold text-branco">Menu de manutenção</p>
      <p className="mb-6 text-lg text-branco/70">Digite o PIN</p>
      <p className="mb-6 h-10 text-4xl tracking-widest text-branco">
        {'•'.repeat(digitado.length)}
      </p>
      {erro && <p className="mb-4 text-lg text-red-400">PIN incorreto</p>}
      <div className="grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✕'].map((t) => (
          <button
            key={t}
            onClick={() => {
              if (t === '⌫') setDigitado((s) => s.slice(0, -1));
              else if (t === '✕') voltar();
              else tecla(t);
            }}
            className="card-toque h-[88px] w-[88px] rounded-card bg-verde-escuro text-3xl font-bold text-branco"
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
