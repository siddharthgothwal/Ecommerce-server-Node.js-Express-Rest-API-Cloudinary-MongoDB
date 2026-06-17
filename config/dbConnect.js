const mongoose = require("mongoose");

const dbConnect = async () => {
  try {
    const mongoUrl = process.env.MONGODB_URL;
    if (!mongoUrl) {
      throw new Error("MONGODB_URL is not defined in environment variables");
    }

    await mongoose.connect(mongoUrl);
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = dbConnect;
