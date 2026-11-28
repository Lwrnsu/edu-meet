/*
  Group 7 · Files & Blogs — calls to the PHP back end (php/api/*.php).

  Every call resolves to the PHP ApiResponse: { response, code, message, body }.
  It never throws, so screens can show the message.

  Where the PHP server is: VITE_PHP_API_URL (default "/php").
  In development vite.config.js forwards /php to the PHP container.

  Who is logged in: the same token the rest of EduMeet uses after login
  (sent as "Authorization: Bearer …"; the login cookies are sent too, which
  is what lets file links open in a new tab).
*/
import { getAccessBearerToken, getAuthBearerToken } from '../../../api/auth'

export const PHP_BASE = (import.meta.env.VITE_PHP_API_URL || '/php').replace(/\/+$/, '')

const OFFLINE = { response: false, code: 0, message: 'Could not reach the server.', body: {} }

function authHeaders() {
  const token = getAccessBearerToken() || getAuthBearerToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function buildUrl(path, query) {
  const url = `${PHP_BASE}/${path.replace(/^\/+/, '')}`
  if (!query) return url
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    params.set(key, String(value))
  })
  const qs = params.toString()
  return qs ? `${url}${url.includes('?') ? '&' : '?'}${qs}` : url
}

// Turns a URL the API sends back ("api/resources.php?id=3&action=view") into a full URL.
export function fileUrl(relative) {
  return relative ? `${PHP_BASE}/${relative.replace(/^\/+/, '')}` : ''
}

/*
  phpApi('api/resources.php', { query: { class_id: 100 } })
  phpApi('api/posts.php', { method: 'POST', body: formData })
  phpApi('api/resources.php', { method: 'POST', query: {...}, json: { name } })
*/
export async function phpApi(path, { method = 'GET', query, body, json } = {}) {
  const options = { method, credentials: 'include', headers: authHeaders() }
  if (json !== undefined) {
    options.headers['Content-Type'] = 'application/json'
    options.body = JSON.stringify(json)
  } else if (body !== undefined) {
    options.body = body
  }
  try {
    const res = await fetch(buildUrl(path, query), options)
    const data = await res.json().catch(() => null)
    return data && typeof data === 'object' && 'response' in data
      ? data
      : { ...OFFLINE, code: res.status, message: 'The server sent an unexpected reply.' }
  } catch {
    return OFFLINE
  }
}

// Upload with a progress bar (fetch can't report upload progress). onProgress(0–100).
export function uploadWithProgress(path, formData, onProgress, query) {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', buildUrl(path, query))
    xhr.withCredentials = true
    Object.entries(authHeaders()).forEach(([k, v]) => xhr.setRequestHeader(k, v))
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      try {
        resolve(JSON.parse(xhr.responseText))
      } catch {
        resolve({ response: false, code: xhr.status, message: 'Upload failed. Please try again.', body: {} })
      }
    }
    xhr.onerror = () => resolve(OFFLINE)
    xhr.send(formData)
  })
}

// ---------- endpoints ----------

export const resourcesApi = {
  list: (classId, search, type) => phpApi('api/resources.php', { query: { class_id: classId, search, type } }),
  show: (id) => phpApi('api/resources.php', { query: { id } }),
  upload: (classId, files, onProgress) => {
    const data = new FormData()
    data.append('class_id', classId)
    files.forEach((f) => data.append('files[]', f))
    return uploadWithProgress('api/resources.php', data, onProgress)
  },
  rename: (id, name) => phpApi('api/resources.php', { method: 'POST', query: { id, action: 'update' }, json: { name } }),
  remove: (id) => phpApi('api/resources.php', { method: 'DELETE', query: { id } }),
  sections: (classId) => phpApi('api/resources.php', { query: { action: 'blocks', class_id: classId } }),
}

