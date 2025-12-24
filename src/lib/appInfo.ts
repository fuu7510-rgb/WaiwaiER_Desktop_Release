export type ReleaseChannel = 'alpha' | 'beta' | 'stable';

export interface AppInfo {
  name: string;
  version: string;
  buildTimeISO: string | null;
  channel: ReleaseChannel;
}

function getBuildTimeISO(): string | null {
  return (typeof __BUILD_TIME_ISO__ === 'string' && __BUILD_TIME_ISO__) || null;
}

function getBuildVersion(): string | null {
  return (typeof __APP_VERSION__ === 'string' && __APP_VERSION__) || null;
}

function getBuildName(): string | null {
  return (typeof __APP_NAME__ === 'string' && __APP_NAME__) || null;
}

function getChannel(): ReleaseChannel {
  const raw = (import.meta.env.VITE_RELEASE_CHANNEL || 'alpha').toLowerCase();
  if (raw === 'beta' || raw === 'stable' || raw === 'alpha') return raw;
  return 'alpha';
}

async function getTauriAppInfo(): Promise<{ name?: string; version?: string } | null> {
  try {
    const { getName, getVersion } = await import('@tauri-apps/api/app');
    const [name, version] = await Promise.all([getName(), getVersion()]);
    return { name, version };
  } catch {
    return null;
  }
}

export async function getAppInfo(): Promise<AppInfo> {
  const tauriInfo = await getTauriAppInfo();

  const name = tauriInfo?.name || getBuildName() || 'WaiwaiER Desktop';
  const version = tauriInfo?.version || getBuildVersion() || '0.0.0';

  return {
    name,
    version,
    buildTimeISO: getBuildTimeISO(),
    channel: getChannel(),
  };
}
