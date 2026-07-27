<template>
  <div class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <Download :size="18" />
        <h3>{{ isBatch ? '批量下载' : '下载音乐' }}</h3>
        <button class="close-btn" @click="close">
          <X :size="16" />
        </button>
      </div>
      <div class="modal-body">
        <div v-if="isBatch && !downloading && !finished" class="batch-info">
          <span class="label">选中歌曲：</span>
          <span>{{ songs.length }} 首</span>
        </div>

        <div v-else-if="!isBatch && !downloading && !finished" class="song-info">
          <div class="info-row">
            <span class="label">歌曲：</span>
            <span>{{ currentSong?.name || currentSong?.title }}</span>
          </div>
          <div class="info-row">
            <span class="label">歌手：</span>
            <span>{{ currentSong?.artist }}</span>
          </div>
          <div class="info-row" v-if="currentSong?.album">
            <span class="label">专辑：</span>
            <span>{{ currentSong?.album }}</span>
          </div>
        </div>

        <div v-if="!downloading && !finished" class="quality-section">
          <div class="info-row">
            <span class="label">下载音质：</span>
            <select v-model="selectedQuality" class="quality-select">
              <option
                v-for="opt in qualityOptions"
                :key="opt.value"
                :value="opt.value"
              >{{ opt.label }}</option>
            </select>
          </div>
          <div class="actions">
            <button class="download-btn" @click="startDownload">
              <Download :size="16" />
              <span>{{ isBatch ? '选择保存位置并批量下载' : '选择保存位置并下载' }}</span>
            </button>
          </div>
        </div>

        <div v-if="downloading" class="progress-area">
          <div v-if="isBatch" class="batch-progress">
            <span class="batch-text">正在下载 {{ currentIndex + 1 }} / {{ songs.length }}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: downloadProgress + '%' }"></div>
          </div>
          <div class="progress-text">
            {{ isBatch ? `正在下载 ${currentSong?.name || currentSong?.title}` : `正在下载 ${downloadProgress}%` }}
          </div>
          <button class="cancel-btn" @click="cancelDownload">
            <X :size="14" />
            <span>取消</span>
          </button>
        </div>

        <div v-if="downloadError" class="result-area error">
          <AlertCircle :size="20" />
          <span>下载失败：{{ downloadError }}</span>
        </div>

        <div v-if="finished && !downloadError" class="result-area success">
          <CheckCircle :size="20" />
          <span>{{ isBatch ? `批量下载完成！成功 ${successCount} 首，失败 ${failCount} 首` : '下载完成！' }}</span>
          <span v-if="!isBatch" class="save-path">{{ savePath }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, onMounted, onUnmounted, computed } from 'vue'
import { getMusicUrl } from '../api/index.js'
import { useSettingsStore } from '../stores/settings.js'
import { Download, X, AlertCircle, CheckCircle } from 'lucide-vue-next'

const { closeDownload, downloadTarget } = inject('download')

const songs = ref([])
const currentIndex = ref(0)
const downloading = ref(false)
const finished = ref(false)
const downloadProgress = ref(0)
const downloadError = ref('')
const savePath = ref('')
const selectedQuality = ref('')
const successCount = ref(0)
const failCount = ref(0)
let downloadProgressCallback = null

function registerProgressListener(callback) {
  if (downloadProgressCallback) {
    window.electronAPI.offDownloadProgress?.(downloadProgressCallback)
  }
  downloadProgressCallback = callback
  window.electronAPI.onDownloadProgress(callback)
}

function cleanupProgressListener() {
  if (downloadProgressCallback) {
    window.electronAPI.offDownloadProgress?.(downloadProgressCallback)
    downloadProgressCallback = null
  }
}

const settings = useSettingsStore()

const isBatch = computed(() => songs.value.length > 1)
const currentSong = computed(() => songs.value[currentIndex.value])

const qualityOptions = computed(() => {
  if (!currentSong.value?.source) return []
  return settings.getQualityOptions(currentSong.value.source)
})

onMounted(() => {
  const target = downloadTarget.value
  if (Array.isArray(target)) {
    songs.value = target
  } else {
    songs.value = [target]
  }
  if (currentSong.value?.source) {
    selectedQuality.value = settings.downloadQuality
  }
})

async function startDownload() {
  if (!currentSong.value) return
  downloading.value = true
  downloadProgress.value = 0
  downloadError.value = ''
  successCount.value = 0
  failCount.value = 0
  currentIndex.value = 0

  if (isBatch.value) {
    await batchDownloadSongs()
  } else {
    await downloadSingleSong(currentSong.value)
  }
}

