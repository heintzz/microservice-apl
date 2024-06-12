const express = require('express');
const app = express();
const amqplib = require('amqplib/callback_api');
const dotenv = require('dotenv');

dotenv.config();

const PORT = 4004;

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
      const paymentQueue = 'payment_queue';
      const paymentFailedQueue = 'payment_failed_queue';
      channel.assertQueue(orderQueue, { durable: true });
      channel.assertQueue(paymentQueue, { durable: true });
      channel.assertQueue(paymentFailedQueue, { durable: true });
      callback(channel, connection);
    });
  });
};

connectRabbitMQ((channel, connection) => {
  channel.consume('order_queue', async (message) => {
    const { orderId, productId, quantity } = JSON.parse(message.content.toString());
    console.log(`Processing order ${orderId} for product ${productId} with quantity ${quantity}`);

    if (Math.random() < 0.5) {
      const paymentData = JSON.stringify({ orderId, productId, status: 'failed' });
      channel.sendToQueue('payment_failed_queue', Buffer.from(paymentData));
      console.log(`Order ${orderId} for product ${productId} with quantity ${quantity} failed`);
    } else {
      const paymentData = JSON.stringify({ orderId, status: 'paid' });
      channel.sendToQueue('payment_queue', Buffer.from(paymentData));
      console.log(`Order ${orderId} for product ${productId} with quantity ${quantity} processed`);
    }

    channel.ack(message);

    setTimeout(() => {
      connection.close();
    }, 500);
  });
});

app.listen(PORT, () => {
  console.log(`Payment Service running on port ${PORT}`);
});
