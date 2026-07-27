<template>
  <div class="settings-panel">
    <div class="settings-header">
      <div class="settings-title-row">
        <component :is="Settings" :size="20" />
        <h2 class="panel-title">设置</h2>
      </div>
      <span class="version-text">v1.0.0</span>
    </div>

    <div class="settings-body">
      <div class="settings-nav">
        <button
          v-for="nav in navItems"
          :key="nav.id"
          class="nav-item"
          :class="{ active: activeSection === nav.id }"
          @click="activeSection = nav.id"
        >
          <component :is="nav.icon" :size="18" />
          <span class="nav-label">{{ nav.label }}</span>
        </button>
      </div>

      <div class="settings-content">
        <!-- 音质设置 -->
        <div v-show="activeSection === 'quality'" class="content-panel">
          <div class="setting-group">
            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">播放音质</div>
                <div class="setting-desc">设置音乐播放时的音质等级</div>
              </div>
              <select v-model="settings.playQuality" class="setting-select">
                <option
                  v-for="opt in qualityOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                >{{ opt.label }}</option>
              </select>
            </div>

            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">下载音质</div>
                <div class="setting-desc">设置下载音乐时的音质等级</div>
              </div>
              <select v-model="settings.downloadQuality" class="setting-select">
                <option
                  v-for="opt in qualityOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                >{{ opt.label }}</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 缓存设置 -->
        <div v-show="activeSection === 'cache'" class="content-panel">
          <div class="setting-group">
            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">启用播放缓存</div>
                <div class="setting-desc">缓存封面和歌词，加快加载速度</div>
              </div>
              <button class="toggle-btn" :class="{ active: settings.cacheEnabled }" @click="settings.cacheEnabled = !settings.cacheEnabled">
                <div class="toggle-thumb"></div>
              </button>
            </div>

            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">自动缓存歌词</div>
                <div class="setting-desc">播放时自动缓存歌词文件到本地</div>
              </div>
              <button class="toggle-btn" :class="{ active: settings.autoCacheLyrics }" :disabled="!settings.cacheEnabled" @click="settings.autoCacheLyrics = !settings.autoCacheLyrics">
                <div class="toggle-thumb"></div>
              </button>
            </div>

            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">自动缓存封面</div>
                <div class="setting-desc">播放时自动缓存专辑封面到本地</div>
              </div>
              <button class="toggle-btn" :class="{ active: settings.autoCacheAlbumArt }" :disabled="!settings.cacheEnabled" @click="settings.autoCacheAlbumArt = !settings.autoCacheAlbumArt">
                <div class="toggle-thumb"></div>
              </button>
            </div>

            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">缓存目录</div>
                <div class="setting-desc">缓存文件存储位置</div>
              </div>
              <div class="cache-dir-row">
                <input
                  v-model="settings.cacheDirectory"
                  placeholder="默认：用户数据目录/cache"
                  disabled
                  class="dir-input"
                />
                <button class="dir-btn" @click="selectDir" title="选择目录">
                  <component :is="FolderOpen" :size="14" />
                </button>
                <button class="dir-btn text" @click="resetDir" title="重置">
                  <component :is="RotateCcw" :size="14" />
                </button>
              </div>
            </div>

            <div v-if="settings.cacheInfo" class="cache-stats-card">
              <div class="cache-ring">
                <svg viewBox="0 0 80 80" class="ring-svg">
                  <circle cx="40" cy="40" r="32" fill="none" stroke="var(--bg-layer-3)" stroke-width="6" />
                  <circle
                    cx="40" cy="40" r="32"
                    fill="none"
                    stroke="var(--color-primary)"
                    stroke-width="6"
                    stroke-linecap="round"
                    :stroke-dasharray="`${cachePercent * 2.01} 201`"
                    transform="rotate(-90 40 40)"
                    class="ring-progress"
                  />
                </svg>
                <div class="ring-text">
                  <span class="ring-size">{{ settings.formatSize(settings.cacheInfo.size) }}</span>
                  <span class="ring-count">{{ settings.cacheInfo.count }} 个文件</span>
                </div>
              </div>
              <div class="cache-actions">
                <button class="dir-btn" @click="refreshCache" title="刷新">
                  <component :is="RefreshCw" :size="14" />
                </button>
                <button class="clear-cache-btn" @click="clearCache" :disabled="settings.cacheInfo.count === 0">
                  <component :is="Trash2" :size="14" />
                  清空缓存
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 外观设置 -->
        <div v-show="activeSection === 'appearance'" class="content-panel">
          <div class="setting-group">
            <div class="theme-cards">
              <div
                class="theme-card"
                :class="{ active: currentTheme === 'dark' }"
                @click="setTheme('dark')"
              >
                <div class="theme-preview theme-preview-dark">
                  <div class="preview-sidebar"></div>
                  <div class="preview-main">
                    <div class="preview-line"></div>
                    <div class="preview-line short"></div>
                    <div class="preview-line"></div>
                  </div>
                </div>
                <div class="theme-meta">
                  <component :is="Moon" :size="14" />
                  <span>暗色模式</span>
                </div>
              </div>

              <div
                class="theme-card"
                :class="{ active: currentTheme === 'light' }"
                @click="setTheme('light')"
              >
                <div class="theme-preview theme-preview-light">
                  <div class="preview-sidebar"></div>
                  <div class="preview-main">
                    <div class="preview-line"></div>
                    <div class="preview-line short"></div>
                    <div class="preview-line"></div>
                  </div>
                </div>
                <div class="theme-meta">
                  <component :is="Sun" :size="14" />
                  <span>亮色模式</span>
                </div>
              </div>

              <div
                class="theme-card"
                :class="{ active: currentTheme === 'system' }"
                @click="setTheme('system')"
              >
                <div class="theme-preview theme-preview-system">
                  <div class="preview-half dark-half"></div>
                  <div class="preview-half light-half"></div>
                </div>
                <div class="theme-meta">
                  <component :is="Monitor" :size="14" />
                  <span>跟随系统</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 快捷键 -->
        <div v-show="activeSection === 'shortcuts'" class="content-panel">
          <div class="setting-group">
            <div class="shortcut-header" @click="shortcutsExpanded = !shortcutsExpanded">
              <div class="shortcut-summary">
                <component :is="Keyboard" :size="16" />
                <span>{{ shortcutsExpanded ? '快捷键列表' : `共 ${shortcuts.length} 个快捷键` }}</span>
              </div>
              <component :is="shortcutsExpanded ? ChevronDown : ChevronRight" :size="16" class="expand-icon" />
            </div>
            <div v-if="shortcutsExpanded" class="shortcut-group">
              <div v-for="(sc, i) in shortcuts" :key="i" class="shortcut-item">
                <span class="shortcut-key">{{ sc.key }}</span>
                <span class="shortcut-desc">{{ sc.desc }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- AI配置 -->
        <div v-show="activeSection === 'ai-api'" class="content-panel">
          <div class="setting-group">
            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">API密钥</div>
                <div class="setting-desc">OpenAI或兼容API的密钥</div>
              </div>
              <div class="ai-input-row">
                <input
                  v-model="settings.aiApiKey"
                  :type="showApiKey ? 'text' : 'password'"
                  placeholder="sk-..."
                  class="ai-input"
                />
                <button class="ai-toggle-btn" @click="showApiKey = !showApiKey" :title="showApiKey ? '隐藏' : '显示'">
                  <component :is="showApiKey ? EyeOff : Eye" :size="14" />
                </button>
              </div>
            </div>

            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">模型名称</div>
                <div class="setting-desc">手动输入或从API获取模型列表</div>
              </div>
              <div class="ai-input-row">
                <input
                  v-model="settings.aiModel"
                  type="text"
                  placeholder="如: gpt-4o-mini"
                  class="ai-input"
                />
                <button
                  class="ai-toggle-btn"
                  @click="fetchModels"
                  :disabled="isFetchingModels"
                  :title="isFetchingModels ? '获取中...' : '从API获取模型列表'"
                >
                  <component :is="isFetchingModels ? Loader2 : RefreshCw" :size="14" :class="{ spinner: isFetchingModels }" />
                </button>
              </div>
              <div v-if="modelList.length > 0" class="model-dropdown">
                <div
                  v-for="model in modelList"
                  :key="model.id"
                  class="model-option"
                  @click="selectModel(model.id)"
                >
                  <span class="model-name">{{ model.name }}</span>
                  <span v-if="model.owned_by" class="model-owner">{{ model.owned_by }}</span>
                </div>
              </div>
              <div v-if="modelsError" class="models-error">
                <component :is="AlertCircle" :size="12" />
                <span>{{ modelsError }}</span>
              </div>
            </div>

            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">API地址</div>
                <div class="setting-desc">自定义API基础地址（支持OpenAI兼容接口）</div>
              </div>
              <input
                v-model="settings.aiBaseUrl"
                type="text"
                placeholder="https://api.openai.com/v1"
                class="ai-input standalone"
              />
            </div>

            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">请求超时（秒）</div>
                <div class="setting-desc">AI请求的超时时间</div>
              </div>
              <input
                v-model.number="settings.aiTimeout"
                type="number"
                min="10"
                max="120"
                class="ai-input small"
              />
            </div>

            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">创意度</div>
                <div class="setting-desc">控制AI推荐的创意程度 (0-1)</div>
              </div>
              <div class="slider-row">
                <input
                  v-model.number="settings.aiTemperature"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  class="ai-slider"
                />
                <span class="slider-value">{{ settings.aiTemperature }}</span>
              </div>
            </div>

            <button class="test-connection-btn" @click="testConnection" :disabled="isTesting">
              <component :is="isTesting ? Loader2 : Wifi" :size="14" :class="{ spinner: isTesting }" />
              {{ isTesting ? '测试中...' : '测试连接' }}
            </button>
            <div v-if="testResult" class="test-result" :class="{ success: testResult.success, error: !testResult.success }">
              <component :is="testResult.success ? CheckCircle2 : AlertCircle" :size="14" />
              <span>{{ testResult.message }}</span>
            </div>
          </div>
        </div>

        <!-- 歌单生成参数 -->
        <div v-show="activeSection === 'ai-gen'" class="content-panel">
          <div class="setting-group">
            <div class="ai-gen-params">
              <div class="params-subtitle">
                <component :is="Music2" :size="16" />
                音乐风格标签
              </div>
              <div class="tag-editor">
                <div v-for="(style, index) in editableStyles" :key="index" class="tag-item">
                  <input
                    v-model="editableStyles[index].label"
                    type="text"
                    class="tag-input"
                    placeholder="风格名称"
                  />
                  <button class="tag-delete" @click="removeStyle(index)" title="删除">
                    <component :is="X" :size="12" />
                  </button>
                </div>
                <button class="tag-add" @click="addStyle">
                  <component :is="Plus" :size="12" />
                  添加风格
                </button>
              </div>

              <div class="params-subtitle">
                <component :is="Heart" :size="16" />
                情绪氛围标签
              </div>
              <div class="tag-editor">
                <div v-for="(mood, index) in editableMoods" :key="index" class="tag-item">
                  <input
                    v-model="editableMoods[index].label"
                    type="text"
                    class="tag-input"
                    placeholder="情绪名称"
                  />
                  <button class="tag-delete" @click="removeMood(index)" title="删除">
                    <component :is="X" :size="12" />
                  </button>
                </div>
                <button class="tag-add" @click="addMood">
                  <component :is="Plus" :size="12" />
                  添加情绪
                </button>
              </div>

              <div class="params-subtitle">
                <component :is="ListOrdered" :size="16" />
                歌单数量选项
              </div>
              <div class="tag-editor">
                <div v-for="(count, index) in editableSongCounts" :key="index" class="tag-item">
                  <input
                    v-model.number="editableSongCounts[index]"
                    type="number"
                    class="tag-input small"
                    min="1"
                    max="100"
                    placeholder="数量"
                  />
                  <span class="tag-unit">首</span>
                  <button class="tag-delete" @click="removeSongCount(index)" title="删除">
                    <component :is="X" :size="12" />
                  </button>
                </div>
                <button class="tag-add" @click="addSongCount">
                  <component :is="Plus" :size="12" />
                  添加数量
                </button>
              </div>

              <div class="param-item">
                <label class="param-label">默认歌单数量</label>
                <div class="param-options">
                  <button
                    v-for="count in editableSongCounts"
                    :key="count"
                    class="param-option"
                    :class="{ active: settings.aiSongCount === count }"
                    @click="settings.aiSongCount = count"
                  >
                    {{ count }}首
                  </button>
                </div>
              </div>

              <div class="param-item">
                <label class="param-label">自定义需求提示</label>
                <textarea
                  class="param-textarea"
                  v-model="settings.aiCustomPrompt"
                  placeholder="例如：推荐适合深夜学习的轻音乐，不要太吵..."
                  rows="2"
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        <!-- 关于与升级 -->
        <div v-show="activeSection === 'about'" class="content-panel">
          <div class="setting-group">
            <div class="about-card">
              <div class="about-logo">
                <span class="logo-icon">♪</span>
                <div class="about-info">
                  <h3 class="about-title">音乐播放器</h3>
                  <p class="about-version">版本 {{ currentVersion }}</p>
                </div>
              </div>
              <p class="about-desc">一款简洁优雅的桌面音乐播放器，支持多平台音乐搜索和下载。</p>
            </div>

            <div class="update-section">
              <div class="update-header">
                <component :is="RefreshCw" :size="16" />
                <span>检查更新</span>
              </div>

              <div v-if="updateStatus === 'checking'" class="update-status">
                <component :is="Loader2" :size="16" class="spinner" />
                <span>正在检查更新...</span>
              </div>

              <div v-else-if="updateStatus === 'available'" class="update-available">
                <div class="update-info">
                  <component :is="AlertCircle" :size="16" />
                  <span>发现新版本 v{{ updateInfo.version }}</span>
                </div>
                <div class="release-notes">
                  <p class="notes-title">更新内容：</p>
                  <ul>
                    <li v-for="(note, index) in updateInfo.releaseNotes" :key="index">
                      {{ note }}
                    </li>
                  </ul>
                </div>
                <button 
                  v-if="downloadProgress < 100"
                  class="update-btn" 
                  @click="startDownload"
                  :disabled="isDownloading"
                >
                  <component :is="isDownloading ? Loader2 : Download" :size="14" :class="{ spinner: isDownloading }" />
                  {{ isDownloading ? `下载中 ${downloadProgress}%` : '立即下载' }}
                </button>
                <button 
                  v-else-if="updateDownloaded"
                  class="install-btn" 
                  @click="installUpdate"
                >
                  <component :is="CheckCircle2" :size="14" />
                  安装更新
                </button>
                <button 
                  v-if="isDownloading"
                  class="cancel-btn" 
                  @click="cancelDownload"
                >
                  <component :is="X" :size="14" />
                  取消下载
                </button>
              </div>

              <div v-else-if="updateStatus === 'downloading'" class="update-downloading">
                <div class="download-progress-bar">
                  <div class="progress-fill" :style="{ width: downloadProgress + '%' }"></div>
                </div>
                <div class="download-info">
                  <span>{{ formatSize(downloadedSize) }} / {{ formatSize(totalSize) }}</span>
                  <span>{{ downloadProgress }}%</span>
                </div>
                <button class="cancel-btn" @click="cancelDownload">
                  <component :is="X" :size="14" />
                  取消下载
                </button>
              </div>

              <div v-else-if="updateStatus === 'up-to-date'" class="update-status success">
                <component :is="CheckCircle2" :size="16" />
                <span>当前已是最新版本</span>
              </div>

              <div v-else-if="updateStatus === 'error'" class="update-status error">
                <component :is="AlertCircle" :size="16" />
                <span>{{ updateError }}</span>
              </div>

              <button 
                v-if="updateStatus !== 'checking' && updateStatus !== 'downloading'"
                class="check-btn" 
                @click="checkForUpdate"
              >
                <component :is="RefreshCw" :size="14" />
                手动检查更新
              </button>
            </div>

            <div class="update-source-config">
              <div class="update-header">
                <component :is="Settings" :size="16" />
                <span>更新源配置</span>
              </div>
              <div class="config-item">
                <label class="config-label">GitHub Owner</label>
                <input
                  v-model="settings.updateGithubOwner"
                  type="text"
                  class="config-input"
                  placeholder="GitHub用户名"
                />
              </div>
              <div class="config-item">
                <label class="config-label">GitHub Repo</label>
                <input
                  v-model="settings.updateGithubRepo"
                  type="text"
                  class="config-input"
                  placeholder="仓库名称"
                />
              </div>
              <button class="save-config-btn" @click="saveUpdateSource">
                <component :is="CheckCircle2" :size="14" />
                保存配置
              </button>
              <p class="config-hint">
                配置后点击"手动检查更新"即可从指定GitHub仓库检查新版本
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, inject, watch } from 'vue'
import { useSettingsStore } from '../stores/settings.js'
import {
  Settings, Music2, HardDrive, FolderOpen, RotateCcw, Trash2,
  Monitor, Moon, Sun, Keyboard, RefreshCw, Bot, Eye, EyeOff,
  Loader2, AlertCircle, ChevronDown, ChevronRight, Wifi, CheckCircle2, Wand2,
  Heart, ListOrdered, Plus, X, Download
} from 'lucide-vue-next'

