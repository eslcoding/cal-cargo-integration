require("dotenv").config(); // import env variables
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");

const app = express();
const http = require("http").createServer(app);

const mondayWebHookRoutes = require("./api/monday/monday.webhook.routes");
const config = require("./config");

app.use(cookieParser());
app.use(bodyParser.json()); //  content type appliaction/Json (header)
app.use(bodyParser.urlencoded({ extended: true })); // for some other content type by tranzilla (middleware for parsing bodys from url)

// app.use(express.static('public'));

var corsOptions;
if (!config.env.isDevelopment) {
  corsOptions = {
    origin: [
      "https://testing-apps.monday.com",
      "https://api-gw.monday.com",
      "https://88983808e60cae26.cdn.monday.app",
      "https://aee9351f6c6a5634.cdn2.monday.app",
    ],
    methods: ["GET", "PUT", "POST", "HEAD", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "Content-Type",
      "X-Auth-Token",
      "x-pulse-pusher-socketid",
    ],
    credentials: true,
  };
} else {
  corsOptions = {
    origin: [
      "http://127.0.0.1:8080",
      "http://localhost:8080",
      "http://127.0.0.1:3000",
      "https://localhost:3000",
      "https://3d9b7dff44f5.ngrok.io",
      "https://88983808e60cae26.cdn.monday.app",
      "https://testing-apps.monday.com",
      "https://api-gw.monday.com",
      "https://aee9351f6c6a5634.cdn2.monday.app",
    ],
    credentials: true,
  };
}
app.use(cors(corsOptions));

// routes
app.use("/", mondayWebHookRoutes);

// app.get('/*', function(req,res) {
//     // res.sendFile(path.resolve(__dirname, 'public/taskpane.html'))
//     res.send('HELLOOOOOO')
// })

const logger = require("./services/logger.service");
const port = process.env.PORT || 3030;
http.listen(port, () => {
  logger.info("Server is running on port: " + port);
});
