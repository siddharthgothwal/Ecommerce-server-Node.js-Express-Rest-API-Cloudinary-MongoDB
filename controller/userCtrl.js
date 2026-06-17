const User = require("../models/userModel");
const Product = require("../models/productModel");
const Cart = require("../models/cartModel");
const Coupon = require("../models/couponModel");
const Order = require("../models/orderModel");
const uniqid = require("uniqid");

const { PhonePe} = require('../config/phonepe');

const asyncHandler = require("express-async-handler");
const { generateToken } = require("../config/jwtToken");
const validateMongoDbId = require("../utils/validateMongodbId");
const { generateRefreshToken } = require("../config/refreshtoken");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const phonepedata = asyncHandler(async (req, res) => {
  try {
    const phonePe = new PhonePe();
    const {
      merchantId,
      merchantTransactionId,
      amount,
    } = req.body;

    if (!merchantId || !merchantTransactionId || !amount) {
      res.status(400).send('Bad Request: Missing necessary fields');
      return;
    }


    const cart = await Cart.findOne({ transactionId: merchantTransactionId });
    if (!cart) {
      res.status(404).send('Cart not found');
      return;
    }


    const user = await User.findById(cart.orderby);
    if (!user) {
      res.status(404).send('User not found');
      return;
    }

    req.user = { _id: user._id };
    const paymentStatusResponse = await phonePe.checkStatus(merchantId, merchantTransactionId);
    
    if (paymentStatusResponse.status === 'SUCCESS') {
      createPrepaidOrder(req, res);
      
      
      res.redirect('https://www.immortals.org.in/payment-success');
    } else {
      
      
      
      res.redirect('https://www.immortals.org.in/payment-failure');
    }
  } catch (error) {
    console.error('Error handling PhonePe data:', error);
    res.status(500).send('Internal Server Error');
  }
});


const onlinepayment = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  validateMongoDbId(_id);
  const user = await User.findById(_id);
  const cart = await Cart.findOne({ orderby: user._id });

  if (!cart) {
    throw new Error("No cart found for the user");
  }
    const finalAmount = res.locals.finalAmount;
  try {
    const phonepe = new PhonePe();
    const paymentURL = await phonepe.generate({},_id,finalAmount) // Passing the user ID to the generate method
    res.json({ paymentURL });
  } catch (error) {
    console.error(error);
    throw new Error("Payment initiation failed");
  }
});



const createUser = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const findUser = await User.findOne({ email });

  if (!findUser) {
    const newUser = await User.create(req.body);
    res.json(newUser);
  } else {
    throw new Error("User Already Exists");
  }
});


const createUserAsGuest = async (req, res) => {
  try {
    const guestIdentifier = `guest_${uniqid()}`;
    console.log('Guest identifier:', guestIdentifier);
    const guestUser = new User({
      role: 'guest',
      email: guestIdentifier, 
      mobile: `placeholder_${guestIdentifier}`, 
    });

    await guestUser.save();

    const token = generateToken(guestUser._id);
    res.json({
      msg: 'Guest user created successfully',
      user: guestUser,
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      msg: 'An error occurred while creating the guest user',
    });
  }
};


const loginUserCtrl = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const findUser = await User.findOne({ email });
  if (findUser && (await findUser.isPasswordMatched(password))) {
    const refreshToken = await generateRefreshToken(findUser?._id);
    const updateuser = await User.findByIdAndUpdate(

      findUser.id,
      {
        refreshToken: refreshToken,
      },
      { new: true }
    );
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      maxAge: 72 * 60 * 60 * 1000,
    });
    res.json({
      _id: findUser?._id,
      name: findUser?.name,
      email: findUser?.email,
      mobile:findUser?.mobile,
      address:findUser?.address,
      token: generateToken(findUser?._id),
    });
  } else {
    throw new Error("Invalid Credentials");
  }
});
const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const findAdmin = await User.findOne({ email });
  if (!findAdmin || findAdmin.role !== "admin") {
    throw new Error("Not Authorised");
  }

  if (await findAdmin.isPasswordMatched(password)) {
    const refreshToken = await generateRefreshToken(findAdmin._id);
    await User.findByIdAndUpdate(
      findAdmin._id,
      {
        refreshToken: refreshToken,
      },
      { new: true }
    );
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      maxAge: 72 * 60 * 60 * 1000,
    });
    res.json({
      _id: findAdmin._id,
      firstname: findAdmin.firstname,
      lastname: findAdmin.lastname,
      email: findAdmin.email,
      mobile: findAdmin.mobile,
      token: generateToken(findAdmin._id),
    });
  } else {
    throw new Error("Invalid Credentials");
  }
});

