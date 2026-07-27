const STORAGE_KEY = 'music-player-history'

export function getHistory() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function addHistory(item) {
  const list = getHistory()
  const idx = list.findIndex(h => h.id === item.id && h.source === item.source)
  if (idx !== -1) list.splice(idx, 1)
  list.unshift(item)
  if (list.length > 200) list.pop()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  return list
}

export function clearHistory() {
  localStorage.removeItem(STORAGE_KEY)
  return []
}
