const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const app = express();
const amqplib = require('amqplib/callback_api');

const Inventory = require('./models/inventory');
const ResponseHelper = require('../../helpers/response');

dotenv.config();

const PORT = 4002;

mongoose.connect(process.env.INVENTORY_SERVICE_DATABASE_URL);

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
      const paymentFailedQueue = 'payment_failed_queue';
      channel.assertQueue(paymentFailedQueue, { durable: true });
      callback(channel, connection);
    });
  });
};

app.get('/', async (_, res) => {
  const inventory = await Inventory.find();
  res.status(200).json(ResponseHelper.success('Inventory retrieved', inventory));
});

app.get('/:id', async (req, res) => {
  const inventory = await Inventory.find({ productId: req.params.id });

  if (!inventory) {
    return res.status(404).json(ResponseHelper.error('Inventory not found'));
  }

  res.status(200).json(ResponseHelper.success('Inventory retrieved', inventory[0]));
});

app.post('/', async (req, res) => {
  const inventory = new Inventory(req.body);
  await inventory.save();

  res.status(201).json(ResponseHelper.success('Inventory created', inventory));
});

app.put('/:id', async (req, res) => {
  const inventory = await Inventory.findOneAndUpdate({ productId: req.params.id }, req.body, {
    new: true,
  });

  if (!inventory) {
    return res.status(404).json(ResponseHelper.error('Inventory not found'));
  }

  res.status(200).json(ResponseHelper.success('Inventory updated', inventory));
});

connectRabbitMQ((channel, connection) => {
  channel.consume('payment_failed_queue', async (message) => {
    const { orderId, productId } = JSON.parse(message.content.toString());
    console.log(typeof orderId);
    console.log(`Payment failed for order ${orderId}`);

    const response = await fetch(`http://localhost:4003/${orderId}`);
    const order = await response.json();

    if (!order) {
      return;
    }

    await Inventory.findOneAndUpdate(
      { productId },
      { $inc: { stock: order.data.quantity } },
      {
        new: true,
      }
    );

    channel.ack(message);

    setTimeout(() => {
      connection.close();
    }, 500);
  });
});

mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to db');
  app.listen(PORT, () => {
    console.log(`Inventory Service running on port ${PORT}`);
  });
});