export const postsApi = {
  feed: (classId, page, type, section) => phpApi('api/posts.php', { query: { class_id: classId, page, type, section } }),
  // fields: { title, type, message, blocks: [ids], files: [File], removeFiles: [ids] }
  save: (classId, postId, fields) => {
    const data = new FormData()
    data.append('title', fields.title)
    data.append('type', fields.type)
    data.append('message', fields.message)
    if (fields.blocks.length) fields.blocks.forEach((id) => data.append('blocks[]', id))
    else data.append('blocks', '') // none ticked = all sections
    fields.files.forEach((f) => data.append('files[]', f))
    if (postId) {
      ;(fields.removeFiles || []).forEach((id) => data.append('remove_files[]', id))
      return phpApi('api/posts.php', { method: 'POST', query: { id: postId, action: 'update' }, body: data })
    }
    data.append('class_id', classId)
    return phpApi('api/posts.php', { method: 'POST', body: data })
  },
  remove: (id) => phpApi('api/posts.php', { method: 'DELETE', query: { id } }),
}

export const announcementsApi = {
  feed: (page, status, mine) => phpApi('api/announcements.php', { query: { page, status, mine: mine ? 1 : '' } }),
  show: (id) => phpApi('api/announcements.php', { query: { id } }),
  targets: () => phpApi('api/announcements.php', { query: { action: 'targets' } }),
  // fields: { title, body, targets: [tokens], is_pinned, status, file, removeAttachment }
  save: (id, fields) => {
    const data = new FormData()
    data.append('title', fields.title)
    data.append('body', fields.body)
    fields.targets.forEach((t) => data.append('targets[]', t))
    data.append('is_pinned', fields.is_pinned ? '1' : '0')
    data.append('status', fields.status)
    if (fields.file) data.append('file', fields.file)
    if (id) {
      if (fields.removeAttachment) data.append('remove_attachment', '1')
      return phpApi('api/announcements.php', { method: 'POST', query: { id, action: 'update' }, body: data })
    }
    return phpApi('api/announcements.php', { method: 'POST', body: data })
  },
  remove: (id) => phpApi('api/announcements.php', { method: 'DELETE', query: { id } }),
}

export const notificationsApi = {
  list: () => phpApi('api/notifications.php'),
  read: (id) => phpApi('api/notifications.php', { method: 'POST', query: { id, action: 'read' } }),
  readAll: () => phpApi('api/notifications.php', { method: 'POST', query: { action: 'read_all' } }),
}

export const classesApi = {
  mine: () => phpApi('api/my_classes.php'),
  show: (id) => phpApi('api/my_classes.php', { query: { id } }),
}

export const tasksApi = {
  list: (classId, search) => phpApi('api/tasks.php', { query: { class_id: classId, search } }),
  show: (id) => phpApi('api/tasks.php', { query: { id } }),
  // fields: { title, instructions, max_score, deadline, is_closed?, file?, removeAttachment? }
  save: (classId, id, fields) => {
    const data = new FormData()
    ;['title', 'instructions', 'max_score', 'deadline'].forEach((k) => data.append(k, fields[k] ?? ''))
    if (fields.is_closed !== undefined) data.append('is_closed', fields.is_closed ? '1' : '0')
    if (fields.file) data.append('file', fields.file)
    if (id) {
      if (fields.removeAttachment) data.append('remove_attachment', '1')
      return phpApi('api/tasks.php', { method: 'POST', query: { id, action: 'update' }, body: data })
    }
    data.append('class_id', classId)
    return phpApi('api/tasks.php', { method: 'POST', body: data })
  },
  setClosed: (id, closed) => {
    const data = new FormData()
    data.append('is_closed', closed ? '1' : '0')
    return phpApi('api/tasks.php', { method: 'POST', query: { id, action: 'update' }, body: data })
  },
  remove: (id) => phpApi('api/tasks.php', { method: 'DELETE', query: { id } }),
  submit: (id, file, onProgress) => {
    const data = new FormData()
    data.append('file', file)
    return uploadWithProgress('api/tasks.php', data, onProgress, { id, action: 'submit' })
  },
  unsubmit: (id) => phpApi('api/tasks.php', { method: 'POST', query: { id, action: 'unsubmit' } }),
  grade: (submissionId, score, feedback) =>
    phpApi('api/tasks.php', { method: 'POST', query: { action: 'grade', submission_id: submissionId }, json: { score, feedback } }),
}
