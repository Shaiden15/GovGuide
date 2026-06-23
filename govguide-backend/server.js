import 'dotenv/config'
import { createApp } from './src/app.js'

const PORT = process.env.PORT || 8000

const app = createApp()

app.listen(PORT, () => {
  console.log(`GovGuide backend running on http://localhost:${PORT}`)
})