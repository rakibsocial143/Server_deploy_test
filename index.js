const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const port = process.env.PORT || 7001;

const app = express();


// ================= FIREBASE ADMIN =================

const decoded = Buffer.from(
  process.env.FIREBASE_SERVICE_KEY,
  "base64"
).toString("utf8");

const serviceAccount = JSON.parse(decoded);

const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

initializeApp({
  credential: cert(serviceAccount),
});


// ================= MIDDLEWARE =================

app.use(cors());
app.use(express.json());


// ================= FIREBASE TOKEN VERIFY =================

const verifyFireBaseToken = async (req, res, next) => {
  console.log("firebase token verify token");

  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).send({
      message: "unauthorized access",
    });
  }

  const token = authorization.split(" ")[1];

  try {
    const decoded = await getAuth().verifyIdToken(token);

    console.log("inside token", decoded);

    req.token_email = decoded.email;

    next();
  } catch (err) {
    console.log("Firebase token error:", err);

    return res.status(401).send({
      message: "unauthorized access",
    });
  }
};


// ================= DNS =================

const dns = require("dns");

dns.setServers(["8.8.8.8", "1.1.1.1"]);


// ================= MONGODB =================

const uri =
  `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASSWORD}@cluster0.n6kwrng.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});


// ================= COLLECTION VARIABLES =================

let productCollection;
let bidsCollection;


// ================= DATABASE CONNECTION =================

async function connectDB() {

  // Already connected হলে আবার connect করবে না
  if (productCollection && bidsCollection) {
    return;
  }

  try {
    await client.connect();

    const db = client.db("Smart_M_DB");

    productCollection = db.collection("products");
    bidsCollection = db.collection("bids");

    console.log("MongoDB connected successfully");

  } catch (error) {

    console.error("MongoDB connection failed:", error);

    throw error;
  }
}


// ================= HOME =================

app.get("/", (req, res) => {
  res.send("Smart Deals Server More");
});


// ==================================================
//                  PRODUCTS
// ==================================================


// GET SINGLE PRODUCT

app.get("/products/:id", async (req, res) => {

  try {

    await connectDB();

    const id = req.params.id;

    const query = {
      _id: new ObjectId(id),
    };

    const result = await productCollection.findOne(query);

    res.send(result);

  } catch (error) {

    console.error(error);

    res.status(500).send({
      message: "Failed to get product",
    });
  }
});


// GET LATEST PRODUCTS

app.get("/latest-product", async (req, res) => {

  try {

    await connectDB();

    const result = await productCollection
      .find()
      .limit(8)
      .sort({ created_at: -1 })
      .toArray();

    res.send(result);

  } catch (error) {

    console.error(error);

    res.status(500).send({
      message: "Failed to get latest products",
    });
  }
});


// GET ALL PRODUCTS

app.get("/products", async (req, res) => {

  try {

    await connectDB();

    const email = req.query.email;

    const query = {};

    if (email) {
      query.email = email;
    }

    const result = await productCollection
      .find(query)
      .toArray();

    res.send(result);

  } catch (error) {

    console.error(error);

    res.status(500).send({
      message: "Failed to get products",
    });
  }
});


// CREATE PRODUCT

app.post("/products", verifyFireBaseToken, async (req, res) => {

  try {

    await connectDB();

    const newProduct = req.body;

    const result = await productCollection.insertOne(newProduct);

    res.send(result);

  } catch (error) {

    console.error(error);

    res.status(500).send({
      message: "Failed to add product",
    });
  }
});


// UPDATE PRODUCT

app.patch("/products/:id", async (req, res) => {

  try {

    await connectDB();

    const id = req.params.id;

    const product = req.body;

    const query = {
      _id: new ObjectId(id),
    };

    const updateProduct = {
      $set: {
        title: product.title,
        price_max: product.price_max,
        image: product.image,
      },
    };

    const result = await productCollection.updateOne(
      query,
      updateProduct
    );

    res.send(result);

  } catch (error) {

    console.error(error);

    res.status(500).send({
      message: "Failed to update product",
    });
  }
});


// DELETE PRODUCT

app.delete("/products/:id", async (req, res) => {

  try {

    await connectDB();

    const id = req.params.id;

    const query = {
      _id: new ObjectId(id),
    };

    const result = await productCollection.deleteOne(query);

    res.send(result);

  } catch (error) {

    console.error(error);

    res.status(500).send({
      message: "Failed to delete product",
    });
  }
});


// ==================================================
//                     BIDS
// ==================================================


// GET BIDS FOR A PRODUCT

app.get("/product/bids/:id", async (req, res) => {

  try {

    await connectDB();

    const id = req.params.id;

    const query = {
      productId: id,
    };

    const result = await bidsCollection
      .find(query)
      .toArray();

    res.send(result);

  } catch (error) {

    console.error(error);

    res.status(500).send({
      message: "Failed to get product bids",
    });
  }
});


// GET MY BIDS

app.get("/bids", verifyFireBaseToken, async (req, res) => {

  try {

    await connectDB();

    console.log("headers", req.headers);

    const email = req.query.email;

    if (!email) {
      return res.status(400).send({
        message: "Email is required",
      });
    }

    // User নিজের email-এর data দেখতে পারবে
    if (email !== req.token_email) {
      return res.status(403).send({
        message: "forbidden access",
      });
    }

    const query = {
      buyer_email: email,
    };

    const cursor = await bidsCollection
      .find(query)
      .toArray();

    res.send(cursor);

  } catch (error) {

    console.error(error);

    res.status(500).send({
      message: "Failed to get bids",
    });
  }
});


// GET SINGLE BID

app.get("/bids/:id", async (req, res) => {

  try {

    await connectDB();

    const id = req.params.id;

    const query = {
      _id: new ObjectId(id),
    };

    const result = await bidsCollection
      .find(query)
      .toArray();

    res.send(result);

  } catch (error) {

    console.error(error);

    res.status(500).send({
      message: "Failed to get bid",
    });
  }
});


// CREATE BID

app.post("/bids", async (req, res) => {

  try {

    await connectDB();

    const newBids = req.body;

    const result = await bidsCollection.insertOne(newBids);

    res.send(result);

  } catch (error) {

    console.error(error);

    res.status(500).send({
      message: "Failed to add bid",
    });
  }
});


// DELETE BID

app.delete("/bids/:id", async (req, res) => {

  try {

    await connectDB();

    const id = req.params.id;

    const query = {
      _id: new ObjectId(id),
    };

    const result = await bidsCollection.deleteOne(query);

    res.send(result);

  } catch (error) {

    console.error(error);

    res.status(500).send({
      message: "Failed to delete bid",
    });
  }
});


// UPDATE BID

app.patch("/bids/:id", async (req, res) => {

  try {

    await connectDB();

    const id = req.params.id;

    const query = {
      _id: new ObjectId(id),
    };

    const product = req.body;

    const newProduct = {
      $set: {
        buyer_name: product.buyer_name,
        bid_price: product.bid_price,
      },
    };

    const result = await bidsCollection.updateOne(
      query,
      newProduct
    );

    res.send(result);

  } catch (error) {

    console.error(error);

    res.status(500).send({
      message: "Failed to update bid",
    });
  }
});


// ================= LOCAL SERVER =================

if (process.env.NODE_ENV !== "production") {

  app.listen(port, () => {

    console.log(
      `Smart Deals Server Running Now on Port : ${port}`
    );

  });

}


// ================= VERCEL =================

module.exports = app;