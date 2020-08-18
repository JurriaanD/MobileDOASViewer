#!/usr/bin/env node

'use strict';

require = require('esm')(module);

const fs = require('fs');
const path = require('path');
// Config file format parser
const toml = require("toml");

const MBTiles = require('@mapbox/mbtiles');

const packageJson = require('../package');

const opts = require('commander')
    .description('mobile-doas-viewer startup options')
    .usage('mobile-doas-viewer [options]')
    .option(
        '-s, --silent',
        'Less verbose output'
    )
    .version(
        packageJson.version,
        '-v, --version'
    )
    .parse(process.argv);

console.log(`Starting ${packageJson.name} v${packageJson.version}`);

const startServer = (applicationConfig, tilesConfig) => {
    return require('./server')(
        applicationConfig,
        tilesConfig
    );
};

let configPath = path.resolve(__dirname, "../config.txt");
let exampleConfigPath = path.resolve(__dirname, "../config.example.txt");
if (!fs.existsSync(configPath)) {
    console.log(`[ERROR] Could not find a config file at ${configPath}`);
    process.exit(1);
}
let configStats = fs.statSync(configPath);
if (!configStats.isFile() || configStats.size === 0) {
    console.log(`[ERROR] The config file at ${configPath} appears to be corrupt.`);
    console.log(`[INFO] You can create a new config file by copying the example config file at ${exampleConfigPath}`);
    process.exit(1);
}

let applicationConfig;
try {
    applicationConfig = toml.parse(fs.readFileSync(configPath));
} catch (err) {
    console.log("[ERROR] Something went wrong while parsing the config file. Please make sure all text values are surrounded with double quotes.");
    console.log("[ERROR] More information about the expected format can be found on https://en.wikipedia.org/wiki/TOML");
    console.log(err);
    process.exit(1);
}

let datafilesFolder = path.resolve(__dirname, "..", applicationConfig.dataset_folder);
applicationConfig.dataset_folder = datafilesFolder;
if (!fs.existsSync(datafilesFolder)) {
    console.log(`[WARNING] Could not find the folder containing the data files at ${datafilesFolder}.`);
    console.log("          If the folder is created at a later time, it's creation will automatically be detected.");
    console.log(`          If the folder should already exist, there is probably a problem with the path specified in the config file (${configPath})`);
}

let tilesPath = path.resolve(__dirname, "..", applicationConfig.tiles_path);
if (!fs.existsSync(tilesPath)) {
    console.log(`[ERROR] Could not find the map tiles file at ${tilesPath}`);
    process.exit(1);
}
const tilesStats = fs.statSync(tilesPath);
if (!tilesStats.isFile() || tilesStats.size === 0) {
    console.log(`[ERROR] Not a valid MBTiles file: ${mbtilesFile}`);
    process.exit(1);
}

const instance = new MBTiles(tilesPath, (err) => {
    if (err) {
        console.log("[ERROR] Unable to open MBTiles.");
        console.log(`        Make sure ${path.basename(tilesPath)} is a valid MBTiles file.`);
        process.exit(1);
    }

    instance.getInfo((err, info) => {
        if (err || !info) {
            console.log('[ERROR] Metadata missing in the MBTiles.');
            console.log(`        Make sure ${path.basename(tilesPath)} is a valid MBTiles file.`);
            process.exit(1);
        }
        const bounds = info.bounds;

        const styleDir = path.resolve(__dirname, "../node_modules/tileserver-gl-styles/");

        const tilesConfig = {
            "options": {
                "paths": {
                    "root": styleDir,
                    "fonts": "fonts",
                    "styles": "styles",
                    "mbtiles": path.dirname(tilesPath)
                }
            },
            "styles": {},
            "data": {}
        };

        if (info.format === 'pbf' &&
            info.name.toLowerCase().indexOf('openmaptiles') > -1) {

            tilesConfig['data'][`v3`] = { "mbtiles": path.basename(tilesPath) };


            const styles = fs.readdirSync(path.resolve(styleDir, 'styles'));
            for (let styleName of styles) {
                const styleFileRel = styleName + '/style.json';
                const styleFile = path.resolve(styleDir, 'styles', styleFileRel);
                if (fs.existsSync(styleFile)) {
                    tilesConfig['styles'][styleName] = {
                        "style": styleFileRel,
                        "tilejson": {
                            "bounds": bounds
                        }
                    };
                }
            }
        } else {
            console.log(`WARN: MBTiles not in "openmaptiles" format. Serving raw data only...`);
            tilesConfig['data'][(info.id || 'mbtiles')
                .replace(/\//g, '_')
                .replace(/:/g, '_')
                .replace(/\?/g, '_')
            ] = {
                "mbtiles": path.basename(tilesPath)
            };
        }

        return startServer(applicationConfig, tilesConfig);
    });
});