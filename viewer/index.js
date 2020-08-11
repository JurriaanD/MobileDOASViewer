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
let dataFile = null;
let dataFilePath = null;
let fileWatcher = chokidar.watch([]);
fileWatcher.on("change", () => { dataFile = readDataFile(); });

const getLastModifiedFile = () => {
    let latestModifiedTime = 0;
    let latestModifiedFilename = null;

    fs.readdirSync(config.data.dataset_folder).forEach(filename => {
        let stats = fs.statSync(path.resolve(config.data.dataset_folder, filename));
        if (stats.isFile()) {
            let lastModified = stats.mtimeMs;
            if (lastModified > latestModifiedTime) {
                latestModifiedTime = lastModified;
                latestModifiedFilename = filename;
            }
        }
    });

    return path.resolve(config.data.dataset_folder, latestModifiedFilename);
};

const readDataFile = () => {
    let columnSplitRegex = new RegExp("[ ]*" + config.data.delimiter + "[ ]*");
    let rows = 
        fs.readFileSync(dataFilePath, { encoding: "utf8" })
        .split(config.data.EOL_character) // Filter empty line at the end of the file 
        .filter(x => x.length != 0)
        .map(row => row.split(columnSplitRegex)); // Split on arbitrary length whitespace
    let headers = rows.shift();
    for (let i = 0; i < rows.length; i++) {
        let row = rows[i];
        let result = {};

        for (let j = 0; j < Math.min(headers.length, row.length); j++) {
            // Convert to number if applicable
            result[headers[j]] = isNaN(row[j]) ? row[j] : Number(row[j]);
        }

        rows[i] = result;
    }
    return {
        lastModified: fs.statSync(dataFilePath),
        content: rows
    }
};

const setDataFile = newDataFilePath => {
    fileWatcher.unwatch(dataFilePath);
    dataFilePath = newDataFilePath;
    dataFile = readDataFile();
    fileWatcher.add(newDataFilePath);
}

if (!fs.existsSync(config.data.dataset_folder)) {
    console.warn(`Could not find the folder ${path.resolve(config.data.dataset_folder)}.\r\nThe server will continue watching the path.`);
} else {
    dataFilePath = getLastModifiedFile();
    if (dataFilePath == null) {
        console.warn(`The dataset folder ${path.resolve(config.data.dataset_folder)} is empty.\r\nThe server will continue watching the folder for new files.`);
    } else {
        setDataFile(dataFilePath);
    }
}

chokidar.watch(config.data.dataset_folder, { ignoreInitial: true })
    .on("add", newFilename => {
        // Assuming that the new file is the last modified file
        setDataFile(path.resolve(newFilename));
    });

/* Express Server */
const app = express();
app.use(express.static(__dirname + "public"));

app.get("/data", (_req, res) => {
    if (dataFile === null) {
        console.log("DataFile is null");
        res.status(404);
        res.send();
    } else {
        res.setHeader("Content-Type", "application/json");
        res.send(dataFile.content);
    }
});

const port = config.server.port;
app.listen(port, () => console.log(`Viewer server is listening at http://localhost:${port}`));