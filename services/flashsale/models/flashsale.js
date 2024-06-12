const mongoose = require('mongoose');

const flashSaleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  productDiscounts: [
    {
      productId: {
        type: String,
        required: true,
      },
      discount: {
        type: Number,
        required: true,
      },
    },
  ],
});

module.exports = mongoose.model('FlashSale', flashSaleSchema);
