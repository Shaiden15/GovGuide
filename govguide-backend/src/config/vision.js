import vision from '@google-cloud/vision'

const credentialsJson = process.env.GOOGLE_VISION_CREDENTIALS_JSON

let clientOptions

if (credentialsJson) {
  // For platforms where shipping a key file isn't practical, allow the
  // full service-account JSON to be passed as a single env var.
  clientOptions = { credentials: JSON.parse(credentialsJson) }
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  // Falls back to the key file path; the client library reads this env var itself.
  clientOptions = undefined
} else {
  console.warn(
    '[vision] Missing Google Vision credentials. Set GOOGLE_APPLICATION_CREDENTIALS (file path) or GOOGLE_VISION_CREDENTIALS_JSON (inline JSON).'
  )
}

export const visionClient = new vision.ImageAnnotatorClient(clientOptions)