const props = defineProps({
  defaultSection: {
    type: String,
    default: ''
  }
})

const settings = useSettingsStore()
const { setTheme: changeTheme } = inject('theme')

const activeSection = ref(props.defaultSection || 'quality')
const qualityOptions = computed(() => settings.getQualityOptions('netease'))

const currentTheme = ref('dark')
const showApiKey = ref(false)
const modelList = ref([])
const isFetchingModels = ref(false)
const modelsError = ref('')

const shortcutsExpanded = ref(true)
const isTesting = ref(false)
const testResult = ref(null)

const currentVersion = ref('1.0.0')
const updateStatus = ref('')
const updateInfo = ref({})
const updateError = ref('')
const isDownloading = ref(false)
const downloadProgress = ref(0)
const downloadedSize = ref(0)
const totalSize = ref(0)
const updateDownloaded = ref(false)
let updateStatusCallback = null
let updateProgressCallback = null

const navItems = [
  { id: 'quality', label: '音质', icon: Music2 },
  { id: 'cache', label: '缓存', icon: HardDrive },
  { id: 'appearance', label: '外观', icon: Monitor },
  { id: 'shortcuts', label: '快捷键', icon: Keyboard },
  { id: 'ai-api', label: 'AI配置', icon: Bot },
  { id: 'ai-gen', label: '歌单生成', icon: Wand2 },
  { id: 'about', label: '关于', icon: RefreshCw }
]

