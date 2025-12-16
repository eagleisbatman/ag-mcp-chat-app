/**
 * AI Routes Index
 * Combines all AI-related routes
 */

import { Router } from 'express';
import chatRouter from './chat';
import voiceRouter from './voice';
import titleRouter from './title';
import locationRouter from './location';

const router = Router();

// Mount all AI routes
router.use(chatRouter);
router.use(voiceRouter);
router.use(titleRouter);
router.use(locationRouter);

export default router;
