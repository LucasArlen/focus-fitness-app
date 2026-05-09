/**
 * Comprime uma imagem usando canvas.
 * @param {File} file       - Arquivo de imagem
 * @param {number} maxLado  - Maior dimensão máxima em px
 * @param {number} qualidade - 0..1, qualidade JPEG
 * @returns {Promise<string>} base64 JPEG
 */
export function comprimirImagem(file, maxLado = 800, qualidade = 0.65) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const ratio  = Math.min(maxLado / img.width, maxLado / img.height, 1);
      const w      = Math.round(img.width  * ratio);
      const h      = Math.round(img.height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width  = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", qualidade));
    };
    img.src = url;
  });
}