const handleRefreshToken = asyncHandler(async (req, res) => {
  const cookie = req.cookies;
  if (!cookie?.refreshToken) throw new Error("No Refresh Token in Cookies");
  const refreshToken = cookie.refreshToken;
  const user = await User.findOne({ refreshToken });
  if (!user) throw new Error("No Refresh token present in db or not matched");

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
  } catch (error) {
    res.status(401);
    throw new Error("There is something wrong with refresh token");
  }

  if (user._id.toString() !== decoded.id) {
    res.status(401);
    throw new Error("Refresh token does not match user");
  }

  const accessToken = generateToken(user._id);
  res.json({ accessToken });
});

const logout = asyncHandler(async (req, res) => {
  const cookie = req.cookies;
  if (!cookie?.refreshToken) throw new Error("No Refresh Token in Cookies");

  const refreshToken = cookie.refreshToken;
  const user = await User.findOne({ refreshToken });
  if (user) {
    await User.findOneAndUpdate({ refreshToken }, { refreshToken: "" });
  }

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  res.sendStatus(204);
});

const updatedUser = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  validateMongoDbId(_id);
  try {
    const updatedUser = await User.findByIdAndUpdate(
      _id,
      {
        firstname: req?.body?.firstname,
        lastname: req?.body?.lastname,
        email: req?.body?.email,
        mobile: req?.body?.mobile,
        address: req?.body?.address
      },
      {
        new: true,
      }
    );
    res.json(updatedUser);
  } catch (error) {
    throw new Error(error);
  }
});

const saveAddress = asyncHandler(async (req, res, next) => {
  const { _id } = req.user;
  validateMongoDbId(_id);

  try {
    const updatedUser = await User.findByIdAndUpdate(
      _id,
      {
        address: req?.body?.address,
      },
      {
        new: true,
      }
    );
    res.json(updatedUser);
  } catch (error) {
    throw new Error(error);
  }
});

const getallUser = asyncHandler(async (req, res) => {
  try {
    const getUsers = await User.find().populate("wishlist");
    res.json(getUsers);
  } catch (error) {
    throw new Error(error);
  }
});

const getaUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);

  try {
    const getaUser = await User.findById(id);
    res.json({
      getaUser,
    });
  } catch (error) {
    throw new Error(error);
  }
});

const deleteaUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const deleteaUser = await User.findByIdAndDelete(id);
    res.json({
      deleteaUser,
    });
  } catch (error) {
    throw new Error(error);
  }
});

const blockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const blockusr = await User.findByIdAndUpdate(
      id,
      {
        isBlocked: true,
      },
      {
        new: true,
      }
    );
    res.json(blockusr);
  } catch (error) {
    throw new Error(error);
  }
});

const unblockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);

  try {
    const unblock = await User.findByIdAndUpdate(
      id,
      {
        isBlocked: false,
      },
      {
        new: true,
      }
    );
    res.json({
      message: "User UnBlocked",
    });
  } catch (error) {
    throw new Error(error);
  }
});

const getWishlist = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  try {
    const findUser = await User.findById(_id).populate("wishlist");
    res.json(findUser);
  } catch (error) {
    throw new Error(error);
  }
});

