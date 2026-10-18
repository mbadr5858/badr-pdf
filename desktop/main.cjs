// BADR PDF — desktop app (Electron).
// Serves the built web app from a private app:// origin so every tool works
// offline, with the security headers the Office converters need.
const { app, BrowserWindow, protocol, net, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const SCHEME = 'app';
const HOST = 'badr';
const OPEN_PDF_PATH = '/__open/current.pdf';
const VIEWER_PATH = '/pdfjs-annotation-viewer/web/viewer.html';
let currentPdfPath = null;
const WEB_ROOT = app.isPackaged
  ? path.join(process.resourcesPath, 'web')
  : path.join(__dirname, 'web');

protocol.registerSchemesAsPrivileged([
  {
    scheme: SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
      codeCache: true,
    },
  },
]);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
  '.pdf': 'application/pdf',
  '.data': 'application/octet-stream',
};

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function findPdfArg(argv = []) {
  return argv.find((arg) => {
    if (typeof arg !== 'string' || !/\.pdf$/i.test(arg)) return false;
    return isFile(path.resolve(arg));
  });
}

// Map a URL path to a file, the same way the website's server does:
//   /ar/merge-pdf -> ar/merge-pdf.html,  /ar/ -> ar/index.html
function resolveFile(urlPath) {
  let rel;
  try {
    rel = decodeURIComponent(urlPath).replace(/^\/+/, '');
  } catch {
    return null;
  }

  const base = path.normalize(path.join(WEB_ROOT, rel));
  const relative = path.relative(WEB_ROOT, base);

  // Reject traversal outside the packaged web root, including sibling paths
  // whose names merely share the same string prefix as WEB_ROOT.
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;

  const candidates = [base, base + '.html', path.join(base, 'index.html')];
  for (const candidate of candidates) if (isFile(candidate)) return candidate;
  return null;
}

function headersFor(file) {
  return {
    'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'credentialless',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'Cache-Control': 'no-cache',
  };
}

async function handle(request) {
  const url = new URL(request.url);

  if (url.pathname === OPEN_PDF_PATH && currentPdfPath && isFile(currentPdfPath)) {
    const res = await net.fetch(pathToFileURL(currentPdfPath).toString());
    return new Response(res.body, {
      status: 200,
      headers: {
        ...headersFor(currentPdfPath),
        'Content-Disposition': 'inline',
      },
    });
  }

  let file = resolveFile(url.pathname);
  let status = 200;
  if (!file) {
    file = path.join(WEB_ROOT, '404.html');
    status = 404;
  }
  const res = await net.fetch(pathToFileURL(file).toString());
  return new Response(res.body, { status, headers: headersFor(file) });
}

function viewerUrl() {
  const pdfUrl = SCHEME + '://' + HOST + OPEN_PDF_PATH;
  return SCHEME + '://' + HOST + VIEWER_PATH + '?file=' + encodeURIComponent(pdfUrl);
}

function addDesktopViewerChrome(win) {
  win.webContents.executeJavaScript(
    "(() => {" +
      "if (document.getElementById('badr-tools-button')) return;" +
      "const button=document.createElement('button');" +
      "button.id='badr-tools-button';" +
      "button.textContent='أدوات BADR PDF';" +
      "button.title='العودة إلى أدوات BADR PDF';" +
      "Object.assign(button.style,{position:'fixed',top:'7px',right:'56px',zIndex:'2147483647',height:'32px',padding:'0 12px',border:'1px solid rgba(255,255,255,.25)',borderRadius:'7px',background:'#2563eb',color:'#fff',fontFamily:'Segoe UI, Tahoma, Arial, sans-serif',fontSize:'13px',fontWeight:'600',cursor:'pointer'});" +
      "button.addEventListener('click',()=>{location.href='app://badr/ar/';});" +
      "document.body.appendChild(button);" +
    "})()"
  ).catch(() => {});
}

function loadPdf(win, filePath) {
  if (!filePath) {
    currentPdfPath = null;
    win.loadURL(SCHEME + '://' + HOST + '/ar/');
    return;
  }

  const resolved = path.resolve(filePath);
  if (!isFile(resolved) || path.extname(resolved).toLowerCase() !== '.pdf') return;

  currentPdfPath = resolved;
  win.setTitle(path.basename(resolved) + ' — BADR PDF');
  win.loadURL(viewerUrl());
}

function createWindow(pdfPath = null) {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 380,
    minHeight: 500,
    title: 'BADR PDF',
    backgroundColor: '#111827',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      spellcheck: true,
    },
  });

  const isInternal = (u) => u.startsWith(SCHEME + '://' + HOST);
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isInternal(url)) return { action: 'allow' };
    if (/^https?:|^mailto:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!isInternal(url)) {
      e.preventDefault();
      if (/^https?:|^mailto:/.test(url)) shell.openExternal(url);
    }
  });

  win.webContents.on('did-finish-load', () => {
    const current = win.webContents.getURL();
    if (current.includes('/pdfjs-annotation-viewer/web/viewer.html')) {
      addDesktopViewerChrome(win);
    } else {
      win.setTitle('BADR PDF');
    }
  });

  loadPdf(win, pdfPath);
  return win;
}

const initialPdf = findPdfArg(process.argv);
const single = app.requestSingleInstanceLock();

if (!single) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    let [win] = BrowserWindow.getAllWindows();
    const pdf = findPdfArg(argv);

    if (!win) win = createWindow(pdf || null);
    else if (pdf) loadPdf(win, pdf);

    if (win) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    }
  });

  app.on('open-file', (event, filePath) => {
    event.preventDefault();
    let [win] = BrowserWindow.getAllWindows();
    if (!win) win = createWindow(filePath);
    else loadPdf(win, filePath);
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    protocol.handle(SCHEME, handle);
    createWindow(initialPdf || null);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
