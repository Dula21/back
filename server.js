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

//Adding GET 
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


//update the object
app.put('/collection/:collectionName/:id', (req, res, next) => {
    const id = req.params.id;

    // Validate if the ID is a valid ObjectId
    if (!ObjectId.isValid(id)) {
        console.error(`Invalid ObjectId: ${id}`); // Log invalid ID
        return res.status(400).json({ message: 'Invalid ID format' });
    }

    // Check the body
    console.log('Received body:', req.body);

    req.collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: req.body },
        (err, result) => {
            if (err) return next(err);

            // Check if any document was modified
            if (result.matchedCount === 0) {
                return res.status(404).json({ message: 'Lesson not found' });
            }

            res.json({ msg: 'success', updated: result.modifiedCount });
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

// Catch-all forother routes (for SPAs or client-side routing)
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