const editableStyles = ref([...settings.getMusicStyles()])
const editableMoods = ref([...settings.getMoods()])
const editableSongCounts = ref([...settings.getSongCounts()])

function addStyle() {
  editableStyles.value.push({ value: `style-${Date.now()}`, label: '' })
}

function removeStyle(index) {
  editableStyles.value.splice(index, 1)
  settings.setMusicStyles(editableStyles.value)
}

function addMood() {
  editableMoods.value.push({ value: `mood-${Date.now()}`, label: '' })
}

function removeMood(index) {
  editableMoods.value.splice(index, 1)
  settings.setMoods(editableMoods.value)
}

function addSongCount() {
  editableSongCounts.value.push(10)
}

function removeSongCount(index) {
  if (editableSongCounts.value.length > 1) {
    editableSongCounts.value.splice(index, 1)
  }
}

watch(editableStyles, (newVal) => {
  settings.setMusicStyles(newVal)
}, { deep: true })

watch(editableMoods, (newVal) => {
  settings.setMoods(newVal)
}, { deep: true })

watch(editableSongCounts, (newVal) => {
  settings.setSongCounts(newVal)
}, { deep: true })

const shortcuts = [
  { key: 'Space', desc: '播放 / 暂停' },
  { key: 'Ctrl + ←', desc: '上一曲' },
  { key: 'Ctrl + →', desc: '下一曲' },
  { key: 'Ctrl + ↑', desc: '音量增加' },
  { key: 'Ctrl + ↓', desc: '音量减小' },
  { key: 'Ctrl + M', desc: '静音切换' },
  { key: 'Ctrl + F', desc: '聚焦搜索' },
  { key: 'Ctrl + 1~7', desc: '切换标签页' }
]

