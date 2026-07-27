<template>
  <div class="local-music-panel">
    <div class="panel-header">
      <div class="header-left">
        <FolderOpen :size="18" />
        <h3>本地音乐</h3>
        <span class="song-count">({{ totalCount }})</span>
      </div>
      <div class="header-actions">
        <button class="action-btn" title="刷新列表" @click="refresh">
          <RefreshCw :size="14" :class="{ spinning: loading }" />
        </button>
      </div>
    </div>

    <div v-if="errorMsg" class="error-banner">
      <AlertCircle :size="14" />
      <span>{{ errorMsg }}</span>
      <button class="error-dismiss" @click="errorMsg = ''">&times;</button>
    </div>

    <div v-if="loading && songs.length === 0" class="loading-state">
      <div class="skeleton" v-for="i in 5" :key="i" style="height: 48px; margin-bottom: 8px; border-radius: var(--radius-md);" />
    </div>

    <div v-else-if="!loading && songs.length === 0" class="empty-state">
      <FolderOpen :size="40" />
      <span>暂无本地歌曲</span>
      <span class="empty-hint">播放歌曲后会自动缓存到本地</span>
    </div>

    <div v-else class="song-list">
      <div
        v-for="song in songs"
        :key="song.filePath"
        class="song-item"
        :class="{ active: isCurrentSong(song) }"
        @dblclick="playSong(song)"
      >
        <button class="play-btn" :title="isCurrentSong(song) && player.playing ? '暂停' : '播放'" @click.stop="playSong(song)">
          <Pause v-if="isCurrentSong(song) && player.playing" :size="14" />
          <Play v-else :size="14" />
        </button>

        <div class="item-info">
          <div class="item-name">{{ song.name }}</div>
          <div class="item-meta">
            <span class="item-artist">{{ song.artist }}</span>
            <span class="meta-sep">·</span>
            <span class="item-format">{{ song.format?.toUpperCase() || '?' }}</span>
            <span class="meta-sep">·</span>
            <span class="item-size">{{ formatFileSize(song.fileSize) }}</span>
            <span class="meta-sep">·</span>
            <span class="item-date">{{ formatDate(song.cached_at) }}</span>
          </div>
        </div>

        <button class="item-btn delete-btn" title="删除" @click.stop="confirmDelete(song)">
          <Trash2 :size="14" />
        </button>
      </div>
    </div>

    <div v-if="hasMore && songs.length > 0" class="load-more">
      <button class="load-more-btn" :disabled="loading" @click="loadMore">
        <Loader2 v-if="loading" :size="14" class="spinning" />
        <span v-else>加载更多</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import { useSettingsStore } from '../stores/settings.js'
import { ElMessageBox, ElMessage } from 'element-plus'
import { FolderOpen, RefreshCw, Play, Pause, Trash2, Loader2, AlertCircle } from 'lucide-vue-next'

const player = usePlayerStore()
const settings = useSettingsStore()

const songs = ref([])
const totalCount = ref(0)
const loading = ref(false)
const errorMsg = ref('')
const currentPage = ref(1)
const hasMore = ref(false)
const pageSize = 20

function isCurrentSong(song) {
  if (!player.currentSong) return false
  return player.currentSong.id === song.id && player.currentSong.source === song.source
}

function playSong(song) {
  const playableSong = {
    id: song.id,
    source: song.source,
    name: song.name,
    artist: song.artist,
    album: song.album || '',
    pic_id: song.pic_id || song.id,
    lyric_id: song.lyric_id || song.id
  }
  player.playSong(playableSong)
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
  return size.toFixed(1) + ' ' + units[i]
}

function formatDate(timestamp) {
  if (!timestamp) return ''
  const d = new Date(timestamp)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

async function fetchSongs(page = 1, append = false) {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await window.electronAPI.listLocalMusic({
      customPath: settings.cacheDirectory,
      page,
      pageSize
    })
    if (res.success) {
      if (append) {
        songs.value = [...songs.value, ...res.songs]
      } else {
        songs.value = res.songs
      }
      totalCount.value = res.total
      hasMore.value = res.hasMore
      currentPage.value = res.page
    } else {
      errorMsg.value = res.error || '加载失败'
    }
  } catch (e) {
    errorMsg.value = '加载本地歌曲失败，请检查目录访问权限'
    console.error('Fetch local songs failed:', e)
  } finally {
    loading.value = false
  }
}

async function refresh() {
  await fetchSongs(1, false)
}

async function loadMore() {
  await fetchSongs(currentPage.value + 1, true)
}

async function confirmDelete(song) {
  try {
    await ElMessageBox.confirm(
      `确定要删除 "${song.name}" 吗？此操作将同时移除缓存文件、歌词和封面数据，且不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )
    await deleteSong(song)
  } catch {
    // 用户取消
  }
}

async function deleteSong(song) {
  try {
    const res = await window.electronAPI.deleteLocalFile({
      filePath: song.filePath,
      customPath: settings.cacheDirectory
    })
    if (res.success) {
      songs.value = songs.value.filter(s => s.filePath !== song.filePath)
      totalCount.value = Math.max(0, totalCount.value - 1)
      ElMessage.success('删除成功')

      // 如果删除的是当前播放的歌曲，停止播放
      if (isCurrentSong(song)) {
        const playerStore = player
        if (playerStore.playing) {
          playerStore.togglePlay()
        }
      }
    } else {
      ElMessage.error(res.error || '删除失败')
    }
  } catch (e) {
    ElMessage.error('删除失败，请检查文件权限')
    console.error('Delete song failed:', e)
  }
}

onMounted(async () => {
  await settings.init()
  await fetchSongs(1, false)
})
</script>

<style scoped>
.local-music-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--spacing-lg);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.header-left h3 {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

.song-count {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.header-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.action-btn {
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--bg-layer-2);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all var(--transition-fast);
}

.action-btn:hover {
  background: var(--bg-hover);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.error-banner {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--radius-md);
  color: var(--color-error);
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-md);
  flex-shrink: 0;
}

.error-dismiss {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--color-error);
  cursor: pointer;
  font-size: 16px;
  padding: 0 4px;
}

.loading-state {
  flex: 1;
  overflow: hidden;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: var(--text-secondary);
  gap: var(--spacing-md);
  flex: 1;
}

.empty-hint {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.song-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  flex: 1;
  overflow-y: auto;
}

.song-item {
  display: flex;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  gap: var(--spacing-sm);
}

.song-item:hover {
  background: var(--bg-hover);
}

.song-item.active {
  background: rgba(99, 102, 241, 0.15);
  border-left: 3px solid var(--color-primary);
}

.play-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: var(--bg-layer-2);
  color: var(--text-primary);
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.play-btn:hover {
  background: var(--color-primary);
  color: white;
  transform: scale(1.1);
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: var(--font-size-base);
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  margin-top: 2px;
}

.item-artist {
  color: var(--text-secondary);
}

.meta-sep {
  margin: 0 2px;
}

.item-format {
  padding: 0 4px;
  background: var(--bg-layer-3);
  border-radius: 3px;
  font-size: 10px;
  font-weight: var(--font-weight-medium);
  color: var(--text-secondary);
}

.item-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.delete-btn:hover {
  background: var(--color-error);
  color: white;
}

.load-more {
  display: flex;
  justify-content: center;
  padding: var(--spacing-lg) 0;
  flex-shrink: 0;
}

.load-more-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-xl);
  background: var(--bg-layer-2);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.load-more-btn:hover:not(:disabled) {
  background: var(--bg-hover);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.load-more-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.skeleton {
  background: var(--bg-layer-2);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}
</style>