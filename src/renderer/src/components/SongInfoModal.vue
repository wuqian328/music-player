<template>
  <div class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <Info :size="18" />
        <h3>歌曲信息</h3>
        <button class="close-btn" @click="close">
          <X :size="16" />
        </button>
      </div>
      <div class="modal-body">
        <div class="info-row">
          <span class="label">歌名：</span>
          <span class="value">{{ song?.name || song?.title || '未知歌曲' }}</span>
        </div>
        <div class="info-row">
          <span class="label">歌手：</span>
          <span class="value">{{ song?.artist || '未知歌手' }}</span>
        </div>
        <div class="info-row" v-if="song?.album">
          <span class="label">专辑：</span>
          <span class="value">{{ song.album }}</span>
        </div>
        <div class="info-row">
          <span class="label">来源：</span>
          <span class="value">{{ sourceLabel }}</span>
        </div>
        <div class="info-row">
          <span class="label">音质：</span>
          <span class="value">{{ qualityLabel }}</span>
        </div>

        <div v-if="showDetail" class="detail-section">
          <div class="info-row">
            <span class="label">时长：</span>
            <span class="value">{{ durationLabel }}</span>
          </div>
          <div class="info-row">
            <span class="label">歌曲ID：</span>
            <span class="value">{{ song?.id || '未知' }}</span>
          </div>
          <div class="info-row">
            <span class="label">文件大小：</span>
            <span class="value">{{ fileSize || '获取中...' }}</span>
          </div>
          <div class="info-row">
            <span class="label">歌词链接：</span>
            <div class="link-section">
              <span class="url-text" @click="copyLyricsUrl">{{ lyricsUrl || '获取中...' }}</span>
              <span class="copy-hint">点击复制</span>
            </div>
          </div>
          <div class="info-row" v-if="song?.albumArtUrl || song?.picUrl">
            <span class="label">封面链接：</span>
            <div class="link-section">
              <span class="url-text" @click="copyCoverUrl">{{ song?.albumArtUrl || song?.picUrl }}</span>
              <span class="copy-hint">点击复制</span>
            </div>
          </div>
          <div class="info-row">
            <span class="label">歌曲链接：</span>
            <div class="link-section">
              <span class="url-text" @click="copySongUrl">{{ songUrl || '获取中...' }}</span>
              <span class="copy-hint">点击复制</span>
            </div>
          </div>
        </div>

        <div class="actions-section">
          <span class="label">操作：</span>
          <div class="action-buttons">
            <button class="action-btn" @click="downloadSong">
              <Download :size="12" />
              <span>下载</span>
            </button>
            <button class="action-btn" @click="toggleDetail">
              <FileText :size="12" />
              <span>{{ showDetail ? '收起' : '详情' }}</span>
            </button>
            <button class="action-btn" @click="toggleFavorite">
              <Heart :size="12" :class="{ filled: isFavorite }" />
              <span>{{ isFavorite ? '已收藏' : '收藏' }}</span>
            </button>
            <button class="action-btn" @click="searchArtist">
              <User :size="12" />
              <span>找歌手</span>
            </button>
            <button class="action-btn" @click="searchAlbum">
              <Disc :size="12" />
              <span>找专辑</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import { Info, X, Download, FileText, Heart, User, Disc, Copy } from 'lucide-vue-next'

const { closeSongInfo, songInfoTarget, triggerSearch } = inject('songInfo')
const { openDownload } = inject('download')

const song = ref(null)
const isFavorite = ref(false)
const showDetail = ref(false)
const fileSize = ref('')
const songUrl = ref('')
const lyricsUrl = ref('')

const player = usePlayerStore()

const sourceLabel = computed(() => {
  const map = {
    netease: '网易云音乐',
    qq: 'QQ音乐',
    kuwo: '酷我音乐',
    bilibili: '哔哩哔哩'
  }
  return map[song.value?.source] || song.value?.source || '未知来源'
})

const qualityLabel = computed(() => {
  return player.qualityLabel || '未知音质'
})

