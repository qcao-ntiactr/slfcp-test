import express from 'express';

import { UsersController } from '../controllers/users.js';

const router: express.Router = express.Router();
const usersController = new UsersController();

// GET /users/:externalId - Get user by external ID
router.get('/users/:externalId', (req, res) => {
  usersController.getUserByExternalId(req, res);
});

// GET /users/email/:email - Get user by email
router.get('/users/email/:email', (req, res) => {
  usersController.getUserByEmail(req, res);
});

export default router;
