import { Button } from '../../common';

type Props = {
  labelKey: (key: string) => string;
  onDelete: () => void;
};

export function ColumnDeleteSection({ labelKey, onDelete }: Props) {
  return (
    <div className="border-t border-zinc-100 pt-3 pb-16">
      <Button variant="danger" size="sm" onClick={onDelete} className="w-full">
        {labelKey('column.deleteColumn')}
      </Button>
    </div>
  );
}