const cacheTotal = computed(() => (settings.cacheInfo?.size || 0))
const cachePercent = computed(() => {
  const max = 512 * 1024 * 1024 // 512MB reference
  return Math.min(100, (cacheTotal.value / max) * 100)
})

function maskApiKey(key) {
  if (!key) return ''
  if (key.length <= 6) return key
  return key.slice(0, 3) + '...' + key.slice(-4)
}

async function fetchModels() {
  if (!settings.aiApiKey.trim()) {
    modelsError.value = '请先输入API密钥'
    return
  }
  
  isFetchingModels.value = true
  modelsError.value = ''
  modelList.value = []
  
  try {
    const res = await window.electronAPI.aiModels({
      apiKey: settings.aiApiKey,
      baseUrl: settings.aiBaseUrl,
      timeout: settings.aiTimeout
    })
    
    if (res.success) {
      modelList.value = res.data
    } else {
      modelsError.value = res.error
    }
  } catch (e) {
    modelsError.value = '获取模型列表失败: ' + e.message
  } finally {
    isFetchingModels.value = false
  }
}

function selectModel(modelId) {
  settings.aiModel = modelId
  modelList.value = []
}

async function testConnection() {
  if (!settings.aiApiKey.trim()) {
    testResult.value = { success: false, message: '请先输入API密钥' }
    return
  }

  isTesting.value = true
  testResult.value = null

  try {
    const res = await window.electronAPI.aiChat({
      apiKey: settings.aiApiKey,
      baseUrl: settings.aiBaseUrl,
      model: settings.aiModel,
      messages: [{ role: 'user', content: '回复OK' }],
      timeout: settings.aiTimeout,
      temperature: 0
    })

    if (res.success) {
      testResult.value = { success: true, message: '连接成功！API 响应正常' }
    } else {
      testResult.value = { success: false, message: res.error || '连接失败' }
    }
  } catch (e) {
    testResult.value = { success: false, message: '连接失败: ' + e.message }
  } finally {
    isTesting.value = false
  }
}

