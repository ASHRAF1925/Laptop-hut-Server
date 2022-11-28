const express = require("express");
const cors = require("cors");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");

//middleware
app.use(cors());
app.use(express.json());

//port
const port = process.env.PORT || 5000;

// Mongo db connection
const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_Password}@cluster0.wbiuqtd.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

//collections

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("unauthorized Access");
  }
  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      console.log(err);
      return res.status(403).send({ message: "forbiden to Access" });
    }
    req.decoded = decoded;

    next();
  });
}

async function run() {
  try {
    const userCollection = client.db("Laptop-Hut").collection("userCollection");
    const brandCollection = client
      .db("Laptop-Hut")
      .collection("BrandsCollection");
    const reportedItems = client.db("Laptop-Hut").collection("reportedItems");
    const productCollection = client
      .db("Laptop-Hut")
      .collection("productCollection");
    const advertiseCollection = client
      .db("Laptop-Hut")
      .collection("advertiseCollection");
    const orderCollection = client
      .db("Laptop-Hut")
      .collection("orderCollection");
    //api for token genaration

    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };

      const user = await userCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {});

        return res.send({ accessToken: token });
      }

      res.status(403).send({ accessToken: "" });
    });

    // insertin user in database
    app.put("/user", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };

      const updatedUser = req.body;
      const options = { upsert: true };

      const newUSer = {
        $set: {
          name: updatedUser.name,
          email: updatedUser.email,
          photoURL: updatedUser.photoURL,
          role: updatedUser.role,
          isverified: updatedUser.isverified,
        },
      };
      const result = await userCollection.updateOne(query, newUSer, options);
      res.send(result);
    });

    // api for geeting single user Info
    app.get("/user/:id", async (req, res) => {
      const email = req.params.id;
      const query = { email: email };

      const result = await userCollection.findOne(query);

      res.send(result);
    });

    // veify admin role
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;

      const query = { email: email };
      const result = await userCollection.findOne(query);

      res.send({ isAdmin: result?.role === "Admin" });
    });

    //verify seller role
    app.get("/users/seller/:email", async (req, res) => {
      const email = req.params.email;
      console.log(email);

      const query = { email: email };
      const result = await userCollection.findOne(query);
      console.log(result);

      res.send({ isSeller: result?.role === "Seller" });
    });

    //verify User role
    app.get("/users/User/:email", async (req, res) => {
      const email = req.params.email;

      const query = { email: email };
      const result = await userCollection.findOne(query);

      res.send({ isUser: result?.role === "User" });
    });

    // api to load product categoris
    app.get("/allcategoris", async (req, res) => {
      const query = {};
      const allBrands = await brandCollection.find(query).toArray();

      res.send(allBrands);
    });

    // admin get all sellers information
    app.get("/admin/sellers", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;

      const userquery = { email: decodedEmail };
      const tempUser = await userCollection.findOne(userquery);
      if (tempUser?.role !== "Admin") {
        return res.status(403).send({ message: "forbiden hello access" });
      }

      const query = { role: "Seller" };
      const allUsers = await userCollection.find(query).toArray();

      res.send(allUsers);
    });

    // admin get all buyers information
    app.get("/admin/Buyers", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;

      const userquery = { email: decodedEmail };
      const tempUser = await userCollection.findOne(userquery);
      if (tempUser?.role !== "Admin") {
        return res.status(403).send({ message: "forbiden hello access" });
      }

      const query = { role: "User" };
      const allUsers = await userCollection.find(query).toArray();

      res.send(allUsers);
    });

    //api to add product by seller
    app.post("/seller/addproduct", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;

      const userquery = { email: decodedEmail };
      const tempUser = await userCollection.findOne(userquery);
      if (tempUser?.role !== "Seller") {
        return res.status(403).send({ message: "forbiden hello access" });
      }

      const product = req.body;

      const result = await productCollection.insertOne(product);
      res.send(result);
    });

    // seller get all my product information
    app.get("/seller/products", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;

      const userquery = { email: decodedEmail };
      const tempUser = await userCollection.findOne(userquery);
      if (tempUser?.role !== "Seller") {
        return res.status(403).send({ message: "forbiden hello access" });
      }

      const query = { email: decodedEmail };

      const allproducts = await productCollection
        .find({ selleremail: decodedEmail })
        .toArray();

      res.send(allproducts);
    });

    //delete a product by seller

    app.delete("/seller/product/:id", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;

      const userquery = { email: decodedEmail };
      const tempUser = await userCollection.findOne(userquery);
      if (tempUser?.role !== "Seller") {
        return res.status(403).send({ message: "forbiden hello access" });
      }

      const id = req.params.id;

      const filter = { _id: ObjectId(id) };

      const result = await productCollection.deleteOne(filter);

      res.send(result);
    });

    //delete a seller by admin

    app.delete("/admin/delete/:id", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;

      const userquery = { email: decodedEmail };
      const tempUser = await userCollection.findOne(userquery);
      if (tempUser?.role !== "Admin") {
        return res.status(403).send({ message: "forbiden hello access" });
      }

      const id = req.params.id;

      const filter = { _id: ObjectId(id) };

      const result = await userCollection.deleteOne(filter);

      res.send(result);
    });

    // admin verify user

    app.put("/admin/verify/:id", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;

      const userquery = { email: decodedEmail };
      const tempUser = await userCollection.findOne(userquery);
      if (tempUser?.role !== "Admin") {
        return res.status(403).send({ message: "forbiden hello access" });
      }

      const id = req.params.id;

      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };

      const updatedDoc = {
        $set: {
          isverified: true,
        },
      };
      const result = await userCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      // geting the email

      const queryforseller = { _id: ObjectId(id) };
      const updatedSeller = await userCollection.findOne(queryforseller);

      // updating status in products

      const useremail = { selleremail: updatedSeller.email };
      console.log(useremail);

      const updatedProducts = {
        $set: {
          issellerverified: true,
        },
      };

      const confirm = await productCollection.updateMany(
        useremail,
        updatedProducts
      );
      console.log(confirm);

      res.send(result);
    });

    //api to advertise product by seller
    app.post("/seller/advertise", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;

      const userquery = { email: decodedEmail };
      const tempUser = await userCollection.findOne(userquery);
      if (tempUser?.role !== "Seller") {
        return res.status(403).send({ message: "forbiden hello access" });
      }

      const product = req.body;
      console.log(product);

      const Product_id = req.body._id;
      const queryforupdate = { _id: ObjectId(Product_id) };

      const updatedProducts = {
        $set: {
          isAdvertized: true,
        },
      };

      const confirm = await productCollection.updateOne(
        queryforupdate,
        updatedProducts
      );
      console.log(confirm);

      const result = await advertiseCollection.insertOne(product);
      res.send(result);
    });

    //send product by category

    app.get("/category/:id", async (req, res) => {
      console.log("send product");

      const id = req.params.id;
      console.log(id);

      const filter = {
        brand: id,
      };
      console.log(filter);

      const result = await productCollection.find(filter).toArray();
      console.log(result);

      res.send(result);
    });
    // get the advertise products
    app.get("/advertise/products", async (req, res) => {
      const filter = {};

      const result = await advertiseCollection.find(filter).toArray();
      console.log(result);

      res.send(result);
    });

    // api for adding order by buyer
    app.post("/buyer/order", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      console.log("Adding product");

      const userquery = { email: decodedEmail };
      const tempUser = await userCollection.findOne(userquery);
      if (tempUser?.role !== "User") {
        return res.status(403).send({ message: "forbiden hello access" });
      }

      const product = req.body;

      const result = await orderCollection.insertOne(product);
      res.send(result);
    });

    // get the ordr Lists
    app.get("/buyer/orders", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;

      const userquery = { email: decodedEmail };
      const tempUser = await userCollection.findOne(userquery);
      if (tempUser?.role !== "User") {
        return res.status(403).send({ message: "forbiden hello access" });
      }

      const query = { email: decodedEmail };
      console.log("myorders");

      const allproducts = await orderCollection
        .find({ buyerEmail: decodedEmail })
        .toArray();
      console.log(allproducts);

      res.send(allproducts);
    });

    // reported Item
    app.post("/admin/reportedItem", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      console.log("Adding product");

      const userquery = { email: decodedEmail };
      const tempUser = await userCollection.findOne(userquery);
      if (tempUser?.role !== "User") {
        return res.status(403).send({ message: "forbiden hello access" });
      }

      const product = req.body;

      const result = await reportedItems.insertOne(product);
      res.send(result);
    });

    //api to get all reported Item by admin
    // reported Item
    app.get("/admin/reportedItem", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      console.log("Adding product");

      const userquery = { email: decodedEmail };
      const tempUser = await userCollection.findOne(userquery);
      if (tempUser?.role !== "Admin") {
        return res.status(403).send({ message: "forbiden hello access" });
      }

      const filter = {};

      const result = await reportedItems.find(filter).toArray();
      res.send(result);
    });

    // api to delte reporte Item
    app.delete("/admin/reported/delete/:id", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      console.log("delete reported Item");
      const userquery = { email: decodedEmail };
      const tempUser = await userCollection.findOne(userquery);
      console.log(tempUser);
      if (tempUser?.role !== "Admin") {
        return res.status(403).send({ message: "forbiden hello access" });
      }

      const id = req.params.id;
      console.log(id);

      const filter = { _id: ObjectId(id) };

      const result = await reportedItems.deleteOne(filter);

      res.send(result);
    });

    // try end
  } finally {
  }
}
run().catch(console.log);

// api for checking server working
app.get("/", (req, res) => {
  res.send(`Server is running on port ${port}`);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
