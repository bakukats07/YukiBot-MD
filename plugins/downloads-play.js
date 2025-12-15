import fetch from "node-fetch"
import yts from "yt-search"
import { execFile } from "child_process"

const YTDLP_PATH = "/data/data/com.termux/files/usr/bin/yt-dlp"

// Cache simple en memoria (60s)
const audioCache = new Map()

const handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    if (!text?.trim()) {
      return conn.reply(
        m.chat,
        "❀ Por favor, ingresa el nombre o link del audio.",
        m
      )
    }

    await m.react("🕒")

    // Buscar video
    const search = await yts(text)
    const video = search.videos?.[0]
    if (!video) throw "ꕥ No se encontraron resultados."

    const {
      title,
      thumbnail,
      timestamp,
      views,
      ago,
      url,
      author,
      seconds
    } = video

    if (seconds > 1800)
      throw "⚠ El video supera el límite de duración (30 minutos)."

    const info = `「✦」Descargando *<${title}>*

> ❑ Canal » *${author.name}*
> ♡ Vistas » *${views.toLocaleString()}*
> ✧︎ Duración » *${timestamp}*
> ☁︎ Publicado » *${ago}*
> ➪ Link » ${url}`

    const thumb = (await conn.getFile(thumbnail)).data
    await conn.sendMessage(
      m.chat,
      { image: thumb, caption: info },
      { quoted: m }
    )

    // AUDIO
    if (["play", "yta", "ytmp3", "playaudio"].includes(command)) {
      const audioUrl = await getAudioURL(url)
      if (!audioUrl) throw "⚠ No se pudo obtener el audio."

      await conn.sendMessage(
        m.chat,
        {
          audio: { url: audioUrl },
          mimetype: "audio/mp4",
          fileName: `${title}.m4a`
        },
        { quoted: m }
      )

      await m.react("✔️")
    }

    // VIDEO (estructura conservada, aún no optimizada)
    else if (["play2", "ytv", "ytmp4", "mp4"].includes(command)) {
      throw "⚠ Descarga de video aún no optimizada."
    }

  } catch (e) {
    await m.react("✖️")
    return conn.reply(
      m.chat,
      typeof e === "string"
        ? e
        : `⚠ Se produjo un error.\nUsa *${usedPrefix}report* para informarlo.`,
      m
    )
  }
}

handler.command = [
  "play",
  "yta",
  "ytmp3",
  "playaudio",
  "play2",
  "ytv",
  "ytmp4",
  "mp4"
]

handler.tags = ["descargas"]
handler.group = true

export default handler

// ======================================
// Obtener URL directa de audio (rápido)
// ======================================
function getAudioURL(videoUrl) {
  const cached = audioCache.get(videoUrl)
  if (cached && Date.now() - cached.time < 60000) {
    return Promise.resolve(cached.url)
  }

  return new Promise(resolve => {
    execFile(
      YTDLP_PATH,
      [
        "-f",
        "bestaudio[ext=m4a]/bestaudio",
        "-g",
        "--no-playlist",
        "--no-check-certificate",
        "--no-warnings",
        "--quiet",
        videoUrl
      ],
      (err, stdout) => {
        if (err || !stdout) return resolve(null)
        const url = stdout.trim()
        audioCache.set(videoUrl, { url, time: Date.now() })
        resolve(url)
      }
    )
  })
}