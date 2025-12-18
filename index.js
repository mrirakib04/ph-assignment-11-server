import express from "express";
import cors from "cors";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import Stripe from "stripe";
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

const stripe = new Stripe(process.env.STRIPE_SK);

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
    const ordersCollection = database.collection("orders");
    const paymentsCollection = database.collection("payments");

    // Payments
    app.post("/create-payment-intent", async (req, res) => {
      try {
        const { amount, productId } = req.body;

        if (!amount || !productId) {
          return res.status(400).send({ message: "Missing payment info" });
        }

        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // smallest unit
          currency: "bdt", // or "usd"
          metadata: { productId },
        });

        res.send({ clientSecret: paymentIntent.client_secret });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Payment intent failed" });
      }
    });
    app.post("/payments", async (req, res) => {
      try {
        const {
          productId,
          buyerEmail,
          amount,
          currency,
          transactionId,
          paymentMethod,
        } = req.body;

        if (!productId || !buyerEmail || !amount || !transactionId) {
          return res.status(400).send({ message: "Missing payment fields" });
        }

        // prevent duplicate payment save
        const exists = await paymentsCollection.findOne({ transactionId });
        if (exists) {
          return res.status(409).send({ message: "Payment already recorded" });
        }

        const paymentData = {
          productId: productId,
          buyerEmail,
          amount,
          currency: currency || "BDT",
          transactionId,
          paymentMethod: paymentMethod || "card",
          paymentStatus: "succeeded",
          createdAt: new Date(),
        };

        const result = await paymentsCollection.insertOne(paymentData);

        res.send({
          success: true,
          paymentId: result.insertedId,
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to save payment" });
      }
    });

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
    // GET Products by Product Owner with pagination + search
    app.get("/admin/products", async (req, res) => {
      try {
        const ownerEmail = req.query.owner;
        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const skip = (page - 1) * limit;

        // base query
        const query = {};

        if (ownerEmail) {
          query.productOwner = ownerEmail;
        }

        // search by title or category
        if (search) {
          query.$or = [
            { title: { $regex: search, $options: "i" } },
            { category: { $regex: search, $options: "i" } },
          ];
        }

        const total = await productsCollection.countDocuments(query);

        const products = await productsCollection
          .find(query)
          .skip(skip)
          .limit(limit)
          .toArray();

        res.send({
          products,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to load products" });
      }
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
    // UPDATE product
    app.patch("/update/product/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const updatedProduct = req.body;

        const result = await productsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedProduct }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Product not found" });
        }

        res.send({ success: true });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to update product" });
      }
    });

    // CREATE ORDER (COD or PAID)
    app.post("/orders", async (req, res) => {
      try {
        const order = req.body;

        // Basic validation
        if (
          !order.productId ||
          !order.buyerEmail ||
          !order.orderQuantity ||
          !order.totalPrice
        ) {
          return res.status(400).send({ message: "Missing required fields" });
        }

        // Fetch product to validate quantity
        const product = await productsCollection.findOne({
          _id: new ObjectId(order.productId),
        });

        if (!product) {
          return res.status(404).send({ message: "Product not found" });
        }

        if (order.orderQuantity < product.moq) {
          return res.status(400).send({
            message: `Minimum order quantity is ${product.moq}`,
          });
        }

        if (order.orderQuantity > product.quantity) {
          return res.status(400).send({
            message: "Order quantity exceeds available stock",
          });
        }

        // Prepare order object
        const newOrder = {
          ...order,
          paymentStatus:
            order.paymentOption === "CashOnDelivery" ? "pending" : "paid",
          transactionId: order.transactionId || null,
          orderStatus: "pending",
          createdAt: new Date(),
        };

        // Save order
        const result = await ordersCollection.insertOne(newOrder);

        // Reduce product quantity
        await productsCollection.updateOne(
          { _id: new ObjectId(order.productId) },
          { $inc: { quantity: -order.orderQuantity } }
        );

        res.send({
          success: true,
          orderId: result.insertedId,
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to place order" });
      }
    });
    // GET Pending Orders for Manager
    app.get("/orders/pending/:email", async (req, res) => {
      const { email } = req.params;

      const orders = await ordersCollection
        .find({
          orderTo: email,
          orderStatus: "pending",
        })
        .sort({ createdAt: -1 })
        .toArray();

      res.send(orders);
    });
    // APPROVE order
    app.patch("/orders/approve/:id", async (req, res) => {
      const { id } = req.params;

      const result = await ordersCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            orderStatus: "approved",
            approvedAt: new Date(),
          },
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).send({
          success: false,
          message: "Order not found or already processed",
        });
      }

      if (result.modifiedCount === 0) {
        return res.status(409).send({
          success: false,
          message: "Order already approved",
        });
      }

      res.send({
        success: true,
        message: "Order approved successfully",
      });
    });
    // REJECT order (with validation)
    app.patch("/orders/reject/:id", async (req, res) => {
      try {
        const { id } = req.params;

        const result = await ordersCollection.updateOne(
          { _id: new ObjectId(id), orderStatus: "pending" },
          {
            $set: {
              orderStatus: "rejected",
              rejectedAt: new Date(),
            },
          }
        );

        // order not found
        if (result.matchedCount === 0) {
          return res.status(404).send({
            success: false,
            message: "Order not found or already processed",
          });
        }

        // no update happened
        if (result.modifiedCount === 0) {
          return res.status(400).send({
            success: false,
            message: "Order rejection failed",
          });
        }

        res.send({
          success: true,
          message: "Order rejected successfully",
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({
          success: false,
          message: "Failed to reject order",
        });
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
