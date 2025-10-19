// Preload script - Security bridge between Electron and web content
// This file runs in the renderer process before web content loads

const { contextBridge } = require('electron');

// Expose safe APIs to the web page if needed
// Currently minimal as we're just displaying the Vercel site
contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  version: process.versions.electron,
});

console.log('Electron preload script loaded');
