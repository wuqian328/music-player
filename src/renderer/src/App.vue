<template>
  <div class="app-container" :class="`theme-${currentTheme}`">
    <TitleBar />
    <div class="app-body">
      <div class="sidebar">
        <div
          v-for="tab in tabs"
          :key="tab.id"
          class="nav-item"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <component :is="tab.icon" :size="20" />
          <span class="nav-label">{{ tab.label }}</span>
        </div>
      </div>
      <div class="main-content">
        <RecommendPanel v-show="activeTab === 'recommend'" />
        <AIPlaylistPanel v-show="activeTab === 'ai-playlist'" @open-settings="openSettingsPanel" />
        <SearchPanel v-show="activeTab === 'search'" />
        <PlaylistPanel v-show="activeTab === 'playlist'" />
        <HistoryPanel v-show="activeTab === 'history'" />
        <LocalMusicPanel v-show="activeTab === 'local'" />
        <SettingsPanel v-show="activeTab === 'settings'" :default-section="settingsSection" />
      </div>
    </div>
    <PlayerBar />
    <DownloadModal v-if="showDownloadModal" />
    <SongInfoModal v-if="showSongInfoModal" />
  </div>
</template>

<script setup>
import { ref, provide, onMounted, onUnmounted } from 'vue'
import TitleBar from './components/TitleBar.vue'
import SearchPanel from './components/SearchPanel.vue'
import PlaylistPanel from './components/PlaylistPanel.vue'
import HistoryPanel from './components/HistoryPanel.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import RecommendPanel from './components/RecommendPanel.vue'
import AIPlaylistPanel from './components/AIPlaylistPanel.vue'
import LocalMusicPanel from './components/LocalMusicPanel.vue'
import PlayerBar from './components/PlayerBar.vue'
import DownloadModal from './components/DownloadModal.vue'
import SongInfoModal from './components/SongInfoModal.vue'
import { usePlayerStore } from './stores/player.js'
import { Search, ListMusic, Clock, Settings, Sparkles, Music, FolderOpen } from 'lucide-vue-next'

const player = usePlayerStore()
const activeTab = ref('recommend')
const showDownloadModal = ref(false)
const downloadTarget = ref(null)
const showSongInfoModal = ref(false)
const songInfoTarget = ref(null)
const themePreference = ref('dark') // 用户偏好：'dark', 'light', 'system'
const currentTheme = ref('dark') // 实际显示的主题
const settingsSection = ref('')

const tabs = [
  { id: 'recommend', label: '推荐', icon: Sparkles },
  { id: 'ai-playlist', label: '歌单', icon: Music },
  { id: 'search', label: '搜索', icon: Search },
  { id: 'playlist', label: '列表', icon: ListMusic },
  { id: 'history', label: '历史', icon: Clock },
  { id: 'local', label: '本地', icon: FolderOpen },
  { id: 'settings', label: '设置', icon: Settings }
]

function openDownload(song) {
  downloadTarget.value = song
  showDownloadModal.value = true
}

function closeDownload() {
  showDownloadModal.value = false
  downloadTarget.value = null
}

function openSongInfo(song) {
  songInfoTarget.value = song
  showSongInfoModal.value = true
}

function closeSongInfo() {
  showSongInfoModal.value = false
  songInfoTarget.value = null
}

function triggerSearch(keyword) {
  activeTab.value = 'search'
  showSongInfoModal.value = false
  setTimeout(() => {
    const event = new CustomEvent('trigger-search', { detail: keyword })
    window.dispatchEvent(event)
  }, 100)
}

function resolveTheme(preference) {
  if (preference === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return preference
}

function setTheme(preference) {
  themePreference.value = preference
  currentTheme.value = resolveTheme(preference)
  localStorage.setItem('music-player-theme', preference)
}

function handleSystemThemeChange(e) {
  if (themePreference.value === 'system') {
    currentTheme.value = e.matches ? 'dark' : 'light'
  }
}

function openSettingsPanel(section = '') {
  settingsSection.value = section
  activeTab.value = 'settings'
}

function handleKeydown(e) {
  if (e.target.tagName === 'INPUT') return

  if (e.code === 'Space') {
    e.preventDefault()
    player.togglePlay()
  } else if (e.ctrlKey || e.metaKey) {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault()
        player.prevSong()
        break
      case 'ArrowRight':
        e.preventDefault()
        player.nextSong()
        break
      case 'ArrowUp':
        e.preventDefault()
        player.setVolume(Math.min(1, player.volume + 0.05))
        break
      case 'ArrowDown':
        e.preventDefault()
        player.setVolume(Math.max(0, player.volume - 0.05))
        break
      case 'm':
      case 'M':
        e.preventDefault()
        player.toggleMute()
        break
      case '1':
        e.preventDefault()
        activeTab.value = 'recommend'
        break
      case '2':
        e.preventDefault()
        activeTab.value = 'ai-playlist'
        break
      case '3':
        e.preventDefault()
        activeTab.value = 'search'
        break
      case '4':
        e.preventDefault()
        activeTab.value = 'playlist'
        break
      case '5':
        e.preventDefault()
        activeTab.value = 'history'
        break
      case '6':
        e.preventDefault()
        activeTab.value = 'local'
        break
      case '7':
        e.preventDefault()
        activeTab.value = 'settings'
        break
      case 'f':
      case 'F':
        e.preventDefault()
        const searchInput = document.querySelector('.search-input')
        if (searchInput) searchInput.focus()
        break
    }
  }
}

provide('download', { openDownload, closeDownload, showDownloadModal, downloadTarget })
provide('songInfo', { openSongInfo, closeSongInfo, showSongInfoModal, songInfoTarget, triggerSearch })
provide('theme', { setTheme })

onMounted(() => {
  const savedTheme = localStorage.getItem('music-player-theme') || 'dark'
  themePreference.value = savedTheme
  currentTheme.value = resolveTheme(savedTheme)
  document.addEventListener('keydown', handleKeydown)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', handleSystemThemeChange)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', handleSystemThemeChange)
})
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-layer-1);
  transition: all var(--transition-normal);
}

.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 64px;
  min-width: 64px;
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  padding-top: var(--spacing-sm);
  flex-shrink: 0;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-xs);
  cursor: pointer;
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  transition: all var(--transition-fast);
  gap: var(--spacing-xs);
  border-left: 3px solid transparent;
}

.nav-item:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.nav-item.active {
  color: var(--color-primary);
  background: rgba(99, 102, 241, 0.1);
  border-left-color: var(--color-primary);
}

.nav-label {
  font-size: 10px;
}

.main-content {
  flex: 1;
  overflow: hidden;
  padding: 0;
  background: var(--bg-layer-1);
}

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-primary);
}
</style>