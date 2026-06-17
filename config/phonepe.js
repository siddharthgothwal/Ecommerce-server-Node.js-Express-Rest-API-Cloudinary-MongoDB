const sha256 = require("sha256");
const axios = require("axios");
const keyGen = require("./keygen");
const Cart = require("../models/cartModel");

class PhonePe {
  constructor() {
    this.merchantId = process.env.PHONEPE_MERCHANT_ID;
    this.merchantUserId = process.env.PHONEPE_MERCHANT_USER_ID;
    this.callbackUrl = process.env.PHONEPE_CALLBACK_URL;
    this.secretKey = process.env.PHONEPE_KEY;

    if (!this.merchantId || !this.merchantUserId || !this.callbackUrl || !this.secretKey) {
      throw new Error("PhonePe configuration is incomplete. Please set environment variables.");
    }
  }

  async fetchUserCart(userId) {
    try {
      return await Cart.findOne({ orderby: userId }).populate("products.product").lean();
    } catch (error) {
      throw new Error(`Unable to fetch cart for user: ${error.message}`);
    }
  }

  async createTxn() {
    this.tnxId = await keyGen();
    return this.tnxId;
  }

  base64Encode(payload) {
    return Buffer.from(JSON.stringify(payload)).toString("base64");
  }

  buildChecksum(payload) {
    const input = `${payload}/pg/v1/pay${this.secretKey}`;
    return `${sha256(input)}###1`;
  }

  async generate(userId, finalAmount) {
    if (!userId) {
      throw new Error("User ID is required to generate a payment request.");
    }

    if (!finalAmount || finalAmount <= 0) {
      throw new Error("A valid payment amount is required.");
    }

    if (!this.tnxId) {
      await this.createTxn();
    }

    const cart = await this.fetchUserCart(userId);
    if (!cart) {
      throw new Error("Cart not found for the provided user.");
    }

    const mobileNumber = cart.address?.[0]?.mobile;
    await Cart.updateOne({ orderby: userId }, { transactionId: this.tnxId });

    const payload = {
      merchantId: this.merchantId,
      merchantUserId: this.merchantUserId,
      amount: finalAmount,
      merchantTransactionId: this.tnxId,
      callbackUrl: this.callbackUrl,
      redirectUrl: this.callbackUrl,
      redirectMode: "GET",
      mobileNumber,
      paymentInstrument: {
        type: "PAY_PAGE",
      },
    };

    const base64Data = this.base64Encode(payload);
    const checksum = this.buildChecksum(base64Data);

    return await this.sendRequest(checksum, base64Data);
  }

  async sendRequest(xVerify, body) {
    try {
      const response = await axios.post(
        "https://api.phonepe.com/apis/hermes/pg/v1/pay",
        { request: body },
        {
          headers: {
            "Content-Type": "application/json",
            "X-VERIFY": xVerify,
          },
        }
      );
      return response.data.data;
    } catch (error) {
      const code = error.response?.data?.code || error.code || "UNKNOWN";
      throw new Error(`PhonePe request failed: ${code} - ${error.message}`);
    }
  }

  buildStatusChecksum(merchantId, merchantTransactionId) {
    const payload = `${merchantId}/${merchantTransactionId}`;
    const input = `${payload}/pg/v1/status${this.secretKey}`;
    return `${sha256(input)}###1`;
  }

  async checkStatus(merchantId, merchantTransactionId) {
    if (!merchantId || !merchantTransactionId) {
      throw new Error("Merchant ID and transaction ID are required to check payment status.");
    }

    const checksum = this.buildStatusChecksum(merchantId, merchantTransactionId);
    const url = `https://api.phonepe.com/apis/hermes/pg/v1/status/${merchantId}/${merchantTransactionId}`;

    try {
      const response = await axios.get(url, {
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          "X-VERIFY": checksum,
          "X-MERCHANT-ID": merchantId,
        },
      });
      return response.data;
    } catch (error) {
      const code = error.response?.data?.code || error.code || "UNKNOWN";
      throw new Error(`PhonePe status check failed: ${code} - ${error.message}`);
    }
  }
}

module.exports = { PhonePe };