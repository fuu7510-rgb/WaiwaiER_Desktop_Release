import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, Button } from '../common';
import { getAppInfo } from '../../lib/appInfo';

interface AboutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutDialog({ isOpen, onClose }: AboutDialogProps) {
  const { t } = useTranslation();
  const [appName, setAppName] = useState<string>('');
  const [version, setVersion] = useState<string>('');
  const [channel, setChannel] = useState<string>('');
  const [buildTimeISO, setBuildTimeISO] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    void (async () => {
      const info = await getAppInfo();
      if (cancelled) return;
      setAppName(info.name);
      setVersion(info.version);
      setChannel(info.channel);
      setBuildTimeISO(info.buildTimeISO);
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const channelLabel = useMemo(() => {
    if (channel === 'beta') return t('app.channel.beta');
    if (channel === 'stable') return t('app.channel.stable');
    return t('app.channel.alpha');
  }, [channel, t]);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t('about.title')}
      size="md"
      footer={
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="text-center">
          <p className="text-sm font-semibold text-zinc-800">{appName || t('app.title')}</p>
          <p className="text-xs text-zinc-500">{channelLabel}</p>
        </div>

        <div className="bg-zinc-50 rounded p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500">{t('about.version')}</span>
            <span className="text-xs text-zinc-700 font-mono">{version || '-'}</span>
          </div>
          {buildTimeISO && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-500">{t('about.buildTime')}</span>
              <span className="text-[11px] text-zinc-700 font-mono">{buildTimeISO}</span>
            </div>
          )}
        </div>

        <div className="text-center text-[10px] text-zinc-400">
          <p>© 2025 Fuaze. All rights reserved.</p>
        </div>
      </div>
    </Dialog>
  );
}
