const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../public/images/"));
  },
  filename: function (req, file, cb) {
    // You can use req.imageType to set the type of image (e.g., "product" or "review")
    const prefix = req.imageType ? `${req.imageType}-` : "";
    const uniquesuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, prefix + file.fieldname + "-" + uniquesuffix + ".jpeg");
  }, 
});

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb({ message: "Unsupported file format" }, false);
  }
};

const uploadPhoto = multer({
  storage: storage,
  fileFilter: multerFilter,
  limits: { fileSize: 10000000 },
});

const productImgResize = async (req, res, next) => {
  if (!req.files) return next();
  
  // You can customize the resize logic based on the image type
  const resizeOptions = req.imageType === "review" ? { width: 200, height: 200 } : { width: 300, height: 300 };

  await Promise.all(
    req.files.map(async (file) => {
      // Define the path based on the image type
      const destinationPath = req.imageType === "review" ? "public/images/reviews/" : "public/images/products/";

      await sharp(file.path)
        .resize(resizeOptions.width, resizeOptions.height)
        .toFormat("jpeg")
        .jpeg({ quality: 100})
        .toFile(`${destinationPath}${file.filename}`);
      fs.unlinkSync(`${destinationPath}${file.filename}`);
    })
  );
  next();
};
module.exports = { uploadPhoto, productImgResize, };