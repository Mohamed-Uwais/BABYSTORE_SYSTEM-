const TOOLS = [
  {
    name: 'search_products',
    description: 'Search for products by name, brand, or category. Returns product name, variants, prices, stock status, and image URLs.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Search term (product name, brand, or category)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'check_stock',
    description: 'Check if a specific product variant is in stock and get current quantity.',
    parameters: {
      type: 'OBJECT',
      properties: {
        variant_id: { type: 'NUMBER', description: 'Product variant ID' },
      },
      required: ['variant_id'],
    },
  },
  {
    name: 'get_customer',
    description: 'Look up customer by phone number. Returns name, address, loyalty tier, and recent orders.',
    parameters: {
      type: 'OBJECT',
      properties: {
        phone: { type: 'STRING', description: 'Customer phone number (any format)' },
      },
      required: ['phone'],
    },
  },
  {
    name: 'create_order',
    description: 'Create a new order. ONLY call after the customer explicitly confirms the order summary. Requires name, phone, address, items, and payment method.',
    parameters: {
      type: 'OBJECT',
      properties: {
        customer_phone: { type: 'STRING', description: 'Customer phone number' },
        customer_name: { type: 'STRING', description: 'Customer full name' },
        delivery_address: { type: 'STRING', description: 'Full delivery address' },
        items: {
          type: 'ARRAY',
          description: 'Array of items to order',
          items: {
            type: 'OBJECT',
            properties: {
              variant_id: { type: 'NUMBER', description: 'Product variant ID' },
              quantity: { type: 'NUMBER', description: 'Quantity to order' },
            },
            required: ['variant_id', 'quantity'],
          },
        },
        payment_method: { type: 'STRING', description: 'Payment method: cod or bank_transfer' },
        notes: { type: 'STRING', description: 'Optional order notes' },
      },
      required: ['customer_phone', 'customer_name', 'delivery_address', 'items', 'payment_method'],
    },
  },
  {
    name: 'get_order_status',
    description: 'Check order status by order number (format: ORD-YYYYMMDD-NNN).',
    parameters: {
      type: 'OBJECT',
      properties: {
        order_number: { type: 'STRING', description: 'Order number' },
      },
      required: ['order_number'],
    },
  },
  {
    name: 'cancel_order',
    description: 'Cancel an order. Only works if the order has not been shipped yet.',
    parameters: {
      type: 'OBJECT',
      properties: {
        order_number: { type: 'STRING', description: 'Order number to cancel' },
      },
      required: ['order_number'],
    },
  },
  {
    name: 'get_delivery_fee',
    description: 'Get delivery fee for a city or area. Fee is calculated per pack: base fee for the first pack + per_additional_pack_fee for each extra pack. Pass total_packs to get the exact total.',
    parameters: {
      type: 'OBJECT',
      properties: {
        zone_name: { type: 'STRING', description: 'City or area name' },
        total_packs: { type: 'NUMBER', description: 'Total number of packs being ordered (default 1)' },
      },
      required: ['zone_name'],
    },
  },
  {
    name: 'get_active_promotions',
    description: 'Get all currently active promotions, deals, and coupon codes.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
];

function toGeminiFormat() {
  return TOOLS;
}

function toAnthropicFormat() {
  return TOOLS.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: convertSchema(t.parameters),
  }));
}

function convertSchema(geminiSchema) {
  if (!geminiSchema) return { type: 'object', properties: {} };
  const result = { type: 'object', properties: {}, required: geminiSchema.required || [] };
  for (const [key, val] of Object.entries(geminiSchema.properties || {})) {
    result.properties[key] = convertProp(val);
  }
  return result;
}

function convertProp(prop) {
  const typeMap = { STRING: 'string', NUMBER: 'number', BOOLEAN: 'boolean', ARRAY: 'array', OBJECT: 'object' };
  const out = { type: typeMap[prop.type] || prop.type?.toLowerCase() || 'string' };
  if (prop.description) out.description = prop.description;
  if (prop.items) out.items = convertProp(prop.items);
  if (prop.properties) {
    out.properties = {};
    for (const [k, v] of Object.entries(prop.properties)) out.properties[k] = convertProp(v);
    if (prop.required) out.required = prop.required;
  }
  return out;
}

module.exports = { TOOLS, toGeminiFormat, toAnthropicFormat };
