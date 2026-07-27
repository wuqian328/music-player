const SOURCES = ['netease', 'tencent', 'kuwo', 'bilibili']

const SOURCE_MAP = {
  netease: '网易云音乐',
  tencent: 'QQ音乐',
  kuwo: '酷我音乐',
  bilibili: 'B站'
}

async function request(params) {
  const result = await window.electronAPI.apiRequest(params)
  return result
}

function normalizeSong(song) {
  return {
    id: song.id || '',
    name: song.name || song.title || '未知歌曲',
    artist: Array.isArray(song.artist) ? song.artist.join(' / ') : (song.artist || '未知歌手'),
    album: song.album || '',
    pic_id: song.pic_id || song.id || '',
    lyric_id: song.lyric_id || song.id || '',
    source: song.source || ''
  }
}

export async function searchMusic({ keyword, source = 'netease', count = 20, pages = 1 }) {
  const res = await request({
    types: 'search',
    source,
    name: keyword,
    count,
    pages
  })
  if (res.success) {
    let raw = []
    if (Array.isArray(res.data)) {
      raw = res.data
    } else if (res.data && res.data.data && Array.isArray(res.data.data)) {
      raw = res.data.data
    } else if (res.data && res.data.result && Array.isArray(res.data.result.songs)) {
      raw = res.data.result.songs
    }
    const songs = raw.map(normalizeSong)
    return { success: true, songs }
  }
  return { success: false, songs: [] }
}

export async function getMusicUrl({ id, source = 'netease', quality = {} }) {
  const res = await request({
    types: 'url',
    source,
    id,
    ...quality
  })
  if (res.success) {
    const data = res.data
    let url = ''
    if (typeof data === 'string') url = data
    else if (data.url) url = data.url
    else if (data.data && data.data.url) url = data.data.url
    return { success: true, url }
  }
  return { success: false, url: '' }
}

export async function getLyric({ id, source = 'netease' }) {
  const res = await request({
    types: 'lyric',
    source,
    id
  })
  if (res.success) {
    const data = res.data
    let lyric = ''
    if (typeof data === 'string') lyric = data
    else if (data.lyric) lyric = data.lyric
    else if (data.lrc && data.lrc.lyric) lyric = data.lrc.lyric
    else if (data.data && data.data.lyric) lyric = data.data.lyric
    return { success: true, lyric }
  }
  return { success: false, lyric: '' }
}

export async function getAlbumArt({ id, source = 'netease' }) {
  const res = await request({
    types: 'pic',
    source,
    id
  })
  if (res.success) {
    const data = res.data
    let url = ''
    if (typeof data === 'string') url = data
    else if (data.url) url = data.url
    else if (data.data && data.data.url) url = data.data.url
    return { success: true, url }
  }
  return { success: false, url: '' }
}

export { SOURCES, SOURCE_MAP }