const userCart = asyncHandler(async (req, res) => {
  const { cart} = req.body;
  const { _id } = req.user;
  validateMongoDbId(_id);

  
  try {
    const user = await User.findById(_id);
    let existingCart = await Cart.findOne({ orderby: user._id });
    if (existingCart) {
    // Update existing cart
for (let i = 0; i < cart.length; i++) {
  const existingProduct = existingCart.products.find(
    (product) => product.product.toString() === cart[i]._id &&
                 product.size === cart[i].size &&
                 product.color === cart[i].color
  );


  
  await existingCart.save();

  if (existingProduct) {
    // Product with the same ID, size, and color already exists in the cart, increase the count
    existingProduct.count += cart[i].count;
  } else {
    // Product doesn't exist in the cart, add it
    let object = {};
    object.product = cart[i]._id;
    object.count = cart[i].count;
    object.color = cart[i].color;
    object.images = cart[i].images;
    object.size = cart[i].size;
    let getPrice = await Product.findById(cart[i]._id)
      .select("price")
      .exec();
    object.price = getPrice.price;
    existingCart.products.push(object);
  }
}

      existingCart.cartTotal = 0;
      for (let i = 0; i < existingCart.products.length; i++) {
        existingCart.cartTotal +=
          existingCart.products[i].price * existingCart.products[i].count;
            // Add or update the address if provided

      }

      await existingCart.save();
      
   
      existingCart = {
        ...existingCart.toObject(),
        userId: user._id,
      };

      res.json(existingCart);
    } else {
      let products = [];

      for (let i = 0; i < cart.length; i++) {
        let object = {};
        object.product = cart[i]._id;
       
        object.count = cart[i].count;
        object.color = cart[i].color;
        object.images = cart[i].images;
        object.size = cart[i].size;
        let getPrice = await Product.findById(cart[i]._id)
          .select("price")
          .exec();
        object.price = getPrice.price;
        products.push(object);
      }

      let cartTotal = 0;
      for (let i = 0; i < products.length; i++) {
        cartTotal += products[i].price * products[i].count;
      }

      const newCart = await new Cart({
        products,
        cartTotal,
        orderby: user._id,
   
      }).save();

      const updatedCart = {
        ...newCart.toObject(),
        userId: user._id,
      };

      res.json(updatedCart);
    }
  } catch (error) {
    throw new Error(error);
  }
});

const fetchUserCart = async (userId) => {
  try {
    const cart = await Cart.findOne({ orderby: userId }).populate("products.product");
    return cart; 
  } catch (error) {
    throw new Error(error);
  }
};


const getUserCart = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  validateMongoDbId(_id);
  try {
    const cart = await Cart.findOne({ orderby: _id }).populate(
      "products.product"
    );
    res.json(cart);
  } catch (error) {
    throw new Error(error);
  }
});


const addAddressToCart = asyncHandler(async (req, res) => {
  const { address } = req.body;
  const { _id } = req.user;
  validateMongoDbId(_id);

  try {
    const user = await User.findById(_id);
    let existingCart = await Cart.findOne({ orderby: user._id });

    if (!existingCart) {
      return res.status(404).json({ error: 'Cart not found' });
    }
    existingCart.address = address;

    await existingCart.save();
    res.json(existingCart);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while updating the address' });
  }
});


const emptyCart = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  validateMongoDbId(_id);
  try {
    const user = await User.findOne({ _id });
    const cart = await Cart.findOneAndRemove({ orderby: user._id });
    res.json(cart);
  } catch (error) {
    throw new Error(error);
  }
});

const removeCartItem = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const cartItemId = req.params.cartItemId;
  
  try {
    const user = await User.findOne({ _id });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const cart = await Cart.findOneAndUpdate(
      { orderby: user._id },
      { $pull: { products: { _id: cartItemId } } },
      { new: true }
    );

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});




const applyCoupon = asyncHandler(async (req, res) => {
  const { coupon } = req.body;
  const { _id } = req.user;
  validateMongoDbId(_id);
  const validCoupon = await Coupon.findOne({ name: coupon });
  if (validCoupon === null) {
    throw new Error("Invalid Coupon");
  }
  const user = await User.findOne({ _id });
  const cart = await Cart.findOne({ orderby: user._id }).populate("products.product");
  const { cartTotal, products } = cart;

  if (cartTotal < validCoupon.minCartTotal) {
    throw new Error(`Coupon is applicable only for cart total of at least ₹${validCoupon.minCartTotal}`);
  }
  const totalProductCount = products.reduce((total, item) => total + item.count, 0);


  if (validCoupon.minProductCount && totalProductCount < validCoupon.minProductCount) {
    throw new Error(`Coupon is applicable only for at least ${validCoupon.minProductCount} products in the cart`);
  }

if (validCoupon.productCategories && validCoupon.productCategories.length > 0) {
  const applicableCategories = new Set(validCoupon.productCategories);
  if (!products.some(product => applicableCategories.has(product.product.category))) {
    throw new Error(`Coupon is not applicable to the product categories in the cart`);
  }
  let finalAmount = 0;
  if (couponApplied && userCart.totalAfterDiscount) {
    finalAmount = userCart.totalAfterDiscount;
  } else {
    finalAmount = userCart.cartTotal;
  }

}
  let totalAfterDiscount = (cartTotal - (cartTotal * validCoupon.discount) / 100).toFixed(2);
  await Cart.findOneAndUpdate({ orderby: user._id }, { totalAfterDiscount }, { new: true });
  res.json(finalAmount);
});





