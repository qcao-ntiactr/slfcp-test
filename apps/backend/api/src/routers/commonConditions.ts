import express, { Router } from 'express';

import {
  createCommonConditionDraft,
  deleteCommonCondition,
  getCommonConditionOptions,
  getPublishedCommonConditions,
  getSubmittedCommonConditions,
  publishCommonCondition,
  rejectCommonCondition,
  submitCommonConditionDraft,
  updateCommonCondition,
} from '../controllers/commonConditions.js';

const router: express.Router = Router();

router.get('/common-conditions/options', getCommonConditionOptions);

router.get('/common-conditions/published', getPublishedCommonConditions);

router.get('/common-conditions/submitted', getSubmittedCommonConditions);

router.post('/common-conditions/drafts', createCommonConditionDraft);

router.put('/common-conditions/drafts/:id', updateCommonCondition);

router.post('/common-conditions/:id/submit', submitCommonConditionDraft);

router.post('/common-conditions/:id/publish', publishCommonCondition);

router.post('/common-conditions/:id/reject', rejectCommonCondition);

router.delete('/common-conditions/:id', deleteCommonCondition);

export default router;
