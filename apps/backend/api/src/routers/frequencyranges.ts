import express, { Router } from 'express';

import { getFrequencyRanges } from '../controllers/frequencyranges.js';

/**
 * Object containing route paths for frequency range-related endpoints.
 * @constant
 * @type {Object}
 * @property {string} FRQRANGES - The endpoint for retrieving allowed frequency ranges.
 */
const FREQUENCY_RANGE_ROUTES = {
  ALLOWED_FREQUENCY_RANGES: '/allowed_frequency_ranges',
};

/**
 * Express router for handling frequency range-related routes.
 * @constant
 * @type {Router}
 */
const frequencyRangeRouters: express.Router = Router();

/**
 * Route to get the allowed frequency ranges.
 * @name GET /allowed_frequency_ranges
 * @function
 * @memberof frequencyRangeRouters
 */
frequencyRangeRouters.get(
  FREQUENCY_RANGE_ROUTES.ALLOWED_FREQUENCY_RANGES,
  getFrequencyRanges
);

export default frequencyRangeRouters;
