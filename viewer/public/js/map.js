"use strict";
(() => {
    const map = L.map("mapid", {
        maxZoom: 20
    }).setView([50.797005, 4.356694], 10);

    /* Tiles */
    const tilesLayer = L.mapboxGL({
        attribution: "Tiles provided by OpenMapTiles",
        accessToken: 'no-token',
        style: `http://${location.hostname}:8080/styles/basic-preview/style.json`
    }).addTo(map);

    let markers = [];

    /* Color Scale */
    const dataColors = ["#1e9600", "#fff200", "#ff0000"];
    const colorGradient = chroma.scale(dataColors).mode("lab");
    const dataBounds = new class {
        _dynamicMin = 0;
        _dynamicMax = 1;

        get min() {
            if (window.settings === undefined || window.settings.bounds === undefined || window.settings.bounds.min === null) {
                return this._dynamicMin;
            }
            return window.settings.bounds.min;
        }

        get max() {
            if (window.settings === undefined || window.settings.bounds === undefined || window.settings.bounds.max === null) {
                return this._dynamicMax;
            }
            return window.settings.bounds.max;
        }

        set(min, max) {
            this._dynamicMin = min;
            this._dynamicMax = max;
            this.update();
        }

        update() {
            dataColorScale.remove();
            dataColorScale = L.DataColorScale({
                position: 'bottomleft'
            }).addTo(map);
            updateMarkerColors();
        }
    }
    const getMarkerColor = val => {
        let f = window.settings.useLogScale ? x => Math.log(x) : x => x;
        // Using a logarithmic scale is not compatible with negative values 
        let mappedMin = f(dataBounds.min);
        if (isNaN(mappedMin)) mappedMin = 0;
        return colorGradient(linearMap(f(val), mappedMin, f(dataBounds.max), 0, 1)).alpha(0.8);
    };

    window.addEventListener("DOASBoundsChange", e => {
        dataBounds.update();
    });

    L.Control.DataColorScale = L.Control.extend({
        onAdd: m => {
            if (dataBounds.min === undefined) {
                //console.log(window.settings, window.settings.scaleLowerBound, window.settings.scaleUpperBound);
            }
            const container = L.DomUtil.create("div", "dataColorScaleContainer");
            const gradient = L.DomUtil.create("div", "dataColorScaleGradient", container);
            gradient.style.background = `linear-gradient(to right,${dataColors.join(',')})`;
            const bounds = L.DomUtil.create("div", "dataColorScaleBounds", container);
            const lowerBound = L.DomUtil.create("span", null, bounds);
            lowerBound.innerHTML = dataBounds.min.toExponential(1);
            const upperBound = L.DomUtil.create("span", null, bounds);
            upperBound.innerHTML = dataBounds.max.toExponential(1);
            return container;
        },

        onRemove: m => {}
    });
    L.DataColorScale = (opts) => new L.Control.DataColorScale(opts);

    let dataColorScale = L.DataColorScale({
        position: 'bottomleft'
    }).addTo(map);

    /* Data Marker Class */
    L.DataMarker = (lat, long, value) => {
        const options = {
            radius: 5,
            interactive: false,
            value,
            color: getMarkerColor(value).toString(),
            fillOpacity: 1,
            stroke: false
        }
        const getValue = () => options.value;
        return L.circleMarker(L.latLng(lat, long), options);
    };

    /* Data Markers */
    const markerClusters = L.markerClusterGroup({
        iconCreateFunction: function (cluster) {
            const childCount = cluster.getChildCount();

            let c = ' marker-cluster-';
            if (childCount < 10) {
                c += 'small';
            } else if (childCount < 100) {
                c += 'medium';
            } else {
                c += 'large';
            }

            const divIcon = new L.DivIcon({
                html: `<div style="background-color:${getMarkerColor(this.getValue(cluster)).toString()}"><span>${childCount}</span></div>`,
                className: 'marker-cluster' + c,
                iconSize: new L.Point(20, 20)
            });
            // icon.style.backgroundColor = getMarkerColor(getValue()).toString();
            return divIcon;
        },

        disableClusteringAtZoom: 13,
        //animateAddingMarkers: true,
        maxClusterRadius: 20,

        getValue: (cluster) => {
            let children = cluster.getAllChildMarkers();
            let s = 0;
            for (let i = 0; i < children.length; i++) {
                let child = children[i];
                s += child.options.value;
            }
            return s / children.length;
            // return cluster.getAllChildMarkers().reduce((acc, marker) => acc + marker.getValue(), 0) / cluster.getAllChildMarkers().length;
        }
    });
    map.addLayer(markerClusters);

    /* Follow Car */
    const followCarButton = L.easyButton({
        states: [{
            stateName: "start-following",
            icon: "fa-location-arrow",
            title: "Follow the car",
            onClick: function (btn, map) {
                btn.state("stop-following");
                window.settings.followCar = true;
                followCar();
            }
        }, {
            stateName: "stop-following",
            icon: "<img src='/openhand.svg' style='width:30px;'/>",
            title: "Stop following the car",
            onClick: function (btn, map) {
                btn.state("start-following");
                window.settings.followCar = false;
            }
        }]
    });
    followCarButton.addTo(map);

    // Settings modal
    const settingsModal = document.getElementById("settingsModal");

    L.easyButton('fa-gear', () => {
        settingsModal.classList.add("visible");
    }).addTo(map);

    document.getElementById("closeSettingsModalButton").addEventListener("click", () => {
        settingsModal.classList.remove("visible");
    });

    document.getElementById("saveSettingsModalButton").addEventListener("click", () => {
        settingsModal.classList.remove("visible");
    });

    window.addEventListener("click", e => {
        if (e.target === settingsModal) {
            settingsModal.classList.remove("visible");
        }
    });

    /* Util */
    const updateMarkerColors = () => {
        for (let marker of markers) {
            marker.setStyle({
                color: getMarkerColor(marker.options.value).toString()
            });
        }
    }

    const clamp = (min, val, max) => {
        if (val < min) return min;
        if (val > max) return max;
        return val;
    }

    const linearMap = (val, min, max, mappedMin, mappedMax) => {
        val = clamp(min, val, max);
        return (val - min) / (max - min) * (mappedMax - mappedMin) + mappedMin;
    }

    const setDynamicBounds = () => {
        const bounds = map.getBounds();
        let visibleMarkers = markers.filter(marker => bounds.contains(marker.getLatLng()));
        if (visibleMarkers.length == 0) return;
        let min = visibleMarkers.reduce((acc, marker) => Math.min(acc, marker.options.value), Infinity);
        let max = visibleMarkers.reduce((acc, marker) => Math.max(acc, marker.options.value), -Infinity);
        dataBounds.set(min, max);
    }

    const followCar = () => {
        if (markers.length == 0) return;
        let relevantMarkers = markers.slice(-1 * window.settings.nbPointsToTrack);
        let markerBounds = L.latLngBounds(relevantMarkers.map(marker => marker.getLatLng()));
        let currentMarkerLatLong = markers[markers.length - 1].getLatLng();
        let deltaLat = Math.max(Math.abs(currentMarkerLatLong.lat - markerBounds.getNorth()), Math.abs(currentMarkerLatLong.lat - markerBounds.getSouth()));
        let deltaLong = Math.max(Math.abs(currentMarkerLatLong.lng - markerBounds.getEast()), Math.abs(currentMarkerLatLong.lng - markerBounds.getWest()));
        let viewportBounds = L.latLngBounds(
            L.latLng(currentMarkerLatLong.lat - deltaLat, currentMarkerLatLong.lng + deltaLong),
            L.latLng(currentMarkerLatLong.lat + deltaLat, currentMarkerLatLong.lng - deltaLong)); 
        map.fitBounds(viewportBounds);
    }

    window.addEventListener("resizeEnd", () => map.invalidateSize());
    window.settings.isAutoZooming = false;
    window.addEventListener("DOASDataReceived", e => {
        markerClusters.removeLayers(markers);
        // Update markers
        markers = e.detail.map(({
            lat,
            long,
            value
        }) => L.DataMarker(lat, long, value));
        // If follow mode is on, zoom and pan
        if (window.settings.followCar) {
            window.settings.isAutoZooming = true;
            followCar();
            window.settings.isAutoZooming = false;
        } else {
            // Update color bounds based on the visible markers
            setDynamicBounds();
        }
        updateMarkerColors();
        markerClusters.addLayers(markers);
    });
    window.addEventListener("DOASScaleChanged", updateMarkerColors);
    map.on("moveend", () => {
        /*
        console.log(window.settings.isAutoZooming);
        if (!window.settings.isAutoZooming) {
            window.settings.followCar = false;
            followCarButton.state("start-following");
        }
        */
        setDynamicBounds();
    });
})();