function setTheme(theme) {
  currentTheme.value = theme
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    changeTheme(prefersDark ? 'dark' : 'light')
  } else {
    changeTheme(theme)
  }
}

function setupUpdateListeners() {
  updateStatusCallback = (data) => {
    if (data.status === 'checking') {
      updateStatus.value = 'checking'
      updateDownloaded.value = false
    } else if (data.status === 'available') {
      updateInfo.value = {
        version: data.version,
        releaseNotes: data.releaseNotes ? data.releaseNotes.split('\n').filter(n => n.trim()) : []
      }
      updateStatus.value = 'available'
      updateDownloaded.value = false
    } else if (data.status === 'up-to-date') {
      updateStatus.value = 'up-to-date'
      updateDownloaded.value = false
    } else if (data.status === 'downloaded') {
      downloadProgress.value = 100
      isDownloading.value = false
      updateStatus.value = 'available'
      updateDownloaded.value = true
    } else if (data.status === 'error') {
      updateStatus.value = 'error'
      updateError.value = data.error || '更新失败'
      updateDownloaded.value = false
    }
  }

  updateProgressCallback = (data) => {
    downloadProgress.value = data.progress
    downloadedSize.value = data.downloadedLength
    totalSize.value = data.totalLength
  }

  window.electronAPI.onUpdateStatus(updateStatusCallback)
  window.electronAPI.onUpdateDownloadProgress(updateProgressCallback)
}