async function batchDownloadSongs() {
  const downloadList = []
  
  for (let i = 0; i < songs.value.length; i++) {
    if (!downloading.value) break
    
    const song = songs.value[i]
    currentIndex.value = i
    downloadProgress.value = Math.round((i / songs.value.length) * 100)
    
    const qualityParam = settings.getQualityParam(song.source, 'download')
    const qualityKey = song.source === 'netease' || song.source === 'kuwo' ? 'br' : 'quality'
    qualityParam[qualityKey] = selectedQuality.value
    
    const urlRes = await getMusicUrl({ id: song.id, source: song.source, quality: qualityParam })
    if (!urlRes.success || !urlRes.url) {
      failCount.value++
      continue
    }

    const url = urlRes.url
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const extMatch = pathname.match(/\.(mp3|flac|wav|m4a|aac)$/i)
    const isLossless = ['740000', '999000', 'A000', 'flac', 'lossless'].includes(selectedQuality.value)
    const fileExt = extMatch ? extMatch[1].toLowerCase() : (isLossless ? 'flac' : 'mp3')

    downloadList.push({
      url,
      filename: `${song.artist} - ${song.name || song.title}`,
      artist: song.artist,
      songName: song.name || song.title,
      ext: fileExt
    })
  }

  if (downloadList.length === 0) {
    downloadError.value = '未能获取任何歌曲的下载地址'
    downloading.value = false
    return
  }

  registerProgressListener((data) => {
    downloadProgress.value = data.progress
    if (data.current) {
      currentIndex.value = data.current - 1
    }
  })

  const result = await window.electronAPI.downloadMusicBatch({ songs: downloadList })

  if (result.canceled) {
    downloading.value = false
    downloadProgress.value = 0
    return
  } else if (result.success) {
    successCount.value = result.successCount
    failCount.value = result.failCount
    savePath.value = result.saveDir
    downloadProgress.value = 100
    finished.value = true
    downloading.value = false
  } else {
    downloadError.value = result.error || '批量下载失败'
    downloading.value = false
  }
}

async function downloadSingleSong(song, isBatchMode = false) {
  const qualityParam = settings.getQualityParam(song.source, 'download')
  const qualityKey = song.source === 'netease' || song.source === 'kuwo' ? 'br' : 'quality'
  qualityParam[qualityKey] = selectedQuality.value
  
  const urlRes = await getMusicUrl({ id: song.id, source: song.source, quality: qualityParam })
  if (!urlRes.success || !urlRes.url) {
    if (!isBatchMode) {
      downloadError.value = '获取播放地址失败'
      downloading.value = false
    }
    return { success: false, error: '获取播放地址失败' }
  }

  registerProgressListener((data) => {
    downloadProgress.value = data.progress
  })

  const url = urlRes.url
  const urlObj = new URL(url)
  const pathname = urlObj.pathname
  const extMatch = pathname.match(/\.(mp3|flac|wav|m4a|aac)$/i)
  const isLossless = ['740000', '999000', 'A000', 'flac', 'lossless'].includes(selectedQuality.value)
  const fileExt = extMatch ? extMatch[1].toLowerCase() : (isLossless ? 'flac' : 'mp3')

  const result = await window.electronAPI.downloadMusic({
    url,
    filename: `${song.artist} - ${song.name || song.title}`,
    artist: song.artist,
    songName: song.name || song.title,
    ext: fileExt
  })

  if (result.canceled) {
    if (!isBatchMode) {
      downloading.value = false
      downloadProgress.value = 0
    }
    return { success: false, canceled: true }
  } else if (result.success) {
    if (!isBatchMode) {
      downloadProgress.value = 100
      finished.value = true
      savePath.value = result.path
      downloading.value = false
    }
    return { success: true, path: result.path }
  } else {
    const errorMsg = result.error || '下载失败'
    if (!isBatchMode) {
      downloadError.value = errorMsg
      downloading.value = false
    }
    return { success: false, error: errorMsg }
  }
}

async function cancelDownload() {
  await window.electronAPI.cancelDownload()
  downloading.value = false
  downloadProgress.value = 0
}

function close() {
  if (!downloading.value) {
    closeDownload()
  }
}

onUnmounted(() => {
  cleanupProgressListener()
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: var(--bg-layer-2);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  width: 420px;
  max-width: 90%;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
  gap: var(--spacing-sm);
}

.modal-header h3 {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  flex: 1;
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.close-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.modal-body {
  padding: var(--spacing-lg);
}

.song-info {
  margin-bottom: var(--spacing-md);
}

.batch-info {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
  font-size: var(--font-size-base);
}

.batch-info .label {
  color: var(--text-secondary);
}

.info-row {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-xs);
  font-size: var(--font-size-base);
}

.info-row .label {
  color: var(--text-secondary);
  min-width: 70px;
}

.quality-section {
  margin-top: var(--spacing-md);
}

.quality-select {
  flex: 1;
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--bg-layer-2);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  cursor: pointer;
  outline: none;
  min-width: 160px;
}

.quality-select:focus {
  border-color: var(--color-primary);
}

.actions {
  margin-top: var(--spacing-lg);
  text-align: center;
}

.download-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-xl);
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-md);
  color: white;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.download-btn:hover {
  background: var(--color-primary-light);
  transform: translateY(-1px);
  box-shadow: var(--shadow-glow);
}

.progress-area {
  margin-top: var(--spacing-lg);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
}

.batch-progress {
  width: 100%;
  text-align: center;
}

.batch-text {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: var(--bg-layer-3);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-light));
  border-radius: 3px;
  transition: width 0.2s;
}

.progress-text {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.cancel-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-md);
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.cancel-btn:hover {
  background: var(--bg-hover);
  border-color: var(--color-error);
  color: var(--color-error);
}

.result-area {
  margin-top: var(--spacing-lg);
  text-align: center;
  font-size: var(--font-size-base);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
}

.result-area.error {
  color: var(--color-error);
}

.result-area.success {
  color: var(--color-success);
}

.save-path {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  word-break: break-all;
  max-width: 100%;
}
</style>