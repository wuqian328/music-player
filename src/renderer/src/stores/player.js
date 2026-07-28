import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Howl } from 'howler'
import { getMusicUrl, getLyric, getAlbumArt, SOURCE_MAP, searchMusic } from '../api/index.js'
import { addHistory, getHistory } from '../utils/storage.js'
import { useSettingsStore } from './settings.js'

export const usePlayerStore = defineStore('player', () => {
  const currentSong = ref(null)
  const playlist = ref([])
  const currentIndex = ref(-1)
  const playing = ref(false)
  const volume = ref(0.8)
  const muted = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const playMode = ref('order')
  const lyricLines = ref([])
  const currentLyricIndex = ref(-1)
  const loading = ref(false)
  const history = ref(getHistory())
  const albumArtUrl = ref('')
  const currentQuality = ref('')

  let howl = null
  let rafId = null

  const songName = computed(() => currentSong.value?.name || '未知歌曲')
  const artistName = computed(() => currentSong.value?.artist || '未知歌手')
  const sourceLabel = computed(() => {
    if (!currentSong.value?.source) return ''
    return SOURCE_MAP[currentSong.value.source] || currentSong.value.source
  })

  const qualityLabel = computed(() => {
    if (!currentQuality.value) return ''
    const settings = useSettingsStore()
    const options = settings.getQualityOptions(currentSong.value?.source || 'netease')
    const opt = options.find(o => o.value === currentQuality.value)
    return opt ? opt.label : currentQuality.value
  })

  const playError = ref('')
  const retryCount = ref(0)

  const QUALITY_FALLBACK = {
    netease: ['320000', '192000', '128000'],
    tencent: ['M1000', 'M800', 'M500'],
    kuwo: ['320k', '192k', '128k'],
    bilibili: ['lossless', 'high', 'standard']
  }

  function getQualityFallback(source, currentQuality) {
    const chain = QUALITY_FALLBACK[source] || ['320000', '192000', '128000']
    const idx = chain.indexOf(currentQuality)
    if (idx !== -1 && idx < chain.length - 1) {
      return chain[idx + 1]
    }
    return null
  }

  function createHowlInstance(src, qualityInfo) {
    return new Promise((resolve) => {
      const h = new Howl({
        src: [src],
        html5: true,
        volume: muted.value ? 0 : volume.value,
        onload: () => {
          duration.value = h.duration()
          loading.value = false
          playError.value = ''
          h.play()
          playing.value = true
          howl = h
          rafId = requestAnimationFrame(updateTime)
          resolve({ success: true })
        },
        onend: () => {
          playing.value = false
          cancelAnimationFrame(rafId)
          if (playMode.value === 'single') {
            h.seek(0)
            h.play()
            playing.value = true
            rafId = requestAnimationFrame(updateTime)
          } else {
            nextSong()
          }
        },
        onloaderror: (id, err) => {
          console.error('Howl load error:', err)
          resolve({ success: false, error: err, qualityInfo })
        }
      })
    })
  }

  async function tryPlayWithFallback(src, initialQuality, song) {
    let quality = initialQuality
    let result = await createHowlInstance(src)

    while (!result.success && quality) {
      const fallback = getQualityFallback(song.source, quality)
      if (!fallback) break

      console.log(`Retrying with lower quality: ${fallback}`)
      retryCount.value++
      quality = fallback

      if (howl) howl.unload()

      const fbRes = await getMusicUrl({
        id: song.id,
        source: song.source,
        quality: { br: fallback, quality: fallback }
      })
      if (fbRes.success && fbRes.url) {
        currentQuality.value = fallback
        result = await createHowlInstance(fbRes.url)
      } else {
        break
      }
    }

    if (!result.success) {
      loading.value = false
      playError.value = `播放失败: ${song.name}`
    }

    return result.success
  }

  function parseLrc(lrcText) {
    if (!lrcText) return []
    const lines = lrcText.split('\n')
    const result = []
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/
    lines.forEach(line => {
      const match = line.match(timeRegex)
      if (match) {
        const minutes = parseInt(match[1])
        const seconds = parseInt(match[2])
        const millis = parseInt(match[3].padEnd(3, '0'))
        const time = minutes * 60 + seconds + millis / 1000
        const text = line.replace(timeRegex, '').trim()
        if (text) result.push({ time, text })
      }
    })
    result.sort((a, b) => a.time - b.time)
    return result
  }

  function updateTime() {
    if (howl && howl.playing()) {
      currentTime.value = howl.seek() || 0
      duration.value = howl.duration() || 0

      const idx = lyricLines.value.findIndex((line, i) => {
        const next = lyricLines.value[i + 1]
        if (!next) return line.time <= currentTime.value
        return line.time <= currentTime.value && currentTime.value < next.time
      })
      currentLyricIndex.value = idx

      rafId = requestAnimationFrame(updateTime)
    }
  }

  // 判断两首歌是否为同一首（兼容AI生成的无ID歌曲）
  function songsMatch(s1, s2) {
    if (s1.id && s2.id && !s1.isAiGenerated && !s2.isAiGenerated) {
      return s1.id === s2.id && s1.source === s2.source
    }
    // AI生成的歌曲用歌名+歌手匹配
    const name1 = (s1.name || '').trim().toLowerCase()
    const name2 = (s2.name || '').trim().toLowerCase()
    const artist1 = (s1.artist || '').trim().toLowerCase()
    const artist2 = (s2.artist || '').trim().toLowerCase()
    return name1 === name2 && artist1 === artist2
  }

  // 通过搜索API解析AI生成的歌曲，获取真实ID等信息
  async function resolveAiSong(song) {
    if (!song.isAiGenerated) return { success: true, song }

    const keyword = `${song.name} ${song.artist}`.trim()
    try {
      const res = await searchMusic({ keyword, source: song.source || 'netease', count: 5 })
      if (res.success && res.songs.length > 0) {
        const realSong = {
          ...res.songs[0],
          reason: song.reason || '',
          isAiGenerated: false
        }
        return { success: true, song: realSong }
      }
    } catch (e) {
      console.error('Resolve AI song failed:', e)
    }
    return { success: false }
  }

  // 用新歌曲信息更新播放列表中对应位置的歌曲
  function updateSongInPlaylist(oldSong, newSong) {
    const idx = playlist.value.findIndex(s => songsMatch(s, oldSong))
    if (idx !== -1) {
      playlist.value[idx] = newSong
      if (idx === currentIndex.value) {
        currentSong.value = newSong
      }
    }
  }

  // 清理文件名中的非法字符，生成可用于文件名的安全字符串
  function sanitizeFileName(str) {
    if (!str) return ''
    return str.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim()
  }

  // 生成"歌名-歌手"格式的缓存文件名基础部分
  function getCacheBaseName(song) {
    const name = sanitizeFileName(song.name || '')
    const artist = sanitizeFileName(song.artist || '')
    return `${name}-${artist}`
  }

  async function cacheLyric(song, lyricText) {
    const settings = useSettingsStore()
    if (!settings.cacheEnabled || !settings.autoCacheLyrics || !lyricText) return
    
    try {
      const fileName = `${getCacheBaseName(song)}.lrc`
      await window.electronAPI.cacheFile({
        fileName,
        customPath: settings.cacheDirectory,
        type: 'lyric',
        content: lyricText
      })
    } catch (e) {
      console.error('Cache lyric failed:', e)
    }
  }

  function getFileExtFromUrl(url) {
    try {
      const cleanUrl = url.split('?')[0]
      const ext = cleanUrl.split('.').pop()
      if (ext && ext.length <= 5 && /^[a-zA-Z0-9]+$/.test(ext)) {
        return ext.toLowerCase()
      }
    } catch (e) {}
    return 'jpg'
  }

  async function cacheAlbumArt(song, url) {
    const settings = useSettingsStore()
    if (!settings.cacheEnabled || !settings.autoCacheAlbumArt || !url) return
    
    try {
      const ext = getFileExtFromUrl(url)
      const fileName = `${getCacheBaseName(song)}.${ext}`
      await window.electronAPI.cacheFile({
        url,
        fileName,
        customPath: settings.cacheDirectory,
        type: 'albumart'
      })
    } catch (e) {
      console.error('Cache album art failed:', e)
    }
  }

  async function cacheMusicFile(song, url, metadata = {}) {
    const settings = useSettingsStore()
    if (!settings.cacheEnabled || !url) return
    
    try {
      const ext = getFileExtFromUrl(url) || 'mp3'
      const fileName = `${getCacheBaseName(song)}.${ext}`
      const meta = {
        id: song.id,
        source: song.source,
        ...metadata
      }
      await window.electronAPI.cacheFile({
        url,
        fileName,
        customPath: settings.cacheDirectory,
        type: 'music',
        metadata: meta
      })
    } catch (e) {
      console.error('Cache music failed:', e)
    }
  }

  async function refreshCacheStats() {
    try {
      const settings = useSettingsStore()
      await settings.refreshCacheInfo()
    } catch (e) {}
  }

  async function loadFromCache(song) {
    const settings = useSettingsStore()
    try {
      const baseName = getCacheBaseName(song)
      const cachedRes = await window.electronAPI.getCachedSong({
        fileName: baseName,
        customPath: settings.cacheDirectory
      })
      
      if (cachedRes.success && cachedRes.cached) {
        console.log('Loading music from cache:', cachedRes.musicPath)
        
        const dataUrlRes = await window.electronAPI.readFileAsDataUrl(cachedRes.musicPath)
        if (!dataUrlRes.success) {
          console.error('Failed to read cached file as data URL:', dataUrlRes.error)
          return { success: false, fromCache: false }
        }
        
        const lyricFile = `${baseName}.lrc`
        const lyricRes = await window.electronAPI.readCachedFile({
          fileName: lyricFile,
          customPath: settings.cacheDirectory,
          type: 'lyric'
        })
        if (lyricRes.success && lyricRes.exists) {
          lyricLines.value = parseLrc(lyricRes.content)
        }
        
        const albumExt = cachedRes.metadata.pic_ext || 'jpg'
        const albumFile = `${baseName}.${albumExt}`
        const albumRes = await window.electronAPI.getCachedFile({
          fileName: albumFile,
          customPath: settings.cacheDirectory,
          type: 'albumart'
        })
        if (albumRes.success && albumRes.exists) {
          const albumDataUrlRes = await window.electronAPI.readFileAsDataUrl(albumRes.path)
          if (albumDataUrlRes.success) {
            albumArtUrl.value = albumDataUrlRes.dataUrl
          }
        }
        
        currentQuality.value = cachedRes.metadata.quality || ''
        
        return { success: true, url: dataUrlRes.dataUrl, fromCache: true }
      }
    } catch (e) {
      console.error('Load from cache failed:', e)
    }
    return { success: false, fromCache: false }
  }

  async function playSong(song) {
    loading.value = true
    playError.value = ''

    // 如果是AI生成的歌曲，先通过搜索API获取真实信息
    if (song.isAiGenerated) {
      const resolved = await resolveAiSong(song)
      if (resolved.success) {
        updateSongInPlaylist(song, resolved.song)
        song = resolved.song
      } else {
        loading.value = false
        playError.value = '无法解析AI生成的歌曲信息'
        return
      }
    }

    currentSong.value = song
    history.value = addHistory(song)

    const settings = useSettingsStore()
    
    const cacheRes = await loadFromCache(song)
    
    if (cacheRes.success && cacheRes.fromCache) {
      if (howl) howl.unload()

      const result = await createHowlInstance(cacheRes.url)
      if (!result.success) {
        playError.value = `缓存播放失败: ${song.name}`
      }
      return
    }

    const qualityParam = settings.getQualityParam(song.source, 'play')
    const qualityKey = song.source === 'netease' || song.source === 'kuwo' ? 'br' : 'quality'
    const initialQuality = qualityParam[qualityKey] || qualityParam.br || qualityParam.quality || ''
    currentQuality.value = initialQuality
    
    const urlRes = await getMusicUrl({ id: song.id, source: song.source, quality: qualityParam })
    if (!urlRes.success || !urlRes.url) {
      loading.value = false
      playError.value = `获取播放地址失败: ${song.name}`
      return
    }

    const lyricRes = await getLyric({ id: song.lyric_id || song.id, source: song.source })
    lyricLines.value = parseLrc(lyricRes.lyric)

    const albumRes = await getAlbumArt({ id: song.pic_id || song.id, source: song.source })
    albumArtUrl.value = albumRes.url

    cacheLyric(song, lyricRes.lyric)
    cacheAlbumArt(song, albumRes.url)
    cacheMusicFile(song, urlRes.url, {
      name: song.name,
      artist: song.artist,
      album: song.album,
      pic_id: song.pic_id || song.id,
      lyric_id: song.lyric_id || song.id,
      quality: currentQuality.value,
      pic_ext: getFileExtFromUrl(albumRes.url),
      url: urlRes.url,
      cached_at: Date.now()
    })
    
    setTimeout(() => {
      refreshCacheStats()
    }, 3000)

    if (howl) howl.unload()

    await tryPlayWithFallback(urlRes.url, initialQuality, song)
  }

  function togglePlay() {
    if (!howl) return
    if (playing.value) {
      howl.pause()
      playing.value = false
      cancelAnimationFrame(rafId)
    } else {
      howl.play()
      playing.value = true
      rafId = requestAnimationFrame(updateTime)
    }
  }

  function seek(time) {
    if (howl) {
      howl.seek(time)
      currentTime.value = time
    }
  }

  function setVolume(val) {
    volume.value = val
    if (howl) {
      howl.volume(muted.value ? 0 : val)
    }
  }

  function toggleMute() {
    muted.value = !muted.value
    if (howl) {
      howl.volume(muted.value ? 0 : volume.value)
    }
  }

  function nextSong() {
    if (playlist.value.length === 0) return
    const next = getNextIndex()
    currentIndex.value = next
    playSong(playlist.value[next])
  }

  function prevSong() {
    if (playlist.value.length === 0) return
    let prev = currentIndex.value - 1
    if (prev < 0) prev = playlist.value.length - 1
    currentIndex.value = prev
    playSong(playlist.value[prev])
  }

  function setPlaylist(songs) {
    playlist.value = songs
  }

  function playFromList(songs, index) {
    setPlaylist(songs)
    currentIndex.value = index
    playSong(songs[index])
  }

  function addToPlaylist(song) {
    const exists = playlist.value.find(s => songsMatch(s, song))
    if (!exists) {
      playlist.value.push(song)
    }
    if (playlist.value.length === 1) {
      currentIndex.value = 0
    }
  }

  function removeFromList(index) {
    if (index === currentIndex.value) {
      if (howl) howl.unload()
      playing.value = false
      currentSong.value = null
    }
    playlist.value.splice(index, 1)
    if (currentIndex.value >= index && currentIndex.value > 0) {
      currentIndex.value--
    }
  }

  function togglePlayMode() {
    const modes = ['order', 'single', 'random']
    const idx = modes.indexOf(playMode.value)
    playMode.value = modes[(idx + 1) % modes.length]
  }

  function getNextIndex() {
    if (playMode.value === 'random') {
      return Math.floor(Math.random() * playlist.value.length)
    }
    return (currentIndex.value + 1) % playlist.value.length
  }

  function loadHistory() {
    history.value = getHistory()
  }

  return {
    currentSong, playlist, currentIndex, playing, volume, muted,
    currentTime, duration, playMode, lyricLines, currentLyricIndex,
    loading, history, albumArtUrl, currentQuality, playError, retryCount,
    songName, artistName, sourceLabel, qualityLabel,
    playSong, togglePlay, seek, setVolume, toggleMute,
    nextSong, prevSong, setPlaylist, playFromList,
    addToPlaylist, removeFromList, togglePlayMode, loadHistory,
    resolveAiSong, updateSongInPlaylist, songsMatch
  }
})
