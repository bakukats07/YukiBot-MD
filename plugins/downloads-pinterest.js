import fs from 'fs'
import axios from 'axios'
import { exec } from 'child_process'

let handler = async (m, { conn, text, usedPrefix }) => {
  if (!text)
    return m.reply(`ꕥ Uso correcto:\n${usedPrefix}pin <link de Pinterest>`)

  let url = text.trim()

  // Resolver pin.it
  if (/pin\.it/i.test(url)) {
    try {
      const res = await axios.get(url, { maxRedirects: 0, validateStatus: s => s === 301 || s === 302 })
      url = res.headers.location
    } catch {}
  }

  if (!/pinterest\.com/i.test(url))
    return m.reply('❌ Enlace de Pinterest no válido.')

  const raw = `./tmp/pin_raw_${Date.now()}.mp4`
  const fixed = `./tmp/pin_fixed_${Date.now()}.mp4`

  try {
    await m.react('🕒')

    const api = `https://pinterestvideodownloader.com/api/video?url=${encodeURIComponent(url)}`
    const { data } = await axios.get(api, { timeout: 20000 })

    if (!data?.video) throw 'No hay video'

    const stream = await axios.get(data.video, { responseType: 'stream' })
    await new Promise((res, rej) => {
      const w = fs.createWriteStream(raw)
      stream.data.pipe(w)
      w.on('finish', res)
      w.on('error', rej)
    })

    // Reparación real
    await new Promise((res, rej) => {
      exec(
        `ffmpeg -y -i "${raw}" -map 0:v:0 -map 0:a? -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${fixed}"`,
        e => e ? rej(e) : res()
      )
    })

    await conn.sendMessage(
      m.chat,
      {
        video: fs.readFileSync(fixed),
        mimetype: 'video/mp4',
        caption: 'ꕥ Pinterest Video'
      },
      { quoted: m }
    )

    await m.react('✔️')

  } catch (e) {
    console.error(e)
    await m.react('✖️')
    m.reply('⚠️ El video no está disponible o Pinterest lo bloqueó.')
  } finally {
    fs.existsSync(raw) && fs.unlinkSync(raw)
    fs.existsSync(fixed) && fs.unlinkSync(fixed)
  }
}

handler.command = ['pin']
handler.tags = ['download']
handler.help = ['pin <link>']
handler.group = true

export default handler