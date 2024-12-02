const express = require('express');
const { MongoClient, ObjectId } = require('mongodb'); // Correct import
const path = require("path");

const app = express();

app.use(express.json());
app.set('port', 3000);
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD, OPTIONS,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
    next();
});
// the 'logger' middleware
app.use(function (req, res, next) {
    console.log("Request IP: " + req.url);
    console.log("Request date: " + new Date());
    next();
});
// MongoDB connection
let db;
MongoClient.connect('mongodb+srv://Admin:admin@gettingstarted.quhps.mongodb.net/', { useNewUrlParser: true, useUnifiedTopology: true }, (err, client) => {
    if (err) {
        console.error('Failed to connect to the database:', err);
        return;
    }
    db = client.db('Lessons');
    console.log('Connected to Database');
});

// Routes
app.get('/', (req, res) => {
    res.send('Select a collection, e.g., /collection/messages');
});

app.param('collectionName', (req, res, next, collectionName) => {
    req.collection = db.collection(collectionName);
    return next();
});

app.get('/collection/:collectionName', (req, res, next) => {
    req.collection.find({}).toArray((e, results) => {
        if (e) return next(e);
        res.send(results);
    });
});

// Adding POST
app.post('/collection/:collectionName', (req, res, next) => {
    req.collection.insert(req.body, (e, results) => {
        if (e) return next(e);
        res.send(results.ops);
    });
});

// New endpoint to handle order submissions
app.post('/collection/orders', async (req, res, next) => {
    const { lessons, customerDetails } = req.body;

    if (!Array.isArray(lessons) || lessons.length === 0) {
        return res.status(400).json({ message: 'No lessons provided in the order.' });
    }

    try {
        // Process each lesson in the order
        for (const lesson of lessons) {
            const { lessonId, quantity } = lesson;

            // Insert the order into the orders collection
            await db.collection('orders').insertOne({
                lessonId,
                quantity,
                customerDetails,
                orderDate: new Date()
            });

            // Update the inventory for each lesson
            await db.collection('lessons').updateOne(
                { _id: new ObjectId(lessonId) },
                { $inc: { availableInventory: -quantity } } // Decrement the inventory
            );
        }

        res.json({ message: 'Order placed successfully!' });
    } catch (error) {
        console.error('Error processing order:', error);
        res.status(500).json({ message: 'Failed to place the order. Please try again later.' });
    }
});

// PUT method to update an object
app.put('/collection/:collectionName/:id', (req, res, next) => {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid ID format' });
    }
    req.collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: req.body },
        (e, result) => {
            if (e) return next(e);
            res.json(result.result.n === 1 ? { msg: 'success' } : { msg: 'error' });
        }
    );
});

// DELETE method to remove an object
app.delete('/collection/:collectionName/:id', (req, res, next) => {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid ID format' });
    }
    req.collection.deleteOne(
        { _id: new ObjectId(id) },
        (e, result) => {
            if (e) return next(e);
            res.json(result.result.n === 1 ? { msg: 'success' } : { msg: 'error' });
        }
    );
});

// Serve static files
app.use('/static', express.static(path.join(__dirname, 'static')));

// Serve index.html
app.get