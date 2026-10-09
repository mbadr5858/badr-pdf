// BADR PDF — Android app support.
// Inside the Android app, the WebView ignores browser downloads
// (<a download href="blob:...">). This patch catches those downloads,
// saves the file to the app cache, and opens the Android share sheet so
// the user can save it to Files/Downloads, open it, or send it.
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || '');
      resolve(result.substring(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function saveAndShare(href: string, filename: string): Promise<void> {
  const blob = await (await fetch(href)).blob();
  const safeName = (filename || 'badr-pdf-file').replace(/[\\/:*?"<>|]/g, '_');
  const written = await Filesystem.writeFile({
    path: safeName,
    data: await blobToBase64(blob),
    directory: Directory.Cache,
  });
  await Share.share({ title: safeName, files: [written.uri] });
}

function shouldIntercept(a: HTMLAnchorElement): boolean {
  const href = a.href || '';
  return a.hasAttribute('download') && /^(blob:|data:)/.test(href);
}

let installed = false;

export function installNativeDownloads(): void {
  if (installed || !Capacitor.isNativePlatform()) return;
  installed = true;

  const originalClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
    if (shouldIntercept(this)) {
      saveAndShare(this.href, this.download).catch((err) =>
        console.error('BADR PDF: could not save file', err)
      );
      return;
    }
    return originalClick.call(this);
  };

  // Links the user taps directly (not clicked from code).
  document.addEventListener(
    'click',
    (event) => {
      const a = (event.target as Element | null)?.closest?.('a');
      if (a instanceof HTMLAnchorElement && shouldIntercept(a)) {
        event.preventDefault();
        saveAndShare(a.href, a.download).catch((err) =>
          console.error('BADR PDF: could not save file', err)
        );
      }
    },
    true
  );
}

installNativeDownloads();
