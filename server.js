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
    res.status(500).json({ message: 'Something broke!' });
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Express.js server running at localhost:${port}`);
});