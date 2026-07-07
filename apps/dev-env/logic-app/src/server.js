import { createServer } from 'node:http';

const port = Number(process.env.PORT || 7071);
const logLevel = process.env.LOG_LEVEL || 'info';

const statuses = new Set([
  'SUBMITTED',
  'UNDER_NTIA_INITIAL_REVIEW',
  'UNDER_INITIAL_REVISION_PER_NTIA',
  'UNDER_FEDERAL_AGENCIES_REVIEW',
  'UNDER_NTIA_FINAL_REVIEW',
  'UNDER_FINAL_REVISION_PER_NTIA',
  'DENIED',
  'APPROVED',
  'APPROVED_WITH_CONDITIONS',
]);

const terminalStatuses = new Set([
  'APPROVED',
  'APPROVED_WITH_CONDITIONS',
  'DENIED',
]);

const transitions = {
  'SUBMITTED:': 'UNDER_NTIA_INITIAL_REVIEW',
  'SUBMITTED:submit': 'UNDER_NTIA_INITIAL_REVIEW',

  'UNDER_NTIA_INITIAL_REVIEW:approve': 'UNDER_FEDERAL_AGENCIES_REVIEW',
  'UNDER_NTIA_INITIAL_REVIEW:request_revisions':
    'UNDER_INITIAL_REVISION_PER_NTIA',

  'UNDER_INITIAL_REVISION_PER_NTIA:resubmit': 'UNDER_NTIA_INITIAL_REVIEW',

  'UNDER_FEDERAL_AGENCIES_REVIEW:concur': 'UNDER_NTIA_FINAL_REVIEW',
  'UNDER_FEDERAL_AGENCIES_REVIEW:concur_with_conditions':
    'UNDER_NTIA_FINAL_REVIEW',
  'UNDER_FEDERAL_AGENCIES_REVIEW:not_concur': 'UNDER_NTIA_FINAL_REVIEW',
  'UNDER_FEDERAL_AGENCIES_REVIEW:auto_approve': 'UNDER_NTIA_FINAL_REVIEW',

  'UNDER_NTIA_FINAL_REVIEW:approve': 'APPROVED',
  'UNDER_NTIA_FINAL_REVIEW:approve_with_conditions':
    'APPROVED_WITH_CONDITIONS',
  'UNDER_NTIA_FINAL_REVIEW:finalize_denial': 'DENIED',
  'UNDER_NTIA_FINAL_REVIEW:request_revisions':
    'UNDER_FINAL_REVISION_PER_NTIA',

  'UNDER_FINAL_REVISION_PER_NTIA:resubmit': 'UNDER_NTIA_FINAL_REVIEW',
};

const sendJson = (res, statusCode, body) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

const readJsonBody = (req) =>
  new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });

    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });

    req.on('error', reject);
  });

const getNextStatus = ({ current_status: currentStatus, action }) => {
  const normalizedAction = typeof action === 'string' ? action.trim() : '';

  if (!statuses.has(currentStatus)) {
    return {
      error: `Unsupported current_status: ${currentStatus}`,
      status: null,
    };
  }

  const key = `${currentStatus}:${normalizedAction}`;
  const nextStatus = transitions[key];

  if (nextStatus) {
    return { status: nextStatus };
  }

  if (terminalStatuses.has(currentStatus)) {
    return { status: currentStatus };
  }

  return {
    error: `Unsupported workflow transition: ${key}`,
    status: null,
  };
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, { ok: true, service: 'slfcp-dev-logic-app' });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/transitions') {
    sendJson(res, 200, { transitions });
    return;
  }

  if (
    req.method === 'POST' &&
    (url.pathname === '/api/workflow' || url.pathname === '/workflow')
  ) {
    try {
      const body = await readJsonBody(req);
      const result = getNextStatus(body);

      if (logLevel !== 'silent') {
        console.log(
          JSON.stringify({
            event: 'workflow.transition',
            input: body,
            result,
          })
        );
      }

      sendJson(res, result.error ? 422 : 200, result);
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`SLFCP local workflow service listening on ${port}`);
});
