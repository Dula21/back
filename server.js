const express = require('express');
const { MongoClient, ObjectId } = require('mongodb'); // Correct import
const path = require("path");
const Lesson = require("./lessons"); // Assuming Lesson is your MongoDB model
const cors = require('cors');
//const router = express.Router();

// Initialize app
const app = express();

// Middleware
app.use(cors());


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

let lessonsCollection; // Declare the variable to store the collection reference
// MongoDB connection
let db;
MongoClient.connect('mongodb+srv://Admin:admin@gettingstarted.quhps.mongodb.net/', { useNewUrlParser: true, useUnifiedTopology: true }, (err, client) => {
    if (err) {
        console.error('Failed to connect to the database:', err);
        return;
    }
    db = client.db('Lessons');
    lessonsCollection = db.collection("lessons"); // Assign the collection
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

// Define the /search route
app.get("/search", async (req, res) => {
    const query = req.query.q;  // Search query from frontend

    if (!query) {
      return res.status(400).json({ error: "Missing search query" });
    }

    try {
        const results = await lessonsCollection
            .find({
                $or: [
                    { title: { $regex: query, $options: "i" } },
                    { description: { $regex: query, $options: "i" } },
                    { location: { $regex: query, $options: "i" } },
                ],
            })
            .project({
                title: 1,
                description: 1,
                location: 1,
                price: 1,
                availableInventory: 1,
                image: 1,
                _id: 1,
            })
            .toArray();

        res.json({ results });
    } catch (error) {
        console.error("Error fetching lessons:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
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

//PUT method
app.put('/collection/:collectionName/:id', async (req, res, next) => {
    const id = req.params.id;

    // Validate ID
    if (!ObjectId.isValid(id) && isNaN(Number(id))) {
        console.error(`Invalid ID format: ${id}`);
        return res.status(400).json({ message: 'Invalid ID format' });
    }

    const { availableInventory } = req.body;
    if (typeof availableInventory !== 'number' || availableInventory < 0) {
        console.error(`Invalid availableInventory: ${availableInventory}`);
        return res.status(400).json({ message: 'Invalid availableInventory value' });
    }

    console.log(`Updating inventory for ID: ${id}, availableInventory: ${availableInventory}`);

    try {
        const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id: Number(id) };
        const result = await req.collection.updateOne(filter, { $set: { availableInventory } });

        if (result.matchedCount === 0) {
            console.error(`Lesson with ID ${id} not found.`);
            return res.status(404).json({ message: 'Lesson not found' });
        }

        res.json({ message: 'Inventory updated successfully', updated: result.modifiedCount });
    } catch (err) {
        console.error('Error updating inventory:', err);
        next(err);
    }
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

