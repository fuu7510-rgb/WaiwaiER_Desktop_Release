import { useEffect } from 'react';
import { useUIStore } from './stores';
import { MainLayout } from './components/Layout';
import { EREditor } from './components/EREditor';
import { Simulator } from './components/Simulator';

function App() {
  const { viewMode, settings } = useUIStore();

  // フォントサイズをHTML要素に適用
  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', settings.fontSize);
  }, [settings.fontSize]);

  return (
    <MainLayout>
      {viewMode === 'editor' ? <EREditor /> : <Simulator />}
    </MainLayout>
  );
}

export default App;
