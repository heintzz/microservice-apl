const express = require('express');
const mongoose = require('mongoose');
const app = express();
const Order = require('./models/order');
const amqplib = require('amqplib/callback_api');
const dotenv = require('dotenv');
const ResponseHelper = require('../../helpers/response');

dotenv.config();

const PORT = 4003;

mongoose.connect(process.env.ORDER_SERVICE_DATABASE_URL);

app.use(express.json());

const connectRabbitMQ = (callback) => {
  amqplib.connect('amqp://localhost', (error0, connection) => {
    if (error0) {
      throw error0;
    }
    connection.createChannel((error1, channel) => {
      if (error1) {
        throw error1;
      }
      const orderQueue = 'order_queue';      
      channel.assertQueue(orderQueue, { durable: true });
      callback(channel, connection);
    });
  });
};

app.get('/', async (_, res) => {
  const orders = await Order.find();
  res.status(200).json(ResponseHelper.success('Orders retrieved', orders));
});

app.get('/:id', async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json(ResponseHelper.error('Order not found'));
  }

  res.status(200).json(ResponseHelper.success('Order retrieved', order));
});

app.post('/', async (req, res) => {
  const { productId, quantity } = req.body;

  const response = await fetch(`http://localhost:4002/${productId}`);
  const inventory = await response.json();
  const remainingStock = inventory.data.stock;

  if (remainingStock < quantity) {
    return res.status(400).json({ error: 'Not enough stock available' });
  }

  const order = new Order({ productId, quantity });
  await order.save();

  await fetch(`http://localhost:4002/${productId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      stock: remainingStock - quantity,
    }),
  });

  connectRabbitMQ((channel, connection) => {
    const orderData = JSON.stringify({ orderId: order._id, productId, quantity });
    channel.sendToQueue('order_queue', Buffer.from(orderData));
    console.log('[x] Sent %s', orderData);

    setTimeout(() => {
      connection.close();
    }, 500);
  });

  res.status(201).json(ResponseHelper.success('Order created', order));
});

connectRabbitMQ((channel, connection) => {
  channel.consume('payment_queue', async (message) => {
    const { orderId } = JSON.parse(message.content.toString());
    console.log(`Payment processed for order ${orderId}`);

    const order = await Order.findById(orderId);

    if (!order) {
      return;
    }

    order.status = 'paid';
    await order.save();

    channel.ack(message);

    setTimeout(() => {
      connection.close();
    }, 500);
  });

  channel.consume('payment_failed_queue', async (message) => {
    const { orderId } = JSON.parse(message.content.toString());
    console.log(`Payment failed for order ${orderId}`);

    const order = await Order.findById(orderId);

    if (!order) {
      return;
    }

    order.status = 'failed';
    await order.save();

    channel.ack(message);

    setTimeout(() => {
      connection.close();
    }, 500);
  });
});

mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to db');
  app.listen(PORT, () => {
    console.log(`Order Service running on port ${PORT}`);
  });
});
