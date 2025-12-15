import fetch from "node-fetch" // se conserva (no se elimina nada)
import yts from 'yt-search'
import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'

const TMP = './tmp'

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

const safeTitle = title
.replace(/[^\w\s]/gi, '')
.slice(0, 60)
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP)

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

} else if (['play2', 'ytv', 'ytmp4', 'mp4'].includes(command)) {
const videoPath = await getVid(url, safeTitle)
m.reply(`> ❀ *Vídeo procesado con yt-dlp*`)
await conn.sendFile(m.chat, fs.readFileSync(videoPath), `${safeTitle}.mp4`, `> ❀ ${title}`, m)
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

handler.command = handler.help = ['play', 'yta', 'ytmp3', 'play2', 'ytv', 'ytmp4', 'playaudio', 'mp4']
handler.tags = ['descargas']
handler.group = true

export default handler