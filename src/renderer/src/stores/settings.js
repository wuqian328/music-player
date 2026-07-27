import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const SETTINGS_KEY = 'music-player-settings'

const QUALITY_OPTIONS = {
  netease: [
    { value: '128000', label: '标准 128kbps' },
    { value: '192000', label: '高清 192kbps' },
    { value: '320000', label: '超清 320kbps' },
    { value: '740000', label: '无损 16bit' },
    { value: '999000', label: '无损 24bit' }
  ],
  tencent: [
    { value: 'M500', label: '标准 128kbps' },
    { value: 'M800', label: '高清 192kbps' },
    { value: 'M1000', label: '超清 320kbps' },
    { value: 'A000', label: '无损 FLAC' }
  ],
  kuwo: [
    { value: '128k', label: '标准 128kbps' },
    { value: '192k', label: '高清 192kbps' },
    { value: '320k', label: '超清 320kbps' },
    { value: 'flac', label: '无损 FLAC' }
  ],
  bilibili: [
    { value: 'standard', label: '标准' },
    { value: 'high', label: '高清' },
    { value: 'lossless', label: '无损' }
  ]
}

function defaults() {
  return {
    playQuality: '320000',
    downloadQuality: '320000',
    cacheEnabled: true,
    cacheDirectory: '',
    autoCacheLyrics: true,
    autoCacheAlbumArt: true,
    aiApiKey: '',
    aiModel: 'gpt-4o-mini',
    aiBaseUrl: 'https://api.openai.com/v1',
    aiTimeout: 30,
    aiTemperature: 0.7,
    aiMusicStyles: JSON.stringify([
      { value: 'pop', label: '流行' },
      { value: 'rock', label: '摇滚' },
      { value: 'jazz', label: '爵士' },
      { value: 'classical', label: '古典' },
      { value: 'electronic', label: '电子' },
      { value: 'rnb', label: 'R&B' },
      { value: 'folk', label: '民谣' },
      { value: 'hiphop', label: '嘻哈' },
      { value: 'indie', label: '独立' },
      { value: 'chinese', label: '华语' }
    ]),
    aiMoods: JSON.stringify([
      { value: 'happy', label: '快乐' },
      { value: 'relaxed', label: '放松' },
      { value: 'sad', label: '伤感' },
      { value: 'energetic', label: '活力' },
      { value: 'romantic', label: '浪漫' },
      { value: 'focus', label: '专注' },
      { value: 'nostalgic', label: '怀旧' },
      { value: 'calm', label: '平静' }
    ]),
    aiSelectedStyles: JSON.stringify([]),
    aiSelectedMoods: JSON.stringify([]),
    aiSongCounts: JSON.stringify([5, 10, 15, 20]),
    aiSongCount: 10,
    aiCustomPrompt: '',
    updateGithubOwner: '',
    updateGithubRepo: ''
  }
}

function load() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? { ...defaults(), ...JSON.parse(raw) } : defaults()
  } catch {
    return defaults()
  }
}

