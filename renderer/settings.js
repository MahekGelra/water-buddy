const sel = document.getElementById('interval');
const login = document.getElementById('login');
const note = document.getElementById('note');
const status = document.getElementById('status');

async function init() {
  const s = await window.water.getSettings();
  sel.value = String(s.intervalMinutes);
  login.checked = s.openAtLogin;
  if (!s.canAutoLaunch) {
    login.disabled = true;
    note.textContent = 'Launch at login works in the installed app (not in npm start).';
  }
}
async function save() {
  await window.water.saveSettings({ intervalMinutes: Number(sel.value), openAtLogin: login.checked });
  status.textContent = 'Saved ✓';
  setTimeout(() => (status.textContent = ''), 1500);
}
sel.addEventListener('change', save);
login.addEventListener('change', save);
init();