const DB_NAME = 'onboarding-sync'
const STORE_NAME = 'persist-queue'
const DB_VERSION = 1
const SYNC_TAG = 'onboarding-persist-sync'
const MESSAGE_SOURCE = 'onboarding-offline-queue'
const QUEUE_MESSAGE = 'onboarding.persist.queue'
const FLUSH_MESSAGE = 'onboarding.persist.flush'
const RESULT_SUCCESS = 'onboarding.persist.synced'
const RESULT_FAILURE = 'onboarding.persist.failed'
const RESULT_ERROR = 'onboarding.persist.sync-error'

let processingPromise = null

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim()
      await ensureDatabase()
      await processQueue()
    })(),
  )
})

self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(processQueue())
  }
})

self.addEventListener('message', (event) => {
  const data = event.data
  if (!data || typeof data !== 'object' || data.source !== MESSAGE_SOURCE) {
    return
  }

  if (data.type === QUEUE_MESSAGE) {
    event.waitUntil(handleQueueMessage(data.payload ?? {}))
    return
  }

  if (data.type === FLUSH_MESSAGE) {
    event.waitUntil(processQueue())
    return
  }
})

async function ensureDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withTransaction(mode, operation) {
  const db = await ensureDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode)
    const store = transaction.objectStore(STORE_NAME)
    operation(store, resolve, reject)
    transaction.oncomplete = () => resolve(undefined)
    transaction.onabort = () => reject(transaction.error || new Error('Transaction aborted'))
    transaction.onerror = () => reject(transaction.error || new Error('Transaction failed'))
  })
}

async function saveJob(job) {
  await withTransaction('readwrite', (store) => {
    store.put(job)
  }).catch((error) => {
    console.error('[onboarding-offline] failed to save job', error)
  })
}

async function deleteJob(id) {
  await withTransaction('readwrite', (store) => {
    store.delete(id)
  }).catch((error) => {
    console.error('[onboarding-offline] failed to delete job', error)
  })
}

async function incrementAttempt(job) {
  await withTransaction('readwrite', (store) => {
    store.put({ ...job, attemptCount: job.attemptCount + 1 })
  }).catch((error) => {
    console.error('[onboarding-offline] failed to bump attempt count', error)
  })
}

async function getNextJob() {
  const db = await ensureDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.openCursor()
    request.onsuccess = () => {
      const cursor = request.result
      resolve(cursor ? cursor.value : null)
    }
    request.onerror = () => reject(request.error)
  }).catch((error) => {
    console.error('[onboarding-offline] failed to read next job', error)
    return null
  })
}

async function handleQueueMessage(rawPayload) {
  const payload = normalizeJobPayload(rawPayload)
  if (!payload) {
    return
  }

  await saveJob(payload)
  await scheduleSync()
  await processQueue()
}

function normalizeJobPayload(rawPayload) {
  if (!rawPayload || typeof rawPayload !== 'object') {
    return null
  }

  const token = typeof rawPayload.token === 'string' ? rawPayload.token : null
  const endpoint = typeof rawPayload.endpoint === 'string' ? rawPayload.endpoint : null
  const body = rawPayload.body && typeof rawPayload.body === 'object' ? rawPayload.body : null
  const id = typeof rawPayload.id === 'string' && rawPayload.id ? rawPayload.id : createId()

  if (!token || !endpoint || !body) {
    return null
  }

  return {
    id,
    token,
    endpoint,
    body,
    createdAt: typeof rawPayload.createdAt === 'number' ? rawPayload.createdAt : Date.now(),
    attemptCount: typeof rawPayload.attemptCount === 'number' ? rawPayload.attemptCount : 0,
    schemaVersion: typeof rawPayload.schemaVersion === 'number' ? rawPayload.schemaVersion : null,
    originStepId: typeof rawPayload.originStepId === 'string' ? rawPayload.originStepId : null,
  }
}

function createId() {
  if (self.crypto && typeof self.crypto.randomUUID === 'function') {
    return self.crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

async function scheduleSync() {
  if (self.registration && 'sync' in self.registration) {
    try {
      await self.registration.sync.register(SYNC_TAG)
    } catch (error) {
      console.warn('[onboarding-offline] failed to register background sync', error)
    }
  }
}

async function processQueue() {
  if (processingPromise) {
    return processingPromise
  }

  processingPromise = (async () => {
    let job
    while ((job = await getNextJob())) {
      const result = await attemptJob(job)
      if (result === 'retry') {
        await scheduleSync()
        break
      }
      if (result === 'failed') {
        await deleteJob(job.id)
        await notifyClients(RESULT_FAILURE, { id: job.id, endpoint: job.endpoint })
        continue
      }
      await deleteJob(job.id)
      await notifyClients(RESULT_SUCCESS, { id: job.id, endpoint: job.endpoint })
    }
  })()

  try {
    await processingPromise
  } finally {
    processingPromise = null
  }
}

async function attemptJob(job) {
  try {
    const response = await fetch(job.endpoint, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${job.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(job.body),
    })

    if (response.status === 204 || (response.ok && response.headers.get('content-type')?.includes('application/json'))) {
      try {
        await response.clone().json()
      } catch (_) {
        // ignore JSON parse errors for empty bodies
      }
    }

    if (!response.ok) {
      if (isRetryableStatus(response.status)) {
        await incrementAttempt(job)
        return 'retry'
      }
      await notifyClients(RESULT_ERROR, {
        id: job.id,
        endpoint: job.endpoint,
        status: response.status,
        retryable: false,
      })
      return 'failed'
    }

    return 'success'
  } catch (error) {
    await incrementAttempt(job)
    await notifyClients(RESULT_ERROR, {
      id: job.id,
      endpoint: job.endpoint,
      status: 0,
      retryable: true,
      message: error instanceof Error ? error.message : String(error),
    })
    return 'retry'
  }
}

function isRetryableStatus(status) {
  if (status === 408) return true
  if (status >= 500 && status < 600) return true
  return false
}

async function notifyClients(type, payload) {
  const allClients = await self.clients.matchAll({ includeUncontrolled: true })
  for (const client of allClients) {
    client.postMessage({ source: MESSAGE_SOURCE, type, payload })
  }
}

