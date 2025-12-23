import { useTranslation } from 'react-i18next';
import { useUIStore, useERStore } from '../../stores';
import type { SimulatorView } from '../../types';
import { TableView } from './TableView';
import { DeckView } from './DeckView';
import { DetailView } from './DetailView';
import { FormView } from './FormView';

export function Simulator() {
  const { t } = useTranslation();
  const { simulatorView, setSimulatorView } = useUIStore();
  const { tables, selectedTableId } = useERStore();
  
  const selectedTable = tables.find((t) => t.id === selectedTableId) || tables[0];

  const views: { id: SimulatorView; label: string }[] = [
    { id: 'table', label: t('simulator.views.table') },
    { id: 'deck', label: t('simulator.views.deck') },
    { id: 'detail', label: t('simulator.views.detail') },
    { id: 'form', label: t('simulator.views.form') },
  ];

  if (!selectedTable) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <p>{t('editor.noTables')}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-100">
      {/* ビュー切り替えタブ */}
      <div className="flex bg-white border-b px-4">
        {views.map((view) => (
          <button
            key={view.id}
            onClick={() => setSimulatorView(view.id)}
            className={`
              px-4 py-3 text-sm font-medium border-b-2 transition-colors
              ${simulatorView === view.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }
            `}
          >
            {view.label}
          </button>
        ))}
      </div>

      {/* シミュレータービュー */}
      <div className="flex-1 overflow-auto p-4">
        {simulatorView === 'table' && <TableView table={selectedTable} />}
        {simulatorView === 'deck' && <DeckView table={selectedTable} />}
        {simulatorView === 'detail' && <DetailView table={selectedTable} />}
        {simulatorView === 'form' && <FormView table={selectedTable} />}
      </div>
    </div>
  );
}
