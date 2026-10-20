const { createHash } = require('node:crypto');

function requestHash(payload) {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

async function completedRequest(db, key, hash) {
  if (!key) return null;
  if (!/^[A-Za-z0-9:_-]{8,128}$/.test(key)) throw Object.assign(new Error('Invalid submission key'), { status: 400 });
  const [[request]] = await db.query('SELECT payload_hash, order_id FROM checkout_requests WHERE request_key = ?', [key]);
  if (!request) return null;
  if (request.payload_hash !== hash) throw Object.assign(new Error('Submission key was already used for a different order'), { status: 409 });
  if (!request.order_id) return null;
  const [[order]] = await db.query('SELECT id AS orderId, order_number, grand_total FROM orders WHERE id = ?', [request.order_id]);
  if (!order) throw new Error('Saved checkout result is unavailable');
  return { ...order, grand_total: Number(order.grand_total) };
}

async function claimRequest(connection, key, hash) {
  if (!key) return null; // Compatibility with older clients.
  if (!/^[A-Za-z0-9:_-]{8,128}$/.test(key)) {
    throw Object.assign(new Error('Invalid submission key'), { status: 400 });
  }
  // The insert and result association belong to the order transaction. A competing
  // insert waits for commit/rollback, including across API workers and restarts.
  await connection.query(
    'INSERT INTO checkout_requests (request_key, payload_hash) VALUES (?, ?) ON DUPLICATE KEY UPDATE request_key = request_key',
    [key, hash]
  );
  const [[request]] = await connection.query(
    'SELECT payload_hash, order_id FROM checkout_requests WHERE request_key = ? FOR UPDATE', [key]
  );
  if (request.payload_hash !== hash) {
    throw Object.assign(new Error('Submission key was already used for a different order'), { status: 409 });
  }
  if (!request.order_id) return null;
  const [[order]] = await connection.query(
    'SELECT id AS orderId, order_number, grand_total FROM orders WHERE id = ?', [request.order_id]
  );
  if (!order) throw new Error('Saved checkout result is unavailable');
  return { ...order, grand_total: Number(order.grand_total) };
}

module.exports = { claimRequest, completedRequest, requestHash };
