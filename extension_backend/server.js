const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Product = require("./model");
//middleware

app.use(express.json());

//routes

// app.get("/", (req, res) => {
//   res.send("hello node api for clickstream");
// });

app.post("/clickstream", async (req, res) => {
  try {
    const data = await Product.create(req.body);
    res.status(200).json(data);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});

mongoose
  .connect(
    "mongodb+srv://healer2823:L0pVC67JcJ8BD398@clickstreamdata.mo5zeoe.mongodb.net/flipshopeUser?retryWrites=true&w=majority"
  )
  .then(() => {
    console.log("connected to mongodb");
    app.listen(3000, () => {
      console.log("clickstream backend!");
    });
  })
  .catch((err) => console.log(err));
