<template>
  <div class="search-panel">
    <div class="search-header">
      <div class="source-tabs">
        <button
          v-for="s in sources"
          :key="s.value"
          class="source-tab"
          :class="{ active: source === s.value }"
          @click="switchSource(s.value)"
        >
          {{ s.label }}
        </button>
      </div>
      <div class="search-input-wrapper">
        <input
          v-model="keyword"
          type="text"
          placeholder="搜索歌曲、歌手、专辑..."
          class="search-input"
          @keyup.enter="doSearch"
        />
        <button v-if="keyword" class="clear-btn" @click="clearSearch">
          <X :size="14" />
        </button>
        <button class="search-btn" @click="doSearch" title="搜索">
          <Search :size="16" />
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <Loader2 :size="28" class="spin" />
      <span>搜索中...</span>
    </div>

    <div v-else-if="songs.length === 0 && keyword" class="empty-state">
      <Disc :size="48" />
      <span>未找到相关歌曲</span>
      <span class="empty-hint">试试其他关键词或切换音乐平台</span>
    </div>

    <div v-else class="song-list">
      <div
        v-for="(song, idx) in songs"
        :key="`${song.source}-${song.id}`"
        class="song-item"
        :class="{ active: isCurrentSong(song) }"
        @dblclick="playSong(song)"
      >
        <div class="song-index">{{ idx + 1 }}</div>
        <div class="song-info">
          <div class="song-name">{{ song.name || song.title || '未知歌曲' }}</div>
          <div class="song-meta">
            <span class="song-artist">{{ song.artist || '未知歌手' }}</span>
            <span v-if="song.album" class="song-album">{{ song.album }}</span>
          </div>
        </div>
        <div class="song-actions">
          <span class="source-tag" :class="sourceTagClass(song.source)">{{ sourceLabel(song.source) }}</span>
          <button class="action-btn" title="播放" @click.stop="playSong(song)">
            <Play :size="14" />
          </button>
          <button class="action-btn" title="添加到播放列表" @click.stop="addToList(song)">
            <Plus :size="14" />
          </button>
          <button class="action-btn" title="下载" @click.stop="downloadSong(song)">
            <Download :size="14" />
          </button>
          <button class="action-btn" title="歌曲信息" @click.stop="showSongInfo(song)">
            <Info :size="14" />
          </button>
        </div>
      </div>
    </div>

    <div v-if="songs.length > 0 && hasMore" class="load-more">
      <button class="load-more-btn" @click="loadMore" :disabled="loadingMore">
        <Loader2 v-if="loadingMore" :size="14" class="spin" />
        <span>{{ loadingMore ? '加载中...' : '加载更多' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import { searchMusic, SOURCES, SOURCE_MAP } from '../api/index.js'

import { Search, X, Play, Plus, Download, Info, Loader2, Disc } from 'lucide-vue-next'

const player = usePlayerStore()
const { openDownload } = inject('download')
const { openSongInfo } = inject('songInfo')

const sources = SOURCES.map(s => ({ value: s, label: SOURCE_MAP[s] }))
const source = ref('netease')
const keyword = ref('')
const songs = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const page = ref(1)
const hasMore = ref(true)

function switchSource(s) {
  source.value = s
}

function clearSearch() {
  keyword.value = ''
  songs.value = []
  page.value = 1
}

async function doSearch() {
  if (!keyword.value.trim()) return
  loading.value = true
  const res = await searchMusic({ keyword: keyword.value, source: source.value, pages: page.value })
  if (res.success) {
    songs.value = res.songs
    hasMore.value = res.songs.length >= 20
  }
  loading.value = false
}

async function loadMore() {
  loadingMore.value = true
  page.value++
  const res = await searchMusic({ keyword: keyword.value, source: source.value, pages: page.value })
  if (res.success) {
    songs.value = [...songs.value, ...res.songs]
    hasMore.value = res.songs.length >= 20
  }
  loadingMore.value = false
}

function playSong(song) {
  const idx = songs.value.indexOf(song)
  player.playFromList(songs.value, idx)
}

function addToList(song) {
  player.addToPlaylist(song)
}

function downloadSong(song) {
  openDownload(song)
}

function showSongInfo(song) {
  openSongInfo(song)
}

function isCurrentSong(song) {
  return player.currentSong && player.currentSong.id === song.id && player.currentSong.source === song.source
}

function sourceLabel(s) { return SOURCE_MAP[s] || s }

function sourceTagClass(s) {
  const map = { netease: 'tag-netease', tencent: 'tag-tencent', kuwo: 'tag-kuwo', bilibili: 'tag-bilibili' }
  return map[s] || ''
}

function handleTriggerSearch(e) {
  keyword.value = e.detail
  doSearch()
}

import { onMounted, onUnmounted } from 'vue'
onMounted(() => {
  window.addEventListener('trigger-search', handleTriggerSearch)
})

onUnmounted(() => {
  window.removeEventListener('trigger-search', handleTriggerSearch)
})
</script>

<style scoped>
.search-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--spacing-lg);
}

.search-header {
  margin-bottom: var(--spacing-lg);
}

.source-tabs {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
  flex-wrap: wrap;
}

.source-tab {
  padding: var(--spacing-xs) var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
}

.source-tab:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.source-tab.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.search-input {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-layer-2);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-base);
  color: var(--text-primary);
  outline: none;
  transition: all var(--transition-fast);
}

.search-input::placeholder {
  color: var(--text-muted);
}

.search-input:focus {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-glow);
}

.clear-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: var(--bg-layer-3);
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.clear-btn:hover {
  background: var(--bg-hover);
}

.search-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: var(--color-primary);
  color: white;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.search-btn:hover {
  background: var(--color-primary-light);
  transform: scale(1.05);
}

.loading-state, .empty-state {
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

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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
}

.song-item:hover {
  background: var(--bg-hover);
}

.song-item.active {
  background: rgba(99, 102, 241, 0.15);
  border-left: 3px solid var(--color-primary);
}

.song-index {
  width: 28px;
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  text-align: center;
  flex-shrink: 0;
}

.song-info {
  flex: 1;
  min-width: 0;
  margin-left: var(--spacing-sm);
}

.song-name {
  font-size: var(--font-size-base);
  color: var(--text-primary);
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-meta {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.song-album {
  opacity: 0.7;
}

.song-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  flex-shrink: 0;
}

.source-tag {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 3px;
  margin-right: var(--spacing-xs);
}

.tag-netease {
  background: rgba(233, 30, 99, 0.15);
  color: #e91e63;
}

.tag-tencent {
  background: rgba(255, 183, 77, 0.15);
  color: #ffb74d;
}

.tag-kuwo {
  background: rgba(76, 175, 80, 0.15);
  color: #4caf50;
}

.tag-bilibili {
  background: rgba(0, 188, 212, 0.15);
  color: #00bcd4;
}

.action-btn {
  width: 28px;
  height: 28px;
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

.action-btn:hover {
  background: var(--color-primary);
  color: white;
}

.load-more {
  text-align: center;
  padding: var(--spacing-lg) 0;
}

.load-more-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--bg-layer-2);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-full);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: var(--font-size-sm);
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
</style>