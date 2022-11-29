const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_KEY);
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.xvlwhga.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyingToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).send("sorry unauthrized access");
  }
  const token = header.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const userscollection = client.db("bookHub").collection("users");
    const productcategoriesCollection = client.db("bookHub").collection("productcategories");
    const allProductscollection = client.db("bookHub").collection("allProducts");
    const bookedproductcollection = client.db("bookHub").collection("bookedproduct");

    // veryfy admin function
    const adminVerify = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await userscollection.findOne(query);

      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // get three categories 
    app.get("/categories", async (req, res) => {
      const query = {};
      const categoriesbook = await productcategoriesCollection
        .find(query)
        .toArray();
      res.send(categoriesbook);
    });

    // get specific data by id
    app.get("/categories/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const category = await productcategoriesCollection.findOne(query);
      res.send(category);
    });

    // get booked product for buying
    app.get("/product/purchase/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await bookedproductcollection.findOne(query);
      res.send(result);
    });

    // get all seller by jwt and admin verify
    app.get("/seller", verifyingToken, adminVerify, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { role: "seller" };
      const seller = await userscollection.find(query).toArray();
      res.send(seller);
    });

    // get campain data
    app.get("/campaign", async (req, res) => {
      const query = {
        campain: true,
        sold:false
      };
      const campaininfo = await allProductscollection.find(query,  {_id:1,_id:0}).sort({"_id":-1}).limit(2).toArray();
      res.send(campaininfo);
    });

    // get all seller
    app.get("/buyer", verifyingToken, adminVerify, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { role: "buyer" };
      const seller = await userscollection.find(query).toArray();
      res.send(seller);
    });

    // get similar type of book category
    app.get("/allproducts/", verifyingToken, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const brand_name = req.query.category_name;
      const query = { 
        brand_name: brand_name,
        sold: false
     };
      const result = await allProductscollection.find(query).toArray();
      res.send(result);
    });

    // get book
    app.get("/myproduct", verifyingToken, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { userEmail: email };
      const result = await allProductscollection.find(query).toArray();
      res.send(result);
    });

    // get jwt token for admin and seller
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await userscollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "8h",
        });
        return res.send({ jwtToken: token });
      }
      res
        .status(403)
        .send({ jwtToken: "sorry you have not permissiton for access" });
    });

    // get admin access
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await userscollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });

    // get seller access
    app.get("/users/seller/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await userscollection.findOne(query);
      res.send({ isSeller: user?.role === "seller" });
    });

    // get my booking
    app.get("/bookingproduct", verifyingToken, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const mybooking = await bookedproductcollection.find(query).toArray();
      res.send(mybooking);
    });

    // get reported items admin dashboard
    app.get('/report', verifyingToken, adminVerify, async (req,res)=>{
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { report : true }
      const result = await allProductscollection.find(query).toArray()
      res.send(result)
    })
    // get specific user info

    app.get("/user", async (req, res) => {
      const username = req.query.sellerName;
      const query = { name: username };
      const result = await userscollection.findOne(query);
      res.send(result);
    });

    // payment system
    app.post("/create-payment-intent", async (req, res) => {
      const booking = req.body;
      const price = parseInt(booking.product_price);
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    // user info add in database
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await userscollection.insertOne(user);
      res.send(result);
    });

    // book add in database
    app.post("/allproducts", verifyingToken, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const products = req.body;
      const result = await allProductscollection.insertOne(products);
      res.send(result);
    });

    app.post("/bookingproduct", verifyingToken, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const bookedproduct = req.body;
      const result = await bookedproductcollection.insertOne(bookedproduct);
      res.send(result);
    });


    app.put("/users", verifyingToken, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const id = req.query.userid;
      console.log(id);
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          verified: true,
        },
      };

      const result = await userscollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    // update payment info
    app.put("/addpayment", verifyingToken, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const sellerEmail = req.query.sellerEmail;
      const productName = req.query.product_name;

      const filter = {
        userEmail:sellerEmail,
        product_name:productName

       };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          sold: true,
          campain: false,

        },
      };

      const result = await allProductscollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    // update payment info
    app.put("/paymentbooked", verifyingToken, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const sellerEmail = req.query.sellerEmail;
      const productName = req.query.product_name;

      const filter = {
        sellerEmail:sellerEmail,
        product_name:productName

       };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          sold: true,
        },
      };

      const result = await bookedproductcollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });


    // capaigning books
    app.put("/campaign", verifyingToken, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const id = req.query.productId;
      console.log(id);
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          campain: true,
        },
      };

      const result = await allProductscollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    // report books - to admin
    app.put("/report", verifyingToken, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const id = req.query.id;
      console.log(id);
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          report: true
        },
      };

      const result = await allProductscollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    // delete user by admin

    app.delete('/deleteuser', async (req,res)=>{
      const id = req.query.id
      const query = { _id: ObjectId(id)}
      const result = await userscollection.deleteOne(query)
      res.send(result)
    })


  } finally {
  }
}
run().catch(console.log());

app.get("/", (req, res) => {
  res.send("Book Back Server is Running");
});
app.listen(port, () => {
  console.log(`Book Back server listening on port ${port}`);
});




