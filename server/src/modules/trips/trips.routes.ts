import { Router } from 'express';
import { safeFilename } from '../../lib/csv.js';
import { sendData } from '../../lib/http.js';
import { parseInput } from '../../lib/validation.js';
import { currentUserId, requireAuth } from '../../middleware/auth.js';
import type { RateLimiters } from '../../middleware/rateLimits.js';
import { buildTripCsv } from './export.js';
import {
  activityParamsSchema,
  createActivitySchema,
  createTripSchema,
  dayParamsSchema,
  reorderSchema,
  tripListQuerySchema,
  tripParamsSchema,
  updateActivitySchema,
  updateTripSchema,
} from './trips.schemas.js';
import {
  addActivity,
  createTrip,
  deleteActivity,
  deleteTrip,
  getOwnedTripForExport,
  getTrip,
  listTrips,
  reorderItinerary,
  updateActivity,
  updateTrip,
} from './trips.service.js';

export function tripsRouter(limiters: RateLimiters): Router {
  const router = Router();
  router.use(requireAuth);
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'private, no-store');
    next();
  });

  router.get('/', async (req, res) => {
    const { page, limit } = parseInput(tripListQuerySchema, req.query);
    const { items, meta } = await listTrips(currentUserId(req), page, limit);
    sendData(res, items, 200, meta);
  });

  router.post('/', async (req, res) => {
    const input = parseInput(createTripSchema, req.body);
    sendData(res, await createTrip(currentUserId(req), input), 201);
  });

  router.get('/:tripId', async (req, res) => {
    const { tripId } = parseInput(tripParamsSchema, req.params);
    sendData(res, await getTrip(currentUserId(req), tripId));
  });

  router.patch('/:tripId', async (req, res) => {
    const { tripId } = parseInput(tripParamsSchema, req.params);
    const input = parseInput(updateTripSchema, req.body);
    sendData(res, await updateTrip(currentUserId(req), tripId, input));
  });

  router.delete('/:tripId', async (req, res) => {
    const { tripId } = parseInput(tripParamsSchema, req.params);
    await deleteTrip(currentUserId(req), tripId);
    res.status(204).end();
  });

  router.get('/:tripId/export.csv', limiters.export, async (req, res) => {
    const { tripId } = parseInput(tripParamsSchema, req.params);
    const trip = await getOwnedTripForExport(currentUserId(req), tripId);
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="${safeFilename(trip.title, 'csv')}"`);
    res.set('X-Content-Type-Options', 'nosniff');
    res.send(buildTripCsv(trip));
  });

  router.post('/:tripId/days/:dayId/activities', async (req, res) => {
    const { tripId, dayId } = parseInput(dayParamsSchema, req.params);
    const input = parseInput(createActivitySchema, req.body);
    sendData(res, await addActivity(currentUserId(req), tripId, dayId, input), 201);
  });

  router.patch('/:tripId/days/:dayId/activities/:activityId', async (req, res) => {
    const { tripId, dayId, activityId } = parseInput(activityParamsSchema, req.params);
    const input = parseInput(updateActivitySchema, req.body);
    sendData(res, await updateActivity(currentUserId(req), tripId, dayId, activityId, input));
  });

  router.delete('/:tripId/days/:dayId/activities/:activityId', async (req, res) => {
    const { tripId, dayId, activityId } = parseInput(activityParamsSchema, req.params);
    sendData(res, await deleteActivity(currentUserId(req), tripId, dayId, activityId));
  });

  router.patch('/:tripId/itinerary/reorder', async (req, res) => {
    const { tripId } = parseInput(tripParamsSchema, req.params);
    const input = parseInput(reorderSchema, req.body);
    sendData(res, await reorderItinerary(currentUserId(req), tripId, input));
  });

  return router;
}
