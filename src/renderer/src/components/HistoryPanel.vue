<template>
  <div class="history-panel">
    <div class="panel-header">
      <div class="header-left">
        <Clock :size="18" />
        <h3>播放历史</h3>
        <span class="item-count">({{ player.history.length }})</span>
      </div>
      <div class="header-actions">
        <button class="action-btn" title="清空播放历史" @click="clearHistory" v-if="player.history.length > 0">
          <Trash2 :size="14" />
        </button>
      </div>
    </div>

    <div v-if="player.history.length === 0" class="empty-state">
      <Clock :size="40" />
      <span>暂无播放历史</span>
      <span class="empty-hint">播放歌曲后将在此显示历史记录</span>
    </div>

    <div v-else class="history-list">
      <div
        v-for="(item, idx) in player.history"
        :key="`h-${idx}`"
        class="history-item"
        @dblclick="playFromHistory(item)"
      >
        <div class="item-index">{{ idx + 1 }}</div>
        <div class="item-info">
          <div class="item-name">{{ item.name || item.title || '未知歌曲' }}</div>
          <div class="item-artist">{{ item.artist || '未知歌手' }}</div>
        </div>
        <button class="info-btn" title="歌曲信息" @click.stop="showSongInfo(item)">
          <Info :size="12" />
        </button>
        <button class="play-btn" title="播放" @click.stop="playFromHistory(item)">
          <Play :size="12" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import { Clock, Trash2, Play, Info } from 'lucide-vue-next'

const player = usePlayerStore()
const { openSongInfo } = inject('songInfo')

function playFromHistory(song) {
  player.addToPlaylist(song)
  const idx = player.playlist.length - 1
  player.currentIndex = idx
  player.playSong(song)
}

function clearHistory() {
  player.history = []
  localStorage.removeItem('music-player-history')
}

function showSongInfo(song) {
  openSongInfo(song)
}
</script>

<style scoped>
.history-panel {
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

.item-count {
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
  transition: all var(--transition-fast);
}

.action-btn:hover {
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

.history-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  flex: 1;
  overflow-y: auto;
}

.history-item {
  display: flex;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.history-item:hover {
  background: var(--bg-hover);
}

.item-index {
  width: 28px;
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  text-align: center;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  min-width: 0;
  margin-left: var(--spacing-sm);
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

.play-btn {
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

.play-btn:hover {
  background: var(--color-primary);
  color: white;
}
</style>