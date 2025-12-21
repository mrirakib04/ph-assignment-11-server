# PH_Assignment-11 Server

## For: PH_Assignment-11 – NextRun Tracker

This is the **backend server** for **NextRun Tracker**, an e-commerce–based SaaS platform built as part of PH Assignment-11.  
The server is responsible for authentication-related data handling, product management, order processing, payment handling, and dashboard analytics.

---

## Project Overview

NextRun Tracker Server is built with **Node.js, Express, MongoDB, and Stripe**.  
It provides secure, scalable REST APIs to support a role-based frontend system (Buyer / Admin / Manager).

---

## Tech Stack

- **Node.js**
- **Express.js**
- **MongoDB (Atlas)**
- **Stripe API**
- **dotenv**
- **cors**
- **cookie-parser**

---

## Live Site Link

- [https://mrirakib-ph-assignment-11.netlify.app/](https://mrirakib-ph-assignment-11.netlify.app/)

## Client Repository

- [https://github.com/mrirakib04/ph-assignment-11-web](https://github.com/mrirakib04/ph-assignment-11-web)

## Server Repository

- [https://github.com/mrirakib04/ph-assignment-11-server](https://github.com/mrirakib04/ph-assignment-11-server)

---

## 📦 Core Features

### 👤 User Management

- Create user
- Get all users
- Get single user by email
- Assign role (admin / manager / user)
- Suspend & activate users
- Assign / discharge manager responsibility

### 📦 Product Management

- Create product
- Update product
- Delete product
- Toggle `showOnHome`
- Admin product list with:
  - Pagination
  - Search (title, category)
- General product listing with:
  - Pagination
  - Category filter
  - Search
  - Price sorting
- Home page featured products (smart grid logic)

### 🛒 Order Management

- Place order (Cash on Delivery or Paid)
- Auto stock reduction
- Approve order
- Reject order
- Cancel pending order
- Add tracking information
- Track order publicly by Order ID
- Get:
  - Pending orders (manager)
  - Approved orders (manager)
  - All orders (admin with pagination & filter)
  - User’s own orders (pagination, search, filter)

### 💳 Payment System

- Stripe payment intent creation
- Secure payment record saving
- Duplicate payment prevention
- Payment history stored for finance tracking

### 📊 Dashboard Analytics

- Total users
- Total products
- Total orders
- Total revenue (from payments)
- Order status counts:
  - Pending
  - Approved
  - Rejected
  - Cancelled

---

## 🔗 API Endpoints (Highlights)

### Payments

- `POST /create-payment-intent`
- `POST /payments`

### Users

- `GET /users`
- `POST /users`
- `GET /users/:email`
- `PATCH /users/role/:id`
- `PATCH /users/suspend/:id`
- `PATCH /users/activate/:id`
- `PUT /users/assign/:email`
- `PUT /users/discharge/:email`

### Products

- `POST /products`
- `GET /admin/products`
- `PATCH /update/product/:id`
- `DELETE /products/:id`
- `PATCH /products/show-home/:id`
- `GET /general/page/products`
- `GET /general/product/:id`
- `GET /home/products`

### Orders

- `POST /orders`
- `GET /orders/pending/:email`
- `GET /orders/approved/:email`
- `PATCH /orders/approve/:id`
- `PATCH /orders/reject/:id`
- `PATCH /orders/cancel/:id`
- `PATCH /orders/tracking/:id`
- `GET /orders/track/:id`
- `GET /admin/all-orders/:email`
- `GET /my-orders/:email`

### Dashboard

- `GET /dashboard/stats`
- `GET /dashboard/orders/status-count`

---

## 🔐 Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3030
DB_USER=your_db_user
DB_ACCESS=your_db_password
DB_NAME=your_db_name
STRIPE_SK=your_stripe_secret_key
```

---

## ▶️ Run the Server

### Install dependencies

```bash
npm install
```

### Start the server

```bash
npm run start
```

Server will run on:

```
http://localhost:3030
```

---

## 🌐 CORS Configuration

Allowed origins:

- `https://mrirakib-ph-assignment-11.netlify.app`

---

## 📁 Database Collections

- `users`
- `products`
- `orders`
- `payments`

---

## Conclusion

Thank you for checking out my repository. If you have any feedback or suggestions, feel free to reach out!

---

Developed by **Md Rakibul Islam Rakib**
