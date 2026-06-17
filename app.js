require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const dbConnect = require("./config/dbConnect");
const { notFound, errorHandler } = require("./middlewares/errorHandler");

const authRouter = require("./routes/authRoute");
const productRouter = require("./routes/productRoute");
const categoryRouter = require("./routes/prodcategoryRoute");
const colorRouter = require("./routes/colorRoute");
const enqRouter = require("./routes/enqRouter");
const couponRouter = require("./routes/couponRoute");
const uploadRouter = require("./routes/uploadRoute");

const app = express();
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  })
);

app.use("/api/user", authRouter);
app.use("/api/product", productRouter);
app.use("/api/category", categoryRouter);
app.use("/api/coupon", couponRouter);
app.use("/api/color", colorRouter);
app.use("/api/enquiry", enqRouter);
app.use("/api/upload", uploadRouter);

app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  await dbConnect();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();