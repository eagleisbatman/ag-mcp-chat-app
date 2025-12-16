/**
 * Location Lookup Route
 * Handles geolocation via Nominatim and IP-API
 */

import { Router, Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { asyncHandler } from '../../middleware/error-handler';
import { lookupLocation } from '../../services/geocoding';

const router = Router();

/**
 * POST /api/location-lookup
 * Lookup location from coordinates or IP address
 */
router.post(
  '/location-lookup',
  asyncHandler(async (req: Request, res: Response) => {
    const { latitude, longitude, ipAddress } = req.body;

    logger.info('[Location] Looking up', { latitude, longitude, ipAddress });

    const result = await lookupLocation(
      latitude ? parseFloat(latitude) : undefined,
      longitude ? parseFloat(longitude) : undefined,
      ipAddress
    );

    if (!result.success) {
      logger.info('[Location] Not found');
      res.json({
        success: false,
        source: 'none',
        error: 'Could not determine location',
      });
      return;
    }

    logger.info('[Location] Found', {
      source: result.source,
      displayName: result.displayName,
      country: result.level1Country,
    });

    res.json(result);
  })
);

export default router;
