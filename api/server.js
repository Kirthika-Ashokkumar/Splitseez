const dotenv = require('dotenv').config();
require('./config/db');

const express = require('express');
const cors = require("cors");
const app = express();

const port = process.env.PORT || 5000;

app.use(cors()); 
app.use(express.json());

app.use("/Splitseez", require("./routes/usersRoutes"));
app.use("/Splitseez", require("./routes/eventRoutes"));
app.use("/api/Splitseez", require("./routes/receiptRoutes"));
// app.use("/api/Splitseez", require("./routes/notifRoutes"));

// app.use(errorHandeler);
app.listen(port, () => {console.log(`Server running on port ${port}`)})