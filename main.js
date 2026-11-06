const {
  app, BrowserWindow, Tray, Menu, nativeImage, screen, ipcMain, powerMonitor,
} = require('electron');
const path = require('path');
const fs = require('fs');

const INTERVALS = [15, 30, 45, 60];
const SNOOZE_MS = 5 * 60 * 1000;
const DEV_FAST = process.env.WB_FAST === '1'; // npm run fast => 1-minute interval

const MESSAGES = [
  'Time for a sip of water! 💧',
  'Your body says thank you in advance.',
  'Hydration check! How about a glass?',
  'A little water goes a long way.',
  'Sip, sip, hooray! 🎉',
  'Your brain is 75% water. Top it up!',
  'Quick break: drink some water.',
  'Feeling sluggish? Try water first.',
  'Water break! Stretch your legs too.',
  'Keep calm and drink water.',
  'Your future self wants you to drink water.',
  'Refill time! Your water bottle misses you.',
  'Small habit, big difference: drink up!',
  'Hey you! Yes, you. Water. Now. 😄',
  'Stay fresh like a drop of dew.',
];
const CHEERS = [
  'Nice! Stay hydrated! 🎉',
  'Glug glug! You are awesome.',
  'Refreshing! See you next time.',
  'Great job! Keep it up! 💙',
];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

let settings = { intervalMinutes: 45, paused: false };
let tray = null;
let avatarWin = null;
let settingsWin = null;
let nextReminderAt = 0;

const webPrefs = () => ({
  preload: path.join(__dirname, 'preload.js'),
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  acceptFirstMouse: true,
});

// ---------- settings storage ----------
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');

function loadSettings() {
  try {
    const s = JSON.parse(fs.readFileSync(settingsFile(), 'utf8'));
    if (INTERVALS.includes(s.intervalMinutes)) settings.intervalMinutes = s.intervalMinutes;
    if (typeof s.paused === 'boolean') settings.paused = s.paused;
  } catch (_) { /* first run: keep defaults */ }
}
function saveSettings() {
  try {
    fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
    fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2));
  } catch (e) { console.error('Could not save settings', e); }
}

// ---------- launch at login (only meaningful in the installed app) ----------
function getLoginItem() {
  return app.isPackaged ? app.getLoginItemSettings().openAtLogin : false;
}
function setLoginItem(enabled) {
  if (!app.isPackaged) return;
  app.setLoginItemSettings({ openAtLogin: enabled });
}

// ---------- scheduler ----------
function intervalMs() {
  return (DEV_FAST ? 1 : settings.intervalMinutes) * 60 * 1000;
}
function scheduleNext(ms = intervalMs()) {
  nextReminderAt = Date.now() + ms;
  refreshMenu();
}
// Checked every 15s against the wall clock, so it still works after sleep.
function tick() {
  if (!settings.paused && Date.now() >= nextReminderAt) {
    showReminder();
    scheduleNext(); // overdue after sleep => ONE reminder, then restart the interval
  }
  refreshMenu();
}

// ---------- the water-drop reminder window ----------
function showReminder() {
  if (avatarWin && !avatarWin.isDestroyed()) return;

  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const { x, y, width, height } = display.workArea;
  const W = 300, H = 310;

  avatarWin = new BrowserWindow({
    width: W,
    height: H,
    x: x + width - W - 8,
    y: y + height - H,
    transparent: true,
    frame: false,
    hasShadow: false,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: true,
    show: false,
    webPreferences: webPrefs(),
  });
  avatarWin.setAlwaysOnTop(true, 'screen-saver');
  avatarWin.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
    skipTransformProcessType: true,
  });
  avatarWin.loadFile(path.join(__dirname, 'renderer', 'avatar.html'), {
    query: { msg: pick(MESSAGES), cheer: pick(CHEERS) },
  });
  avatarWin.once('ready-to-show', () => {
    if (!avatarWin || avatarWin.isDestroyed()) return;
    avatarWin.showInactive();
    avatarWin.webContents.send('show');
  });
  avatarWin.on('closed', () => { avatarWin = null; });
}
function closeAvatar() {
  if (avatarWin && !avatarWin.isDestroyed()) avatarWin.close();
}

