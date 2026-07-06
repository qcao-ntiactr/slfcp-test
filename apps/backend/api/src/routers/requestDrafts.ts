import express, { Router } from 'express';
import multer from 'multer';

import {
  createRequestDraft,
  getRequestDrafts,
  getRequestDraftById,
  deleteRequestDraftById,
  updateRequestDraftById,
} from '../controllers/requestDrafts.js';

const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    const fileSchema = { type: file.mimetype };
    if (file.fieldname === 'ecf_cartesian_vectors_format_file')
      req.body.ecf_cartesian_vectors_format_file = fileSchema;
    if (file.fieldname === 'ground_track_of_launch_vehicle_2d_img_file')
      req.body.ground_track_of_launch_vehicle_2d_img_file = fileSchema;
    return cb(null, true);
  },
});

const router: express.Router = Router();

router.get('/request-drafts', getRequestDrafts);
router.post(
  '/request-drafts',
  upload.fields([
    { name: 'ecf_cartesian_vectors_format_file' },
    { name: 'ground_track_of_launch_vehicle_2d_img_file' },
  ]),
  createRequestDraft
);
router.get('/request-drafts/:id', getRequestDraftById);
router.put(
  '/request-drafts/:id',
  upload.fields([
    { name: 'ecf_cartesian_vectors_format_file' },
    { name: 'ground_track_of_launch_vehicle_2d_img_file' },
  ]),
  updateRequestDraftById
);
router.delete('/request-drafts/:id', deleteRequestDraftById);

export default router;
