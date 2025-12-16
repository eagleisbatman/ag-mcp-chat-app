/**
 * MCP Servers Routes Index
 * Combines all MCP server related routes
 */

import { Router } from 'express';
import listRouter from './list';
import activeRouter from './active';
import detailRouter from './detail';
import healthRouter from './health';

const router = Router();

// Mount routes - order matters for route matching
// Health routes (before :slug to avoid conflict)
router.use(healthRouter);

// Active servers route
router.use(activeRouter);

// List routes
router.use(listRouter);

// Detail routes (has :slug param, so must be last)
router.use(detailRouter);

export default router;
