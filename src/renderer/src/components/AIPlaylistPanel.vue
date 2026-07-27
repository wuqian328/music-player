<template>
  <div class="ai-playlist-panel">
    <div class="banner">
      <div class="banner-content">
        <h2>AI 智能歌单</h2>
        <p>让AI为你生成专属音乐推荐</p>
      </div>
      <button class="config-link" @click="$emit('openSettings')">
        <component :is="Settings" :size="16" />
        <span>配置</span>
      </button>
    </div>

    <div class="params-section">
      <h3 class="section-title clickable" @click="paramsCollapsed = !paramsCollapsed">
        <component :is="Wand2" :size="16" />
        生成参数
        <component :is="ChevronDown" :size="14" class="collapse-icon" :class="{ rotated: paramsCollapsed }" />
      </h3>

      <div v-show="!paramsCollapsed">
        <div class="param-item">
          <label class="param-label">音乐风格</label>
          <div class="param-options">
            <button
              v-for="style in musicStyles"
              :key="style.value"
              class="param-option"
              :class="{ active: selectedStyles.includes(style.value) }"
              @click="toggleStyle(style.value)"
            >
              {{ style.label }}
            </button>
          </div>
        </div>

        <div class="param-item">
          <label class="param-label">情绪氛围</label>
          <div class="param-options">
            <button
              v-for="mood in moods"
              :key="mood.value"
              class="param-option"
              :class="{ active: selectedMoods.includes(mood.value) }"
              @click="toggleMood(mood.value)"
            >
              {{ mood.label }}
            </button>
          </div>
        </div>

        <div class="param-item">
          <label class="param-label">歌单数量</label>
          <div class="param-options">
            <button
              v-for="count in songCounts"
              :key="count"
              class="param-option"
              :class="{ active: settings.aiSongCount === count }"
              @click="settings.aiSongCount = count"
            >
              {{ count }}首
            </button>
          </div>
        </div>

        <div class="param-item custom-row">
          <label class="param-label">自定义需求</label>
          <textarea
            class="param-textarea"
            v-model="settings.aiCustomPrompt"
            placeholder="例如：推荐适合深夜学习的轻音乐，不要太吵..."
            rows="2"
          ></textarea>
        </div>

        <button
          class="generate-btn"
          :class="{ generating: isGenerating }"
          :disabled="isGenerating || !settings.aiApiKey.trim()"
          @click="generatePlaylist"
        >
          <template v-if="isGenerating">
            <div class="btn-progress">
              <div class="btn-progress-bar" :style="{ width: progressPercent + '%' }"></div>
            </div>
            <span class="btn-progress-text">{{ progressText }}</span>
            <component :is="Loader2" :size="16" class="spinner" />
          </template>
          <template v-else>
            <component :is="Sparkles" :size="18" />
            <span>生成歌单</span>
          </template>
        </button>
      </div>
    </div>

    <div v-if="errorMessage" class="error-section">
      <div class="error-box">
        <component :is="AlertCircle" :size="16" />
        <span>{{ errorMessage }}</span>
        <button class="error-close" @click="errorMessage = ''">
          <component :is="X" :size="14" />
        </button>
      </div>
    </div>

    <div v-if="playlistSongs.length > 0" class="playlist-section">
      <div class="playlist-header">
        <h3 class="section-title">
          <component :is="Music" :size="16" />
          生成的歌单
        </h3>
        <div class="playlist-actions">
          <button class="action-btn" @click="addAllToPlaylist">
            <component :is="Plus" :size="14" />
            添加全部
          </button>
          <button class="action-btn" @click="regeneratePlaylist">
            <component :is="RefreshCw" :size="14" />
            重新生成
          </button>
        </div>
      </div>

      <div class="song-list">
        <div
          v-for="(song, index) in playlistSongs"
          :key="song.tempId || `${song.source}-${song.id}-${index}`"
          class="song-item"
          :class="{ active: isCurrentSong(song), unavailable: isUnavailable(song) }"
          @dblclick="isUnavailable(song) || playSong(song)"
        >
          <div class="song-number">
            <span v-if="isCurrentSong(song)" class="wave-indicator">
              <span class="wave-bar"></span>
              <span class="wave-bar"></span>
              <span class="wave-bar"></span>
            </span>
            <span v-else class="song-index">{{ index + 1 }}</span>
          </div>
          <div class="song-info">
            <span class="song-name">{{ song.name }}</span>
            <span class="song-artist">{{ song.artist }}</span>
          </div>
          <div class="song-album">
            <span>{{ song.album }}</span>
          </div>
          <div v-if="song.reason" class="song-reason">
            <span>{{ song.reason }}</span>
          </div>
          <div v-if="isUnavailable(song)" class="song-status">
            <span class="status-badge">未找到</span>
          </div>
          <div class="song-actions">
            <button class="song-action-btn play-btn" :disabled="isUnavailable(song)" @click.stop="!isUnavailable(song) && playSong(song)" title="播放">
              <component :is="Play" :size="14" />
            </button>
            <button class="song-action-btn add-btn" @click.stop="addToPlaylist(song)" title="添加到列表">
              <component :is="Plus" :size="14" />
            </button>
            <button class="song-action-btn download-btn" :disabled="isUnavailable(song)" @click.stop="!isUnavailable(song) && downloadSong(song)" title="下载">
              <component :is="Download" :size="14" />
            </button>
            <button class="song-action-btn info-btn" :disabled="isUnavailable(song)" @click.stop="!isUnavailable(song) && showSongInfo(song)" title="详情">
              <component :is="Info" :size="14" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!isGenerating && !errorMessage && playlistSongs.length === 0" class="empty-section">
      <div class="empty-icon">
        <component :is="Music" :size="48" />
      </div>
      <p class="empty-title">点击上方按钮，让AI为你生成专属歌单</p>
      <p class="empty-hint">
        请先在
        <span class="empty-link" @click="$emit('openSettings')">设置页面</span>
        配置API密钥
      </p>
      <div class="empty-decoration">
        <span class="deco-circle"></span>
        <span class="deco-circle"></span>
        <span class="deco-circle"></span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted } from 'vue'