const createOrder = asyncHandler(async (req, res) => {
  const { COD, couponApplied } = req.body; 
  const { _id } = req.user;
  validateMongoDbId(_id);
  try {
    if (!COD) throw new Error("Create cash order failed");
    const user = await User.findById(_id);
    let userCart = await Cart.findOne({ orderby: user._id });
    const address = userCart ? userCart.address : null;
    if (!address) throw new Error("Address information not found in the cart");

    let finalAmount = 0;
    if (couponApplied && userCart.totalAfterDiscount) {
      finalAmount = userCart.totalAfterDiscount;
    } else {
      finalAmount = userCart.cartTotal;
    }
  
    const order = new Order({
      products: userCart.products,
      paymentIntent: {
        id: uniqid(),
        method: "COD",
        amount: finalAmount,
        status: "Cash on Delivery",
        created: Date.now(),
        currency: "rupees",
      },
      address: address,
      orderby: user._id,
      orderStatus: "Cash on Delivery",
    });
    
    await order.save(); 

    let update = userCart.products.map((item) => {
      return {
        updateOne: {
          filter: { _id: item.product._id },
          update: { $inc: { quantity: -item.count, sold: +item.count } },
        },
      };
    });

    const updated = await Product.bulkWrite(update, {});
    res.json({ message: "success" });
  } catch (error) {
    throw new Error(error);
  }
});


const createPrepaidOrder = asyncHandler(async (req, res) => {
  
  const { _id } = req.user;
  validateMongoDbId(_id);
  const PREPAID = true;

  try {
    const user = await User.findById(_id);
    let userCart = await Cart.findOne({ orderby: user._id });

    if (!userCart) throw new Error("Cart not found");

    // Retrieve the couponApplied value from the cart
    const couponApplied = userCart.couponApplied;

    if (!PREPAID) throw new Error("Create Prepaid order failed");


    const address = userCart ? userCart.address : null;
    if (!address) throw new Error("Address information not found in the cart");

    let finalAmount = 0;
    if (couponApplied && userCart.totalAfterDiscount) {
      finalAmount = userCart.totalAfterDiscount;
    } else {
      finalAmount = userCart.cartTotal;
    }
  
    const order = new Order({
      products: userCart.products,
      paymentIntent: {
        id: uniqid(),
        method: "PREPAID",
        amount: finalAmount,
        status: "PREPAID",
        created: Date.now(),
        currency: "rupees",
      },
      address: address,
      orderby: user._id,
      orderStatus: "PREPAID",
    });
    
    await order.save(); 

    let update = userCart.products.map((item) => {
      return {
        updateOne: {
          filter: { _id: item.product._id },
          update: { $inc: { quantity: -item.count, sold: +item.count } },
        },
      };
    });

    const updated = await Product.bulkWrite(update, {});
    res.json({ message: "success" });
  } catch (error) {
    throw new Error(error);
  }
});




const getOrders = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  validateMongoDbId(_id);
  try {
    const userorders = await Order.find({ orderby: _id })
      .populate("products.product")
      .populate("orderby")
      .exec();
      console.log(userorders);
    res.json(userorders);
  } catch (error) {
    throw new Error(error);
  }
});



const getAllOrders = asyncHandler(async (req, res) => {
  try {
    const alluserorders = await Order.find()
      .populate("products.product")
      .populate("orderby")
      .exec();
    res.json(alluserorders);
  } catch (error) {
    throw new Error(error);
  }
});
const getOrderByUserId = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const userorders = await Order.findOne({ orderby: id })
      .populate("products.product")
      .populate("orderby")
      .exec();
    res.json(userorders);
  } catch (error) {
    throw new Error(error);
  }
});
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const updateOrderStatus = await Order.findByIdAndUpdate(
      id,
      {
        orderStatus: status,
        paymentIntent: {
          status: status,
        },
      },
      { new: true }
    );
    res.json(updateOrderStatus);
  } catch (error) {
    throw new Error(error);
  }
});

module.exports = {
  phonepedata,
  createUser,
  createUserAsGuest,
  loginUserCtrl,
  getallUser,
  getaUser,
  deleteaUser,
  updatedUser,
  blockUser,
  unblockUser,
  handleRefreshToken,
  logout,
  loginAdmin,
  getWishlist,
  saveAddress,
  addAddressToCart,
  userCart,
  fetchUserCart,
  getUserCart,
  emptyCart,
  removeCartItem,
  applyCoupon,
  createOrder,
  createPrepaidOrder,
  onlinepayment,
  getOrders,
  updateOrderStatus,
  getAllOrders,
  getOrderByUserId,
};