function cleanupUpdateListeners() {
  if (updateStatusCallback) {
    window.electronAPI.offUpdateStatus(updateStatusCallback)
    updateStatusCallback = null
  }
  if (updateProgressCallback) {
    window.electronAPI.offUpdateDownloadProgress(updateProgressCallback)
    updateProgressCallback = null
  }
}

async function checkForUpdate() {
  updateStatus.value = 'checking'
  updateError.value = ''
  
  try {
    const owner = settings.updateGithubOwner.trim()
    const repo = settings.updateGithubRepo.trim()
    
    if (owner && repo) {
      await window.electronAPI.setUpdateSource({ owner, repo })
    }
    
    const res = await window.electronAPI.checkUpdate()
    if (res.success) {
      currentVersion.value = res.currentVersion
    } else {
      updateStatus.value = 'error'
      updateError.value = res.error || '检查更新失败'
    }
  } catch (e) {
    updateStatus.value = 'error'
    updateError.value = e.message || '检查更新失败'
  }
}

async function startDownload() {
  if (isDownloading.value) return
  
  isDownloading.value = true
  downloadProgress.value = 0
  downloadedSize.value = 0
  
  try {
    const res = await window.electronAPI.downloadUpdate()
    if (!res.success) {
      updateError.value = res.error || '下载失败'
      updateStatus.value = 'error'
      isDownloading.value = false
    }
  } catch (e) {
    updateError.value = e.message || '下载失败'
    updateStatus.value = 'error'
    isDownloading.value = false
  }
}

async function cancelDownload() {
  await window.electronAPI.cancelUpdateDownload()
  isDownloading.value = false
  downloadProgress.value = 0
  updateStatus.value = 'available'
}

async function saveUpdateSource() {
  const owner = settings.updateGithubOwner.trim()
  const repo = settings.updateGithubRepo.trim()
  
  if (!owner || !repo) {
    updateError.value = '请输入完整的GitHub Owner和Repo名称'
    updateStatus.value = 'error'
    return
  }
  
  try {
    const res = await window.electronAPI.setUpdateSource({ owner, repo })
    if (res.success) {
      updateError.value = ''
      updateStatus.value = ''
    } else {
      updateError.value = res.error || '保存配置失败'
      updateStatus.value = 'error'
    }
  } catch (e) {
    updateError.value = e.message || '保存配置失败'
    updateStatus.value = 'error'
  }
}

async function installUpdate() {
  await window.electronAPI.installUpdate()
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

async function selectDir() {
  await settings.selectCacheDir()
}

function resetDir() {
  settings.cacheDirectory = ''
}

async function clearCache() {
  await settings.clearCacheData()
}

async function refreshCache() {
  await settings.refreshCacheInfo()
}

onMounted(() => {
  settings.init()
  const savedTheme = localStorage.getItem('music-player-theme')
  if (savedTheme) currentTheme.value = savedTheme
  if (props.defaultSection) {
    activeSection.value = props.defaultSection
  }
  setTimeout(() => {
    settings.refreshCacheInfo()
  }, 1000)
  setupUpdateListeners()
})

onUnmounted(() => {
  cleanupUpdateListeners()
})
</script>

<style scoped>
.settings-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* ===== Header ===== */
.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-lg) var(--spacing-xl);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.settings-title-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  color: var(--text-primary);
}

.panel-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
}

.version-text {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

/* ===== Body ===== */
.settings-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ===== Left Nav ===== */
.settings-nav {
  width: 150px;
  min-width: 150px;
  border-right: 1px solid var(--border-color);
  padding: var(--spacing-sm);
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  border: none;
  background: transparent;
  text-align: left;
}

.nav-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.nav-item.active {
  background: rgba(99, 102, 241, 0.12);
  color: var(--color-primary);
}

.nav-label {
  font-size: var(--font-size-sm);
}

/* ===== Right Content ===== */
.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-xl);
}

.content-panel {
  animation: fadeIn 0.2s ease;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
  position: relative;
}

.setting-item:hover {
  background: var(--bg-hover);
}

.setting-info {
  flex: 1;
  min-width: 0;
  padding-right: var(--spacing-lg);
}

