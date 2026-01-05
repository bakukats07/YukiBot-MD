import fs from 'fs'
import axios from 'axios'
import { exec } from 'child_process'
import path from 'path'

let handler = async (m, { conn, text, usedPrefix }) => {
  if (!text)
    return m.reply(`❀ Uso correcto:\n${usedPrefix}pin <link de Pinterest>`)

  if (!/pinterest\.|pin\.it/i.test(text))
    return m.reply('❌ El enlace no es válido de Pinterest.')

  const raw = `./tmp/pin_raw_${Date.now()}.mp4`
  const fixed = `./tmp/pin_fixed_${Date.now()}.mp4`

  try {
    await m.react('🕒')

    const api = `https://pinterestvideodownloader.com/api/video?url=${encodeURIComponent(text)}`
    const { data } = await axios.get(api, { timeout: 20000 })

    if (!data?.video) throw 'Video no disponible'

    const stream = await axios.get(data.video, { responseType: 'stream' })
    await new Promise((res, rej) => {
      const w = fs.createWriteStream(raw)
      stream.data.pipe(w)
      w.on('finish', res)
      w.on('error', rej)
    })

    await new Promise((res, rej) => {
      exec(
        `ffmpeg -y -i "${raw}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${fixed}"`,
        e => e ? rej(e) : res()
      )
    })

    await conn.sendMessage(
      m.chat,
      {
        video: fs.readFileSync(fixed),
        mimetype: 'video/mp4',
        caption: '❀ Video de Pinterest reparado correctamente.'
      },
      { quoted: m }
    )

    await m.react('✔️')

  } catch (e) {
    console.error(e)
    await m.react('✖️')
    m.reply('⚠️ El video no está disponible o está dañado.')
  } finally {
    fs.existsSync(raw) && fs.unlinkSync(raw)
    fs.existsSync(fixed) && fs.unlinkSync(fixed)
  }
}

handler.command = /^pin$/i
handler.tags = ['download']
handler.help = ['pin <link>']
handler.group = true

export default handler