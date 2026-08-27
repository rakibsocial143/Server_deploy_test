const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const port = process.env.PORT || 5001;
require('dotenv').config();

const app = express();

// firebase service accout old virtion
// const admin = require("firebase-admin");

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

// jwt verify 
const jwt = require('jsonwebtoken');




// firebase admin new virtion
const serviceAccount = require("./smart-deals-more-KEY.json");
const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
initializeApp({ 
  credential: cert(serviceAccount) 
});

app.use(cors());
app.use(express.json());

const verifyFireBaseToken = async ( req, res, next ) => {
  console.log('firebase token verify token')
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({message: "unauthorized access"})
  }
  const token = authorization.split(' ')[1];
  try{
    const decoded = await getAuth().verifyIdToken(token);
    console.log('inside token', decoded);
    req.token_email = decoded.email;
    next()
  }
  catch(err){
    return res.status(401).send({message: 'unauthorized access'})
  }

}

// const logger = (req, res, next) => {
//   console.log("logging info");
//   next();
// };
// firebase token verify
// const verifyFirebaseToken = async (req, res, next) => {
//   console.log("headers", req.headers.authorization);

//   if (!req.headers.authorization) {
//     return res.status(401).send({ message: "unauthorization access" });
//   }

//   const token = req.headers.authorization.split(" ")[1];
//   if (!token) {
//     return res.status(401).send({ massge: "unauthorization access" });
//   }

//   try {
//     const userInfo = await getAuth().verifyIdToken(token);
//     console.log("after token validation", userInfo);
//     req.token_email = userInfo.email;
//     next();
//   } 
//   catch {
//     return res.status(401).send({ massge: "unauthorization access" });
//   }

//   // verify id token
// };

// JWT Verify Token 
// const verifyJWTToken = (req, res, next) => {
//   // console.log('in middleware',req.headers);
//   const authorization = req.headers.authorization;
//   if(!authorization){
//     return res.status(401).send({message: 'unauthorizaton access'})
//   }
//   const token = authorization.split(" ")[1];
//   if(!token){
//     return res.status(401).send({message: 'unauthorizaton access'})
//   }

//   jwt.verify(token,process.env.JWT_SECRET, (err , decoded) => {
//     if(err){
//       console.log(err)
//     }
//     // put it in the right place
//     console.log('after decoded', decoded)
//     req.token_email = decoded.email;
//     next()
//   })

// }








const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

// this is URI USERNAME:smarMdb PASS: 3pmkT8YESKBLZMVT
const uri =
  `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASSWORD}@cluster0.n6kwrng.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    await client.connect();

    const db = client.db("Smart_M_DB");
    const productCollection = db.collection("products");
    const bidsCollection = db.collection("bids");

    // _________JWT TOKEN GENARATE_____________

    // app.post('/getjwttoken', async (req, res) => {
    //   const loggedUser = req.body;
    //   const token = jwt.sign(loggedUser,process.env.JWT_SECRET, {expiresIn: '12h'})
    //   res.send({token: token})

    // })


    // _________ONLY PRODUCT APIS ________________

    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });

    app.get("/latest-product", async (req, res) => {
      const cursor = await productCollection
        .find()
        .limit(8)
        .sort({ created_at: -1 })
        .toArray();
      res.send(cursor);
    });

    app.get("/products", async (req, res) => {
      const email = req.query.email;
      const query = {};
      if (email) {
        query.email = email;
      }
      const cursor = await productCollection.find(query).toArray();
      res.send(cursor);
    });

    app.post("/products",verifyFireBaseToken, async (req, res) => {
      // console.log('header in the post', req.headers)
      const newProduct = req.body;
      const result = await productCollection.insertOne(newProduct);
      res.send(result);
    });

    app.patch("/products/:id", async (req, res) => {
      const id = req.params.id;
      const product = req.body;
      const query = { _id: new ObjectId(id) };
      const updateProduct = {
        $set: {
          title: product.title,
          price_max: product.price_max,
          image: product.image,
        },
      };

      const result = await productCollection.updateOne(query, updateProduct);
      res.send(result);
    });

    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.send(result);
    });

    // _________ONLY PRODUCT APIS ________________

    // ________FOR BIDS COLLECTIONS_______________


    // This is for Product er bids

    app.get("/product/bids/:id", async (req, res) => {
      const id = req.params.id;
      const query = { productId: id };
      const result = await bidsCollection.find(query).toArray();
      res.send(result);
    });

    // jwt token verify
    app.get('/bids',verifyFireBaseToken, async ( req, res ) => {
      console.log('headers', req.headers)
      const email = req.query.email;
      const query = {};
      if(query){
        query.buyer_email = email;
        if(email !== req.token_email){
          return res.status(403).send({message: 'forbidden access'})
        }
      }

      // verify user have access to see this data
      // if(email !== req.token_email){
      //   return res.status(403).send({message: 'forbidden access'})
      // }

      const cursor = await bidsCollection.find(query).toArray();
      res.send(cursor)

    })


    // bids related apis with firebase token verify 
    // app.get("/bids", logger, verifyFirebaseToken, async (req, res) => {
    //   console.log('headers', req)

    //   const email = req.query.email;
    //   const query = {};
    //   if (email) {
    //     if(email !== req.token_email ){
    //         return res.status(403).send({message: 'forbidden access'})
    //     }
    //     query.buyer_email = email;
    //   }

    //   const cursor = await bidsCollection.find(query).toArray();
    //   res.send(cursor);
    // });

    app.get("/bids/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bidsCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/bids", async (req, res) => {
      const newBids = req.body;
      const result = await bidsCollection.insertOne(newBids);
      res.send(result);
    });

    app.delete("/bids/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bidsCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/bids/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const product = req.body;
      const newProduct = {
        $set: {
          buyer_name: product.buyer_name,
          bid_price: product.bid_price,
        },
      };
      const result = await bidsCollection.updateOne(query, newProduct);
      res.send(result);
    });

    // ________FOR BIDS COLLECTIONS_______________
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Smart Deals Server More");
});

app.listen(port, () => {
  console.log(`Smart Deals Server Running Now on Port : ${port}`);
});
