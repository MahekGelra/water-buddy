const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('water', {
  drank: () => ipcRenderer.send('drank'),
  snooze: () => ipcRenderer.send('snooze'),
  dismiss: () => ipcRenderer.send('dismiss'),
  onShow: (cb) => ipcRenderer.on('show', () => cb()),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (s) => ipcRenderer.invoke('save-settings', s),
});