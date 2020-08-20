const express = require('express');
const router = express.Router();
const fs = require("fs");
const path = require("path");
// Better file monitoring
const chokidar = require('chokidar');

const initRouter = config => {
    /* Data file administration */
    let dataFile = null;
    let dataFilePath = null;
    let fileWatcher = chokidar.watch([]);
    fileWatcher.on("change", () => { dataFile = readDataFile(); });

    const getLastModifiedFile = () => {
        let latestModifiedTime = 0;
        let latestModifiedFilename = null;

        fs.readdirSync(config.dataset_folder).forEach(filename => {
            let stats = fs.statSync(path.resolve(config.dataset_folder, filename));
            if (stats.isFile()) {
                let lastModified = stats.mtimeMs;
                if (lastModified > latestModifiedTime) {
                    latestModifiedTime = lastModified;
                    latestModifiedFilename = filename;
                }
            }
        });

        return path.resolve(config.dataset_folder, latestModifiedFilename);
    };

    const readDataFile = () => {
        let columnSplitRegex = new RegExp("[ ]*" + config.delimiter + "[ ]*");
        let rows = 
            fs.readFileSync(dataFilePath, { encoding: "utf8" })
            .split(config.EOL_character) // Filter empty line at the end of the file 
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

    if (fs.existsSync(config.dataset_folder)) {
        dataFilePath = getLastModifiedFile();
        if (dataFilePath == null) {
            console.log(`[WARNING] The dataset folder ${config.dataset_folder} is empty.`);
            console.log("          The server will continue watching the folder for new files.");
        } else {
            setDataFile(dataFilePath);
        }
    }

    chokidar.watch(config.dataset_folder, { ignoreInitial: true })
        .on("add", newFilename => {
            // Assuming that the new file is the last modified file
            console.log(`New file at ${newFilename}`);
            setDataFile(path.resolve(newFilename));
        });

    /* Express Server */
    router.use(express.static("public"));

    router.get("/data", (_req, res) => {
        if (dataFile === null) {
            console.log("Received data request, but data file hasn't yet been initialized.");
            res.setHeader("Content-Type", "application/json");
            res.send("[]");
        } else {
            res.setHeader("Content-Type", "application/json");
            res.send(dataFile.content);
        }
    });

    router.get("/columns", (req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.send(config.colummns);
    });

    return router;
}

module.exports = applicationConfig => initRouter(applicationConfig);