ipcMain.on('drank', () => { closeAvatar(); scheduleNext(); });
ipcMain.on('snooze', () => { closeAvatar(); scheduleNext(SNOOZE_MS); });
ipcMain.on('dismiss', () => { closeAvatar(); }); // schedule is untouched: next reminder still fires

// ---------- settings window ----------
function openSettings() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.show();
    settingsWin.focus();
    return;
  }
  settingsWin = new BrowserWindow({
    width: 360,
    height: 300,
    resizable: false,
    minimizable: false,
    maximizable: false,
    title: 'Water Buddy Settings',
    webPreferences: webPrefs(),
  });
  settingsWin.loadFile(path.join(__dirname, 'renderer', 'settings.html'));
  settingsWin.on('closed', () => { settingsWin = null; });
  app.focus({ steal: true });
}

ipcMain.handle('get-settings', () => ({
  intervalMinutes: settings.intervalMinutes,
  openAtLogin: getLoginItem(),
  canAutoLaunch: app.isPackaged,
}));
ipcMain.handle('save-settings', (_e, s) => {
  if (s && INTERVALS.includes(s.intervalMinutes) && s.intervalMinutes !== settings.intervalMinutes) {
    settings.intervalMinutes = s.intervalMinutes;
    scheduleNext();
  }
  if (s && typeof s.openAtLogin === 'boolean') setLoginItem(s.openAtLogin);
  saveSettings();
  refreshMenu();
  return true;
});

// ---------- menu bar ----------
function setIntervalMinutes(m) {
  settings.intervalMinutes = m;
  saveSettings();
  scheduleNext();
}
function togglePause() {
  settings.paused = !settings.paused;
  saveSettings();
  if (!settings.paused) scheduleNext();
  refreshMenu();
}
function buildMenu() {
  const mins = Math.ceil((nextReminderAt - Date.now()) / 60000);
  const nextLabel = settings.paused
    ? 'Reminders paused'
    : mins <= 1 ? 'Next reminder in <1 min' : `Next reminder in ${mins} min`;
  return Menu.buildFromTemplate([
    { label: nextLabel, enabled: false },
    { type: 'separator' },
    { label: 'Remind me now', click: () => showReminder() },
    { label: settings.paused ? 'Resume reminders' : 'Pause reminders', click: togglePause },
    {
      label: 'Interval',
      submenu: INTERVALS.map((m) => ({
        label: `Every ${m} minutes`,
        type: 'radio',
        checked: settings.intervalMinutes === m,
        click: () => setIntervalMinutes(m),
      })),
    },
    {
      label: 'Launch at login',
      type: 'checkbox',
      checked: getLoginItem(),
      enabled: app.isPackaged,
      click: (item) => { setLoginItem(item.checked); refreshMenu(); },
    },
    { label: 'Settings…', click: openSettings },
    { type: 'separator' },
    { label: 'Quit Water Buddy', click: () => app.quit() },
  ]);
}
function refreshMenu() {
  if (tray) tray.setContextMenu(buildMenu());
}

// ---------- app lifecycle ----------
app.on('window-all-closed', () => { /* keep running in the menu bar */ });

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', openSettings);
  app.whenReady().then(() => {
    if (app.dock) app.dock.hide();
    loadSettings();

    const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'trayTemplate.png'));
    icon.setTemplateImage(true);
    tray = new Tray(icon);
    tray.setToolTip('Water Buddy');

    scheduleNext();
    setInterval(tick, 15 * 1000);
    powerMonitor.on('resume', () => setTimeout(tick, 3000));
    powerMonitor.on('unlock-screen', () => setTimeout(tick, 1000));
  });
}