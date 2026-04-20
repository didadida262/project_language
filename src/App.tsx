import { useState } from 'react';
import { RootBombardPage } from './pages/RootBombardPage';
import { BombardModule, getMockWords } from './pages/BombardModule';

export default function App() {
  const [activeModule, setActiveModule] = useState<number | null>(null);

  if (activeModule !== null) {
    return (
      <BombardModule
        unitId={activeModule}
        words={getMockWords(activeModule)}
        onBack={() => setActiveModule(null)}
      />
    );
  }

  return <RootBombardPage onStartBombard={setActiveModule} />;
}