const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const app = express();

dotenv.config();

const Product = require('./models/product');
const ResponseHelper = require('../../helpers/response');

const PORT = 4001;

mongoose.connect(process.env.PRODUCT_SERVICE_DATABASE_URL);

app.use(express.json());

app.get('/', async (req, res) => {
  const products = await Product.find();
  res.status(200).json(ResponseHelper.success('Products retrieved', products));
});

app.get('/:id', async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json(ResponseHelper.error('Product not found'));
  }

  res.status(200).json(ResponseHelper.success('Product retrieved', product));
});

app.put('/:id', async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json(ResponseHelper.error('Product not found'));
  }

  product.set(req.body);
  await product.save();

  res.status(200).json(ResponseHelper.success('Product updated', product));
});

app.post('/', async (req, res) => {
  const product = new Product(req.body);
  await product.save();

  if (product._id) {
    fetch('http://localhost:4002', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productId: product._id,
        stock: 0,
      }),
    });
  }

  res.status(201).json(ResponseHelper.success('Product created', product));
});

mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to db');
  app.listen(PORT, () => {
    console.log(`Product Service running on port ${PORT}`);
  });
});
