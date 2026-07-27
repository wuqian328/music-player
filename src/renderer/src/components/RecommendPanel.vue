<template>
  <div class="recommend-panel">
    <div class="banner">
      <div class="banner-content">
        <h2>🎵 网易云音乐热榜</h2>
        <p>实时更新，聆听当下最火的音乐</p>
      </div>
      <button class="refresh-btn" @click="fetchAllCharts" :disabled="isLoading">
        <component :is="RefreshCw" :size="16" :class="{ spin: isLoading }" />
      </button>
    </div>

    <div class="chart-tabs">
      <button
        v-for="chart in charts"
        :key="chart.id"
        class="chart-tab"
        :class="{ active: activeChart === chart.id, loading: chartLoading[chart.id] }"
        @click="switchChart(chart.id)"
      >
        <span>{{ chart.emoji }} {{ chart.name }}</span>
        <span v-if="chartLoading[chart.id]" class="loading-dot"></span>
      </button>
    </div>

    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>正在获取热榜...</p>
    </div>

    <div v-if="!isLoading && activeChartError" class="error-state">
      <p class="error-message">{{ activeChartError }}</p>
      <button class="retry-btn" @click="fetchChart(activeChart)">重试</button>
    </div>

    <div v-if="!isLoading && !activeChartError && currentChartData.songs.length > 0" class="hot-content">
      <div class="chart-header">
        <div class="chart-item rank">排名</div>
        <div class="chart-item title">歌曲</div>
        <div class="chart-item artist">歌手</div>
        <div class="chart-item album">专辑</div>
        <div class="chart-item actions">操作</div>
      </div>

      <div class="song-list">
        <div
          v-for="(song, index) in currentChartData.songs"
          :key="`${song.source}-${song.id}-${activeChart}`"
          class="song-item"
          :class="{ active: isCurrentSong(song), top3: index < 3 }"
          @dblclick="playSong(song)"
        >
          <div class="song-rank" :class="{ 'rank-1': index === 0, 'rank-2': index === 1, 'rank-3': index === 2 }">
            <template v-if="index === 0">🥇</template>
            <template v-else-if="index === 1">🥈</template>
            <template v-else-if="index === 2">🥉</template>
            <template v-else>{{ index + 1 }}</template>
          </div>
          <div class="song-info">
            <span class="song-name">{{ song.name }}</span>
            <span class="song-artist">{{ song.artist }}</span>
          </div>
          <div class="song-album">
            <span>{{ song.album }}</span>
          </div>
          <div class="song-actions">
            <button class="action-btn play-btn" @click.stop="playSong(song)" title="播放">
              <component :is="Play" :size="14" />
            </button>
            <button class="action-btn add-btn" @click.stop="addToPlaylist(song)" title="添加到列表">
              <component :is="Plus" :size="14" />
            </button>
            <button class="action-btn download-btn" @click.stop="downloadSong(song)" title="下载">
              <component :is="Download" :size="14" />
            </button>
            <button class="action-btn info-btn" @click.stop="showSongInfo(song)" title="详情">
              <component :is="Info" :size="14" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!isLoading && !activeChartError && currentChartData.songs.length === 0" class="empty-state">
      <p>暂无{{ currentChartData.name }}数据</p>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, onMounted, computed } from 'vue'
import { Play, Plus, Download, Info, RefreshCw } from 'lucide-vue-next'
import { usePlayerStore } from '../stores/player.js'

const player = usePlayerStore()

const charts = [
  { id: 'hot', name: '热歌榜', playlistId: 2884035, emoji: '🔥' },
  { id: 'rising', name: '飙升榜', playlistId: 3778678, emoji: '📈' },
  { id: 'new', name: '新歌榜', playlistId: 3779629, emoji: '✨' }
]

const activeChart = ref('hot')
const isLoading = ref(false)
const chartLoading = ref({ hot: false, rising: false, new: false })
const chartData = ref({
  hot: { songs: [], name: '热歌榜' },
  rising: { songs: [], name: '飙升榜' },
  new: { songs: [], name: '新歌榜' }
})
const chartErrors = ref({ hot: '', rising: '', new: '' })

const CACHE_KEY = 'music-player-chart-cache'
const CACHE_EXPIRE = 3600000

const { openDownload } = inject('download')
const { openSongInfo } = inject('songInfo')

const currentChartData = computed(() => chartData.value[activeChart.value])
const activeChartError = computed(() => chartErrors.value[activeChart.value])

function isCurrentSong(song) {
  return player.currentSong && player.currentSong.id === song.id && player.currentSong.source === song.source
}

function getCache() {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const data = JSON.parse(cached)
      if (data.timestamp && Date.now() - data.timestamp < CACHE_EXPIRE) {
        return data.charts
      }
    }
  } catch (e) {}
  return null
}

function saveCache(chartsData) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      charts: chartsData
    }))
  } catch (e) {}
}

