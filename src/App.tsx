import { useState } from 'react';
import { BombardPage } from './pages/BombardPage';
import { RootBombardPage } from './pages/RootBombardPage';

export default function App() {
  const [page, setPage] = useState<'home' | 'bombard'>('home');

  if (page === 'bombard') {
    return <BombardPage onBack={() => setPage('home')} />;
  }

  return <RootBombardPage onStartBombard={() => setPage('bombard')} />;
}
