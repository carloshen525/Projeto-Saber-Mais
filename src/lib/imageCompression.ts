import heic2any from 'heic2any';

/**
 * Automatic client-side image compression and conversion before uploading to Supabase Storage.
 * - Detects and converts HEIC / HEIF (iPhone photos) automatically to standard JPEG.
 * - Resizes images to max dimensions.
 * - Converts to ultra-compact WebP format with sharp quality.
 */
export interface CompressionResult {
  file: File;
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
}

export async function compressImageBeforeUpload(
  inputFile: File,
  options: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
): Promise<CompressionResult> {
  const { maxWidth = 1280, maxHeight = 1280, quality = 0.82 } = options;

  let fileToProcess = inputFile;

  // Detect HEIC / HEIF by file extension or mime type
  const isHeic =
    inputFile.name.toLowerCase().endsWith('.heic') ||
    inputFile.name.toLowerCase().endsWith('.heif') ||
    inputFile.type === 'image/heic' ||
    inputFile.type === 'image/heif';

  if (isHeic) {
    try {
      const conversionResult = await heic2any({
        blob: inputFile,
        toType: 'image/jpeg',
        quality: 0.9,
      });

      const convertedBlob = Array.isArray(conversionResult)
        ? conversionResult[0]
        : conversionResult;

      const cleanBaseName = inputFile.name.replace(/\.[^/.]+$/, '');
      fileToProcess = new File([convertedBlob], `${cleanBaseName}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });
    } catch (err) {
      console.warn('Erro ao converter HEIC com heic2any, tentando leitura direta:', err);
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler arquivo de imagem.'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagem inválido ou não suportado.'));
      img.onload = () => {
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível inicializar o compressor de imagem.'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = 'image/webp';
        const dataUrl = canvas.toDataURL(mimeType, quality);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Erro ao comprimir a imagem.'));
              return;
            }
            const cleanBaseName = inputFile.name.replace(/\.[^/.]+$/, '');
            const compressedFile = new File([blob], `${cleanBaseName}.webp`, {
              type: mimeType,
              lastModified: Date.now(),
            });

            resolve({
              file: compressedFile,
              dataUrl,
              originalSize: inputFile.size,
              compressedSize: compressedFile.size,
              width,
              height,
            });
          },
          mimeType,
          quality
        );
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(fileToProcess);
  });
}