import {
  Settings, Wand2, Sparkles, Loader2, AlertCircle, X,
  Music, Play, Plus, Download, Info, RefreshCw, ChevronDown
} from 'lucide-vue-next'
import { usePlayerStore } from '../stores/player.js'
import { useSettingsStore } from '../stores/settings.js'

const player = usePlayerStore()
const settings = useSettingsStore()

const paramsCollapsed = ref(false)
const isGenerating = ref(false)
const progressPercent = ref(0)
const progressText = ref('')
const errorMessage = ref('')
const playlistSongs = ref([])

const musicStyles = computed(() => settings.getMusicStyles())
const moods = computed(() => settings.getMoods())
const songCounts = computed(() => settings.getSongCounts())

const selectedStyles = computed(() => settings.getSelectedStyles())
const selectedMoods = computed(() => settings.getSelectedMoods())

function toggleStyle(value) {
  const styles = settings.getSelectedStyles()
  const index = styles.indexOf(value)
  if (index > -1) {
    styles.splice(index, 1)
  } else {
    styles.push(value)
  }
  settings.setSelectedStyles(styles)
}

function toggleMood(value) {
  const moodList = settings.getSelectedMoods()
  const index = moodList.indexOf(value)
  if (index > -1) {
    moodList.splice(index, 1)
  } else {
    moodList.push(value)
  }
  settings.setSelectedMoods(moodList)
}

function isCurrentSong(song) {
  return player.currentSong && player.currentSong.id === song.id && player.currentSong.source === song.source
}

