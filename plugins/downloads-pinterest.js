import axios from 'axios'
import cheerio from 'cheerio'

let handler = async (m, { conn, text, usedPrefix }) => {

  if (!text) {
    return m.reply(
      `❀ Pinterest ❀\n\n` +
      `✦ Uso:\n` +
      `» ${usedPrefix}pin <texto>\n` +
      `» ${usedPrefix}pin <link de Pinterest>\n\n` +
      `✦ Ejemplo:\n` +
      `» ${usedPrefix}pin anime aesthetic`
    )
  }

  try {
    await m.react('🕒')

    // ───── LINK DE PINTEREST ─────
    if (/https?:\/\/(www\.)?(pinterest\.|pin\.it)/i.test(text)) {

      const media = await getPinMedia(text)

      if (!media || !media.url) {
        return m.reply('✖ El contenido no está disponible.')
      }

      // ─── VIDEO ───
      if (media.type === 'video') {
        try {
          const buffer = await downloadBuffer(media.url)

          // validación mínima real
          if (!buffer || buffer.length < 10000) {
            throw new Error('Video incompleto')
          }

          await conn.sendMessage(
            m.chat,
            {
              video: buffer,
              mimetype: 'video/mp4',
              caption: media.title || 'Pinterest Video'
            },
            { quoted: m }
          )

        } catch (err) {
          return m.reply(
            '⚠ El video no está disponible porque el archivo está dañado o incompleto.'
          )
        }
      }

      // ─── IMAGEN ───
      if (media.type === 'image') {
        const buffer = await downloadBuffer(media.url)

        await conn.sendMessage(
          m.chat,
          {
            image: buffer,
            caption: media.title || 'Pinterest Image'
          },
          { quoted: m }
        )
      }

      await m.react('✔️')
      return
    }

    // ───── BÚSQUEDA ─────
    const results = await searchPinterest(text)

    if (!results.length) {
      return m.reply(`ꕥ No se encontraron resultados para "${text}".`)
    }

    const medias = results.slice(0, 10).map(url => ({
      type: 'image',
      data: { url }
    }))

    await conn.sendSylphy(
      m.chat,
      medias,
      {
        caption:
          `❀ Pinterest ❀\n\n` +
          `✧ Búsqueda » "${text}"\n` +
          `✐ Resultados » ${medias.length}`,
        quoted: m
      }
    )

    await m.react('✔️')

  } catch (err) {
    console.error(err)
    await m.react('✖️')
    m.reply(
      `⚠ Ocurrió un error interno.\n` +
      `> Usa *${usedPrefix}report* para informarlo.`
    )
  }
}

handler.help = ['pin', 'pinterest']
handler.command = ['pin', 'pinterest']
handler.tags = ['download']
handler.group = true

export default handler

/*━━━━━━━━━━━━━━━━━━━━━━━
  FUNCIONES
━━━━━━━━━━━━━━━━━━━━━━━*/

async function downloadBuffer(url) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })
  return res.data
}

async function getPinMedia(url) {
  const res = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })

  const $ = cheerio.load(res.data)

  // ── VIDEO ──
  const videoScript = $('script[data-test-id="video-snippet"]')
  if (videoScript.length) {
    const json = JSON.parse(videoScript.text())
    return {
      type: 'video',
      url: json.contentUrl,
      title: json.name
    }
  }

  // ── IMAGEN ──
  const relay = $("script[data-relay-response='true']").first()
  if (relay.length) {
    const json = JSON.parse(relay.text())
    const data = json.response?.data?.v3GetPinQuery?.data

    return {
      type: 'image',
      url: data?.imageLargeUrl || data?.images?.orig?.url,
      title: data?.title
    }
  }

  return null
}

async function searchPinterest(query) {
  const link =
    `https://id.pinterest.com/resource/BaseSearchResource/get/?source_url=` +
    `%2Fsearch%2Fpins%2F%3Fq%3D${encodeURIComponent(query)}` +
    `&data=${encodeURIComponent(JSON.stringify({
      options: { query, scope: 'pins' }
    }))}`

  const res = await axios.get(link, {
    headers: {
      'accept': 'application/json',
      'user-agent': 'Mozilla/5.0',
      'x-requested-with': 'XMLHttpRequest'
    }
  })

  return (res.data?.resource_response?.data?.results || [])
    .map(v => v.images?.orig?.url)
    .filter(Boolean)
}