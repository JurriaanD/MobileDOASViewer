const express = require("express");
const fs = require("fs");
const csvtojson = require("csvtojson");
const path = require("path");
// Config file format parser
const toml = require("toml");
// Better file monitoring
const chokidar = require('chokidar');

/* Load config file */
const configFileName = "./config.txt";
if (!fs.existsSync(configFileName)) {
    throw new Error("Could not find the configuration file ('config.txt'). Please make sure you didn't move or rename it.");
}
let config;
try {
    config = toml.parse(fs.readFileSync(configFileName));
} catch (e) {
    e.message = "Something went wrong while trying to read the config file. Please make sure all text values are surrounded in double quotes. More information about the expected format can be found on https://en.wikipedia.org/wiki/TOML";
    throw e;
}

/* Data file administration */
const readDataFile = () => ({
    lastModified: fs.statSync(config.data.file_path),
    content: fs.readFileSync(config.data.file_path, { encoding: "utf8" })
});
let dataFile = null;
if (!fs.existsSync(config.data.file_path)) {
    console.warn(`Could not find the data file at ${path.resolve(config.data.file_path)}. This may be due to a mistake in your configuration. The server will continue watching the given path.`);
} else {
    dataFile = readDataFile();
}
chokidar.watch(config.data.file_path)
    .on("change", _path => {
        dataFile = readDataFile();
    })
    .on("add", _path => {
        if (dataFile == null) {
            console.log("Detected the creation of the data file");
            dataFile = readDataFile();
        }
    });

/* Express Server */
const app = express();
app.use(express.static("public"));

app.get("/", (req, res) => res.send('Hello World!'));

app.get("/data", (req, res) => {
    if (dataFile === null) {
        console.log("DataFile is null");
        res.status(404);
        return res.send();
    }
    csvtojson({delimiter: config.data.delimiter, alwaysSplitAtEOL: true, eol: config.data.EOL_character})
    .fromString(dataFile.content)
    .then(json => {
        res.setHeader("Content-Type", "application/json");
        res.send(json);
    });
});

const port = config.server.port;
app.listen(port, () => console.log(`Viewer server is listening at http://localhost:${port}`));