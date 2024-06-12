const express = require('express');
const mongoose = require('mongoose');
const app = express();
const dotenv = require('dotenv');

const FlashSale = require('./models/flashsale');
const ResponseHelper = require('../../helpers/response');

dotenv.config();

const PORT = 4005;

mongoose.connect(process.env.FLASH_SALE_SERVICE_DATABASE_URL);

app.use(express.json());

app.get('/', async (req, res) => {
  const flashSales = await FlashSale.find();
  res.status(200).json(ResponseHelper.success('Flash Sales retrieved', flashSales));
});

app.post('/', async (req, res) => {
  const { productDiscounts } = req.body;
  const flashSale = new FlashSale(req.body);
  await flashSale.save();

  for (const productDiscount of productDiscounts) {
    const response = await fetch(`http://localhost:4001/${productDiscount.productId}`, {});
    const { data: product } = await response.json();

    const discountedPrice = product.price * (1 - productDiscount.discount / 100);

    await fetch(`http://localhost:4001/${productDiscount.productId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ discountedPrice }),
    });
  }

  res.status(201).json(ResponseHelper.success('Flash Sale created', productDiscounts));
});

mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to db');
  app.listen(PORT, () => {
    console.log(`Order Service running on port ${PORT}`);
  });
});
