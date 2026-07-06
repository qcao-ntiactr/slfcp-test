import express, { Router } from 'express';
import multer from 'multer';

import {
  getRequests,
  getRequestById,
  createRequest,
  putRequest,
  getCommentsByRequestId,
  createCommentForRequest,
  getApprovalsByRequestId,
  createApprovalForRequest,
  getDenialsByRequestId,
  createDenialForRequest,
  getConcurrencesByRequestId,
  createConcurrenceForRequest,
  getActionsByRequestId,
  createRevision,
  getRequestedRevisions,
  createRequestedRevision,
  verifyEntities,
  verifyEntity,
  createInquiry,
  getInquiries,
  getInquiryById,
  updateInquiry,
  createMessage,
  markInquiryMessagesAsRead,
  markMessageAsRead,
} from '../controllers/requests.js'; // or split `actions.ts` if separated

const REQUEST_ROUTES = {
  REQUEST: '/requests/:id',
  REQUESTS: '/requests',
  COMMENTS: '/requests/:id/comments',
  APPROVALS: '/requests/:id/approvals',
  DENIALS: '/requests/:id/denials',
  CONCURRENCES: '/requests/:id/concurrences',
  ACTIONS: '/requests/:id/actions',
  REVISIONS: '/requests/:id/revisions',
  REVISION: '/requests/:id/revisions/:revisionId',
  REQUESTED_REVISIONS: '/requests/:id/requested-revisions',
  INQUIRIES: '/requests/:id/inquiries',
  INQUIRY: '/requests/:id/inquiries/:inquiryId',
  MESSAGES: '/requests/:id/inquiries/:inquiryId/messages',
  MARK_INQUIRY_READ: '/requests/:id/inquiries/:inquiryId/mark-read',
  MARK_MESSAGE_READ: '/messages/:messageId/mark-read',
};

const requestRouters: express.Router = Router();

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

// Main request routes
requestRouters.post(
  REQUEST_ROUTES.REQUESTS,
  upload.fields([
    { name: 'ecf_cartesian_vectors_format_file' },
    { name: 'ground_track_of_launch_vehicle_2d_img_file' },
  ]),
  createRequest
);

requestRouters.get(REQUEST_ROUTES.REQUESTS, getRequests);
requestRouters.get(REQUEST_ROUTES.REQUEST, getRequestById);
requestRouters.put(REQUEST_ROUTES.REQUEST, putRequest);

// Nested subresources
requestRouters.get(REQUEST_ROUTES.COMMENTS, getCommentsByRequestId);
requestRouters.post(REQUEST_ROUTES.COMMENTS, createCommentForRequest);

requestRouters.get(REQUEST_ROUTES.APPROVALS, getApprovalsByRequestId);
requestRouters.post(REQUEST_ROUTES.APPROVALS, createApprovalForRequest);

requestRouters.get(REQUEST_ROUTES.DENIALS, getDenialsByRequestId);
requestRouters.post(REQUEST_ROUTES.DENIALS, createDenialForRequest);

requestRouters.get(REQUEST_ROUTES.CONCURRENCES, getConcurrencesByRequestId);
requestRouters.post(REQUEST_ROUTES.CONCURRENCES, createConcurrenceForRequest);

requestRouters.get(REQUEST_ROUTES.ACTIONS, getActionsByRequestId);

requestRouters.get(REQUEST_ROUTES.REQUESTED_REVISIONS, getRequestedRevisions);
requestRouters.post(
  REQUEST_ROUTES.REQUESTED_REVISIONS,
  createRequestedRevision
);
requestRouters.post(
  REQUEST_ROUTES.REVISIONS,
  upload.fields([
    { name: 'ecf_cartesian_vectors_format_file' },
    { name: 'ground_track_of_launch_vehicle_2d_img_file' },
  ]),
  createRevision
);

requestRouters.get(REQUEST_ROUTES.INQUIRIES, getInquiries);
requestRouters.post(REQUEST_ROUTES.INQUIRIES, verifyEntities, createInquiry);

requestRouters.get(REQUEST_ROUTES.INQUIRY, getInquiryById);
requestRouters.put(REQUEST_ROUTES.INQUIRY, verifyEntity, updateInquiry);

requestRouters.post(REQUEST_ROUTES.MESSAGES, verifyEntity, createMessage);

// Mark messages as read routes
requestRouters.post(
  REQUEST_ROUTES.MARK_INQUIRY_READ,
  markInquiryMessagesAsRead
);
requestRouters.put(REQUEST_ROUTES.MARK_MESSAGE_READ, markMessageAsRead);

export default requestRouters;
