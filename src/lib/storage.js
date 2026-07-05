import { supabase } from './supabase'

const BUCKET = 'client-files'
const EMPLOYEE_BUCKET = 'employee-files'

async function uploadTo(bucket, file, folder) {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
  const path = `${folder}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  })
  if (error) throw error
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export async function uploadClientFile(file, folder) {
  return uploadTo(BUCKET, file, folder)
}

export async function uploadEmployeeFile(file, folder) {
  return uploadTo(EMPLOYEE_BUCKET, file, folder)
}

export function fileNameFromUrl(url) {
  try { return decodeURIComponent(url.split('/').pop().split('?')[0]) } catch { return url }
}

export async function downloadFile(url, filename) {
  const res = await fetch(url)
  const blob = await res.blob()
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename || fileNameFromUrl(url)
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(blobUrl)
}
