import { useUIStore } from './stores';
import { MainLayout } from './components/Layout';
import { EREditor } from './components/EREditor';
import { Simulator } from './components/Simulator';

function App() {
  const { viewMode } = useUIStore();

  return (
    <MainLayout>
      {viewMode === 'editor' ? <EREditor /> : <Simulator />}
    </MainLayout>
  );
}

export default App;
