const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  apiRequest: (params) => ipcRenderer.invoke('api-request', params),
  hotList: (params) => ipcRenderer.invoke('hot-list', params),
  downloadMusic: (payload) => ipcRenderer.invoke('download-music', payload),
  downloadMusicBatch: (payload) => ipcRenderer.invoke('download-music-batch', payload),
  cancelDownload: () => ipcRenderer.invoke('cancel-download'),
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', (_event, data) => callback(data))
  },
  offDownloadProgress: (callback) => {
    ipcRenderer.removeListener('download-progress', callback)
  },
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', { filePath, data }),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  ensureCacheDir: (customPath) => ipcRenderer.invoke('ensure-cache-dir', customPath),
  getCacheInfo: (customPath) => ipcRenderer.invoke('get-cache-info', customPath),
  clearCache: (customPath) => ipcRenderer.invoke('clear-cache', customPath),
  cacheFile: (params) => ipcRenderer.invoke('cache-file', params),
  safeEncrypt: (plainText) => ipcRenderer.invoke('safe-encrypt', plainText),
  safeDecrypt: (encrypted) => ipcRenderer.invoke('safe-decrypt', encrypted),
  getCachedFile: (params) => ipcRenderer.invoke('get-cached-file', params),
  getCachedSong: (params) => ipcRenderer.invoke('get-cached-song', params),
  readCachedFile: (params) => ipcRenderer.invoke('read-cached-file', params),
  getCacheFileUrl: (filePath) => `cache-file://${encodeURIComponent(filePath)}`,
  readFileAsDataUrl: (filePath) => ipcRenderer.invoke('read-file-as-data-url', { filePath }),
  listLocalMusic: (params) => ipcRenderer.invoke('list-local-music', params),
  deleteLocalFile: (params) => ipcRenderer.invoke('delete-local-file', params),
  aiChat: (params) => ipcRenderer.invoke('ai-chat', params),
  aiModels: (params) => ipcRenderer.invoke('ai-models', params),
  checkUpdate: () => ipcRenderer.invoke('check-update'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  cancelUpdateDownload: () => ipcRenderer.invoke('cancel-update-download'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateDownloadProgress: (callback) => {
    ipcRenderer.on('update-download-progress', (_event, data) => callback(data))
  },
  onUpdateStatus: (callback) => {
    ipcRenderer.on('update-status', (_event, data) => callback(data))
  },
  offUpdateStatus: (callback) => {
    ipcRenderer.removeListener('update-status', callback)
  },
  offUpdateDownloadProgress: (callback) => {
    ipcRenderer.removeListener('update-download-progress', callback)
  },
  setUpdateSource: (params) => ipcRenderer.invoke('set-update-source', params)
})
