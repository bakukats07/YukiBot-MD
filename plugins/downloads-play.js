import fs from "fs"
import path from "path"
import yts from "yt-search"
import { spawn } from "child_process"

const YTDLP_PATH = "/data/data/com.termux/files/usr/bin/yt-dlp"
const TMP_DIR = "./tmp"

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR)

const handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    if (!text?.trim())
      return conn.reply(m.chat, "❀ Ingresa el nombre o link del audio.", m)

    await m.react("🕒")

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
    await conn.sendMessage(m.chat, { image: thumb, caption: info }, { quoted: m })

    if (["play", "yta", "ytmp3", "playaudio"].includes(command)) {
      const audioPath = await downloadAudio(url, title)

      await conn.sendMessage(
        m.chat,
        {
          audio: fs.readFileSync(audioPath),
          mimetype: "audio/mp4",
          fileName: `${title}.m4a`
        },
        { quoted: m }
      )

      fs.unlinkSync(audioPath)
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

// ===============================
// DESCARGA SIN CONVERSIÓN (RÁPIDA)
// ===============================
function downloadAudio(videoUrl, title) {
  return new Promise((resolve, reject) => {
    const safe = title.replace(/[\\/:*?"<>|]/g, "")
    const output = path.join(TMP_DIR, `${safe}.m4a`)

    const yt = spawn(YTDLP_PATH, [
      "-f", "bestaudio[ext=m4a]/bestaudio",
      "--no-playlist",
      "-o", output,
      videoUrl
    ])

    yt.stderr.on("data", data => {
      console.error("yt-dlp:", data.toString())
    })

    yt.on("close", code => {
      if (code !== 0 || !fs.existsSync(output))
        return reject("Error en yt-dlp")
      resolve(output)
    })
  })
}