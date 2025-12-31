import { Button } from '../../common';

type Props = {
  labelKey: (key: string) => string;
  onDelete: () => void;
};

export function ColumnDeleteSection({ labelKey, onDelete }: Props) {
  return (
    <div className="border-t pt-3 pb-16" style={{ borderColor: 'var(--border)' }}>
      <Button variant="danger" size="sm" onClick={onDelete} className="w-full">
        {labelKey('column.deleteColumn')}
      </Button>
    </div>
  );
}