.setting-label {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  margin-bottom: 2px;
}

.setting-desc {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

/* ===== Select ===== */
.setting-select {
  width: 180px;
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--bg-layer-2);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  outline: none;
  transition: border-color var(--transition-fast);
  flex-shrink: 0;
}

.setting-select:focus {
  border-color: var(--color-primary);
}

/* ===== Toggle ===== */
.toggle-btn {
  width: 44px;
  height: 24px;
  background: var(--bg-layer-3);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  position: relative;
  transition: all var(--transition-normal);
  flex-shrink: 0;
}

.toggle-btn.active {
  background: var(--color-primary);
}

.toggle-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  background: white;
  border-radius: 50%;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggle-btn.active .toggle-thumb {
  transform: translateX(20px);
}

/* ===== Cache ===== */
.cache-dir-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}

.dir-input {
  width: 200px;
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--bg-layer-2);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  outline: none;
}

.dir-btn {
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

.dir-btn:hover {
  background: var(--bg-hover);
}

.dir-btn.text {
  background: transparent;
  border-color: transparent;
}

.cache-stats-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-lg);
  margin-top: var(--spacing-md);
  background: var(--bg-layer-2);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.cache-ring {
  position: relative;
  width: 80px;
  height: 80px;
  flex-shrink: 0;
}

.ring-svg {
  width: 100%;
  height: 100%;
}

.ring-progress {
  transition: stroke-dasharray 0.6s ease;
  stroke: var(--color-primary);
}

.ring-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.ring-size {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
}

.ring-count {
  font-size: 10px;
  color: var(--text-muted);
}

.cache-actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.clear-cache-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-md);
  background: transparent;
  border: 1px solid var(--color-error);
  border-radius: var(--radius-md);
  color: var(--color-error);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
}

.clear-cache-btn:hover:not(:disabled) {
  background: var(--color-error);
  color: white;
}

.clear-cache-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===== Theme Cards ===== */
.theme-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-md);
}

.theme-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--bg-layer-2);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.theme-card:hover {
  border-color: var(--color-primary);
  background: var(--bg-hover);
}

.theme-card.active {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px var(--color-primary);
}

.theme-preview {
  height: 60px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  display: flex;
}

.theme-preview-dark {
  background: #1e293b;
}

.theme-preview-light {
  background: #f8fafc;
}

.theme-preview-system {
  flex-direction: column;
}

.preview-sidebar {
  width: 20px;
  background: rgba(0, 0, 0, 0.15);
}

.preview-main {
  flex: 1;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview-line {
  height: 4px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
}

.theme-preview-light .preview-line {
  background: rgba(0, 0, 0, 0.1);
}

.theme-preview-light .preview-sidebar {
  background: rgba(0, 0, 0, 0.05);
}

.preview-line.short {
  width: 60%;
}

.preview-half {
  flex: 1;
}

.dark-half {
  background: #1e293b;
}

.light-half {
  background: #f8fafc;
}

.theme-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

/* ===== Shortcuts ===== */
.shortcut-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
  user-select: none;
}

.shortcut-header:hover {
  background: var(--bg-hover);
}

.shortcut-summary {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-base);
  font-weight: 500;
  color: var(--text-secondary);
}

.expand-icon {
  color: var(--text-muted);
  transition: transform var(--transition-fast);
}

.shortcut-group {
  padding: var(--spacing-sm);
  background: var(--bg-layer-2);
  border-radius: var(--radius-md);
  margin-top: var(--spacing-sm);
  animation: fadeIn 0.2s ease;
}

.shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--border-color);
}

.shortcut-item:last-child {
  border-bottom: none;
}

.shortcut-key {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  padding: 2px 8px;
  background: var(--bg-layer-3);
  border-radius: 4px;
  font-size: var(--font-size-sm);
  color: var(--color-primary);
}

.shortcut-desc {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}



.ai-input-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}

.ai-input {
  flex: 1;
  min-width: 200px;
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--bg-layer-2);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  outline: none;
  transition: all var(--transition-fast);
}

.ai-input:focus {
  border-color: var(--color-primary);
}

.ai-input.small {
  width: 100px;
  flex: none;
}

.ai-input.standalone {
  flex-shrink: 0;
}

.ai-toggle-btn {
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

.ai-toggle-btn:hover {
  background: var(--bg-hover);
}

.ai-toggle-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  flex-shrink: 0;
}

.ai-slider {
  flex: 1;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--bg-layer-3);
  border-radius: var(--radius-full);
  outline: none;
}

.ai-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background: var(--color-primary);
  border-radius: 50%;
  cursor: pointer;
  transition: transform var(--transition-fast);
}

.ai-slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

