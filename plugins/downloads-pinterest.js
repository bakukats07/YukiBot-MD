import fs from 'fs'
import axios from 'axios'
import { exec } from 'child_process'

/**
 * Resuelve correctamente enlaces pin.it → pinterest.com
 * Soporta redirecciones múltiples y HTML intermedio
 */
async function resolvePinterest(url) {
  try {
    const res = await axios.get(url, {
      maxRedirects: 5,
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    })
    return res?.request?.res?.responseUrl || url
  } catch {
    return url
  }
}

let handler = async (m, { conn, text, usedPrefix }) => {
  if (!text)
    return m.reply(`ꕥ Uso correcto:\n${usedPrefix}pin <link de Pinterest>`)

  let url = text.trim()

  // Resolver pin.it correctamente
  if (/pin\.it/i.test(url)) {
    url = await resolvePinterest(url)
  }

  // Validación final del pin real
  if (!/pinterest\.com\/pin\//i.test(url)) {
    return m.reply('❌ No se pudo resolver el enlace de Pinterest.')
  }

  const raw = `./tmp/pin_raw_${Date.now()}.mp4`
  const fixed = `./tmp/pin_fixed_${Date.now()}.mp4`

  try {
    await m.react('🕒')

    // API estable (aún así Pinterest puede bloquear algunos pins)
    const api = `https://pinterestvideodownloader.com/api/video?url=${encodeURIComponent(url)}`
    const { data } = await axios.get(api, { timeout: 20000 })

    if (!data || !data.video)
      throw 'Video no disponible'

    // Descarga binaria real
    const stream = await axios.get(data.video, {
      responseType: 'stream',
      timeout: 20000
    })

    await new Promise((resolve, reject) => {
      const w = fs.createWriteStream(raw)
      stream.data.pipe(w)
      w.on('finish', resolve)
      w.on('error', reject)
    })

    // Reparación obligatoria para WhatsApp
    await new Promise((resolve, reject) => {
      exec(
        `ffmpeg -y -i "${raw}" -map 0:v:0 -map 0:a? -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${fixed}"`,
        err => err ? reject(err) : resolve()
      )
    })

    if (!fs.existsSync(fixed) || fs.statSync(fixed).size < 10000)
      throw 'Archivo dañado tras FFmpeg'

    await conn.sendMessage(
      m.chat,
      {
        video: fs.readFileSync(fixed),
        mimetype: 'video/mp4',
        caption: 'ꕥ Video de Pinterest'
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
handler.help = ['pin <link de Pinterest>']
handler.group = true

export default handler