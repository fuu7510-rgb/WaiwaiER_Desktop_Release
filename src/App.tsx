import { useEffect } from 'react';
import { useUIStore } from './stores';
import { MainLayout } from './components/Layout';
import { EREditor } from './components/EREditor';
import { Simulator } from './components/Simulator';
import { ToastContainer } from './components/common';

function App() {
  const { viewMode, settings } = useUIStore();

  // フォントサイズをHTML要素に適用
  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', settings.fontSize);
  }, [settings.fontSize]);

  // テーマをHTML要素に適用
  useEffect(() => {
    const applyTheme = (theme: 'light' | 'dark') => {
      document.documentElement.setAttribute('data-theme', theme);
    };

    if (settings.theme === 'system') {
      // システム設定に従う
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
        applyTheme(e.matches ? 'dark' : 'light');
      };
      
      // 初期適用
      handleChange(mediaQuery);
      
      // システム設定の変更を監視
      mediaQuery.addEventListener('change', handleChange);
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    } else {
      applyTheme(settings.theme);
    }
  }, [settings.theme]);

  return (
    <>
      <MainLayout>
        {viewMode === 'editor' ? <EREditor /> : <Simulator />}
      </MainLayout>
      <ToastContainer />
    </>
  );
}

export default App;
