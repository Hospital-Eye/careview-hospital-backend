const crypto = require('crypto');

const requestContext = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();

  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);

  next();
};

module.exports = { requestContext };
