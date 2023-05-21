const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const cors = require('cors')
require('dotenv').config()
const app = express()
const port = process.env.PORT || 3000


// Middleware
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send('Schleish server is running')
})

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dodjx0x.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10,
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        client.connect(err => {
            if (err) {
                console.error(err)
                return
            }
        });

        const toyCollection = client.db('schleishDB').collection('toys')

        app.get('/toys', async (req, res) => {
            let query = {}
            if (req.query?.email) {
                query = {
                    sellerEmail: req.query.email
                }
            }
            else if (req.query?.category) {
                query = {
                    category: req.query.category
                }
            }
            else if (req.query?.search) {
                query = {
                    toyName: req.query.search
                }
            }

            let result
            if (req.query?.limit) {
                result = await toyCollection.find(query).limit(parseInt(req.query.limit)).toArray()
            }
            else if (req.query?.sort) {
                if (req.query.sort === 'asc'){
                   // result = await toyCollection.find(query).sort({price: 1}).toArray()
                    result = await toyCollection
                        .aggregate([
                            { $match: query },
                            {
                                $addFields: {
                                    priceAsInt: {
                                        $convert: {
                                            input: "$price",
                                            to: "int",
                                            onError: 0,
                                            onNull: 0
                                        }
                                    }
                                }
                            },
                            {
                                $sort: {
                                    priceAsInt: 1
                                }
                            }
                        ])
                        .toArray();

                } else {
                    result = await toyCollection
                        .aggregate([
                            { $match: query },
                            {
                                $addFields: {
                                    priceAsInt: {
                                        $convert: {
                                            input: "$price",
                                            to: "int",
                                            onError: 0,
                                            onNull: 0
                                        }
                                    }
                                }
                            },
                            {
                                $sort: {
                                    priceAsInt: -1
                                }
                            }
                        ])
                        .toArray();
                }
            }
            else {
                result = await toyCollection.find(query).toArray()
            }
            console.log(result.length, req.query)
            res.send(result)
        })

        app.get('/toy/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await toyCollection.findOne(query)
            res.send(result)
        })

        app.post('/addToy', async (req, res) => {
            const addToy = req.body
            const results = await toyCollection.insertOne(addToy)
            res.send(results)
        })

        app.patch('/toy/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const updatedToy = req.body

            const toy = {
                $set: {
                    toyName: updatedToy.toyName,
                    price: updatedToy.price,
                    quantity: updatedToy.quantity,
                    pdDetails: updatedToy.pdDetails,
                }
            }
            const result = await toyCollection.updateOne(query, toy, options)
            res.send(result)

        })

        app.delete('/toy/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await toyCollection.deleteOne(query)
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})