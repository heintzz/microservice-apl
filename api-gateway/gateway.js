const express = require('express');
const httpProxy = require('express-http-proxy');
const app = express();

const productProxy = httpProxy('http://localhost:4001');
app.use('/products', productProxy);

const inventoryProxy = httpProxy('http://localhost:4002');
app.use('/inventory', inventoryProxy);

const orderProxy = httpProxy('http://localhost:4003');
app.use('/orders', orderProxy);

const flashSaleProxy = httpProxy('http://localhost:4005');
app.use('/flashsales', flashSaleProxy);

app.listen(4000, () => {
  console.log('API Gateway running on port 4000');
});
