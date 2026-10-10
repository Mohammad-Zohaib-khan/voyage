import { Router } from 'express';
import mongoose, { Schema, model } from 'mongoose';
import { z } from 'zod';
import { HttpError, notFound, sendData } from '../../lib/http.js';
import { objectIdSchema, parseInput } from '../../lib/validation.js';
import { currentUserId, requireAuth } from '../../middleware/auth.js';
import { DestinationModel } from '../destinations/destination.model.js';
import { findPublishedByIds, toDestinationCard } from '../destinations/destinations.service.js';

const MAX_SAVED = 200;

const savedSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    destinationId: { type: Schema.Types.ObjectId, ref: 'Destination', required: true },
  },
  { timestamps: true },
);
savedSchema.index({ userId: 1, destinationId: 1 }, { unique: true });
savedSchema.index({ userId: 1, createdAt: -1 });

export const SavedDestinationModel = model('SavedDestination', savedSchema);

const paramsSchema = z.object({ destinationId: objectIdSchema });

export async function listSaved(userId: string) {
  const saved = await SavedDestinationModel.find({ userId }).sort({ createdAt: -1, _id: -1 }).limit(MAX_SAVED).lean();
  const destinations = await findPublishedByIds(saved.map((item) => item.destinationId.toString()));
  const byId = new Map(destinations.map((doc) => [doc._id.toString(), doc]));
  // Unpublished destinations simply drop out of the list.
  return saved.flatMap((item) => {
    const destination = byId.get(item.destinationId.toString());
    return destination ? [{ savedAt: item.createdAt.toISOString(), destination: toDestinationCard(destination) }] : [];
  });
}

export function savedRouter(): Router {
  const router = Router();
  router.use(requireAuth);
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'private, no-store');
    next();
  });

  router.get('/', async (req, res) => {
    sendData(res, await listSaved(currentUserId(req)));
  });

  router.post('/:destinationId', async (req, res) => {
    const { destinationId } = parseInput(paramsSchema, req.params);
    const userId = currentUserId(req);
    const destination = await DestinationModel.exists({ _id: destinationId, published: true });
    if (!destination) throw notFound('Destination');

    const existing = await SavedDestinationModel.findOne({ userId, destinationId });
    if (existing) {
      sendData(res, { destinationId, savedAt: existing.createdAt.toISOString() });
      return;
    }
    if ((await SavedDestinationModel.countDocuments({ userId })) >= MAX_SAVED) {
      throw new HttpError(409, 'LIMIT_REACHED', `You can save up to ${MAX_SAVED} places.`);
    }
    try {
      const created = await SavedDestinationModel.create({ userId, destinationId });
      sendData(res, { destinationId, savedAt: created.createdAt.toISOString() }, 201);
    } catch (error) {
      // A concurrent request saved the same place first; the outcome is identical.
      if ((error as { code?: unknown }).code === 11000) {
        sendData(res, { destinationId, savedAt: new Date().toISOString() });
        return;
      }
      throw error;
    }
  });

  router.delete('/:destinationId', async (req, res) => {
    const { destinationId } = parseInput(paramsSchema, req.params);
    await SavedDestinationModel.deleteOne({ userId: currentUserId(req), destinationId: new mongoose.Types.ObjectId(destinationId) });
    res.status(204).end();
  });

  return router;
}
