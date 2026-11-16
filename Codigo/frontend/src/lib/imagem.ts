"use client"

/** Maior lado da foto depois de otimizada (boa nitidez no catálogo e no anúncio). */
const LADO_MAXIMO_PX = 1600
const QUALIDADE = 0.9

function carregar(arquivo: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (erro) => {
      URL.revokeObjectURL(url)
      reject(erro)
    }
    img.src = url
  })
}

/**
 * Prepara a foto do anúncio sem cortar: mantém a imagem inteira, na proporção
 * original, e só reduz fotos muito grandes para o arquivo não pesar.
 * Retorna a imagem em base64 (data URL).
 */
export async function otimizarImagem(arquivo: File): Promise<string> {
  const img = await carregar(arquivo)
  const escala = Math.min(1, LADO_MAXIMO_PX / Math.max(img.naturalWidth, img.naturalHeight))
  const largura = Math.round(img.naturalWidth * escala)
  const altura = Math.round(img.naturalHeight * escala)

  const canvas = document.createElement("canvas")
  canvas.width = largura
  canvas.height = altura
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Não foi possível processar a imagem.")

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  // PNG com transparência mantém o fundo transparente; o resto vira WEBP de alta qualidade
  const formato = arquivo.type === "image/png" ? "image/png" : "image/webp"
  ctx.drawImage(img, 0, 0, largura, altura)
  return canvas.toDataURL(formato, QUALIDADE)
}
