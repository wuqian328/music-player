const { app, BrowserWindow, ipcMain, shell, dialog, protocol, net, safeStorage } = require('electron')
const { join, dirname, basename } = require('path')
const axios = require('axios')
const fs = require('fs')
const path = require('path')
const { autoUpdater } = require('electron-updater')

const API_BASE = 'https://music-api.gdstudio.xyz/api.php'

let mainWindow = null
let abortController = null
let updateCheckStarted = false

let logStream = null

function getLogPath() {
  return join(app.getPath('userData'), 'logs', `app-${new Date().toISOString().split('T')[0]}.log`)
}

function ensureLogDir() {
  const logDir = join(app.getPath('userData'), 'logs')
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true })
  }
}

function initLogger() {
  ensureLogDir()
  const logPath = getLogPath()
  logStream = fs.createWriteStream(logPath, { flags: 'a', encoding: 'utf-8' })
  
  process.on('exit', () => {
    if (logStream) {
      logStream.end()
    }
  })
}

function getTimestamp() {
  return new Date().toISOString()
}

function log(level, message, data = null) {
  const timestamp = getTimestamp()
  let logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}`
  
  if (data) {
    try {
      logLine += ` | Data: ${JSON.stringify(data)}`
    } catch (e) {
      logLine += ` | Data: ${String(data)}`
    }
  }
  
  console.log(logLine)
  
  if (logStream) {
    logStream.write(logLine + '\n')
  }
}

function info(message, data = null) {
  log('info', message, data)
}

function warn(message, data = null) {
  log('warn', message, data)
}

function error(message, data = null) {
  log('error', message, data)
}

function debug(message, data = null) {
  if (process.env.NODE_ENV === 'development') {
    log('debug', message, data)
  }
}

function getDefaultCacheDir() {
  return join(app.getPath('userData'), 'cache')
}

function createWindow() {
  info('Creating main window...')
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    show: false,
    backgroundColor: '#1a1a2e'
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    info('Main window shown successfully')
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('did-finish-load', () => {
    info('Renderer process loaded successfully')
  })

  mainWindow.webContents.on('console-message', (event, level, message) => {
    if (level === 0) error('Renderer error:', message)
    else if (level === 1) warn('Renderer warning:', message)
    else if (level === 2) info('Renderer log:', message)
  })

  mainWindow.on('closed', () => {
    info('Main window closed')
    mainWindow = null
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    debug(`Loading from dev server: ${process.env.ELECTRON_RENDERER_URL}`)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    debug('Loading from local file')
  }
}

function registerIpcHandlers() {

  ipcMain.handle('api-request', async (event, params) => {
    debug(`API request: ${JSON.stringify(params)}`)
    try {
      const response = await axios.get(API_BASE, {
        params,
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })
      debug(`API response: success, status: ${response.status}`)
      return { success: true, data: response.data }
    } catch (err) {
      error(`API request failed: ${err.message}`, { params })
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('hot-list', async (event, { id }) => {
    debug(`Hot list request: ${id}`)
    try {
      const response = await axios.get('https://music.163.com/api/playlist/detail', {
        params: { id, timestamp: Date.now() },
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://music.163.com'
        }
      })
      debug(`Hot list response: success, status: ${response.status}`)
      return { success: true, data: response.data }
    } catch (err) {
      error(`Hot list request failed: ${err.message}`)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('download-music', async (event, { url, filename, artist, songName, ext }) => {
    const fileExt = ext || 'mp3'
    info(`Starting download: ${artist} - ${songName}.${fileExt}`)
    
    const extNames = {
      mp3: 'MP3文件',
      flac: 'FLAC文件',
      wav: 'WAV文件',
      m4a: 'M4A文件',
      aac: 'AAC文件'
    }
    const filterName = extNames[fileExt] || `${fileExt.toUpperCase()}文件`
    
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '保存音乐文件',
      defaultPath: `${artist} - ${songName}.${fileExt}`,
      filters: [{ name: filterName, extensions: [fileExt] }]
    })

    if (result.canceled) {
      info('Download canceled by user')
      return { success: false, canceled: true }
    }

    const savePath = result.filePath.endsWith(`.${fileExt}`) ? result.filePath : result.filePath + `.${fileExt}`
    abortController = new AbortController()

    try {
      const response = await axios({
        method: 'GET',
        url,
        responseType: 'stream',
        signal: abortController.signal,
        timeout: 60000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://music.163.com'
        }
      })

      const totalLength = parseInt(response.headers['content-length'], 10) || 0
      debug(`Download file size: ${totalLength} bytes`)
      
      let downloadedLength = 0
      const writer = fs.createWriteStream(savePath)

      response.data.on('data', (chunk) => {
        downloadedLength += chunk.length
        if (totalLength > 0 && mainWindow && !mainWindow.isDestroyed()) {
          const progress = Math.round((downloadedLength / totalLength) * 100)
          mainWindow.webContents.send('download-progress', { progress, filename })
        }
      })

      response.data.pipe(writer)

      return new Promise((resolve) => {
        writer.on('finish', () => {
          info(`Download completed: ${savePath}`)
          resolve({ success: true, path: savePath })
        })
        writer.on('error', (err) => {
          error(`Download write error: ${err.message}`)
          resolve({ success: false, error: err.message })
        })
      })
    } catch (err) {
      if (err.name === 'CanceledError') {
        info('Download aborted')
        return { success: false, canceled: true }
      }
      error(`Download failed: ${err.message}`)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('download-music-batch', async (event, { songs }) => {
    info(`Starting batch download: ${songs.length} songs`)
    
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择保存目录',
      properties: ['openDirectory', 'createDirectory']
    })

    if (result.canceled) {
      info('Batch download canceled by user')
      return { success: false, canceled: true }
    }

    const saveDir = result.filePaths[0]
    const results = []

    for (let i = 0; i < songs.length; i++) {
      if (!abortController) {
        abortController = new AbortController()
      }
      
      const song = songs[i]
      const { url, filename, artist, songName, ext } = song
      const fileExt = ext || 'mp3'
      const savePath = join(saveDir, `${artist} - ${songName}.${fileExt}`)
      
      info(`Downloading ${i + 1}/${songs.length}: ${artist} - ${songName}.${fileExt}`)
      
      try {
        const response = await axios({
          method: 'GET',
          url,
          responseType: 'stream',
          signal: abortController.signal,
          timeout: 60000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://music.163.com'
          }
        })

        const totalLength = parseInt(response.headers['content-length'], 10) || 0
        debug(`Download file size: ${totalLength} bytes`)
        
        let downloadedLength = 0
        const writer = fs.createWriteStream(savePath)

        response.data.on('data', (chunk) => {
          downloadedLength += chunk.length
          if (totalLength > 0 && mainWindow && !mainWindow.isDestroyed()) {
            const progress = Math.round((downloadedLength / totalLength) * 100)
            mainWindow.webContents.send('download-progress', { 
              progress, 
              filename,
              current: i + 1,
              total: songs.length
            })
          }
        })

        await new Promise((resolve, reject) => {
          writer.on('finish', () => {
            info(`Download completed: ${savePath}`)
            resolve()
          })
          writer.on('error', (err) => {
            error(`Download write error: ${err.message}`)
            reject(err)
          })
        })
        
        results.push({ success: true, path: savePath, songName, artist })
        
        await new Promise(resolve => setTimeout(resolve, 500))
        
      } catch (err) {
        if (err.name === 'CanceledError') {
          info('Batch download aborted')
          return { success: false, canceled: true, results }
        }
        error(`Download failed: ${err.message}`)
        results.push({ success: false, error: err.message, songName, artist })
      }
    }
    
    abortController = null
    
    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length
    
    info(`Batch download finished: ${successCount} success, ${failCount} failed`)
    
    return { 
      success: true, 
      results, 
      successCount, 
      failCount,
      saveDir 
    }
  })

  ipcMain.handle('cancel-download', async () => {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    return { success: true }
  })

  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择缓存目录',
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled) return { success: false, canceled: true }
    return { success: true, path: result.filePaths[0] }
  })

  ipcMain.handle('ensure-cache-dir', async (event, customPath) => {
    try {
      const cacheDir = customPath || getDefaultCacheDir()
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true })
      }
      return { success: true, path: cacheDir }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('get-cache-info', async (event, customPath) => {
    try {
      const cacheDir = customPath || getDefaultCacheDir()
      if (!fs.existsSync(cacheDir)) return { success: true, size: 0, count: 0, path: cacheDir }
      let totalSize = 0
      let fileCount = 0
      function walk(dir) {
        const items = fs.readdirSync(dir)
        for (const item of items) {
          const full = join(dir, item)
          const stat = fs.statSync(full)
          if (stat.isDirectory()) walk(full)
          else { totalSize += stat.size; fileCount++ }
        }
      }
      walk(cacheDir)
      return { success: true, size: totalSize, count: fileCount, path: cacheDir }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('clear-cache', async (event, customPath) => {
    try {
      const cacheDir = customPath || getDefaultCacheDir()
      if (fs.existsSync(cacheDir)) {
        fs.rmSync(cacheDir, { recursive: true, force: true })
        fs.mkdirSync(cacheDir, { recursive: true })
      }
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('cache-file', async (event, { url, fileName, customPath, type, content, metadata }) => {
    try {
      const cacheDir = customPath || getDefaultCacheDir()
      const typeDir = join(cacheDir, type || 'other')
      if (!fs.existsSync(typeDir)) {
        fs.mkdirSync(typeDir, { recursive: true })
      }
      
      const cleanFileName = fileName.split('?')[0].split('#')[0]
      const filePath = join(typeDir, cleanFileName)
      
      if (fs.existsSync(filePath)) {
        debug(`Cache file exists: ${filePath}`)
        return { success: true, cached: true, path: filePath }
      }
      
      debug(`Caching file: ${fileName} to ${typeDir}`)
      
      if (content !== undefined) {
        fs.writeFileSync(filePath, content, 'utf8')
        const stat = fs.statSync(filePath)
        debug(`Cached file from content: ${filePath}, size: ${stat.size} bytes`)
      } else {
        const response = await axios.get(url, {
          responseType: 'stream',
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://music.163.com'
          }
        })
        
        const writer = fs.createWriteStream(filePath)
        await new Promise((resolve, reject) => {
          response.data.pipe(writer)
          writer.on('finish', resolve)
          writer.on('error', reject)
        })
        
        const stat = fs.statSync(filePath)
        debug(`Cached file: ${filePath}, size: ${stat.size} bytes`)
      }
      
      if (metadata) {
        const jsonFileName = cleanFileName.replace(/\.[^/.]+$/, '.json')
        const jsonFilePath = join(typeDir, jsonFileName)
        fs.writeFileSync(jsonFilePath, JSON.stringify(metadata, null, 2), 'utf8')
        debug(`Cached metadata: ${jsonFilePath}`)
      }
      
      return { success: true, cached: false, path: filePath }
    } catch (err) {
      error(`Cache file failed: ${err.message}`)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('get-cached-file', async (event, { fileName, customPath, type }) => {
    try {
      const cacheDir = customPath || getDefaultCacheDir()
      const typeDir = join(cacheDir, type || 'other')
      const filePath = join(typeDir, fileName)
      
      if (fs.existsSync(filePath)) {
        return { success: true, exists: true, path: filePath }
      }
      return { success: true, exists: false }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('get-cached-song', async (event, { id, source, customPath }) => {
    try {
      const cacheDir = customPath || getDefaultCacheDir()
      const musicDir = join(cacheDir, 'music')
      
      debug(`Checking cached song: ${source}-${id}`)
      debug(`Cache directory: ${musicDir}`)
      
      if (!fs.existsSync(musicDir)) {
        debug(`Music dir does not exist: ${musicDir}`)
        return { success: true, cached: false }
      }
      
      const files = fs.readdirSync(musicDir)
      debug(`Files in music dir: ${files.join(', ')}`)
      
      const musicFile = files.find(f => f.startsWith(`${source}-${id}.`))
      debug(`Found music file: ${musicFile || 'none'}`)
      
      if (!musicFile) {
        return { success: true, cached: false }
      }
      
      const jsonFile = files.find(f => f === `${source}-${id}.json`)
      debug(`Found json file: ${jsonFile || 'none'}`)
      
      if (!jsonFile) {
        return { success: true, cached: false }
      }
      
      const jsonPath = join(musicDir, jsonFile)
      const musicPath = join(musicDir, musicFile)
      
      debug(`Loading metadata from: ${jsonPath}`)
      const metadata = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
      debug(`Metadata loaded: ${JSON.stringify(metadata)}`)
      
      return {
        success: true,
        cached: true,
        musicPath,
        metadata
      }
    } catch (err) {
      error(`Get cached song failed: ${err.message}`)
      return { success: true, cached: false }
    }
  })

  ipcMain.handle('read-cached-file', async (event, { fileName, customPath, type }) => {
    try {
      const cacheDir = customPath || getDefaultCacheDir()
      const typeDir = join(cacheDir, type || 'other')
      const filePath = join(typeDir, fileName)
      
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8')
        return { success: true, exists: true, content, path: filePath }
      }
      return { success: true, exists: false }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('window-minimize', () => {
    if (mainWindow) mainWindow.minimize()
  })

  ipcMain.handle('window-maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize()
      } else {
        mainWindow.maximize()
      }
    }
  })

  ipcMain.handle('window-close', () => {
    if (mainWindow) mainWindow.close()
  })

  ipcMain.handle('read-file', async (event, filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf-8')
        return { success: true, data }
      }
      return { success: false, error: 'File not found' }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('ai-chat', async (event, { apiKey, baseUrl, model, messages, timeout, temperature }) => {
    debug(`AI chat request: model=${model}, messages=${messages.length}, timeout=${timeout}`)
    
    if (!apiKey || !apiKey.trim()) {
      warn('AI chat failed: API key is required')
      return { success: false, error: '请先配置API密钥' }
    }

    try {
      const requestData = {
        model,
        messages,
        temperature: temperature || 0.7,
        max_tokens: 2000
      }

      try {
        const response = await axios.post(
          `${baseUrl}/chat/completions`,
          { ...requestData, response_format: { type: 'json_object' } },
          {
            timeout: (timeout || 30) * 1000,
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          }
        )
        
        debug(`AI chat response: success, status: ${response.status}`)
        
        if (response.data && response.data.choices && response.data.choices.length > 0) {
          return { success: true, data: response.data.choices[0].message.content }
        }
        return { success: false, error: 'AI返回数据格式异常' }
      } catch (formatErr) {
        debug(`Response format not supported, retrying without it: ${formatErr.message}`)
        
        const response = await axios.post(
          `${baseUrl}/chat/completions`,
          requestData,
          {
            timeout: (timeout || 30) * 1000,
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          }
        )
        
        debug(`AI chat response (fallback): success, status: ${response.status}`)
        
        if (response.data && response.data.choices && response.data.choices.length > 0) {
          return { success: true, data: response.data.choices[0].message.content }
        }
        return { success: false, error: 'AI返回数据格式异常' }
      }
    } catch (err) {
      error(`AI chat failed: ${err.message}`)
      let errorMsg = 'AI调用失败'
      if (err.response) {
        if (err.response.status === 401) {
          errorMsg = 'API密钥无效，请检查配置'
        } else if (err.response.status === 429) {
          errorMsg = '请求过于频繁，请稍后重试'
        } else if (err.response.data && err.response.data.error && err.response.data.error.message) {
          errorMsg = err.response.data.error.message
        }
      } else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        errorMsg = '无法连接到AI服务器，请检查网络和地址配置'
      } else if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        errorMsg = '请求超时，请增加超时时间'
      }
      return { success: false, error: errorMsg }
    }
  })

  ipcMain.handle('ai-models', async (event, { apiKey, baseUrl, timeout }) => {
    debug(`AI models request: baseUrl=${baseUrl}`)
    
    if (!apiKey || !apiKey.trim()) {
      warn('AI models failed: API key is required')
      return { success: false, error: '请先配置API密钥' }
    }

    try {
      const response = await axios.get(
        `${baseUrl}/models`,
        {
          timeout: (timeout || 30) * 1000,
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      )
      
      debug(`AI models response: success, status: ${response.status}`)
      
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        const models = response.data.data.map(model => ({
          id: model.id,
          name: model.id,
          owned_by: model.owned_by || '',
          created: model.created || 0
        }))
        return { success: true, data: models }
      }
      return { success: false, error: 'API返回数据格式异常' }
    } catch (err) {
      error(`AI models failed: ${err.message}`)
      let errorMsg = '获取模型列表失败'
      if (err.response) {
        if (err.response.status === 401) {
          errorMsg = 'API密钥无效，请检查配置'
        } else if (err.response.status === 429) {
          errorMsg = '请求过于频繁，请稍后重试'
        } else if (err.response.status === 404) {
          errorMsg = '该API不支持获取模型列表，请手动输入模型名称'
        } else if (err.response.data && err.response.data.error && err.response.data.error.message) {
          errorMsg = err.response.data.error.message
        }
      } else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        errorMsg = '无法连接到AI服务器，请检查网络和地址配置'
      } else if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        errorMsg = '请求超时，请增加超时时间'
      }
      return { success: false, error: errorMsg }
    }
  })

  const SUPPORTED_AUDIO_EXT = ['.mp3', '.flac', '.wav', '.m4a', '.aac', '.ogg', '.wma', '.opus', '.ape', '.wv', '.aiff']

let currentGithubOwner = ''
let currentGithubRepo = ''

function setupAutoUpdater() {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    info('Checking for updates...')
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', { status: 'checking' })
    }
  })

  autoUpdater.on('update-available', (info) => {
    info(`Update available: v${info.version}`)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', {
        status: 'available',
        version: info.version,
        releaseNotes: info.releaseNotes,
        releaseDate: info.releaseDate
      })
    }
  })

  autoUpdater.on('update-not-available', () => {
    info('No update available')
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', { status: 'up-to-date' })
    }
  })

  autoUpdater.on('error', (err) => {
    error(`Update error: ${err.message}`)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', {
        status: 'error',
        error: err.message
      })
    }
  })

  autoUpdater.on('download-progress', (progress) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-download-progress', {
        progress: Math.round(progress.percent),
        downloadedLength: progress.transferred,
        totalLength: progress.total
      })
    }
  })

  autoUpdater.on('update-downloaded', () => {
    info('Update downloaded, ready to install')
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', { status: 'downloaded' })
    }
  })
}

ipcMain.handle('set-update-source', async (event, { owner, repo }) => {
  try {
    currentGithubOwner = owner || ''
    currentGithubRepo = repo || ''
    info(`Update source configured: ${owner}/${repo}`)
    return { success: true }
  } catch (err) {
    error(`Set update source failed: ${err.message}`)
    return { success: false, error: err.message }
  }
})

ipcMain.handle('check-update', async () => {
  try {
    if (currentGithubOwner && currentGithubRepo) {
      autoUpdater.setFeedURL({
        provider: 'github',
        owner: currentGithubOwner,
        repo: currentGithubRepo,
        releaseType: 'release'
      })
    }
    
    const currentVersion = app.getVersion()
    await autoUpdater.checkForUpdates()
    return { success: true, currentVersion }
  } catch (err) {
    error(`Check update failed: ${err.message}`)
    return { success: false, error: err.message }
  }
})

ipcMain.handle('download-update', async () => {
  try {
    await autoUpdater.downloadUpdate()
    return { success: true }
  } catch (err) {
    error(`Download update failed: ${err.message}`)
    return { success: false, error: err.message }
  }
})

ipcMain.handle('cancel-update-download', async () => {
  try {
    autoUpdater.cancelDownload()
    return { success: true }
  } catch (err) {
    error(`Cancel download failed: ${err.message}`)
    return { success: false, error: err.message }
  }
})

ipcMain.handle('install-update', async () => {
  try {
    autoUpdater.quitAndInstall()
    return { success: true }
  } catch (err) {
    error(`Install update failed: ${err.message}`)
    return { success: false, error: err.message }
  }
})

ipcMain.handle('list-local-music', async (event, { customPath, page = 1, pageSize = 20 }) => {
    try {
      const cacheDir = customPath || getDefaultCacheDir()
      const musicDir = join(cacheDir, 'music')

      if (!fs.existsSync(musicDir)) {
        return { success: true, songs: [], total: 0, page, pageSize }
      }

      const files = fs.readdirSync(musicDir)
      const jsonFiles = files.filter(f => f.endsWith('.json'))

      const songs = []
      for (const jsonFile of jsonFiles) {
        try {
          const jsonPath = join(musicDir, jsonFile)
          const metadata = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))

          const baseName = jsonFile.replace('.json', '')
          const musicFile = files.find(f =>
            f.startsWith(baseName + '.') && !f.endsWith('.json') &&
            SUPPORTED_AUDIO_EXT.some(ext => f.toLowerCase().endsWith(ext))
          )

          if (musicFile && metadata) {
            const filePath = join(musicDir, musicFile)
            const stat = fs.statSync(filePath)
            const ext = musicFile.split('.').pop().toLowerCase()

            songs.push({
              id: metadata.id || baseName,
              source: metadata.source || 'local',
              name: metadata.name || musicFile.replace(/\.[^/.]+$/, ''),
              artist: metadata.artist || '未知歌手',
              album: metadata.album || '',
              pic_id: metadata.pic_id,
              lyric_id: metadata.lyric_id,
              quality: metadata.quality || '',
              pic_ext: metadata.pic_ext || 'jpg',
              cached_at: metadata.cached_at || 0,
              filePath,
              fileName: musicFile,
              fileSize: stat.size,
              format: ext
            })
          }
        } catch (e) {
          debug(`Skip invalid cache entry: ${jsonFile}, ${e.message}`)
        }
      }

      songs.sort((a, b) => (b.cached_at || 0) - (a.cached_at || 0))

      const total = songs.length
      const start = (page - 1) * pageSize
      const pagedSongs = songs.slice(start, start + pageSize)

      return { success: true, songs: pagedSongs, total, page, pageSize, hasMore: start + pageSize < total }
    } catch (err) {
      error(`List local music failed: ${err.message}`)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('delete-local-file', async (event, { filePath, customPath }) => {
    try {
      const cacheDir = customPath || getDefaultCacheDir()
      const musicDir = join(cacheDir, 'music')

      const fileName = basename(filePath)
      const baseName = fileName.replace(/\.[^/.]+$/, '')
      const parts = baseName.split('-')
      const source = parts[0] || ''
      const id = parts.slice(1).join('-') || baseName

      // 删除音乐文件
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        info(`Deleted music file: ${filePath}`)
      }

      // 删除元数据JSON
      const jsonPath = join(musicDir, baseName + '.json')
      if (fs.existsSync(jsonPath)) {
        fs.unlinkSync(jsonPath)
        info(`Deleted metadata: ${jsonPath}`)
      }

      // 删除关联歌词
      const lyricDir = join(cacheDir, 'lyric')
      if (fs.existsSync(lyricDir)) {
        const lyricFiles = fs.readdirSync(lyricDir)
        for (const f of lyricFiles) {
          if (f.startsWith(`${source}-${id}.`)) {
            fs.unlinkSync(join(lyricDir, f))
            info(`Deleted lyric: ${f}`)
          }
        }
      }

      // 删除关联专辑封面
      const albumDir = join(cacheDir, 'albumart')
      if (fs.existsSync(albumDir)) {
        const albumFiles = fs.readdirSync(albumDir)
        for (const f of albumFiles) {
          if (f.startsWith(`${source}-${id}.`)) {
            fs.unlinkSync(join(albumDir, f))
            info(`Deleted album art: ${f}`)
          }
        }
      }

      return { success: true }
    } catch (err) {
      error(`Delete local file failed: ${err.message}`)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('write-file', async (event, { filePath, data }) => {
    try {
      const dir = dirname(filePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(filePath, data, 'utf-8')
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('safe-encrypt', async (event, plainText) => {
    try {
      if (!plainText) return ''
      if (safeStorage.isEncryptionAvailable()) {
        return safeStorage.encryptString(plainText).toString('base64')
      }
      return ''
    } catch (err) {
      error(`Safe encrypt failed: ${err.message}`)
      return ''
    }
  })

  ipcMain.handle('safe-decrypt', async (event, encryptedBase64) => {
    try {
      if (!encryptedBase64) return ''
      if (safeStorage.isEncryptionAvailable()) {
        return safeStorage.decryptString(Buffer.from(encryptedBase64, 'base64'))
      }
      return ''
    } catch (err) {
      error(`Safe decrypt failed: ${err.message}`)
      return ''
    }
  })
}

protocol.handle('cache-file', (request) => {
  const url = request.url.replace('cache-file://', '')
  const filePath = decodeURIComponent(url)
  try {
    return net.fetch(`file://${filePath}`)
  } catch (err) {
    error(`Cache protocol error: ${err.message}`)
    return new Response('File not found', { status: 404 })
  }
})

app.whenReady().then(() => {
  initLogger()
  info('=== Application Started ===')
  info(`Platform: ${process.platform}`)
  info(`Electron version: ${process.versions.electron}`)
  info(`Node version: ${process.versions.node}`)
  
  createWindow()
  registerIpcHandlers()
  setupAutoUpdater()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  info('Application shutting down...')
  if (process.platform !== 'darwin') app.quit()
})

app.on('quit', () => {
  info('=== Application Quit ===')
})
