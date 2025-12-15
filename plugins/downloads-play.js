import fetch from "node-fetch"
import yts from "yt-search"
import { execFile } from "child_process"

const YTDLP_PATH = "/data/data/com.termux/files/usr/bin/yt-dlp"

const handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    if (!text) {
      return conn.reply(m.chat, "❀ Ingresa el nombre o link del video.", m)
    }

    await m.react("🕒")

    const search = await yts(text)
    const video = search.videos[0]
    if (!video) throw "ꕥ No se encontraron resultados."

    const { title, url, timestamp, views, ago, author, seconds, thumbnail } = video
    if (seconds > 1800) throw "⚠ El video supera los 30 minutos."

    const info = `「✦」Descargando *<${title}>*

> ❑ Canal » *${author.name}*
> ♡ Vistas » *${views.toLocaleString()}*
> ✧︎ Duración » *${timestamp}*
> ☁︎ Publicado » *${ago}*
> ➪ Link » ${url}`

    const thumb = (await conn.getFile(thumbnail)).data
    await conn.sendMessage(m.chat, { image: thumb, caption: info }, { quoted: m })

    // AUDIO
    if (["play", "yta", "ytmp3", "playaudio"].includes(command)) {
      const audioUrl = await getAudioURL(url)
      if (!audioUrl) throw "⚠ No se pudo obtener el audio."

      await conn.sendMessage(
        m.chat,
        {
          audio: { url: audioUrl },
          mimetype: "audio/mpeg",
          fileName: `${title}.mp3`
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
        : `⚠ Se produjo un error.\nUsa *${usedPrefix}report* para reportarlo.`,
      m
    )
  }
}

handler.command = ["play", "yta", "ytmp3", "playaudio"]
handler.tags = ["descargas"]
handler.group = true

export default handler

// ===============================
// OBTENER AUDIO CON yt-dlp REAL
// ===============================
function getAudioURL(videoUrl) {
  return new Promise((resolve) => {
    execFile(
      YTDLP_PATH,
      [
        "-f",
        "ba",
        "-g",
        videoUrl
      ],
      (err, stdout) => {
        if (err || !stdout) return resolve(null)
        resolve(stdout.trim())
      }
    )
  })
}