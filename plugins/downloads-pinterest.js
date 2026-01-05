import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import fetch from 'node-fetch'

const tmpDir = './tmp'
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir)

export default {
  name: 'pin',
  command: ['pin'],
  tags: ['downloader'],
  desc: 'Descargar videos de Pinterest',
  
  async run(m, { conn, args, usedPrefix, command }) {
    try {
      if (!args[0]) {
        return m.reply(`Uso correcto:\n${usedPrefix + command} <link de Pinterest>`)
      }

      const url = args[0]
      if (!/pinterest|pin\.it/.test(url)) {
        return m.reply('❌ El enlace no es válido de Pinterest.')
      }

      m.reply('⏳ Procesando video de Pinterest...')

      // Resolver redirección
      const res = await fetch(url, { redirect: 'follow' })
      const finalUrl = res.url

      // Buscar URL de video en el HTML
      const html = await res.text