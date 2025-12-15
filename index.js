import express from "express";
import cors from "cors";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
dotenv.config();

const port = process.env.PORT || 3030;
const app = express();

// middleware
app.use(
  cors({
    origin: [
      "https://mrirakib-ph-assignment-11.netlify.app",
      "http://localhost:5173",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_ACCESS}@cluster0.bfqzn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    // Connections
    const database = client.db(process.env.DB_NAME);
    const usersCollection = database.collection("users");
    const productsCollection = database.collection("products");

    // GET All Users
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });
    // CREATE New User
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const exists = await usersCollection.findOne({ email: newUser.email });

      if (exists) {
        return res.status(409).send({ message: "User already exists" });
      }

      const result = await usersCollection.insertOne(newUser);
      res.send(result);
    });
    // GET Single User by Email
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const result = await usersCollection.findOne({ email });
      res.send(result);
    });

    // CREATE New Product
    app.post("/products", async (req, res) => {
      const product = req.body;

      if (!product?.title || !product?.productOwner) {
        return res.status(400).send({ message: "Missing required fields" });
      }

      product.createdAt = new Date();
      product.status = "active";

      const result = await productsCollection.insertOne(product);
      res.send(result);
    });
    // GET Products by Product Owner with pagination
    app.get("/admin/products", async (req, res) => {
      const ownerEmail = req.query.owner;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const skip = (page - 1) * limit;
      const query = ownerEmail ? { productOwner: ownerEmail } : {};

      const total = await productsCollection.countDocuments(query);
      const products = await productsCollection
        .find(query)
        .skip(skip)
        .limit(limit)
        .toArray();

      res.send({
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        products,
      });
    });
    // DELETE Product
    app.delete("/products/:id", async (req, res) => {
      const { id } = req.params;

      const result = await productsCollection.deleteOne({
        _id: new ObjectId(id),
      });

      res.send(result);
    });
    // UPDATE showOnHome
    app.patch("/products/show-home/:id", async (req, res) => {
      const { id } = req.params;
      const { showOnHome } = req.body;

      const result = await productsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { showOnHome } }
      );

      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("NextRun Tracker server");
});

app.listen(port, () => {
  console.log(`NextRun Tracker server listening on port ${port}`);
});
