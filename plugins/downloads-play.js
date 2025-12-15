import fetch from "node-fetch"
import yts from "yt-search"
import fs from "fs"
import path from "path"
import os from "os"
import { execFile } from "child_process"

const YTDLP = "/data/data/com.termux/files/usr/bin/yt-dlp"

const handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    if (!text.trim()) {
      return conn.reply(
        m.chat,
        "❀ Por favor, ingresa el nombre o enlace del video.",
        m
      )
    }

    await m.react("🛷")

    const videoMatch = text.match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/
    )

    const query = videoMatch
      ? "https://youtu.be/" + videoMatch[1]
      : text

    const search = await yts(query)
    const result = videoMatch
      ? search.videos.find(v => v.videoId === videoMatch[1]) || search.all[0]
      : search.all[0]

    if (!result) throw "ꕥ No se encontraron resultados."

    const {
      title,
      thumbnail,
      timestamp,
      views,
      ago,
      url,
      author,
      seconds
    } = result

    if (seconds > 1800)
      throw "⚠ El video supera el límite de duración (30 minutos)."

    const vistas = formatViews(views)

    const info = `「✦」Descargando *<${title}>*

> ❑ Canal » *${author.name}*
> ♡ Vistas » *${vistas}*
> ✧︎ Duración » *${timestamp}*
> ☁︎ Publicado » *${ago}*
> ➪ Link » ${url}`

    const thumb = (await conn.getFile(thumbnail)).data

    await conn.sendMessage(
      m.chat,
      { image: thumb, caption: info },
      { quoted: m }
    )

    // ───── AUDIO ─────
    if (["play", "yta", "ytmp3", "playaudio"].includes(command)) {
      const audioPath = await getAudioYtdlp(url, title)

      await conn.sendMessage(
        m.chat,
        {
          audio: fs.readFileSync(audioPath),
          mimetype: "audio/mp4",
          fileName: `${title}.m4a`,
          ptt: false // presente pero ignorado
        },
        { quoted: m }
      )

      fs.unlinkSync(audioPath)
      await m.react("✔️")
    }

    // ───── VIDEO ─────
    else if (["play2", "ytv", "ytmp4", "mp4"].includes(command)) {
      const videoPath = await getVideoYtdlp(url, title)

      await conn.sendMessage(
        m.chat,
        {
          video: fs.readFileSync(videoPath),
          mimetype: "video/mp4",
          fileName: `${title}.mp4`,
          caption: `> 一緒🎁 ¡Felicidades! tu petición fue aceptada, aquí tienes ^^ ¡🎅Feliz navidad!🦌`
        },
        { quoted: m }
      )

      fs.unlinkSync(videoPath)
      await m.react("🎅")
    }

  } catch (e) {
    await m.react("😔")
    return conn.reply(
      m.chat,
      typeof e === "string"
        ? e
        : `⚠ Se produjo un error.\n> Usa *${usedPrefix}report* para informarlo.\n\n${e.message}`,
      m
    )
  }
}

handler.command = handler.help = [
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

// ───────── FUNCIONES ─────────

function getAudioYtdlp(url, title) {
  return new Promise((resolve, reject) => {
    const out = path.join(os.tmpdir(), `yta_${Date.now()}.m4a`)

    const args = [
      "-f",
      "ba[ext=m4a]/ba",
      "-o",
      out,
      "--no-playlist",
      url
    ]

    execFile(YTDLP, args, { timeout: 120000 }, err => {
      if (err || !fs.existsSync(out)) {
        return reject("⚠ No se pudo obtener el audio.")
      }
      resolve(out)
    })
  })
}

function getVideoYtdlp(url, title) {
  return new Promise((resolve, reject) => {
    const out = path.join(os.tmpdir(), `ytv_${Date.now()}.mp4`)

    const args = [
      "-f",
      "bv*[ext=mp4]+ba[ext=m4a]/mp4",
      "--merge-output-format",
      "mp4",
      "-o",
      out,
      "--no-playlist",
      url
    ]

    execFile(YTDLP, args, { timeout: 180000 }, err => {
      if (err || !fs.existsSync(out)) {
        return reject("⚠ No se pudo obtener el video.")
      }
      resolve(out)
    })
  })
}

function formatViews(views) {
  if (views === undefined) return "No disponible"
  if (views >= 1_000_000_000)
    return `${(views / 1_000_000_000).toFixed(1)}B (${views.toLocaleString()})`
  if (views >= 1_000_000)
    return `${(views / 1_000_000).toFixed(1)}M (${views.toLocaleString()})`
  if (views >= 1_000)
    return `${(views / 1_000).toFixed(1)}k (${views.toLocaleString()})`
  return views.toString()
}