function save(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

const ENC_PREFIX = '__enc__'

function decryptApiKey(encrypted) {
  if (encrypted && encrypted.startsWith(ENC_PREFIX)) {
    return window.electronAPI.safeDecrypt(encrypted.slice(ENC_PREFIX.length))
  }
  return Promise.resolve(encrypted)
}

async function encryptApiKey(plain) {
  if (plain) {
    const encrypted = await window.electronAPI.safeEncrypt(plain)
    if (encrypted) {
      return ENC_PREFIX + encrypted
    }
  }
  return plain
}

export const useSettingsStore = defineStore('settings', () => {
  const saved = load()

  const playQuality = ref(saved.playQuality)
  const downloadQuality = ref(saved.downloadQuality)
  const cacheEnabled = ref(saved.cacheEnabled)
  const cacheDirectory = ref(saved.cacheDirectory)
  const autoCacheLyrics = ref(saved.autoCacheLyrics)
  const autoCacheAlbumArt = ref(saved.autoCacheAlbumArt)
  const cacheInfo = ref({ size: 0, count: 0, path: '' })
  const aiApiKey = ref(saved.aiApiKey)
  const aiModel = ref(saved.aiModel)
  const aiBaseUrl = ref(saved.aiBaseUrl)
  const aiTimeout = ref(saved.aiTimeout)
  const aiTemperature = ref(saved.aiTemperature)
  const aiMusicStyles = ref(saved.aiMusicStyles)
  const aiMoods = ref(saved.aiMoods)
  const aiSelectedStyles = ref(saved.aiSelectedStyles)
  const aiSelectedMoods = ref(saved.aiSelectedMoods)
  const aiSongCounts = ref(saved.aiSongCounts)
  const aiSongCount = ref(saved.aiSongCount)
  const aiCustomPrompt = ref(saved.aiCustomPrompt)
  const updateGithubOwner = ref(saved.updateGithubOwner)
  const updateGithubRepo = ref(saved.updateGithubRepo)

  // 解密 API 密钥
  decryptApiKey(saved.aiApiKey).then(decrypted => {
    if (decrypted) aiApiKey.value = decrypted
  })

  function getMusicStyles() {
    try { return JSON.parse(aiMusicStyles.value) } catch { return [] }
  }

  function getMoods() {
    try { return JSON.parse(aiMoods.value) } catch { return [] }
  }

  function getSelectedStyles() {
    try { return JSON.parse(aiSelectedStyles.value) } catch { return [] }
  }

  function getSelectedMoods() {
    try { return JSON.parse(aiSelectedMoods.value) } catch { return [] }
  }

  function setSelectedStyles(styles) {
    aiSelectedStyles.value = JSON.stringify(styles)
  }

  function setSelectedMoods(moods) {
    aiSelectedMoods.value = JSON.stringify(moods)
  }

  function setMusicStyles(styles) {
    aiMusicStyles.value = JSON.stringify(styles)
  }

  function setMoods(moods) {
    aiMoods.value = JSON.stringify(moods)
  }

  function getSongCounts() {
    try { return JSON.parse(aiSongCounts.value) } catch { return [5, 10, 15, 20] }
  }

  function setSongCounts(counts) {
    aiSongCounts.value = JSON.stringify(counts)
  }

  function persist() {
    save({
      playQuality: playQuality.value,
      downloadQuality: downloadQuality.value,
      cacheEnabled: cacheEnabled.value,
      cacheDirectory: cacheDirectory.value,
      autoCacheLyrics: autoCacheLyrics.value,
      autoCacheAlbumArt: autoCacheAlbumArt.value,
      aiApiKey: aiApiKey.value,
      aiModel: aiModel.value,
      aiBaseUrl: aiBaseUrl.value,
      aiTimeout: aiTimeout.value,
      aiTemperature: aiTemperature.value,
      aiMusicStyles: aiMusicStyles.value,
      aiMoods: aiMoods.value,
      aiSelectedStyles: aiSelectedStyles.value,
      aiSelectedMoods: aiSelectedMoods.value,
      aiSongCounts: aiSongCounts.value,
      aiSongCount: aiSongCount.value,
      aiCustomPrompt: aiCustomPrompt.value,
      updateGithubOwner: updateGithubOwner.value,
      updateGithubRepo: updateGithubRepo.value
    })
  }

  function debounce(fn, delay = 300) {
    let timer = null
    return function(...args) {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => fn.apply(this, args), delay)
    }
  }

  const debouncedPersist = debounce(persist, 300)

  watch([playQuality, downloadQuality, cacheEnabled, cacheDirectory, autoCacheLyrics, autoCacheAlbumArt, aiApiKey, aiModel, aiBaseUrl, aiTimeout, aiTemperature, aiMusicStyles, aiMoods, aiSelectedStyles, aiSelectedMoods, aiSongCounts, aiSongCount, aiCustomPrompt, updateGithubOwner, updateGithubRepo], debouncedPersist, { deep: true })

  function getQualityOptions(source) {
    return QUALITY_OPTIONS[source] || QUALITY_OPTIONS.netease
  }

  function getQualityParam(source, mode = 'play') {
    const val = mode === 'play' ? playQuality.value : downloadQuality.value
    if (source === 'netease') return { br: val }
    if (source === 'tencent') return { quality: val }
    if (source === 'kuwo') return { br: val }
    if (source === 'bilibili') return { quality: val }
    return {}
  }

  async function selectCacheDir() {
    const res = await window.electronAPI.selectDirectory()
    if (res.success) {
      cacheDirectory.value = res.path
    }
    return res
  }

  async function refreshCacheInfo() {
    const res = await window.electronAPI.getCacheInfo(cacheDirectory.value)
    if (res.success) cacheInfo.value = { size: res.size, count: res.count, path: res.path }
  }

  async function clearCacheData() {
    const res = await window.electronAPI.clearCache(cacheDirectory.value)
    if (res.success) await refreshCacheInfo()
    return res
  }

  async function init() {
    await window.electronAPI.ensureCacheDir(cacheDirectory.value)
    await refreshCacheInfo()
  }

  function formatSize(bytes) {
    if (!bytes) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB']
    let i = 0
    let size = bytes
    while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
    return size.toFixed(1) + ' ' + units[i]
  }

  return {
    playQuality, downloadQuality, cacheEnabled, cacheDirectory,
    autoCacheLyrics, autoCacheAlbumArt, cacheInfo,
    aiApiKey, aiModel, aiBaseUrl, aiTimeout, aiTemperature,
    aiMusicStyles, aiMoods, aiSelectedStyles, aiSelectedMoods, aiSongCounts, aiSongCount, aiCustomPrompt,
    updateGithubOwner, updateGithubRepo,
    getMusicStyles, getMoods, getSelectedStyles, getSelectedMoods, setSelectedStyles, setSelectedMoods,
    setMusicStyles, setMoods, getSongCounts, setSongCounts,
    getQualityOptions, getQualityParam, selectCacheDir,
    refreshCacheInfo, clearCacheData, init, formatSize
  }
})
