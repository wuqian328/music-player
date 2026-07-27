<template>
  <div class="title-bar" @dblclick="toggleMaximize">
    <div class="title-bar-drag">
      <div class="app-logo">
        <span class="logo-icon">♪</span>
        <span class="app-title">音乐播放器</span>
      </div>
    </div>
    <div class="window-controls">
      <button class="control-btn" @click="minimize" title="最小化">
        <Minus :size="14" />
      </button>
      <button class="control-btn" @click="toggleMaximize" title="最大化">
        <Square :size="14" />
      </button>
      <button class="control-btn close" @click="closeWin" title="关闭">
        <X :size="14" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { Minus, Square, X } from 'lucide-vue-next'

function minimize() { window.electronAPI.windowMinimize() }
function toggleMaximize() { window.electronAPI.windowMaximize() }
function closeWin() { window.electronAPI.windowClose() }
</script>

<style scoped>
.title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border-bottom: 1px solid var(--border-color);
  -webkit-app-region: no-drag;
  flex-shrink: 0;
  padding-right: 8px;
}

.title-bar-drag {
  flex: 1;
  display: flex;
  align-items: center;
  padding-left: 16px;
  -webkit-app-region: drag;
  height: 100%;
}

.app-logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  font-size: 20px;
  color: var(--color-primary);
  font-style: italic;
  font-weight: 700;
}

.app-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.window-controls {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 100%;
}

.control-btn {
  width: 46px;
  height: 100%;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  border-radius: var(--radius-sm);
}

.control-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.control-btn.close:hover {
  background: #e81123;
  color: white;
}
</style>