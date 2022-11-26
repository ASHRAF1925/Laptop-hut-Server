const express = require("express");
const cors = require("cors");
const app = express();
const { MongoClient, ServerApiVersion } = require("mongodb");
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
const userCollection = client.db("Laptop-Hut").collection("userCollection");
const brandCollection = client.db("Laptop-Hut").collection("BrandsCollection");

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("unauthorized Access");
  }
  const token = authHeader.split(" ")[1];
  console.log("found token", token);
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      console.log(err);
      return res.status(403).send({ message: "forbiden to Access" });
    }
    req.decoded = decoded;
    console.log(decoded);
    next();
  });
}

async function run() {
  try {
    //api for token genaration

    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      console.log(query);
      const user = await userCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {});
        console.log("new token", token);
        return res.send({ accessToken: token });
      }
      console.log(user);
      res.status(403).send({ accessToken: "" });
    });

    // insertin user in database
    app.put("/user", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      console.log(query);
      const updatedUser = req.body;
      const options = { upsert: true };
      console.log(updatedUser);

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
      console.log(result);
      res.send(result);
    });

    // veify admin role
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      console.log(email);
      const query = { email: email };
      const result = await userCollection.findOne(query);
      console.log(result);
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

   // api to load product categoris
    app.get("/allcategoris", async (req, res) => {
      const query = {};
      const allBrands = await brandCollection.find(query).toArray();
      console.log(allBrands);
      res.send(allBrands);
    });

   
      // admin get all user information
    app.get("/admin/users", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      console.log("from all user", decodedEmail);
      const userquery = { email: decodedEmail };
      const tempUser = await userCollection.findOne(userquery);
      if (tempUser?.role !== "Admin") {
        return res.status(403).send({ message: "forbiden hello access" });
      }

      const query = {};
      const allUsers = await userCollection.find(query).toArray();
      console.log(allUsers);
      res.send(allUsers);
    });
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
