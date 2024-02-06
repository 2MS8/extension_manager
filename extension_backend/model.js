const mongoose = require("mongoose");

const dataSchema = mongoose.Schema(
  {
    panelid: {
      type: String,
      required: false,
    },

    referer: {
      type: String,
      required: false,
    },
    url: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: false,
  }
);

const Product = mongoose.model("Product", dataSchema);
module.exports = Product;
