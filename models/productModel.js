const mongoose = require("mongoose"); // Erase if already required

// Declare the Schema of the Mongo model

const descriptionSchema = new mongoose.Schema({
  descrip:{
    type:String,
  },
  fabric:{
    type: String,
  },
  features:{
    type: String,
  },
  tech:{
    type: String,
  },
  compos:{
    type:String,
  }
})
var productSchema = new mongoose.Schema(
  {
    
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    description: [descriptionSchema], 
      
      

    price: {
      type: Number,
      required: true,
    },
    discountprice: {
      type: Number,
      required: true,
    },
    percentage:{
      type: Number,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    size: [{

      type: String,
    }],

    quantity: {
      type: Number,
      
    },
    sold: {
      type: Number,
      default: 0,
    },
    images: [
      {
        public_id: String,
        asset_id: String,
        url: String,

      },
    ],
    color: [],
    tags: String,
    ratings: [
      {
        star: Number,
        comment: String,
        postedby: String,
        images: [
          {
            public_id: String,
            asset_id: String,
            url: String,
          },
        ],
      },
    ],

    totalrating: {
      type: String,
      default: 0,
    },
  },
  { timestamps: true }
);


//Export the model
module.exports = mongoose.model("Product", productSchema);