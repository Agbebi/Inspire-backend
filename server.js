const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");

const { User } = require("./models/index");
const authRoutes = require("./routes/auth-routes");
const publicRoutes = require("./routes/public-routes");
const schoolRoutes = require("./routes/school-routes");
const schoolManageRoutes = require("./routes/school-manage-routes");
const schoolCycleRoutes = require("./routes/school-cycle-routes");


dotenv.config();

const PORT = process.env.PORT || 3000;

const app = express();

// MongoDB Connection

const mongoURI = process.env.MONGO_URI || 'mongodb+srv://@cluster0.duchdbl.mongodb.net/?retryWrites=true&w=majority';

mongoose.connect(mongoURI).then(() => console.log("MongoDB is connected")).catch((error) => console.log(error));


//CORS Configuration

const localHost = 'https://inspirerms.netlify.app/'

// const localHost = 'http://localhost:5173'

app.use(
    cors({
        origin: localHost,
        methods: ['GET', 'POST', 'DELETE', 'PUT'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'Cache-Control',
            'Expires',
            'Pragma'
        ],
        credentials: true
    })
)

app.use(cookieParser());
app.use(express.json());

app.use('/api/superadmin', authRoutes);
app.use('/api', publicRoutes);
app.use('/api/school', schoolRoutes);
app.use('/api/school/manage', schoolManageRoutes);
app.use('/api/school/manage', schoolCycleRoutes);


app.listen(PORT, console.log(
    `Server started successfully at ${PORT}`
))