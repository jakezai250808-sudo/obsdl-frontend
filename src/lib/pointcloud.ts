export interface PointFieldLike {
  name: string;
  offset: number;
  datatype: number;
  count: number;
}

export interface PointCloud2Like {
  width: number;
  height: number;
  point_step: number;
  is_bigendian?: boolean;
  fields: PointFieldLike[];
  data: number[] | Uint8Array | string;
}

export interface ParsedPointCloud {
  positions: Float32Array;
  colors: Float32Array;
  count: number;
}

const decodeBase64 = (encoded: string) => {
  const raw = atob(encoded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
};

const toUint8Array = (value: number[] | Uint8Array | string) => {
  if (value instanceof Uint8Array) return value;
  if (Array.isArray(value)) return Uint8Array.from(value);
  return decodeBase64(value);
};

const findField = (fields: PointFieldLike[], name: string) => fields.find((field) => field.name === name);

const readFieldValue = (view: DataView, offset: number, datatype: number, littleEndian: boolean) => {
  switch (datatype) {
    case 1:
      return view.getInt8(offset);
    case 2:
      return view.getUint8(offset);
    case 3:
      return view.getInt16(offset, littleEndian);
    case 4:
      return view.getUint16(offset, littleEndian);
    case 5:
      return view.getInt32(offset, littleEndian);
    case 6:
      return view.getUint32(offset, littleEndian);
    case 7:
      return view.getFloat32(offset, littleEndian);
    case 8:
      return view.getFloat64(offset, littleEndian);
    default:
      return 0;
  }
};

export const parsePointCloud2 = (message: PointCloud2Like, maxPoints = 200000): ParsedPointCloud => {
  const xField = findField(message.fields, 'x');
  const yField = findField(message.fields, 'y');
  const zField = findField(message.fields, 'z');
  const intensityField = findField(message.fields, 'intensity');

  if (!xField || !yField || !zField) {
    return { positions: new Float32Array(0), colors: new Float32Array(0), count: 0 };
  }

  const totalPoints = Number(message.width) * Number(message.height);
  if (!Number.isFinite(totalPoints) || totalPoints <= 0 || message.point_step <= 0) {
    return { positions: new Float32Array(0), colors: new Float32Array(0), count: 0 };
  }

  const sampleStride = Math.max(1, Math.ceil(totalPoints / Math.max(1, maxPoints)));
  const raw = toUint8Array(message.data);
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const littleEndian = !message.is_bigendian;

  const positions = new Float32Array(Math.ceil(totalPoints / sampleStride) * 3);
  const colors = new Float32Array(Math.ceil(totalPoints / sampleStride) * 3);
  let writeIndex = 0;

  for (let pointIndex = 0; pointIndex < totalPoints; pointIndex += sampleStride) {
    const baseOffset = pointIndex * message.point_step;
    if (baseOffset + message.point_step > view.byteLength) break;

    const x = view.getFloat32(baseOffset + xField.offset, littleEndian);
    const y = view.getFloat32(baseOffset + yField.offset, littleEndian);
    const z = view.getFloat32(baseOffset + zField.offset, littleEndian);

    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      continue;
    }

    positions[writeIndex * 3] = x;
    positions[writeIndex * 3 + 1] = y;
    positions[writeIndex * 3 + 2] = z;

    let gray = 0.7;
    if (intensityField) {
      const intensity = readFieldValue(view, baseOffset + intensityField.offset, intensityField.datatype, littleEndian);
      if (Number.isFinite(intensity)) {
        if (intensity <= 1) gray = Math.max(0, Math.min(1, intensity));
        else if (intensity <= 255) gray = intensity / 255;
        else gray = Math.min(1, intensity / 2048);
      }
    }

    colors[writeIndex * 3] = gray;
    colors[writeIndex * 3 + 1] = gray;
    colors[writeIndex * 3 + 2] = gray;

    writeIndex += 1;
  }

  return {
    positions: positions.subarray(0, writeIndex * 3),
    colors: colors.subarray(0, writeIndex * 3),
    count: writeIndex,
  };
};
