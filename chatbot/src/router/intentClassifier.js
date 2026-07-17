const INTENTS = [
  {
    intent: 'greeting',
    patterns: [/^(hi|hello|hey|hlo|hii+|good\s*(morning|evening|afternoon|night)|ayubowan|vanakkam|sup|yo)\b/i],
    priority: 10,
  },
  {
    intent: 'thanks',
    patterns: [/^(thanks|thank\s*you|thx|ty|cheers|sthuthi|nandri|bohoma\s*sthuthi)/i],
    priority: 10,
  },
  {
    intent: 'goodbye',
    patterns: [/^(bye|goodbye|see\s*you|good\s*night|later|take\s*care)\b/i],
    priority: 10,
  },
  {
    intent: 'order_tracking',
    patterns: [
      /ORD-\d+/i,
      /track|where.*order|order.*status|my\s*order|order.*where/i,
    ],
    priority: 8,
  },
  {
    intent: 'product_price',
    patterns: [
      /price|how\s*much|kiyada|cost|rate|gana\s*kiyada|vila|ethana/i,
    ],
    priority: 5,
  },
  {
    intent: 'stock_check',
    patterns: [
      /available|in\s*stock|stock|thiyenawada|ithinda|have\s*(you\s*)?got|do\s*you\s*have/i,
    ],
    priority: 5,
  },
  {
    intent: 'delivery_info',
    patterns: [
      /deliver(y|\s)|shipping|send\s*to|dispatch|delivery\s*(charge|fee|cost)|shipping\s*cost/i,
    ],
    priority: 6,
  },
  {
    intent: 'business_hours',
    patterns: [
      /open|close|hours|time|when.*open|when.*close|working\s*hours/i,
    ],
    priority: 7,
  },
  {
    intent: 'contact_info',
    patterns: [
      /phone|call|email|address|location|where.*shop|visit/i,
    ],
    priority: 7,
  },
  {
    intent: 'promotion',
    patterns: [
      /offer|promo|discount|deal|coupon|sale|special/i,
    ],
    priority: 6,
  },
  {
    intent: 'cod_check',
    patterns: [
      /\bcod\b|cash\s*on\s*delivery|pay.*delivery|deliver.*pay/i,
    ],
    priority: 7,
  },
  {
    intent: 'payment_methods',
    patterns: [
      /payment|how.*pay|pay.*method|bank\s*transfer/i,
    ],
    priority: 7,
  },
  {
    intent: 'return_refund',
    patterns: [
      /return|refund|exchange|damaged|wrong\s*item|broken/i,
    ],
    priority: 7,
  },
  {
    intent: 'brands',
    patterns: [
      /what\s*brand|which\s*brand|brands?\s*(you|do|available)/i,
    ],
    priority: 6,
  },
  {
    intent: 'bulk_order',
    patterns: [
      /bulk|wholesale|large\s*order|big\s*order/i,
    ],
    priority: 6,
  },
];

function classify(message) {
  const text = message.trim();
  const matches = [];

  for (const def of INTENTS) {
    for (const pattern of def.patterns) {
      if (pattern.test(text)) {
        matches.push(def);
        break;
      }
    }
  }

  if (matches.length === 0) return null;
  matches.sort((a, b) => b.priority - a.priority);
  return matches[0].intent;
}

function extractOrderNumber(message) {
  const m = message.match(/ORD-\d{8}-\d{3}/i);
  return m ? m[0].toUpperCase() : null;
}

function extractProductName(message) {
  let cleaned = message
    .replace(/price|how\s*much|cost|kiyada|rate|gana\s*kiyada|vila|ethana/gi, '')
    .replace(/available|in\s*stock|stock|thiyenawada|ithinda|have\s*(you\s*)?got|do\s*you\s*have/gi, '')
    .replace(/what('?s|\s*is)?|the|of|for|a|an|your|you|me|please|pls|can|show/gi, '')
    .replace(/\?|!|\.|\,/g, '')
    .trim();
  return cleaned.length >= 2 ? cleaned : null;
}

module.exports = { classify, extractOrderNumber, extractProductName };
