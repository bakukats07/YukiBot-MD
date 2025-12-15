import fs from "fs"
import path from "path"
import yts from "yt-search"
import { spawn } from "child_process"

const YTDLP_PATH = "/data/data/com.termux/files/usr/bin/yt-dlp"

const TMP_DIR = "./tmp"
const CACHE_DIR = "./cache"

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR)
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR)

const handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    if (!text?.trim())
      return conn.reply(m.chat, "❀ Ingresa el nombre o link del audio.", m)

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
      seconds,
      videoId
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

    if (["play", "yta", "ytmp3", "playaudio"].includes(command)) {
      const audioPath = await getAudioCached(url, videoId, title)

      await conn.sendMessage(
        m.chat,
        {
          audio: fs.readFileSync(audioPath),
          mimetype: "audio/mp4",
          ptt: false //nota de voz
        },
        { quoted: m }
      )

      await m.react("✔️")
    }

  } catch (e) {
    await m.react("✖️")
    return conn.reply(
      m.chat,
      typeof e === "string"
        ? e
        : `⚠ Error interno.\nUsa *${usedPrefix}report* para informarlo.`,
      m
    )
  }
}

handler.command = ["play", "yta", "ytmp3", "playaudio"]
handler.tags = ["descargas"]
handler.group = true

export default handler

// =================================================
// DESCARGA + CACHE (RÁPIDO Y ESTABLE)
// =================================================
function getAudioCached(videoUrl, videoId, title) {
  return new Promise((resolve, reject) => {
    const safeTitle = title.replace(/[\\/:*?"<>|]/g, "")
    const cached = path.join(CACHE_DIR, `${videoId}.m4a`)
    const temp = path.join(TMP_DIR, `${safeTitle}.m4a`)

    // Si ya existe en cache → instantáneo
    if (fs.existsSync(cached)) {
      return resolve(cached)
    }

    const yt = spawn(YTDLP_PATH, [
      "-f", "bestaudio[ext=m4a]/bestaudio",
      "--audio-quality", "2",
      "--no-playlist",
      "-o", temp,
      videoUrl
    ])

    yt.stderr.on("data", data => {
      console.error("yt-dlp:", data.toString())
    })

    yt.on("close", code => {
      if (code !== 0 || !fs.existsSync(temp))
        return reject("Error en yt-dlp")

      // Guardar en cache
      fs.copyFileSync(temp, cached)
      fs.unlinkSync(temp)

      resolve(cached)
    })
  })
}