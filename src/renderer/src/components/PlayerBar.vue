<template>
  <div class="player-bar">
    <div v-if="player.playError" class="play-error-banner">
      <span>{{ player.playError }}</span>
      <button class="error-dismiss" @click="player.playError = ''">&times;</button>
    </div>
    <div class="player-main">
      <div class="song-info-section">
        <div class="album-art" :class="{ playing: player.playing }">
          <img v-if="player.albumArtUrl" :src="player.albumArtUrl" />
          <div v-else class="album-placeholder">
            <Music :size="24" />
          </div>
        </div>
        <div class="song-text-info">
          <div class="song-name">{{ player.songName }}</div>
          <div class="song-artist">{{ player.artistName }}</div>
        </div>
        <button v-if="player.currentSong" class="download-single-btn" @click="downloadCurrent" title="下载当前歌曲">
          <Download :size="16" />
        </button>
      </div>

      <div class="controls-section">
        <div class="controls-top">
          <button class="ctrl-btn" @click="player.togglePlayMode" :title="modeLabel">
            <Repeat v-if="player.playMode === 'order'" :size="18" />
            <Repeat1 v-else-if="player.playMode === 'single'" :size="18" />
            <Shuffle v-else :size="18" />
          </button>
          <button class="ctrl-btn" @click="player.prevSong" title="上一曲">
            <SkipBack :size="18" />
          </button>
          <button class="ctrl-btn play-btn" @click="player.togglePlay" :disabled="!player.currentSong">
            <Loader2 v-if="player.loading" :size="20" class="spin" />
            <Pause v-else-if="player.playing" :size="20" />
            <Play v-else :size="20" />
          </button>
          <button class="ctrl-btn" @click="player.nextSong" title="下一曲">
            <SkipForward :size="18" />
          </button>
        </div>
        <div class="progress-section">
          <span class="time">{{ formatTime(player.currentTime) }}</span>
          <div class="progress-bar" ref="progressRef" @mousedown="startSeek">
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
              <div class="progress-thumb" :style="{ left: progressPercent + '%' }"></div>
            </div>
          </div>
          <span class="time">{{ formatTime(player.duration) }}</span>
        </div>
      </div>

      <div class="extra-section">
        <div class="volume-control">
          <button class="ctrl-btn" @click="player.toggleMute" title="静音">
            <VolumeX v-if="player.muted || player.volume === 0" :size="16" />
            <Volume1 v-else-if="player.volume < 0.3" :size="16" />
            <Volume2 v-else-if="player.volume < 0.7" :size="16" />
            <Volume2 v-else :size="16" />
          </button>
          <div class="volume-bar" ref="volumeRef" @mousedown="startVolumeSeek">
            <div class="volume-track">
              <div class="volume-fill" :style="{ width: (player.muted ? 0 : player.volume * 100) + '%' }"></div>
            </div>
          </div>
        </div>
        <button class="ctrl-btn" @click="showLyrics = !showLyrics" title="歌词" :class="{ active: showLyrics }">
          <AlignCenter :size="16" />
        </button>
        <div v-if="player.qualityLabel" class="quality-badge">
          <Music2 :size="12" />
          <span>{{ player.qualityLabel }}</span>
        </div>
        <button v-if="player.currentSong" class="ctrl-btn" @click="showSongInfo" title="歌曲信息">
          <Info :size="16" />
        </button>
      </div>
    </div>

    <div v-if="showLyrics && player.currentSong" class="lyric-section">
      <div class="lyric-container" ref="lyricRef">
        <div v-if="player.lyricLines.length === 0" class="no-lyric">暂无歌词</div>
        <div
          v-for="(line, idx) in player.lyricLines"
          :key="idx"
          class="lyric-line"
          :class="{ active: idx === player.currentLyricIndex }"
        >
          {{ line.text }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, inject } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import {
  Music, Play, Pause, SkipBack, SkipForward, Repeat, Repeat1,
  Shuffle, VolumeX, Volume1, Volume2, AlignCenter, Loader2, Music2, Download, Info
} from 'lucide-vue-next'

const player = usePlayerStore()
const { openDownload } = inject('download')
const { openSongInfo } = inject('songInfo')
const showLyrics = ref(false)
const progressRef = ref(null)
const volumeRef = ref(null)
const lyricRef = ref(null)

function downloadCurrent() {
  if (player.currentSong) {
    openDownload(player.currentSong)
  }
}

function showSongInfo() {
  if (player.currentSong) {
    openSongInfo(player.currentSong)
  }
}

const progressPercent = computed(() => {
  if (player.duration === 0) return 0
  return (player.currentTime / player.duration) * 100
})

const modeLabel = computed(() => {
  const map = { order: '顺序播放', single: '单曲循环', random: '随机播放' }
  return map[player.playMode] || ''
})

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

let seeking = false

function startSeek(e) {
  seeking = true
  doSeek(e)
  document.addEventListener('mousemove', doSeek)
  document.addEventListener('mouseup', endSeek)
}

