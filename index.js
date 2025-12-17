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
    // UPDATE user
    app.patch("/users/role/:id", async (req, res) => {
      const { id } = req.params;
      const { role } = req.body;

      const result = await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { role } }
      );

      res.send(result);
    });
    // SUSPEND user
    app.patch("/users/suspend/:id", async (req, res) => {
      const { id } = req.params;
      const { suspendReason } = req.body;

      const result = await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            status: "suspended",
            suspendReason,
          },
        }
      );

      res.send(result);
    });
    // ACTIVATE user
    app.patch("/users/activate/:id", async (req, res) => {
      const { id } = req.params;

      const result = await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            status: "active",
            suspendReason: "",
          },
        }
      );

      res.send(result);
    });
    // Assign manager
    app.put("/users/assign/:email", async (req, res) => {
      try {
        const { email } = req.params;
        const { managerFor } = req.body;

        const result = await usersCollection.updateOne(
          { email },
          { $set: { managerFor } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "User not found" });
        }

        res.send({ success: true, message: "Manager assigned successfully" });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Server error" });
      }
    });
    // Discharge manager
    app.put("/users/discharge/:email", async (req, res) => {
      try {
        const { email } = req.params;
        const { managerFor } = req.body;

        const result = await usersCollection.updateOne(
          { email },
          { $set: { managerFor } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "User not found" });
        }

        res.send({ success: true, message: "Manager assigned successfully" });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Server error" });
      }
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
    // GET All Products for General Page (with pagination)
    app.get("/general/page/products", async (req, res) => {
      try {
        const { category, search, sort, page = 1 } = req.query;

        const limit = 12;
        const skip = (Number(page) - 1) * limit;

        let query = { status: "active" };

        if (category) {
          query.category = category;
        }

        if (search) {
          query.title = { $regex: search, $options: "i" };
        }

        let sortQuery = {};
        if (sort === "price_asc") sortQuery.price = 1;
        if (sort === "price_desc") sortQuery.price = -1;

        const total = await productsCollection.countDocuments(query);

        const products = await productsCollection
          .find(query)
          .sort(sortQuery)
          .skip(skip)
          .limit(limit)
          .toArray();

        res.send({
          products,
          total,
          page: Number(page),
          totalPages: Math.ceil(total / limit),
        });
      } catch (error) {
        res.status(500).send({ message: "Failed to load products" });
      }
    });
    // GET Single Product for General Details Page
    app.get("/general/product/:id", async (req, res) => {
      try {
        const { id } = req.params;

        const product = await productsCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!product) {
          return res.status(404).send({ message: "Product not found" });
        }

        res.send(product);
      } catch (error) {
        res.status(500).send({ message: "Failed to load product details" });
      }
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
