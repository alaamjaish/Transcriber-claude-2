// Preload script - Security bridge between Electron and web content
// This file runs in the renderer process before web content loads

const { contextBridge } = require('electron');

// Expose safe APIs to the web page if needed
// Allows webapp to detect it's running in desktop app
contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  version: process.versions.electron,
  isElectron: true,  // NEW: Allow webapp to detect desktop environment
});

console.log('Electron preload script loaded');
