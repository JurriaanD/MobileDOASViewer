const map = L.map("mapid", {
    maxZoom: 20
}).setView([50.797005, 4.356694], 10);

/* Tiles */
const tilesLayer = L.mapboxGL({
    attribution: "Tiles provided by OpenMapTiles",
    accessToken: 'no-token',
    style: `http://${location.hostname}:8080/styles/basic-preview/style.json`
}).addTo(map);

/* Color Scale */
const dataColors = ["#1e9600", "#fff200", "#ff0000"];
const colorGradient = chroma.scale(dataColors).mode("lab");
let dataMinValue = Infinity;
let dataMaxValue = -Infinity;

function setDataBounds(min, max) {
    dataMinValue = min;
    dataMaxValue = max;
    dataColorScale.remove();
    dataColorScale = L.DataColorScale({
        position: 'bottomleft'
    }).addTo(map);
}

L.Control.DataColorScale = L.Control.extend({
    onAdd: m => {
        const container = L.DomUtil.create("div", "dataColorScaleContainer");
        const gradient = L.DomUtil.create("div", "dataColorScaleGradient", container);
        gradient.style.background = `linear-gradient(to right,${dataColors.join(',')})`;
        const bounds = L.DomUtil.create("div", "dataColorScaleBounds", container);
        const lowerBound = L.DomUtil.create("span", null, bounds);
        lowerBound.innerHTML = dataMinValue.toExponential(2);
        const upperBound = L.DomUtil.create("span", null, bounds);
        upperBound.innerHTML = dataMaxValue.toExponential(2);
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
const markers = L.markerClusterGroup({
    iconCreateFunction: function (cluster) {
        var childCount = cluster.getChildCount();

        var c = ' marker-cluster-';
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

fetch(new Request("/data"))
    // TODO: handle non-200 OK responses
    .then(res => res.json())
    .then(measurements => {
        // TODO: handle NaN
        let min = measurements.reduce((acc, val) => Math.min(acc, val.VCBira), Infinity);
        let max = measurements.reduce((acc, val) => Math.max(acc, val.VCBira), -Infinity);
        setDataBounds(min, max);
        measurements.forEach(m => {
            markers.addLayer(L.DataMarker(m.lat, m.long, m.VCBira));
        });

        const timeSeries = new Chart("chartCanvas", {
            type: "line",
            data: {
                labels: measurements.map((_m, i) => i),
                datasets: [{
                    label: "VCBira",
                    fill: false,
                    backgroundColor: "#2698de",
                    borderColor: "#2698de",
                    borderWidth: 1,
                    data: measurements.map(m => m.VCBira),
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    xAxes: [{
                        display: false,
                    }],
                    yAxes: [{
                        display: true,
                        type: "logarithmic",
                    }]
                }
            }
        });
    });
map.addLayer(markers);

/* Util */
function linearMap(val, min, max, mappedMin, mappedMax) {
    return (max - val) / (max - min) * (mappedMax - mappedMin) + mappedMin;
}

function getMarkerColor(val) {
    return colorGradient(linearMap(Math.log(val), Math.log(dataMinValue), Math.log(dataMaxValue), 0, 1)).alpha(0.8);
}

document.addEventListener("resizeEnd", () => map.invalidateSize());