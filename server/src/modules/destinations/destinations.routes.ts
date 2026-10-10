import { Router } from 'express';
import { sendData } from '../../lib/http.js';
import { parseInput } from '../../lib/validation.js';
import {
  destinationListQuerySchema,
  getDestinationBySlug,
  getDestinationFacets,
  listDestinations,
  slugSchema,
} from './destinations.service.js';

export function destinationsRouter(): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const query = parseInput(destinationListQuerySchema, req.query);
    const { items, meta } = await listDestinations(query);
    res.set('Cache-Control', 'public, max-age=60');
    sendData(res, items, 200, meta);
  });

  router.get('/facets', async (_req, res) => {
    res.set('Cache-Control', 'public, max-age=60');
    sendData(res, await getDestinationFacets());
  });

  router.get('/:slug', async (req, res) => {
    const slug = parseInput(slugSchema, req.params.slug);
    res.set('Cache-Control', 'public, max-age=60');
    sendData(res, await getDestinationBySlug(slug));
  });

  return router;
}
