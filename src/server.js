#!/usr/bin/env node

'use strict';

process.env.UV_THREADPOOL_SIZE = Math.ceil(Math.max(4, require('os').cpus().length * 1.5));

const fs = require('fs');
const path = require('path');

const chokidar = require('chokidar');
const clone = require('clone');
const enableShutdown = require('http-shutdown');
const express = require('express');
const handlebars = require('handlebars');
const mercator = new(require('@mapbox/sphericalmercator'))();

const packageJson = require('../package');
const serve_font = require('./serve_font');
const serve_style = require('./serve_style');
const serve_data = require('./serve_data');
const utils = require('./utils');

let serve_rendered = null
const isLight = true;

function start(applicationConfig, tilesConfig) {
    const app = express().disable('x-powered-by');
    app.enable('trust proxy');
    const serving = {
        styles: {},
        rendered: {},
        data: {},
        fonts: {}
    };
    const options = tilesConfig.options;
    const paths = options.paths;
    options.paths = paths;
    paths.styles = path.resolve(paths.root, paths.styles || '');
    paths.fonts = path.resolve(paths.root, paths.fonts || '');
    paths.sprites = path.resolve(paths.root, paths.sprites || '');
    paths.mbtiles = path.resolve(paths.root, paths.mbtiles || '');

    const startupPromises = [];

    const checkPath = type => {
        if (!fs.existsSync(paths[type])) {
            console.error(`[ERROR] Could not load some of the resources necessary to display a map. The specified path for "${type}" does not exist (${paths[type]}).`);
            process.exit(1);
        }
    };
    checkPath('styles');
    checkPath('fonts');
    checkPath('sprites');
    checkPath('mbtiles');

    const data = clone(tilesConfig.data);

    app.use('/', require("./viewer_router")(applicationConfig));

    app.use('/data/', serve_data.init(options, serving.data));
    app.use('/styles/', serve_style.init(options, serving.styles));

    let addStyle = (id, item, allowMoreData, reportFonts) => {
        let success = true;
        if (item.serve_data !== false) {
            success = serve_style.add(options, serving.styles, item, id, undefined, // publicURL
                (mbtiles, fromData) => {
                    let dataItemId;
                    for (const id of Object.keys(data)) {
                        if (fromData) {
                            if (id === mbtiles) {
                                dataItemId = id;
                            }
                        } else {
                            if (data[id].mbtiles === mbtiles) {
                                dataItemId = id;
                            }
                        }
                    }
                    if (dataItemId) { // mbtiles exist in the data config
                        return dataItemId;
                    } else {
                        if (fromData || !allowMoreData) {
                            console.log(`ERROR: style "${file.name}" using unknown mbtiles "${mbtiles}"! Skipping...`);
                            return undefined;
                        } else {
                            let id = mbtiles.substr(0, mbtiles.lastIndexOf('.')) || mbtiles;
                            while (data[id]) id += '_';
                            data[id] = {
                                'mbtiles': mbtiles
                            };
                            return id;
                        }
                    }
                }, font => {
                    if (reportFonts) {
                        serving.fonts[font] = true;
                    }
                });
        }
        if (success && item.serve_rendered !== false) {
            if (serve_rendered) {
                startupPromises.push(serve_rendered.add(options, serving.rendered, item, id, undefined,
                    mbtiles => {
                        let mbtilesFile;
                        for (const id of Object.keys(data)) {
                            if (id === mbtiles) {
                                mbtilesFile = data[id].mbtiles;
                            }
                        }
                        return mbtilesFile;
                    }
                ));
            } else {
                item.serve_rendered = false;
            }
        }
    };

    for (const id of Object.keys(tilesConfig.styles || {})) {
        const item = tilesConfig.styles[id];
        if (!item.style || item.style.length === 0) {
            console.log(`Missing "style" property for ${id}`);
            continue;
        }

        addStyle(id, item, true, true);
    }

    startupPromises.push(
        serve_font(options, serving.fonts).then(sub => {
            app.use('/', sub);
        })
    );

    for (const id of Object.keys(data)) {
        const item = data[id];
        if (!item.mbtiles || item.mbtiles.length === 0) {
            console.log(`Missing "mbtiles" property for ${id}`);
            continue;
        }

        startupPromises.push(
            serve_data.add(options, serving.data, item, id, undefined) // opts.publicUrl
        );
    }

    app.get('/styles.json', (req, res, next) => {
        const result = [];
        const query = req.query.key ? (`?key=${encodeURIComponent(req.query.key)}`) : '';
        for (const id of Object.keys(serving.styles)) {
            const styleJSON = serving.styles[id].styleJSON;
            result.push({
                version: styleJSON.version,
                name: styleJSON.name,
                id: id,
                url: `${utils.getPublicUrl(undefined, req)}styles/${id}/style.json${query}`
            });
        }
        res.send(result);
    });

    const addTileJSONs = (arr, req, type) => {
        for (const id of Object.keys(serving[type])) {
            const info = clone(serving[type][id].tileJSON);
            let path = '';
            if (type === 'rendered') {
                path = `styles/${id}`;
            } else {
                path = `${type}/${id}`;
            }
            info.tiles = utils.getTileUrls(req, info.tiles, path, info.format, undefined, {
                'pbf': options.pbfAlias
            });
            arr.push(info);
        }
        return arr;
    };

    app.get('/data.json', (req, res, next) => {
        res.send(addTileJSONs([], req, 'data'));
    });
    app.get('/index.json', (req, res, next) => {
        res.send(addTileJSONs(addTileJSONs([], req, 'rendered'), req, 'data'));
    });

    //------------------------------------
    // serve web presentations
    app.use('/', express.static(path.join(__dirname, '../public')));

    /*
    const templates = path.join(__dirname, '../public/templates');
    const serveTemplate = (urlPath, template, dataGetter) => {
        let templateFile = `${templates}/${template}.tmpl`;
        startupPromises.push(new Promise((resolve, reject) => {
            fs.readFile(templateFile, (err, content) => {
                if (err) {
                    err = new Error(`Template not found: ${err.message}`);
                    reject(err);
                    return;
                }
                const compiled = handlebars.compile(content.toString());

                app.use(urlPath, (req, res, next) => {
                    let data = {};
                    if (dataGetter) {
                        data = dataGetter(req);
                        if (!data) {
                            return res.status(404).send('Not found');
                        }
                    }
                    data['server_version'] = `${packageJson.name} v${packageJson.version}`;
                    data['public_url'] = undefined || '/';
                    data['is_light'] = isLight;
                    data['key_query_part'] =
                        req.query.key ? `key=${encodeURIComponent(req.query.key)}&amp;` : '';
                    data['key_query'] = req.query.key ? `?key=${encodeURIComponent(req.query.key)}` : '';
                    if (template === 'wmts') res.set('Content-Type', 'text/xml');
                    return res.status(200).send(compiled(data));
                });
                resolve();
            });
        }));
    };

    serveTemplate('/styles/:id/$', 'viewer', req => {
        const id = req.params.id;
        const style = clone(((serving.styles || {})[id] || {}).styleJSON);
        if (!style) {
            return null;
        }
        style.id = id;
        style.name = (serving.styles[id] || serving.rendered[id]).name;
        style.serving_data = serving.styles[id];
        style.serving_rendered = serving.rendered[id];
        return style;
    });

    serveTemplate('/styles/:id/wmts.xml', 'wmts', req => {
        const id = req.params.id;
        const wmts = clone((serving.styles || {})[id]);
        if (!wmts) {
            return null;
        }
        if (wmts.hasOwnProperty("serve_rendered") && !wmts.serve_rendered) {
            return null;
        }
        wmts.id = id;
        wmts.name = (serving.styles[id] || serving.rendered[id]).name;
        wmts.baseUrl = `${req.get('X-Forwarded-Protocol') ? req.get('X-Forwarded-Protocol') : req.protocol}://${req.get('host')}`;
        return wmts;
    });

    serveTemplate('/data/:id/$', 'data', req => {
        const id = req.params.id;
        const data = clone(serving.data[id]);
        if (!data) {
            return null;
        }
        data.id = id;
        data.is_vector = data.tileJSON.format === 'pbf';
        return data;
    });
    */

    let startupComplete = false;
    const startupPromise = Promise.all(startupPromises).then(() => {
        console.log('Startup complete');
        startupComplete = true;
    });
    app.get('/health', (req, res, next) => {
        if (startupComplete) {
            return res.status(200).send('OK');
        } else {
            return res.status(503).send('Starting');
        }
    });

    const server = app.listen(applicationConfig.port, function () {
        let address = this.address().address;
        if (address.indexOf('::') === 0) {
            address = `[${address}]`; // literal IPv6 address
        }
        console.log(`You can start the viewer by browsing to http://${address}:${this.address().port}/`);
    });

    // add server.shutdown() to gracefully stop serving
    enableShutdown(server);

    return {
        app: app,
        server: server,
        startupPromise: startupPromise
    };
}

module.exports = (applicationConfig, tilesConfig) => {
    const running = start(applicationConfig, tilesConfig);

    running.startupPromise.catch(err => {
        console.error(err.message);
        process.exit(1);
    });

    process.on('SIGINT', () => {
        process.exit();
    });

    process.on('SIGHUP', () => {
        process.exit();
    });

    return running;
};