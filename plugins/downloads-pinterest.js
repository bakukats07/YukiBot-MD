import fs from 'fs'
import path from 'path'
import axios from 'axios'
import { exec } from 'child_process'

const TMP_DIR = './tmp'
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR)

export default {
  command: ['pin'],
  tags: ['downloader'],
  help: ['pin <url de pinterest>'],

  async handler(m, { conn, text }) {
    if (!text)
      return conn.sendMessage(
        m.chat,
        { text: '❌ Usa el comando así:\n/pin <link de Pinterest>' },
        { quoted: m }
      )

    if (!/pinterest\./i.test(text))
      return conn.sendMessage(
        m.chat,
        { text: '❌ El enlace no parece ser de Pinterest.' },
        { quoted: m }
      )

    const rawPath = path.join(TMP_DIR, `pin_raw_${Date.now()}.mp4`)
    const fixedPath = path.join(TMP_DIR, `pin_fixed_${Date.now()}.mp4`)

    try {
      await conn.sendMessage(
        m.chat,
        { text: '⏳ Descargando video de Pinterest…' },
        { quoted: m }
      )

      // ===== DESCARGA =====
      const api = `https://pinterestvideodownloader.com/api/video?url=${encodeURIComponent(text)}`
      const { data } = await axios.get(api, { timeout: 20000 })

      if (!data?.video)
        throw 'No se pudo obtener el video desde Pinterest.'

      const videoStream = await axios.get(data.video, {
        responseType: 'stream',
        timeout: 20000
      })

      await new Promise((resolve, reject) => {
        const w = fs.createWriteStream(rawPath)
        videoStream.data.pipe(w)
        w.on('finish', resolve)
        w.on('error', reject)
      })

      // ===== FFmpeg (OBLIGATORIO) =====
      await new Promise((resolve, reject) => {
        exec(
          `ffmpeg -y -i "${rawPath}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${fixedPath}"`,
          err => (err ? reject(err) : resolve())
        )
      })

      if (!fs.existsSync(fixedPath) || fs.statSync(fixedPath).size < 10000)
        throw 'El video resultante sigue dañado.'

      // ===== ENVÍO =====
      await conn.sendMessage(
        m.chat,
        {
          video: fs.readFileSync(fixedPath),
          mimetype: 'video/mp4',
          caption: '✅ Video de Pinterest reparado y compatible.'
        },
        { quoted: m }
      )

    } catch (e) {
      console.error(e)
      await conn.sendMessage(
        m.chat,
        {
          text:
            '❌ El video no está disponible.\n' +
            '⚠️ Falló la descarga o el archivo estaba dañado.'
        },
        { quoted: m }
      )
    } finally {
      if (fs.existsSync(rawPath)) fs.unlinkSync(rawPath)
      if (fs.existsSync(fixedPath)) fs.unlinkSync(fixedPath)
    }
  }
}