.slider-value {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  min-width: 30px;
  text-align: right;
}

.model-dropdown {
  margin-top: var(--spacing-sm);
  max-height: 180px;
  overflow-y: auto;
  background: var(--bg-layer-2);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
}

.model-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.model-option:hover {
  background: var(--bg-hover);
}

.model-name {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
}

.model-owner {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.models-error {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: rgba(239, 68, 68, 0.1);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  color: var(--color-error);
}

.test-connection-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--bg-layer-2);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-top: var(--spacing-md);
}

/* ===== AI Gen Params ===== */
.ai-gen-params {
  margin-top: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--bg-layer-2);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.params-subtitle {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-primary);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--border-color);
  margin-top: var(--spacing-md);
}

.params-subtitle:first-of-type {
  margin-top: 0;
}

.tag-editor {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}

.tag-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: 4px;
  background: var(--bg-layer-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.tag-input {
  padding: 4px 8px;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: var(--font-size-xs);
  outline: none;
  min-width: 60px;
}

.tag-input.small {
  width: 50px;
  text-align: center;
}

.tag-unit {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.tag-delete {
  padding: 2px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.tag-delete:hover {
  background: rgba(239, 68, 68, 0.2);
  color: var(--color-error);
}

.tag-add {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 10px;
  background: transparent;
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-muted);
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tag-add:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.param-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
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
  font-family: inherit;
}

.param-textarea:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
}

.test-connection-btn:hover:not(:disabled) {
  background: var(--bg-hover);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.test-connection-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.test-result {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  animation: fadeIn 0.2s ease;
}

.test-result.success {
  background: rgba(34, 197, 94, 0.1);
  color: var(--color-success);
}

.test-result.error {
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-error);
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ===== About & Update ===== */
.about-card {
  background: var(--bg-layer-2);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  margin-bottom: var(--spacing-md);
}

.about-logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.about-logo .logo-icon {
  font-size: 36px;
  color: var(--color-primary);
}

.about-info {
  display: flex;
  flex-direction: column;
}

.about-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin: 0;
}

.about-version {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  margin-top: 2px;
}

.about-desc {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.6;
}

.update-section {
  background: var(--bg-layer-2);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
}

.update-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--border-color);
}

.update-status {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-md);
}

.update-status.success {
  background: rgba(34, 197, 94, 0.1);
  color: var(--color-success);
}

.update-status.error {
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-error);
}

.update-available {
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-sm);
  background: rgba(99, 102, 241, 0.1);
  margin-bottom: var(--spacing-md);
}

.update-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  font-weight: 500;
  margin-bottom: var(--spacing-sm);
}

.release-notes {
  margin-bottom: var(--spacing-md);
}

.notes-title {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  margin-bottom: var(--spacing-xs);
}

.release-notes ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.release-notes li {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  padding-left: var(--spacing-md);
  position: relative;
  margin-bottom: 4px;
}

.release-notes li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: var(--color-primary);
}

.update-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-md);
  color: white;
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-bottom: var(--spacing-sm);
}

.update-btn:hover:not(:disabled) {
  background: var(--color-primary-dark);
  box-shadow: 0 0 12px rgba(99, 102, 241, 0.35);
}

.update-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.install-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--color-success);
  border: none;
  border-radius: var(--radius-md);
  color: white;
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-bottom: var(--spacing-sm);
}

.install-btn:hover {
  background: #16a34a;
  box-shadow: 0 0 12px rgba(34, 197, 94, 0.35);
}

.cancel-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-md);
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.cancel-btn:hover {
  background: var(--bg-hover);
  border-color: var(--color-error);
  color: var(--color-error);
}

.update-downloading {
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-sm);
  background: rgba(99, 102, 241, 0.1);
  margin-bottom: var(--spacing-md);
}

.download-progress-bar {
  height: 6px;
  background: var(--bg-layer-3);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: var(--spacing-xs);
}

.progress-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 3px;
  transition: width var(--transition-fast);
}

.download-info {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  margin-bottom: var(--spacing-sm);
}

.check-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-md);
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.check-btn:hover {
  background: var(--bg-hover);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.update-source-config {
  background: var(--bg-layer-2);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  margin-top: var(--spacing-md);
}

.config-item {
  margin-bottom: var(--spacing-md);
}

.config-label {
  display: block;
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  margin-bottom: var(--spacing-xs);
}

.config-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-layer-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  outline: none;
  transition: all var(--transition-fast);
}

.config-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.config-input::placeholder {
  color: var(--text-muted);
}

.save-config-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-md);
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-md);
  color: white;
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-bottom: var(--spacing-sm);
}

.save-config-btn:hover {
  background: var(--color-primary-dark);
}

.config-hint {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  margin: 0;
  line-height: 1.5;
}
</style>