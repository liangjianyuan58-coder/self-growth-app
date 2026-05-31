// src/lib/google/calendar.ts
// googleapis パッケージ不要。Google Calendar REST API を直接呼び出す。

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const CAL_BASE  = 'https://www.googleapis.com/calendar/v3'

export function isGoogleConnected() {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN
  )
}

async function getAccessToken(): Promise<string | null> {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) return null

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json() as { access_token?: string; error?: string }
  if (data.error) { console.error('[gcal] token error:', data.error); return null }
  return data.access_token ?? null
}

function calId() { return encodeURIComponent(process.env.GOOGLE_CALENDAR_ID ?? 'primary') }

function buildBody(ev: {
  title: string; event_date: string
  start_time: string | null; end_time: string | null; note: string | null
}) {
  const tz = 'Asia/Tokyo'
  const start = ev.start_time
    ? { dateTime: `${ev.event_date}T${ev.start_time.slice(0, 5)}:00`, timeZone: tz }
    : { date: ev.event_date }
  // 終了時刻がない場合は開始と同じ（終日 or 1分後）
  const end = ev.end_time
    ? { dateTime: `${ev.event_date}T${ev.end_time.slice(0, 5)}:00`, timeZone: tz }
    : ev.start_time
      ? { dateTime: `${ev.event_date}T${ev.start_time.slice(0, 5)}:00`, timeZone: tz }
      : { date: ev.event_date }
  return {
    summary: ev.title,
    description: ev.note ?? undefined,
    start,
    end,
  }
}

// イベント新規作成 → Google イベントID を返す
export async function gcalCreate(ev: {
  title: string; event_date: string
  start_time: string | null; end_time: string | null; note: string | null
}): Promise<string | null> {
  const token = await getAccessToken()
  if (!token) return null

  try {
    const res = await fetch(`${CAL_BASE}/calendars/${calId()}/events`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(buildBody(ev)),
    })
    const data = await res.json() as { id?: string }
    return data.id ?? null
  } catch (e) {
    console.error('[gcal] create error:', e)
    return null
  }
}

// イベント更新
export async function gcalUpdate(googleId: string, ev: {
  title: string; event_date: string
  start_time: string | null; end_time: string | null; note: string | null
}): Promise<void> {
  const token = await getAccessToken()
  if (!token) return

  try {
    await fetch(`${CAL_BASE}/calendars/${calId()}/events/${googleId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(buildBody(ev)),
    })
  } catch (e) {
    console.error('[gcal] update error:', e)
  }
}

// イベント削除
export async function gcalDelete(googleId: string): Promise<void> {
  const token = await getAccessToken()
  if (!token) return

  try {
    await fetch(`${CAL_BASE}/calendars/${calId()}/events/${googleId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch (e) {
    console.error('[gcal] delete error:', e)
  }
}

// 月内のイベント一覧取得
export interface GCalEvent {
  id: string
  summary?: string
  description?: string
  start?: { dateTime?: string; date?: string }
  end?:   { dateTime?: string; date?: string }
}

export async function gcalList(year: number, month: number): Promise<GCalEvent[]> {
  const token = await getAccessToken()
  if (!token) return []

  try {
    const timeMin = new Date(year, month, 1).toISOString()
    const timeMax = new Date(year, month + 1, 0, 23, 59, 59).toISOString()

    const url = new URL(`${CAL_BASE}/calendars/${calId()}/events`)
    url.searchParams.set('timeMin', timeMin)
    url.searchParams.set('timeMax', timeMax)
    url.searchParams.set('singleEvents', 'true')
    url.searchParams.set('orderBy', 'startTime')
    url.searchParams.set('maxResults', '250')

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json() as { items?: GCalEvent[] }
    return data.items ?? []
  } catch (e) {
    console.error('[gcal] list error:', e)
    return []
  }
}

// Google Calendar イベント → DB 用フィールドに変換
export function parseGCalEvent(gev: GCalEvent): {
  event_date: string; start_time: string | null; end_time: string | null
} {
  const rawStart = gev.start?.dateTime ?? gev.start?.date ?? ''
  const rawEnd   = gev.end?.dateTime   ?? gev.end?.date   ?? ''

  if (gev.start?.dateTime) {
    // 日時イベント → "HH:MM" を抽出
    const startTime = new Date(rawStart).toLocaleTimeString('ja-JP', {
      timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hour12: false,
    })
    const endTime = gev.end?.dateTime ? new Date(rawEnd).toLocaleTimeString('ja-JP', {
      timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hour12: false,
    }) : null
    const eventDate = new Date(rawStart).toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' })
    return { event_date: eventDate, start_time: startTime, end_time: endTime }
  }

  // 終日イベント
  return { event_date: rawStart, start_time: null, end_time: null }
}
