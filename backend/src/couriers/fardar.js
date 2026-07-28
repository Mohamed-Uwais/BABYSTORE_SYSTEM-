// Fardar Express adapter — manual tracking via URL template

const FALLBACK_URL = 'https://www.google.com/search?q=fardar+express+tracking+{tracking_number}';

function getTrackingUrl(trackingNumber, urlTemplate) {
  const template = urlTemplate || FALLBACK_URL;
  return template.replace('{tracking_number}', encodeURIComponent(trackingNumber));
}

async function getTracking(trackingNumber, urlTemplate) {
  return {
    status: 'Track via link',
    tracking_url: getTrackingUrl(trackingNumber, urlTemplate),
    tracking_number: trackingNumber,
  };
}

module.exports = { getTrackingUrl, getTracking };
