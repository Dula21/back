const express = require('express');
const { MongoClient, ObjectId } = require('mongodb'); // Use the new MongoClient import
const path = require("path");



const app = express();

app.use(express.json());
app.set('port', 3000);
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers'
    );
    next();
});

// MongoDB connection
const uri = 'mongodb+srv://Admin:admin@gettingstarted.quhps.mongodb.net/';
const client = new MongoClient(uri);

let db;

// Connect to MongoDB
async function connectToMongoDB() {
    try {
        await client.connect(); // Connect to the MongoDB server
        db = client.db('Lessons'); // Use the database 'webstore'
        console.log('Connected to MongoDB successfully');
    } catch (error) {
        console.error('Failed to connect to MongoDB', error);
        process.exit(1); // Exit if the connection fails
    }
}

// Start MongoDB connection
connectToMongoDB();

// Routes
app.get('/', (req, res) => {
    res.send('Select a collection, e.g., /collection/messages');
});

app.param('collectionName', (req, res, next, collectionName) => {
    req.collection = db.collection(collectionName);
    return next();
});

app.get('/collection/:collectionName', async (req, res, next) => {
    try {
        const results = await req.collection.find({}).toArray();
        res.send(results);
    } catch (error) {
        next(error);
    }
});

app.post('/collection/:collectionName', async (req, res, next) => {
    try {
        const result = await req.collection.insertOne(req.body);
        res.send(result.ops);
    } catch (error) {
        next(error);
    }
});

app.put('/collection/:collectionName/:id', async (req, res, next) => {
    try {
        const result = await req.collection.updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: req.body }
        );
        res.send(result.modifiedCount === 1 ? { msg: 'success' } : { msg: 'error' });
    } catch (error) {
        next(error);
    }
});

app.delete('/collection/:collectionName/:id', async (req, res, next) => {
    try {
        const result = await req.collection.deleteOne({ _id: new ObjectId(req.params.id) });
        res.send(result.deletedCount === 1 ? { msg: 'success' } : { msg: 'error' });
    } catch (error) {
        next(error);
    }
});

app.use('/static', express.static(path.join(__dirname, 'static'))); // Serve static files

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Catch-all for other routes (for SPAs or client-side routing)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});
// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Express.js server running at localhost:${port}`);
});
