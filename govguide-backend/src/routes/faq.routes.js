import { Router } from 'express'
import { searchFaq } from '../controllers/faq.controller.js'

const router = Router()

router.get('/faq', searchFaq)

export default router
