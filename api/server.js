require('./config/db');
const express = require('express');
const dotenv = require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use("/Splitseez", require("./routes/usersRoutes"));
// app.use("/api/Splitseez", require("./routes/eventRoutes"));
// app.use("/api/Splitseez", require("./routes/notifRoutes"));
// app.use("/api/Splitseez", require("./routes/receiptRoutes"));

// app.use(errorHandeler);
app.listen(port, () => {console.log(`Server running on port ${port}`)})