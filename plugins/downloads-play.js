import fetch from "node-fetch" // se conserva aunque ya no se use
import yts from 'yt-search'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

/* ===== CONFIGURACIÓN TERMUX ===== */
const YTDLP = '/data/data/com.termux/files/usr/bin/yt-dlp'
const TMP = path.join(process.cwd(), 'tmp')

/* ===== HANDLER PRINCIPAL ===== */
const handler = async (m, { conn, text, usedPrefix, command }) => {
try {
if (!text.trim()) return conn.reply(m.chat, `❀ Por favor, ingresa el nombre de la música a descargar.`, m)
await m.react('🕒')

const videoMatch = text.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/)
const query = videoMatch ? 'https://youtu.be/' + videoMatch[1] : text

const search = await yts(query)
const result = videoMatch
? search.videos.find(v => v.videoId === videoMatch[1]) || search.all[0]
: search.all[0]

if (!result) throw 'ꕥ No se encontraron resultados.'

const { title, thumbnail, timestamp, views, ago, url, author, seconds } = result
if (seconds > 1800) throw '⚠ El video supera el límite de duración (10 minutos).'

const vistas = formatViews(views)

const info = `「✦」Descargando *<${title}>*\n\n> ❑ Canal » *${author.name}*\n> ♡ Vistas » *${vistas}*\n> ✧︎ Duración » *${timestamp}*\n> ☁︎ Publicado » *${ago}*\n> ➪ Link » ${url}`

const thumb = (await conn.getFile(thumbnail)).data
await conn.sendMessage(m.chat, { image: thumb, caption: info }, { quoted: m })

if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true })

const safeTitle = title
.replace(/[\\/:*?"<>|]/g, '')
.slice(0, 60)

/* ===== AUDIO ===== */
if (['play', 'yta', 'ytmp3', 'playaudio'].includes(command)) {
const audioPath = await getAud(url, safeTitle)
m.reply(`> ❀ *Audio procesado con yt-dlp*`)
await conn.sendMessage(
m.chat,
{ audio: fs.readFileSync(audioPath), fileName: `${safeTitle}.mp3`, mimetype: 'audio/mpeg' },
{ quoted: m }
)
fs.unlinkSync(audioPath)
await m.react('✔️')

/* ===== VIDEO ===== */
} else if (['play2', 'ytv', 'ytmp4', 'mp4'].includes(command)) {
const videoPath = await getVid(url, safeTitle)
m.reply(`> ❀ *Vídeo procesado con yt-dlp*`)
await conn.sendFile(
m.chat,
fs.readFileSync(videoPath),
`${safeTitle}.mp4`,
`> ❀ ${title}`,
m
)
fs.unlinkSync(videoPath)
await m.react('✔️')
}

} catch (e) {
await m.react('✖️')
return conn.reply(
m.chat,
typeof e === 'string'
? e
: '⚠︎ Se ha producido un problema.\n> Usa *' + usedPrefix + 'report* para informarlo.\n\n' + e.message,
m
)
}}

/* ===== REGISTRO ===== */
handler.command = handler.help = ['play', 'yta', 'ytmp3', 'play2', 'ytv', 'ytmp4', 'playaudio', 'mp4']
handler.tags = ['descargas']
handler.group = true

export default handler

/* ===== FUNCIONES ===== */

/* 🎵 AUDIO */
function getAud(url, title) {
  return new Promise((resolve, reject) => {
    const base = path.join(TMP, title)
    const out = `${base}.mp3`

    const yt = spawn(YTDLP, [
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '--no-playlist',
      '-o', `${base}.%(ext)s`,
      url
    ])

    yt.on('error', err => reject(err))

    yt.on('close', code => {
      if (code !== 0) return reject('⚠ No se pudo obtener el audio.')
      if (!fs.existsSync(out)) return reject('⚠ Archivo de audio no generado.')
      resolve(out)
    })
  })
}

/* 🎬 VIDEO */
function getVid(url, title) {
return new Promise((resolve, reject) => {
const out = path.join(TMP, `${title}.mp4`)

const yt = spawn(YTDLP, [
'-f', 'mp4',
'-o', out,
url
])

yt.on('error', err => reject(err))

yt.on('close', code => {
if (code !== 0) return reject('⚠ No se pudo obtener el video.')
if (!fs.existsSync(out)) return reject('⚠ Archivo de video no generado.')
resolve(out)
})
})
}

/* 👁️ VISTAS */
function formatViews(views) {
if (views === undefined) return "No disponible"
if (views >= 1_000_000_000) return `${(views / 1_000_000_000).toFixed(1)}B (${views.toLocaleString()})`
if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M (${views.toLocaleString()})`
if (views >= 1_000) return `${(views / 1_000).toFixed(1)}k (${views.toLocaleString()})`
return views.toString()
}