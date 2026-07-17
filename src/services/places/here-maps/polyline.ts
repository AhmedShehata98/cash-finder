type LatLng = { latitude: number; longitude: number }

const DECODING_TABLE: number[] = (() => {
  const table = new Array(256).fill(-1)
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
  for (let i = 0; i < chars.length; i++) {
    table[chars.charCodeAt(i)] = i
  }
  return table
})()

function decodeUnsignedVarint(
  encoded: string,
  index: number
): { value: number; index: number } {
  let result = 0
  let shift = 0
  let i = index

  while (i < encoded.length) {
    const code = encoded.charCodeAt(i)
    const chunk = DECODING_TABLE[code] ?? -1
    if (chunk < 0) {
      throw new Error(`Invalid character at index ${i}`)
    }

    const isLast = (chunk & 0x20) === 0
    const value = chunk & 0x1f

    result |= value << shift
    shift += 5
    i++

    if (isLast) {
      return { value: result, index: i }
    }
  }

  throw new Error("Unexpected end of encoded string")
}

function decodeSignedVarint(
  encoded: string,
  index: number
): { value: number; index: number } {
  const { value: unsigned, index: next } = decodeUnsignedVarint(encoded, index)

  const signed = unsigned & 1 ? -((unsigned + 1) >> 1) : unsigned >> 1

  return { value: signed, index: next }
}

function decodeHeader(
  encoded: string
): { precision: number; thirdDimFlag: number; thirdDimPrecision: number; index: number } {
  const { index: afterVersion } = decodeUnsignedVarint(encoded, 0)
  const { value: headerContent, index: afterHeader } = decodeUnsignedVarint(
    encoded,
    afterVersion
  )

  const precision = headerContent & 0xf
  const thirdDimFlag = (headerContent >> 4) & 0x7
  const thirdDimPrecision = (headerContent >> 7) & 0xf

  return { precision, thirdDimFlag, thirdDimPrecision, index: afterHeader }
}

export function decodeHerePolyline(encoded: string): LatLng[] {
  if (!encoded || encoded.length === 0) return []

  try {
    const { precision, thirdDimFlag, index } = decodeHeader(encoded)

    const multiplier = Math.pow(10, precision)
    const tupleSize = thirdDimFlag === 0 ? 2 : 3
    const coords: LatLng[] = []

    let lat = 0
    let lng = 0
    let pos = index

    while (pos < encoded.length) {
      const latRes = decodeSignedVarint(encoded, pos)
      lat += latRes.value
      pos = latRes.index

      const lngRes = decodeSignedVarint(encoded, pos)
      lng += lngRes.value
      pos = lngRes.index

      if (tupleSize === 3) {
        const thirdRes = decodeSignedVarint(encoded, pos)
        pos = thirdRes.index
      }

      coords.push({
        latitude: lat / multiplier,
        longitude: lng / multiplier,
      })
    }

    return coords
  } catch {
    return []
  }
}