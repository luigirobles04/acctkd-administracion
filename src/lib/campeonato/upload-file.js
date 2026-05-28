/** Lee un archivo de FormData en entorno Node/Edge (compatible Next.js) */
export async function readUploadFile(entry) {
  if (!entry || typeof entry === 'string') {
    throw new Error('Archivo no válido')
  }

  if (typeof entry.arrayBuffer === 'function') {
    const buffer = Buffer.from(await entry.arrayBuffer())
    return {
      buffer,
      contentType: entry.type || 'application/octet-stream',
      filename: entry.name || 'upload.bin',
    }
  }

  if (typeof entry.stream === 'function') {
    const reader = entry.stream().getReader()
    const chunks = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(Buffer.from(value))
    }
    return {
      buffer: Buffer.concat(chunks),
      contentType: entry.type || 'application/octet-stream',
      filename: entry.name || 'upload.bin',
    }
  }

  throw new Error('Formato de archivo no soportado')
}
