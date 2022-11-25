const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId} = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// middle wares
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.xvlwhga.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        const categoryCollection = client.db('bookBack').collection('book');
        const bookCollection = client.db('bookBack').collection('books');

        app.get('/book', async (req, res) => {
            const query = {}
            const cursor = categoryCollection.find(query, {_id:1,_id:0}).sort({"_id":-1});
            const book = await cursor.toArray();
            res.send(book);
        });

        app.get('/books/:category', async (req, res) => {
            const cat = req.params.category;
            const query = {category:cat};
            const cursor = bookCollection.find(query);
            const book = await cursor.toArray();
            res.send(book);
        });

    }
    finally {

    }

}

run().catch(err => console.error(err));


app.get('/', (req, res) => {
    res.send('Book Back server is running')
})

app.listen(port, () => {
    console.log(`Book Back server running on ${port}`);
})