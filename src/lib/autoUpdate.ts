const GITHUB_REPO_OWNER = 'pedrogottardi';
const GITHUB_REPO_NAME = 'post-it';
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`;

const STORAGE_KEY_LAST_CHECK = 'postit-last-update-check';
const STORAGE_KEY_DISMISSED_VERSION = 'postit-dismissed-update-version';
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export interface UpdateInfo {
  version: string;
  versionCode: number;
  releaseNotes: string;
  downloadUrl: string;
  isNewer: boolean;
}

function isNewerVersion(remote: string, local: string): boolean {
  const remoteParts = remote.split('.').map(Number);
  const localParts = local.split('.').map(Number);

  for (let i = 0; i < Math.max(remoteParts.length, localParts.length); i++) {
    const r = remoteParts[i] || 0;
    const l = localParts[i] || 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false;
}

async function fetchLatestRelease(): Promise<{
  tagName: string;
  body: string | null;
  htmlUrl: string;
  assets: Array<{ name: string; browserDownloadUrl: string }>;
} | null> {
  try {
    const response = await fetch(GITHUB_API_URL, {
      headers: { Accept: 'application/vnd.github.v3+json' }
    });

    if (!response.ok) {
      if (response.status === 404) console.log('No releases found');
      else console.error('GitHub API error:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch latest release:', error);
    return null;
  }
}

function getCurrentVersion(): string {
  if (typeof window !== 'undefined' && (window as any).__APP_VERSION__) {
    return (window as any).__APP_VERSION__;
  }
  return '1.0.0';
}

function shouldCheckForUpdate(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return true;
  const lastCheck = localStorage.getItem('postit-last-update-check');
  if (!lastCheck) return true;
  return Date.now() - Number(lastCheck) > 24 * 60 * 60 * 1000;
}

function recordUpdateCheck(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem('postit-last-update-check', Date.now().toString());
  }
}

function isVersionDismissed(version: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  return localStorage.getItem('postit-dismissed-update-version') === version;
}

function dismissVersion(version: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem('postit-dismissed-update-version', version);
  }
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (!shouldCheckForUpdate()) return null;
  recordUpdateCheck();

  const release = await fetchLatestRelease();
  if (!release) return null;

  const tagVersion = release.tagName.replace(/^v/, '');
  const currentVersion = getCurrentVersion();

  if (!isNewerVersion(tagVersion, currentVersion)) return null;
  if (isVersionDismissed(tagVersion)) return null;

  const apkAsset = release.assets.find(a => a.name.endsWith('.apk'));
  const downloadUrl = apkAsset ? apkAsset.browserDownloadUrl : release.htmlUrl;

  return {
    version: tagVersion,
    versionCode: 0,
    releaseNotes: release.body || 'Nova versão disponível',
    downloadUrl,
    isNewer: true,
  };
}

export function dismissUpdate(version: string): void {
  dismissVersion(version);
}