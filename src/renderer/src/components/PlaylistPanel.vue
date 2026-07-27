<template>
  <div class="playlist-panel">
    <div class="panel-header">
      <div class="header-left">
        <ListMusic :size="18" />
        <h3>播放列表</h3>
        <span class="song-count">({{ player.playlist.length }})</span>
      </div>
      <div class="header-actions">
        <button class="action-btn" title="全选" @click="toggleSelectAll" v-if="player.playlist.length > 0">
          <CheckSquare v-if="isAllSelected" :size="14" />
          <Square v-else :size="14" />
        </button>
        <button class="action-btn" title="批量下载" @click="batchDownload" v-if="selectedSongs.length > 0">
          <Download :size="14" />
          <span>{{ selectedSongs.length }}</span>
        </button>
        <button class="action-btn" title="清空播放列表" @click="clearAll" v-if="player.playlist.length > 0">
          <Trash2 :size="14" />
        </button>
      </div>
    </div>

    <div v-if="player.playlist.length === 0" class="empty-state">
      <ListMusic :size="40" />
      <span>播放列表为空</span>
      <span class="empty-hint">搜索歌曲并添加到播放列表</span>
    </div>

    <div v-else class="playlist-list">
      <div
        v-for="(song, idx) in player.playlist"
        :key="song.tempId || `pl-${song.source}-${song.id}`"
        class="playlist-item"
        :class="{ active: idx === player.currentIndex, selected: isSelected(song) }"
        @dblclick="player.playSong(song)"
        @click="handleItemClick(song, $event)"
      >
        <input
          type="checkbox"
          class="item-checkbox"
          :checked="isSelected(song)"
          @click.stop="toggleSelect(song, $event)"
        />
        <div class="item-index">
          <Play v-if="idx === player.currentIndex && player.playing" :size="12" class="playing-icon" />
          <span v-else>{{ idx + 1 }}</span>
        </div>
        <div class="item-info">
          <div class="item-name">{{ song.name || song.title || '未知歌曲' }}</div>
          <div class="item-artist">{{ song.artist || '未知歌手' }}</div>
        </div>
        <button class="download-btn" title="下载" @click.stop="downloadSong(song)">
          <Download :size="12" />
        </button>
        <button class="info-btn" title="歌曲信息" @click.stop="showSongInfo(song)">
          <Info :size="12" />
        </button>
        <button class="remove-btn" title="移除" @click.stop="player.removeFromList(idx)">
          <X :size="12" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, computed } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import { ListMusic, Trash2, X, Play, Download, Info, CheckSquare, Square } from 'lucide-vue-next'

const player = usePlayerStore()
const { openDownload } = inject('download')
const { openSongInfo } = inject('songInfo')

const selectedSongs = ref([])
const lastClickedIndex = ref(-1)

function isSelected(song) {
  return selectedSongs.value.some(s => player.songsMatch(s, song))
}

const isAllSelected = computed(() => {
  return player.playlist.length > 0 && player.playlist.every(song => isSelected(song))
})

function toggleSelect(song, event) {
  if (event.shiftKey && lastClickedIndex.value !== -1) {
    const currentIndex = player.playlist.findIndex(s => player.songsMatch(s, song))
    const start = Math.min(lastClickedIndex.value, currentIndex)
    const end = Math.max(lastClickedIndex.value, currentIndex)
    
    if (event.ctrlKey || event.metaKey) {
      for (let i = start; i <= end; i++) {
        const s = player.playlist[i]
        const idx = selectedSongs.value.findIndex(item => player.songsMatch(item, s))
        if (idx === -1) {
          selectedSongs.value.push(s)
        }
      }
    } else {
      selectedSongs.value = player.playlist.slice(start, end + 1)
    }
  } else {
    const idx = selectedSongs.value.findIndex(s => player.songsMatch(s, song))
    if (idx === -1) {
      if (event.ctrlKey || event.metaKey) {
        selectedSongs.value.push(song)
      } else {
        selectedSongs.value = [song]
      }
    } else {
      selectedSongs.value.splice(idx, 1)
    }
    const currentIndex = player.playlist.findIndex(s => player.songsMatch(s, song))
    lastClickedIndex.value = currentIndex
  }
}

function handleItemClick(song, event) {
  if (event.target.tagName !== 'INPUT') {
    if (!(event.ctrlKey || event.metaKey)) {
      selectedSongs.value = []
    }
    lastClickedIndex.value = player.playlist.findIndex(s => player.songsMatch(s, song))
  }
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedSongs.value = []
  } else {
    selectedSongs.value = [...player.playlist]
  }
}

function clearAll() {
  player.playlist = []
  selectedSongs.value = []
}

function downloadSong(song) {
  openDownload([song])
}

function batchDownload() {
  openDownload(selectedSongs.value)
}

function showSongInfo(song) {
  openSongInfo(song)
}
</script>

<style scoped>
.playlist-panel {
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

.action-btn:last-child:hover {
  background: var(--color-error);
  border-color: var(--color-error);
  color: white;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: var(--text-secondary);
  gap: var(--spacing-md);
}

.empty-hint {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.playlist-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  flex: 1;
  overflow-y: auto;
}

.playlist-item {
  display: flex;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.playlist-item:hover {
  background: var(--bg-hover);
}

.playlist-item.active {
  background: rgba(99, 102, 241, 0.15);
  border-left: 3px solid var(--color-primary);
}

.playlist-item.selected {
  background: rgba(99, 102, 241, 0.2);
}

.item-checkbox {
  width: 14px;
  height: 14px;
  margin-right: var(--spacing-sm);
  cursor: pointer;
  flex-shrink: 0;
}

.item-index {
  width: 28px;
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  text-align: center;
  flex-shrink: 0;
}

.playing-icon {
  color: var(--color-primary);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
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

.item-artist {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.download-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 50%;
  font-size: var(--font-size-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  margin-right: 4px;
}

.download-btn:hover {
  background: var(--color-success);
  color: white;
}

.info-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 50%;
  font-size: var(--font-size-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  margin-right: 4px;
}

.info-btn:hover {
  background: var(--color-primary);
  color: white;
}

.remove-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 50%;
  font-size: var(--font-size-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.remove-btn:hover {
  background: var(--color-error);
  color: white;
}
</style>