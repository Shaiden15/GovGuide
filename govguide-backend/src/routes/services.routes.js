import { Router } from 'express'
import { listServices, getServiceDetail } from '../controllers/services.controller.js'

const router = Router()

router.get('/services', listServices)
router.get('/services/:slug', getServiceDetail)

export default router
