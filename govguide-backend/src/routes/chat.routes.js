import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import { postMessage } from '../controllers/chat.controller.js'

const router = Router()

router.post('/chat/message', requireAuth, postMessage)

export default router