function isUnavailable(song) {
  return song.isAiGenerated === true
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

function addAllToPlaylist() {
  playlistSongs.value.forEach(song => {
    player.addToPlaylist(song)
  })
}

function regeneratePlaylist() {
  playlistSongs.value = []
  generatePlaylist()
}

const { openDownload } = inject('download')
const { openSongInfo } = inject('songInfo')

async function generatePlaylist() {
  if (!settings.aiApiKey.trim()) {
    errorMessage.value = '请先在设置页面配置API密钥'
    return
  }

  isGenerating.value = true
  errorMessage.value = ''
  playlistSongs.value = []
  progressPercent.value = 0
  progressText.value = '正在向AI发送请求...'

  const styleLabels = selectedStyles.value.map(v => musicStyles.value.find(s => s.value === v)?.label).filter(Boolean)
  const moodLabels = selectedMoods.value.map(v => moods.value.find(m => m.value === v)?.label).filter(Boolean)

  const stylePart = styleLabels.length > 0 ? `${styleLabels.join('、')}风格` : ''
  const moodPart = moodLabels.length > 0 ? `适合${moodLabels.join('、')}的情绪氛围` : ''
  const styleAndMood = [stylePart, moodPart].filter(Boolean).join('，')

  const systemPrompt = `你是一个专业的音乐推荐助手。请根据用户的需求，推荐${settings.aiSongCount}首符合条件的歌曲。

要求：
1. 必须返回标准的JSON格式，包含一个名为"songs"的数组
2. 每个歌曲对象包含：name（歌曲名）、artist（歌手）、album（专辑，可选）、reason（推荐理由）
3. 推荐理由要简短、有趣，说明为什么这首歌符合要求
4. 确保歌曲真实存在，可以在主流音乐平台找到
5. 不要返回任何额外的文本或解释，只返回JSON

示例格式：
{"songs":[{"name":"歌曲名","artist":"歌手","album":"专辑","reason":"推荐理由"}]}
`

  const userPrompt = `${styleAndMood ? `请推荐${settings.aiSongCount}首${styleAndMood}的歌曲。` : `请推荐${settings.aiSongCount}首歌曲。`}${settings.aiCustomPrompt.trim() ? `额外要求：${settings.aiCustomPrompt}` : ''}`

  try {
    const aiRes = await window.electronAPI.aiChat({
      apiKey: settings.aiApiKey,
      baseUrl: settings.aiBaseUrl,
      model: settings.aiModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      timeout: settings.aiTimeout,
      temperature: settings.aiTemperature
    })

    if (!aiRes.success) {
      throw new Error(aiRes.error)
    }

    progressPercent.value = 30
    progressText.value = 'AI返回结果，正在解析...'

    let aiResult
    try {
      const cleanData = aiRes.data.replace(/```json/g, '').replace(/```/g, '').trim()
      aiResult = JSON.parse(cleanData)
    } catch (e) {
      throw new Error('AI返回的数据格式有误，请重试')
    }

    if (!aiResult.songs || !Array.isArray(aiResult.songs)) {
      throw new Error('AI返回的数据格式有误，请重试')
    }

    progressPercent.value = 80
    progressText.value = '正在生成歌单...'

    const foundSongs = aiResult.songs.map((song, i) => ({
      id: '',
      name: song.name,
      artist: song.artist,
      album: song.album || '未知专辑',
      pic_id: '',
      lyric_id: '',
      source: 'netease',
      reason: song.reason || '',
      isAiGenerated: true,
      tempId: `ai-temp-${Date.now()}-${i}`
    }))

    progressPercent.value = 100
    progressText.value = '歌单生成完成！'

    playlistSongs.value = foundSongs
    paramsCollapsed.value = true

    setTimeout(() => {
      progressPercent.value = 0
      progressText.value = ''
    }, 1000)
  } catch (e) {
    errorMessage.value = e.message
  } finally {
    isGenerating.value = false
  }
}
</script>

<style scoped>
.ai-playlist-panel {
  padding: var(--spacing-lg);
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  overflow: hidden;
}

/* ===== Banner ===== */
.banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-xl);
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
  border-radius: var(--radius-lg);
  flex-shrink: 0;
}

.banner-content h2 {
  color: white;
  font-size: 28px;
  font-weight: var(--font-weight-bold);
  margin-bottom: 4px;
}

.banner-content p {
  color: rgba(255, 255, 255, 0.8);
  font-size: var(--font-size-sm);
}

.config-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.config-link:hover {
  background: rgba(255, 255, 255, 0.35);
}

/* ===== Params ===== */
.params-section {
  background: var(--bg-layer-2);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  flex-shrink: 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-md);
  color: var(--text-primary);
  margin-bottom: var(--spacing-lg);
  font-weight: 600;
}

.section-title.clickable {
  cursor: pointer;
  user-select: none;
}

.collapse-icon {
  margin-left: auto;
  transition: transform 0.3s ease;
}

.collapse-icon.rotated {
  transform: rotate(180deg);
}

.param-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.custom-row {
  margin-top: var(--spacing-sm);
}

.param-label {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  font-weight: 500;
}

.param-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.param-option {
  padding: 6px 14px;
  background: var(--bg-layer-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-full);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.param-option:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  transform: scale(1.05);
}

.param-option.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
  box-shadow: 0 0 12px rgba(99, 102, 241, 0.35);
}

.param-textarea {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-layer-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  resize: vertical;
  outline: none;
  transition: all var(--transition-fast);
}

.param-textarea:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
}

/* ===== Generate Button ===== */
.generate-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
  border: none;
  border-radius: var(--radius-md);
  color: white;
  font-size: var(--font-size-base);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-top: var(--spacing-md);
  position: relative;
  overflow: hidden;
  min-height: 44px;
}

.generate-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-glow);
}

.generate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.generate-btn.generating {
  justify-content: flex-start;
  padding: 0;
  background: var(--bg-layer-3);
  border: 1px solid var(--border-color);
}

.btn-progress {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary) 0%, var(--color-success) 100%);
  border-radius: var(--radius-md);
  transition: width var(--transition-normal);
  opacity: 0.25;
}

