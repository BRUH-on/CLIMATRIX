import { asyncHandler } from '../utils/asyncHandler';
import { retrieveForUser } from '../services/retrievalService';
import { parseRetrievalRequest } from '../services/retrievalInput';

export const retrieve = asyncHandler(async (req, res) => {
  const request = parseRetrievalRequest(req.body);
  const result = await retrieveForUser(req.user!, request);
  res.json(result);
});