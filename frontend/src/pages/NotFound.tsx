import { Link } from 'react-router-dom';
import { Mascot } from '@/components/mascot/Mascot';
import { Button } from '@/components/ui';

export function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-20 text-center">
      <Mascot character="bit" mood="surprised" animation="confused" size={120} />
      <h1 className="font-display text-3xl font-bold">404 — index out of bounds</h1>
      <p className="text-ink-300">That page does not exist.</p>
      <Link to="/">
        <Button variant="primary">Back home</Button>
      </Link>
    </div>
  );
}