.btn-progress-text {
  position: relative;
  z-index: 1;
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  font-weight: 500;
  padding-left: var(--spacing-lg);
  flex: 1;
}

.generate-btn .spinner {
  position: relative;
  z-index: 1;
  margin-right: var(--spacing-lg);
  animation: spin 1s linear infinite;
  color: var(--color-primary);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ===== Error ===== */
.error-section {
  flex-shrink: 0;
}

.error-box {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  background: rgba(239, 68, 68, 0.1);
  border-radius: var(--radius-md);
  color: var(--color-error);
  font-size: var(--font-size-sm);
  animation: fadeIn 0.3s ease;
}

.error-close {
  margin-left: auto;
  padding: 2px;
  background: transparent;
  border: none;
  color: var(--color-error);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.error-close:hover {
  background: rgba(239, 68, 68, 0.2);
}

/* ===== Playlist Section ===== */
.playlist-section {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.playlist-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
  flex-shrink: 0;
}

.playlist-header .section-title {
  margin-bottom: 0;
}

.playlist-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.playlist-actions .action-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  background: var(--bg-layer-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.playlist-actions .action-btn:hover {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

/* ===== Song List ===== */
.song-list {
  display: flex;
  flex-direction: column;
  background: var(--bg-layer-2);
  border-radius: var(--radius-md);
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.song-item {
  display: flex;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
  transition: all var(--transition-fast);
  height: 52px;
}

.song-item:last-child {
  border-bottom: none;
}

.song-item:hover {
  background: var(--bg-hover);
}

.song-item.active {
  background: rgba(99, 102, 241, 0.12);
}

.song-item.active .song-name {
  color: var(--color-primary);
}

.song-number {
  width: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.song-index {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  font-weight: 500;
}

/* Wave indicator */
.wave-indicator {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 16px;
}

.wave-bar {
  display: block;
  width: 3px;
  background: var(--color-primary);
  border-radius: 2px;
  animation: wave 0.8s ease-in-out infinite;
}

.wave-bar:nth-child(1) {
  height: 8px;
  animation-delay: 0s;
}

.wave-bar:nth-child(2) {
  height: 14px;
  animation-delay: 0.15s;
}

.wave-bar:nth-child(3) {
  height: 10px;
  animation-delay: 0.3s;
}

@keyframes wave {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(0.4); }
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
  flex: 1;
  min-width: 0;
}

.song-album span {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-reason {
  flex: 1.5;
  min-width: 0;
}

.song-reason span {
  font-size: var(--font-size-xs);
  color: var(--color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-style: italic;
}

.song-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  transition: opacity var(--transition-fast);
  flex-shrink: 0;
}

.song-item:hover .song-actions {
  opacity: 1;
  animation: fadeIn 0.2s ease;
}

.song-action-btn {
  padding: 6px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
}

.song-action-btn:hover {
  background: var(--bg-layer-3);
}

.play-btn:hover {
  color: var(--color-success);
}

.add-btn:hover {
  color: var(--color-primary);
}

.download-btn:hover {
  color: var(--color-warning);
}

.info-btn:hover {
  color: var(--color-primary);
}

.song-item.unavailable {
  opacity: 0.45;
  cursor: not-allowed;
}

.song-item.unavailable:hover {
  background: var(--bg-layer-2);
}

.song-item.unavailable .song-actions {
  opacity: 1;
}

.song-status {
  width: 56px;
  text-align: center;
  flex-shrink: 0;
}

.status-badge {
  padding: 2px 8px;
  background: rgba(239, 68, 68, 0.2);
  color: var(--color-error);
  font-size: 10px;
  border-radius: var(--radius-full);
}

.song-action-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.song-action-btn:disabled:hover {
  background: transparent;
}

/* ===== Empty State ===== */
.empty-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  position: relative;
}

.empty-icon {
  color: var(--text-muted);
  margin-bottom: var(--spacing-sm);
  opacity: 0.4;
}

.empty-title {
  color: var(--text-secondary);
  font-size: var(--font-size-md);
  font-weight: 500;
}

.empty-hint {
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}

.empty-link {
  color: var(--color-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.empty-link:hover {
  text-decoration: underline;
  color: var(--color-primary-light);
}

.empty-decoration {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  gap: 40px;
  opacity: 0.04;
  pointer-events: none;
}

.deco-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: var(--color-primary);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .song-album {
    display: none;
  }

  .song-reason {
    display: none;
  }

  .song-actions {
    opacity: 1;
  }

  .playlist-actions {
    flex-wrap: wrap;
  }
}
</style>