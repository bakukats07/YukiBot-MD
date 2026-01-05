import axios from 'axios'

const APIFY_TOKEN = process.env.APIFY_TOKEN
const ACTOR_ID = 'easyapi~pinterest-video-downloader'

if (!APIFY_TOKEN) {
  console.error('[PIN] Falta APIFY_TOKEN en variables de entorno')
}

export default {
  command: ['pin'],
  tags: ['downloader'],
  help: ['pin <url>'],

  async handler(m, { conn, args, usedPrefix, command }) {
    try {
      if (!args[0]) {
        return m.reply(
          `✘ Uso incorrecto\n\nEjemplo:\n${usedPrefix + command} https://pin.it/xxxx`
        )
      }

      const url = args[0].trim()
      if (!/^https?:\/\/(www\.)?(pin\.it|pinterest\.)/i.test(url)) {
        return m.reply('✘ El enlace no es válido de Pinterest.')
      }

      await m.reply('⏳ Procesando el pin, espera un momento...')

      // 1️⃣ Ejecutar Actor
      const run = await axios.post(
        `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}`,
        { pinUrl: url }
      )

      const runId = run.data?.data?.id
      if (!runId) throw 'No se pudo iniciar el proceso'

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

      if (!datasetId) {
        throw 'Pinterest no devolvió datos'
      }

      // 3️⃣ Leer resultado
      const data = await axios.get(
        `https://api.apify.com/v2/datasets/${datasetId}/items?clean=true`
      )

      const item = data.data?.[0]
      if (!item) {
        throw 'Resultado vacío'
      }

      // 4️⃣ Determinar tipo
      if (item.type === 'image' && item.images?.length) {
        return await conn.sendMessage(
          m.chat,
          { image: { url: item.images[0] }, caption: '📌 Imagen de Pinterest' },
          { quoted: m }
        )
      }

      if (!item.videoUrl) {
        throw 'El pin no contiene video descargable'
      }

      // 5️⃣ Enviar video real
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
      console.error('[PIN ERROR]', e)
      m.reply(
        '⚠️ No fue posible obtener el video.\n' +
        'Pinterest puede haber limitado temporalmente el contenido.'
      )
    }
  }
}