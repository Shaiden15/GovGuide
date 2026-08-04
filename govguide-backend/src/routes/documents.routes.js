import { Router } from 'express'
import multer from 'multer'
import { requireAuth } from '../middleware/requireAuth.js'
import { uploadDocument } from '../controllers/documents.controller.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB, matches the storage bucket limit
})

const router = Router()

router.post('/documents/upload', requireAuth, upload.single('file'), uploadDocument)

export default router
