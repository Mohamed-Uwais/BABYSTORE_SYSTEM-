function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  console.error('[API_ERROR]', { requestId: req.requestId, method: req.method, path: req.path, code: err.code || err.name, status });
  return res.status(status).json({
    success: false,
    message: status < 500 ? err.message : 'The service could not complete the request. Please retry.',
    requestId: req.requestId,
  });
}
module.exports = errorHandler;
