interface CompressedImageLike {
  data: string | number[] | Uint8Array;
  format?: string;
}

interface RawImageLike {
  width: number;
  height: number;
  encoding: string;
  data: string | number[] | Uint8Array;
}

const decodeBase64 = (encoded: string) => {
  const raw = atob(encoded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
};

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const toUint8Array = (value: string | number[] | Uint8Array) => {
  if (value instanceof Uint8Array) return value;
  if (Array.isArray(value)) return Uint8Array.from(value);
  return decodeBase64(value);
};

const mimeFromFormat = (format?: string) => {
  const lower = (format || '').toLowerCase();
  if (lower.includes('png')) return 'image/png';
  if (lower.includes('jpg') || lower.includes('jpeg')) return 'image/jpeg';
  return 'image/jpeg';
};

export const decodeCompressedImage = (message: CompressedImageLike) => {
  const mime = mimeFromFormat(message.format);

  if (typeof message.data === 'string') {
    const trimmed = message.data.trim();
    if (trimmed.startsWith('data:image/')) {
      return trimmed;
    }
    return `data:${mime};base64,${trimmed}`;
  }

  const bytes = toUint8Array(message.data);
  return `data:${mime};base64,${bytesToBase64(bytes)}`;
};

export const decodeRawImage = (message: RawImageLike) => {
  const width = Number(message.width);
  const height = Number(message.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('invalid image size');
  }

  const encoding = String(message.encoding || '').toLowerCase();
  const raw = toUint8Array(message.data);
  const pixelCount = width * height;
  const rgba = new Uint8ClampedArray(pixelCount * 4);

  if (encoding === 'rgb8') {
    if (raw.length < pixelCount * 3) throw new Error('rgb8 payload length mismatch');
    for (let i = 0; i < pixelCount; i += 1) {
      rgba[i * 4] = raw[i * 3];
      rgba[i * 4 + 1] = raw[i * 3 + 1];
      rgba[i * 4 + 2] = raw[i * 3 + 2];
      rgba[i * 4 + 3] = 255;
    }
  } else if (encoding === 'bgr8') {
    if (raw.length < pixelCount * 3) throw new Error('bgr8 payload length mismatch');
    for (let i = 0; i < pixelCount; i += 1) {
      rgba[i * 4] = raw[i * 3 + 2];
      rgba[i * 4 + 1] = raw[i * 3 + 1];
      rgba[i * 4 + 2] = raw[i * 3];
      rgba[i * 4 + 3] = 255;
    }
  } else if (encoding === 'mono8') {
    if (raw.length < pixelCount) throw new Error('mono8 payload length mismatch');
    for (let i = 0; i < pixelCount; i += 1) {
      const gray = raw[i];
      rgba[i * 4] = gray;
      rgba[i * 4 + 1] = gray;
      rgba[i * 4 + 2] = gray;
      rgba[i * 4 + 3] = 255;
    }
  } else {
    throw new Error(`unsupported encoding: ${encoding}`);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas 2d context unavailable');

  const imageData = new ImageData(rgba, width, height);
  context.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
};
