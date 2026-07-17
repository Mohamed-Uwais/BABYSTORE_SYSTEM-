const productModel = require('../models/productModel');

async function listProducts(req, res) {
  try {
    const products = await productModel.getAllProducts();
    res.json({ success: true, data: products });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
}

async function getProduct(req, res) {
  try {
    const product = await productModel.getProductById(req.params.id);
    if (!product.length) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch product' });
  }
}

async function addProduct(req, res) {
  try {
    const id = await productModel.createProduct(req.body);
    res.status(201).json({ success: true, message: 'Product created', id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to create product' });
  }
}

async function lowStock(req, res) {
  try {
    const variants = await productModel.getLowStockVariants();
    res.json({ success: true, data: variants });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch low-stock variants' });
  }
}

async function addProductWithVariants(req, res) {
  try {
    const id = await productModel.createProductWithVariants({ ...req.body, created_by: req.user?.id });
    if (req.body.tag_ids?.length) {
      const tagModel = require('../models/tagModel');
      await tagModel.setProductTags(id, req.body.tag_ids);
    }
    res.status(201).json({ success: true, message: 'Product created', id });
  } catch (error) {
    console.error(error);
    // duplicate SKU/barcode/slug come back as ER_DUP_ENTRY - surface a readable message
    const message = error.code === 'ER_DUP_ENTRY'
      ? 'A product with the same SKU, barcode, or name already exists'
      : error.message;
    res.status(400).json({ success: false, message });
  }
}

async function editProduct(req, res) {
  try {
    await productModel.updateProduct(req.params.id, req.body);
    res.json({ success: true, message: 'Product updated' });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message });
  }
}

async function editVariant(req, res) {
  try {
    await productModel.updateVariant(req.params.variantId, req.body);
    if (req.body.price_tiers !== undefined) {
      await productModel.savePriceTiers(req.params.variantId, req.body.price_tiers);
    }
    res.json({ success: true, message: 'Variant updated' });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message });
  }
}

async function getPriceTiers(req, res) {
  try {
    const tiers = await productModel.getPriceTiers(req.params.variantId);
    res.json({ success: true, data: tiers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch price tiers' });
  }
}

async function savePriceTiers(req, res) {
  try {
    await productModel.savePriceTiers(req.params.variantId, req.body.tiers);
    res.json({ success: true, message: 'Price tiers saved' });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message });
  }
}

// multer put the file on disk; return the public URL for the client to attach to a variant
async function uploadImage(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No image file received' });
  }
  res.status(201).json({ success: true, data: { image_url: `/uploads/${req.file.filename}` } });
}

async function deleteProduct(req, res) {
  try {
    const result = await productModel.deleteProduct(req.params.id);
    res.json({ success: true, message: `Product ${result}`, action: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
}

async function deleteVariant(req, res) {
  try {
    const result = await productModel.deleteVariant(req.params.variantId);
    res.json({ success: true, message: `Variant ${result}`, action: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to delete variant' });
  }
}

async function checkOrderHistory(req, res) {
  try {
    const has = await productModel.hasOrderHistory(req.params.id);
    res.json({ success: true, data: { hasOrderHistory: has } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Check failed' });
  }
}

module.exports = {
  listProducts, getProduct, addProduct, addProductWithVariants,
  editProduct, editVariant, uploadImage, lowStock,
  deleteProduct, deleteVariant, checkOrderHistory,
  getPriceTiers, savePriceTiers,
};