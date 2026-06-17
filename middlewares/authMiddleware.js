const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");

const authMiddleware = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    res.status(401);
    throw new Error("No token attached to header");
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    res.status(401);
    throw new Error("No token attached to header");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    res.status(401);
    throw new Error("Not authorized, token expired or invalid. Please login again");
  }

  const user = await User.findById(decoded?.id).select("-password");
  if (!user) {
    res.status(401);
    throw new Error("User not found");
  }

  req.user = user;
  next();
});

const isAdmin = asyncHandler(async (req, res, next) => {
  if (req.user?.role !== "admin") {
    res.status(403);
    throw new Error("You are not authorized as admin");
  }
  next();
});

module.exports = { authMiddleware, isAdmin };