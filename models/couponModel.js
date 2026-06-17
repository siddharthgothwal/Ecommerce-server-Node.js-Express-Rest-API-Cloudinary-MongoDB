const mongoose = require("mongoose"); // Erase if already required

// Declare the Schema of the Mongo model
var couponSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  },
  description:{
    type:String,
    required:false,
  },
  expiry: {
    type: Date,
    required: true,
  },
  discount: {
    type: Number,
    required: true,
  },
  minCartTotal: {
    type: Number,
    required: true,
  }, 
  minProductCount: {  // Minimum product count for applying the coupon
    type: Number,
    required: false,
  },
  productCategories: { // Categories where the coupon can be applied
    type: [String],
    required: false,
  },
});

//Export the model
module.exports = mongoose.model("Coupon", couponSchema);