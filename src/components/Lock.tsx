// Pincodescherm bij het openen van de app.

import { useState } from 'react';
import { Delete } from 'lucide-react';
import { hashPin } from '../lib/pin';

export function Lock({ hash, onUnlock }: { hash: string; onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);

  async function press(d: string) {
    const next = (pin + d).slice(0, 6);
    setPin(next);
    if (next.length >= 4 && (await hashPin(next)) === hash) return onUnlock();
    if (next.length === 6) {
      setShake(true);
      navigator.vibrate?.(80);
      setTimeout(() => { setShake(false); setPin(''); }, 340);
    }
  }

  return (
    <div className="lock" data-area="today">
      <div className="stack" style={{ gap: 28, justifyItems: 'center' }}>
        <h1>EV2027</h1>
        <p className="muted small">Voer je pincode in</p>
        <div className={`pin-dots ${shake ? 'shake' : ''}`} aria-label={`${pin.length} cijfers ingevoerd`}>
          {Array.from({ length: Math.max(4, pin.length) }, (_, i) => <i key={i} className={i < pin.length ? 'on' : ''} />)}
        </div>
        <div className="keypad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => <button key={d} onClick={() => press(d)}>{d}</button>)}
          <span />
          <button onClick={() => press('0')}>0</button>
          <button aria-label="Wissen" onClick={() => setPin(pin.slice(0, -1))} style={{ border: 0, background: 'transparent' }}><Delete size={22} /></button>
        </div>
      </div>
    </div>
  );
}
