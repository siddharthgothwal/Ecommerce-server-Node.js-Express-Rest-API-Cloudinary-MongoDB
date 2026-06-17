const mongoose = require("mongoose"); // Erase if already required

const addressSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobile: { type: String, required: true },
  pincode: { type: String, required: true },
  useraddress: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
});
// Declare the Schema of the Mongo model
var cartSchema = new mongoose.Schema(
  {
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        
        
        count: Number,
        color: String,
        price: Number,
        size: String,
          images: {
           type: String,
         },
      },
    ],
    transactionId: {
      type: String,
      default: null,
    },
    cartTotal: Number,
    totalAfterDiscount: Number,
    orderby: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    address: [addressSchema],
  },
  {
    timestamps: true,
  }
);

//Export the model
module.exports = mongoose.model("Cart", cartSchema);