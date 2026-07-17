// Fardar Express adapter — manual tracking via URL template

function getTrackingUrl(trackingNumber, urlTemplate) {
  if (!urlTemplate) return null;
  return urlTemplate.replace('{tracking_number}', encodeURIComponent(trackingNumber));
}

async function getTracking(trackingNumber, urlTemplate) {
  return {
    status: 'Track via link',
    tracking_url: getTrackingUrl(trackingNumber, urlTemplate),
    tracking_number: trackingNumber,
  };
}

module.exports = { getTrackingUrl, getTracking };