const durationLabel = computed(() => {
  if (!player.duration) return '未知'
  const m = Math.floor(player.duration / 60)
  const s = Math.floor(player.duration % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

async function fetchSongDetails() {
  if (!song.value) return
  try {
    const urlRes = await window.electronAPI.apiRequest({
      types: 'url',
      id: song.value.id,
      source: song.value.source,
      br: player.currentQuality || '320000'
    })
    if (urlRes.success && urlRes.data?.url) {
      songUrl.value = urlRes.data.url
      if (urlRes.data.size) {
        const sizeBytes = parseInt(urlRes.data.size)
        if (sizeBytes < 1024) {
          fileSize.value = sizeBytes + 'B'
        } else if (sizeBytes < 1024 * 1024) {
          fileSize.value = (sizeBytes / 1024).toFixed(2) + 'KB'
        } else {
          fileSize.value = (sizeBytes / (1024 * 1024)).toFixed(2) + 'MB'
        }
      } else {
        try {
          const response = await fetch(urlRes.data.url, { method: 'HEAD' })
          const contentLength = response.headers.get('content-length')
          if (contentLength) {
            const bytes = parseInt(contentLength)
            if (bytes < 1024) {
              fileSize.value = bytes + 'B'
            } else if (bytes < 1024 * 1024) {
              fileSize.value = (bytes / 1024).toFixed(2) + 'KB'
            } else {
              fileSize.value = (bytes / (1024 * 1024)).toFixed(2) + 'MB'
            }
          } else {
            fileSize.value = '未知大小'
          }
        } catch {
          fileSize.value = '未知大小'
        }
      }
    } else {
      songUrl.value = '获取失败'
      fileSize.value = '未知大小'
    }

    lyricsUrl.value = `https://music-api.gdstudio.xyz/api.php?types=lyric&source=${song.value.source}&id=${song.value.id}`
  } catch (err) {
    console.error('获取歌曲详情失败:', err)
    songUrl.value = '获取失败'
    lyricsUrl.value = '获取失败'
    fileSize.value = '未知大小'
  }
}

function toggleDetail() {
  showDetail.value = !showDetail.value
  if (showDetail.value && !songUrl.value) {
    fetchSongDetails()
  }
}

function close() {
  closeSongInfo()
}

function downloadSong() {
  if (song.value) {
    openDownload(song.value)
    closeSongInfo()
  }
}

function copyLyricsUrl() {
  if (lyricsUrl.value && lyricsUrl.value !== '获取中...' && lyricsUrl.value !== '暂无歌词') {
    navigator.clipboard.writeText(lyricsUrl.value).then(() => {
      alert('歌词链接已复制')
    })
  }
}

function copyCoverUrl() {
  const url = song.value?.albumArtUrl || song.value?.picUrl
  if (url) {
    navigator.clipboard.writeText(url).then(() => {
      alert('封面链接已复制')
    })
  }
}

function copySongUrl() {
  if (songUrl.value && songUrl.value !== '获取中...') {
    navigator.clipboard.writeText(songUrl.value).then(() => {
      alert('歌曲链接已复制')
    })
  }
}

function toggleFavorite() {
  isFavorite.value = !isFavorite.value
}

function searchArtist() {
  if (song.value?.artist) {
    triggerSearch(song.value.artist)
  }
}

function searchAlbum() {
  if (song.value?.album) {
    triggerSearch(song.value.album)
  }
}

import { onMounted } from 'vue'
onMounted(() => {
  song.value = songInfoTarget.value
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
  max-height: 80vh;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
  gap: var(--spacing-sm);
  flex-shrink: 0;
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
  overflow-y: auto;
  flex: 1;
}

.info-row {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
  font-size: var(--font-size-base);
}

.info-row .label {
  color: var(--text-secondary);
  min-width: 60px;
  flex-shrink: 0;
}

.info-row .value {
  flex: 1;
  word-break: break-all;
}

.detail-section {
  margin: var(--spacing-md) 0;
  padding: var(--spacing-md);
  background: var(--bg-layer-1);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.cover-preview {
  flex: 1;
}

.cover-preview img {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-md);
  object-fit: cover;
}

.link-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.url-text {
  font-size: var(--font-size-xs);
  color: var(--color-primary);
  word-break: break-all;
  max-width: 100%;
  cursor: pointer;
  text-decoration: underline;
}

.url-text:hover {
  color: var(--color-primary-light);
}

.copy-hint {
  font-size: 10px;
  color: var(--text-muted);
}

.link-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: var(--spacing-xs) var(--spacing-sm);
  background: transparent;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.link-btn:hover {
  background: var(--color-primary);
  color: white;
}

.actions-section {
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-color);
}

.actions-section .label {
  color: var(--text-secondary);
  display: block;
  margin-bottom: var(--spacing-sm);
  font-size: var(--font-size-sm);
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: var(--spacing-xs) var(--spacing-md);
  background: var(--bg-layer-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-btn:hover {
  background: var(--bg-hover);
  border-color: var(--color-primary);
}

.action-btn .filled {
  color: var(--color-error);
}
</style>