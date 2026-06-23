import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import healthRoutes from './routes/health.routes.js'
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js'

export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    })
  )
  app.use(express.json())
  app.use(morgan('dev'))

  app.use('/api', healthRoutes)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}