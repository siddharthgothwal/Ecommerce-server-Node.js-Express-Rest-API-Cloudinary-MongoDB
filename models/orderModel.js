const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  name: { 
    type: String,
    required: true,
  },
  mobile: {
    type: String,
    required: true,
  },
  pincode: {
    type: String,
    required: true,
  },
  useraddress: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
});

const paymentIntentSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  method: {
    type: String,
    required: true,
    enum: ['COD', 'PREPAID'],
  },
  amount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    required: true,
  },
  created: {
    type: Date,
    required: true,
  },
  currency: {
    type: String,
    required: true,
  },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  products: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
      slug: String,
      images: String,
      count: Number,
      size: String,
      color: String,
    },
  ],
  transactionId: {
    type: String,
    default: null,
  },
  paymentIntent: paymentIntentSchema,
  orderStatus: {
    type: String,
    default: "Not Processed",
    enum: [
      "Not Processed",
      "Cash on Delivery",
      "PREPAID",
      "Processing",
      "Dispatched",
      "Cancelled",
      "Delivered",
    ],
  },
  address: [addressSchema], 
  orderby: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
