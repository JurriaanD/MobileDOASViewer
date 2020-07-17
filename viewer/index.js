const express = require('express');
const csvtojson = require("csvtojson");
const app = express();
const port = 3000;

app.use(express.static('public'));

app.get('/', (req, res) => res.send('Hello World!'));

app.get('/data', (req, res) => {
    csvtojson({delimiter: "\t", alwaysSplitAtEOL: true, eol: '\n'})
    .fromFile("measurements.dat")
    .then(json => {
        res.setHeader("Content-Type", "application/json");
        res.send(json);
    });
});

app.listen(port, () => console.log(`Viewer server is listening at http://localhost:${port}`));