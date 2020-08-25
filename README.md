<p align="center">
  <img src="public/logo.png" width="350px">
</p>

# Mobile DOAS Viewer

This application was originally developped for the Royal Belgian Institute for Space Aeronomy to visualise the measurements of a mobile DOAS instrument in real-time.
However, the application is generic enough to be useful for the visualisation of any sort of real-time geospatial numeric data.

<p align="center">
  <img src="public/screenshot.png">
</p>

## Table of Contents
- [Features](#features)
- [Installation](#installation)
  - [Requirements](#requirements)
  - [Setup](#setup)
  - [Maps](#maps)
- [Usage](#usage)
- [Acknowledgements](#acknowledgements)
- [License](#license)

## Features
- Display measurements on map
- Dynamic colorscale based on measurements that are visible
- Automatically move and zoom map as new measurements come in
- Measurements are plotted on a graph

## Installation
### Requirements
The application is build with NodeJS, [which you can download here](https://nodejs.org/en/download/).

The program is designed to work without an Internet connection, so that it can also be used for campaigns in areas with poor to no connectivity. This means that you have to download a map in advance (instructions below). The filesize of such a map can be anywhere between 30MB (small city) to 72GB (entire planet), so make sure your device has sufficient storage! 

### Setup
- You can either [download the application directly (zip)](https://github.com/JurriaanD/MobileDOASViewer/archive/master.zip) or clone the repository: `git clone https://github.com/JurriaanD/MobileDOASViewer`.
- Run `npm install` to install all dependecies (this may take a while).
- Copy `config.example.txt` to `config.txt`.
- Change the config file if needed.

Soon: `npm install -g mobile-doas-viewer`

### Maps
- [Download mbtiles on country level, updated every 2 weeks](http://osmlab.github.io/osm-qa-tiles/country.html)
- [OpenMapTiles offers free mbtiles for personal/open-data usage](https://openmaptiles.com/downloads/planet/). Usage of their tiles in production within a company/institution requires a purchase of rights (See their [Terms of use](https://openmaptiles.com/terms/) for more information).


## Usage
Run `npm start` or `node src/main.js` to start the server on the acquisition computer.
Open a browser on you device and connect to `*ip address of the acquisition computer*:*port specified in config.txt*`.


## Acknowledgements
The 'lost connection' notification sound: https://freesound.org/people/ecfike/sounds/135125/


## License
