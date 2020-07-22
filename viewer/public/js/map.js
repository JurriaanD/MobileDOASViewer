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
        min = Infinity;
        max = -Infinity;

        get bounds() {
            return {
                min,
                max
            };
        }

        set(min, max) {
            // FIXME: does this condition actually make sense?
            if (window.settings.bounds.min === null || window.settings.bounds.min === undefined)
                this.min = min;
            if (window.settings.bounds.max === null || window.settings.bounds.max === undefined)
                this.max = max;
            this._onUpdate();
        }

        setUnsafe(min, max) {
            if (min !== null && min !== undefined)
                this.min = min;
            if (max !== null && max !== undefined)
                this.max = max;
            this._onUpdate();
        }

        // TODO: recolor all (visible) markers
        _onUpdate() {
            dataColorScale.remove();
            dataColorScale = L.DataColorScale({
                position: 'bottomleft'
            }).addTo(map);
        }
    }
    const getMarkerColor = val => {
        return colorGradient(linearMap(Math.log(val), Math.log(dataBounds.min), Math.log(dataBounds.max), 0, 1)).alpha(0.8);
    };

    window.addEventListener("DOASBoundsChange", e => {
        dataBounds.setUnsafe(e.details.min, e.details.max);
    });

    L.Control.DataColorScale = L.Control.extend({
        onAdd: m => {
            const container = L.DomUtil.create("div", "dataColorScaleContainer");
            const gradient = L.DomUtil.create("div", "dataColorScaleGradient", container);
            gradient.style.background = `linear-gradient(to right,${dataColors.join(',')})`;
            const bounds = L.DomUtil.create("div", "dataColorScaleBounds", container);
            const lowerBound = L.DomUtil.create("span", null, bounds);
            lowerBound.innerHTML = dataBounds.min.toExponential(2);
            const upperBound = L.DomUtil.create("span", null, bounds);
            upperBound.innerHTML = dataBounds.max.toExponential(2);
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
                html: '<div><span>' + childCount + '</span></div>',
                className: 'marker-cluster' + c,
                iconSize: new L.Point(40, 40)
            });
            // icon.style.backgroundColor = getMarkerColor(getValue()).toString();
            return divIcon;
        },

        disableClusteringAtZoom: 1,
        //animateAddingMarkers: true,
        maxClusterRadius: 30,

        getValue: () => {
            return cluster.getAllChildMarkers().reduce((acc, marker) => acc + marker.getValue(), 0) / cluster.getAllChildMarkers().length;
        }
    });
    map.addLayer(markerClusters);

    /* Util */
    function linearMap(val, min, max, mappedMin, mappedMax) {
        return (max - val) / (max - min) * (mappedMax - mappedMin) + mappedMin;
    }

    window.addEventListener("resizeEnd", () => map.invalidateSize());
    window.addEventListener("DOASDataReceived", e => {
        let min = e.detail.reduce((acc, { value }) => Math.min(acc, value), Infinity);
        let max = e.detail.reduce((acc, { value }) => Math.max(acc, value), -Infinity);
        dataBounds.set(min, max);
        markerClusters.removeLayers(markers);
        markers = e.detail.map(({ lat, long, value}) => L.DataMarker(lat, long, value));
        markerClusters.addLayers(markers);
    });
})();