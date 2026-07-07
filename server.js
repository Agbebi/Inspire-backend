const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");

const { User } = require("./models/index");


dotenv.config();

const PORT = process.env.PORT || 3000;

const app = express();

// MongoDB Connection

mongoose.connect(process.env.MONGO_URI).then(() => console.log("MongoDB is connected")).catch((error) => console.log(error));



app.use(
    cors({
        origin: '',
        methods: ['GET', 'POST', 'DELETE', 'PUT'],
        allowedHeaders: [
            'Content-Type',
            'Authorisation',
            'Cache-Control',
            'Expires',
            'Pragma'
        ],
        credentials: true
    })
)

app.use(cookieParser());
app.use(express.json());


app.listen(PORT, console.log(
    `Server started successfully at ${PORT}`
))