async function fetchChart(chartId) {
  const chart = charts.find(c => c.id === chartId)
  if (!chart) return

  chartLoading.value[chartId] = true
  chartErrors.value[chartId] = ''
  
  try {
    const result = await window.electronAPI.hotList({ id: chart.playlistId })
    
    if (result.success) {
      const data = result.data
      let songs = []
      
      if (data.result && data.result.tracks && Array.isArray(data.result.tracks)) {
        songs = data.result.tracks
      } else if (data.tracks && Array.isArray(data.tracks)) {
        songs = data.tracks
      } else if (data.data && data.data.tracks && Array.isArray(data.data.tracks)) {
        songs = data.data.tracks
      }
      
      if (songs.length > 0) {
        const normalized = songs.map(song => ({
          id: song.id || '',
          name: song.name || song.title || '未知歌曲',
          artist: Array.isArray(song.artists) ? song.artists.map(a => a.name).join(' / ') : (song.artist || song.singer || '未知歌手'),
          album: song.album ? song.album.name || song.album : '',
          pic_id: song.pic_id || song.id || '',
          lyric_id: song.lyric_id || song.id || '',
          source: 'netease'
        }))
        
        chartData.value[chartId] = {
          songs: normalized,
          name: chart.name
        }
        
        saveCache(chartData.value)
      } else {
        chartErrors.value[chartId] = `${chart.name}数据为空`
      }
    } else {
      chartErrors.value[chartId] = result.error || `获取${chart.name}失败`
    }
  } catch (e) {
    chartErrors.value[chartId] = `获取${chart.name}失败，请稍后重试`
  } finally {
    chartLoading.value[chartId] = false
  }
}

async function fetchAllCharts() {
  isLoading.value = true
  
  await Promise.all(charts.map(chart => fetchChart(chart.id)))
  
  isLoading.value = false
}

function switchChart(chartId) {
  activeChart.value = chartId
  if (chartData.value[chartId].songs.length === 0 && !chartLoading.value[chartId]) {
    fetchChart(chartId)
  }
}

function playSong(song) {
  player.addToPlaylist(song)
  player.playSong(song)
}

function addToPlaylist(song) {
  player.addToPlaylist(song)
}

function downloadSong(song) {
  openDownload(song)
}

function showSongInfo(song) {
  openSongInfo(song)
}

onMounted(() => {
  const cached = getCache()
  if (cached) {
    chartData.value = { ...cached }
  }
  fetchAllCharts()
})
</script>

<style scoped>
.recommend-panel {
  padding: var(--spacing-lg);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-lg);
  background: linear-gradient(135deg, var(--color-primary) 0%, rgba(99, 102, 241, 0.6) 100%);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-lg);
}

.banner-content h2 {
  color: white;
  font-size: var(--font-size-xl);
  margin-bottom: var(--spacing-xs);
}

.banner-content p {
  color: rgba(255, 255, 255, 0.8);
  font-size: var(--font-size-sm);
}

.refresh-btn {
  padding: var(--spacing-md);
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.refresh-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.refresh-btn .spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.chart-tabs {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
}

.chart-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-md);
  background: var(--bg-layer-2);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.chart-tab:hover {
  background: var(--bg-hover);
}

.chart-tab.active {
  background: var(--color-primary);
  color: white;
}

.chart-tab.loading .loading-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  animation: blink 0.6s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.loading-state, .error-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: calc(var(--spacing-xl) * 2);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: var(--spacing-md);
}

.error-message {
  color: var(--color-error);
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-md);
}

.retry-btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.retry-btn:hover {
  background: var(--color-primary-hover);
}

.hot-content {
  flex: 1;
  overflow-y: auto;
}

.chart-header {
  display: flex;
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--bg-layer-3);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  font-weight: 600;
}

.chart-item {
  display: flex;
  align-items: center;
}

.chart-item.rank {
  width: 60px;
  justify-content: center;
}

.chart-item.title {
  flex: 2;
}

.chart-item.artist {
  flex: 1;
}

.chart-item.album {
  flex: 1.5;
}

.chart-item.actions {
  width: 100px;
  justify-content: center;
}

.song-list {
  display: flex;
  flex-direction: column;
}

.song-item {
  display: flex;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--bg-layer-2);
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.song-item:last-child {
  border-radius: 0 0 var(--radius-md) var(--radius-md);
}

.song-item:hover {
  background: var(--bg-hover);
}

.song-item.active {
  background: rgba(99, 102, 241, 0.15);
}

.song-item.top3 {
  background: rgba(99, 102, 241, 0.05);
}

.song-rank {
  width: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-secondary);
}

.song-rank.rank-1,
.song-rank.rank-2,
.song-rank.rank-3 {
  font-size: 20px;
}

.song-info {
  flex: 2;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.song-name {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-artist {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-album {
  flex: 1.5;
  min-width: 0;
}

.song-album span {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-actions {
  width: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.song-item:hover .song-actions {
  opacity: 1;
}

.action-btn {
  padding: var(--spacing-xs);
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.action-btn:hover {
  background: var(--bg-layer-3);
  color: var(--color-primary);
}

.play-btn:hover {
  color: var(--color-success);
}

.download-btn:hover {
  color: var(--color-warning);
}

@media (max-width: 768px) {
  .chart-item.album {
    display: none;
  }
  
  .song-album {
    display: none;
  }
  
  .song-actions {
    opacity: 1;
  }
  
  .chart-tabs {
    flex-direction: column;
  }
}
</style>