function doSeek(e) {
  if (!progressRef.value || !player.currentSong) return
  const rect = progressRef.value.getBoundingClientRect()
  const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  const time = percent * player.duration
  player.seek(time)
}

function endSeek() {
  seeking = false
  document.removeEventListener('mousemove', doSeek)
  document.removeEventListener('mouseup', endSeek)
}

function startVolumeSeek(e) {
  doVolumeSeek(e)
  document.addEventListener('mousemove', doVolumeSeek)
  document.addEventListener('mouseup', endVolumeSeek)
}

function doVolumeSeek(e) {
  if (!volumeRef.value) return
  const rect = volumeRef.value.getBoundingClientRect()
  const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  player.setVolume(percent)
}

function endVolumeSeek() {
  document.removeEventListener('mousemove', doVolumeSeek)
  document.removeEventListener('mouseup', endVolumeSeek)
}

function lyricScroll() {
  if (!lyricRef.value) return
  const activeEl = lyricRef.value.querySelector('.lyric-line.active')
  if (activeEl) {
    activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

watch(() => player.currentLyricIndex, () => {
  if (showLyrics.value) lyricScroll()
})

watch(showLyrics, (val) => {
  if (val) setTimeout(lyricScroll, 100)
})
</script>

<style scoped>
.player-bar {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}

.play-error-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 16px;
  background: rgba(239, 68, 68, 0.15);
  color: var(--color-error);
  font-size: var(--font-size-xs);
  border-bottom: 1px solid rgba(239, 68, 68, 0.2);
}

.error-dismiss {
  background: none;
  border: none;
  color: var(--color-error);
  cursor: pointer;
  font-size: 16px;
  padding: 0 4px;
  line-height: 1;
}

.player-main {
  display: flex;
  align-items: center;
  height: 72px;
  padding: 0 16px;
  gap: 16px;
}

.song-info-section {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 240px;
  min-width: 180px;
}

.album-art {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-md);
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: var(--shadow-md);
}

.album-art.playing img {
  animation: album-spin 8s linear infinite;
}

@keyframes album-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.album-art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.album-placeholder {
  width: 100%;
  height: 100%;
  background: var(--bg-layer-3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
}

.download-single-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(34, 197, 94, 0.1);
  color: var(--color-success);
  cursor: pointer;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  margin-left: auto;
}

.download-single-btn:hover {
  background: var(--color-success);
  color: white;
  transform: scale(1.05);
}

.song-text-info {
  min-width: 0;
}

.song-name {
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-artist {
  font-size: 12px;
  color: var(--text-secondary);
}

.controls-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.controls-top {
  display: flex;
  align-items: center;
  gap: 16px;
}

.ctrl-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.ctrl-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.ctrl-btn.active {
  color: var(--color-primary);
}

.play-btn {
  width: 44px;
  height: 44px;
  background: var(--color-primary);
  color: white;
  box-shadow: var(--shadow-glow);
}

.play-btn:hover {
  background: var(--color-primary-light);
  transform: scale(1.05);
}

.play-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.progress-section {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  max-width: 500px;
}

.time {
  font-size: 12px;
  color: var(--text-secondary);
  min-width: 40px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.progress-bar {
  flex: 1;
  height: 24px;
  display: flex;
  align-items: center;
  cursor: pointer;
  position: relative;
}

.progress-track {
  width: 100%;
  height: 4px;
  background: var(--bg-layer-3);
  border-radius: 2px;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-light));
  border-radius: 2px;
  transition: width 0.1s;
}

.progress-thumb {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  background: white;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  opacity: 0;
  transition: opacity var(--transition-fast);
  box-shadow: var(--shadow-sm);
}

.progress-bar:hover .progress-thumb {
  opacity: 1;
}

.extra-section {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 200px;
  justify-content: flex-end;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.volume-bar {
  width: 64px;
  height: 20px;
  display: flex;
  align-items: center;
  cursor: pointer;
}

.volume-track {
  width: 100%;
  height: 3px;
  background: var(--bg-layer-3);
  border-radius: 2px;
}

.volume-fill {
  height: 100%;
  background: var(--text-secondary);
  border-radius: 2px;
}

.quality-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: var(--radius-full);
  font-size: 11px;
  color: var(--color-primary);
}

.lyric-section {
  max-height: 240px;
  overflow: hidden;
  border-top: 1px solid var(--border-color);
}

.lyric-container {
  max-height: 240px;
  overflow-y: auto;
  padding: 16px 20px;
  text-align: center;
}

.lyric-line {
  padding: 8px 0;
  font-size: 14px;
  color: var(--text-secondary);
  transition: all var(--transition-normal);
  line-height: 1.6;
}

.lyric-line.active {
  color: var(--color-primary);
  font-size: 16px;
  font-weight: 600;
}

.no-lyric {
  color: var(--text-secondary);
  padding: 24px 0;
  font-size: 13px;
}
</style>