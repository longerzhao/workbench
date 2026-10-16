/** 压缩到正方形小图，避免 localStorage 被原图撑爆 */
const MAX_EDGE = 192;
const JPEG_QUALITY = 0.85;

export async function fileToAvatarDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('请选择图片文件');
  }
  // 约 2MB 上限；过大先拒，再靠画布压缩
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('图片请小于 2MB');
  }

  const bitmap = await createImageBitmap(file);
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;
    const edge = Math.min(MAX_EDGE, side);

    const canvas = document.createElement('canvas');
    canvas.width = edge;
    canvas.height = edge;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法处理图片');

    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, edge, edge);
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  } finally {
    bitmap.close();
  }
}
