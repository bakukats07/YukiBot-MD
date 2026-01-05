import axios from 'axios'

const APIFY_TOKEN = process.env.APIFY_TOKEN
const ACTOR_ID = 'easyapi~pinterest-video-downloader'

let handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    if (!text) {
      return m.reply(
        `✘ Uso correcto:\n\n${usedPrefix + command} https://pin.it/xxxxx`
      )
    }

    const url = text.trim()
    if (!/^https?:\/\/(pin\.it|.*pinterest\.com)/i.test(url)) {
      return m.reply('✘ El enlace no es válido de Pinterest.')
    }

    await m.reply('⏳ Procesando el pin, espera...')

    // 1️⃣ Ejecutar Actor
    const run = await axios.post(
      `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}`,
      { pinUrl: url }
    )

    const runId = run.data?.data?.id
    if (!runId) throw 'No se pudo iniciar Apify'

    // 2️⃣ Esperar Dataset
    let datasetId
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 2000))
      const status = await axios.get(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
      )
      datasetId = status.data?.data?.defaultDatasetId
      if (datasetId) break
    }

    if (!datasetId) throw 'Sin resultados de Pinterest'

    // 3️⃣ Leer Dataset
    const res = await axios.get(
      `https://api.apify.com/v2/datasets/${datasetId}/items?clean=true`
    )

    const item = res.data?.[0]
    if (!item) throw 'Resultado vacío'

    // 4️⃣ Imagen
    if (item.type === 'image' && item.images?.length) {
      return await conn.sendMessage(
        m.chat,
        { image: { url: item.images[0] }, caption: '📌 Imagen de Pinterest' },
        { quoted: m }
      )
    }

    // 5️⃣ Video
    if (!item.videoUrl) {
      throw 'El pin no contiene video'
    }

    await conn.sendMessage(
      m.chat,
      {
        video: { url: item.videoUrl },
        mimetype: 'video/mp4',
        caption: '📌 Video de Pinterest'
      },
      { quoted: m }
    )

  } catch (e) {
    console.error('[PIN]', e)
    m.reply(
      '⚠️ No se pudo obtener el contenido.\n' +
      'Pinterest puede haber limitado temporalmente el acceso.'
    )
  }
}

handler.help = ['pin <url>']
handler.tags = ['downloader']
handler.command = /^pin$/i

export default handler