# MongoDB Setup Guide

This application uses MongoDB to store lottery shares, history, and counters. Follow these steps to set up MongoDB for your deployment.

## 1. Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account (M0 cluster is free)
3. Create a new cluster

## 2. Get Your Connection String

1. In MongoDB Atlas, click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy the connection string (it will look like: `mongodb+srv://username:password@cluster.mongodb.net/`)
4. Replace `<password>` with your database user password
5. Add your database name at the end (e.g., `lottery-site`)

## 3. Set Environment Variable

Create a `.env.local` file in the root of your project:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/lottery-site?retryWrites=true&w=majority
```

**Important:** Never commit `.env.local` to version control. It's already in `.gitignore`.

## 4. For Vercel Deployment

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add a new variable:
   - **Name:** `MONGODB_URI`
   - **Value:** Your MongoDB connection string
4. Redeploy your application

## 5. Database Collections

The application will automatically create these collections:
- `shares` - Stores lottery share links (with 30-day TTL)
- `history` - Stores user lottery history
- `counter` - Stores the global lottery counter

## 6. Indexes (Optional but Recommended)

For better performance, you can create indexes in MongoDB Atlas:

```javascript
// In MongoDB Atlas, go to Collections > Indexes

// For shares collection
db.shares.createIndex({ shareId: 1 }, { unique: true })
db.shares.createIndex({ expiresAt: 1 })

// For history collection
db.history.createIndex({ username: 1 })
db.history.createIndex({ timestamp: -1 })
```

## Troubleshooting

- **Connection errors:** Make sure your IP address is whitelisted in MongoDB Atlas (Network Access)
- **Authentication errors:** Verify your username and password in the connection string
- **Timeout errors:** Check that your MongoDB cluster is running and accessible

