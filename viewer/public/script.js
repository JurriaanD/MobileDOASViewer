const map = L.map("mapid").setView([50.797005, 4.356694], 9);

/* Tiles */
const tilesLayer = L.mapboxGL({
    attribution: "Tiles provided by OpenMapTiles",
    accessToken: 'no-token',
    style: "http://localhost:8080/styles/basic-preview/style.json"
}).addTo(map);

/* Color Scale */
const dataColors = ["#1e9600", "#fff200", "#ff0000"];
const colorGradient = chroma.scale(dataColors).mode("lab");

L.Control.DataColorScale = L.Control.extend({
    onAdd: m => {
        const div = L.DomUtil.create('div');
        div.style.width = "200px";
        div.style.height = "30px";
        div.style.background = `linear-gradient(to right,${dataColors.join(',')})`;
        return div;
    },

    onRemove: m => {}
});

L.DataColorScale = (opts) => new L.Control.DataColorScale(opts);

L.DataColorScale({ position: 'bottomleft' }).addTo(map);

/* Data Marker */
L.DataMarker = (lat, long, color) => {
    const options = {
        radius: 5,
        interactive: false,
        color: color.toString(),
        fillOpacity: 1,
        stroke: false
    }
    return L.circleMarker(L.latLng(lat, long), options);
};

fetch(new Request("/data"))
    // TODO: handle non-200 OK responses
    .then(res => res.json() )
    .then(measurements => {
        // TODO: handle NaN
        let min = Math.log(measurements.reduce((acc, val) => Math.min(acc, val.VCBira), Infinity));
        let max = Math.log(measurements.reduce((acc, val) => Math.max(acc, val.VCBira), -Infinity));
        measurements.forEach(m => {
            let color = colorGradient(linearMap(Math.log(m.VCBira), min, max, 0, 1));
            L.DataMarker(m.lat, m.long, color).addTo(map);
        });
    });

/* Util */
const linearMap = (val, min, max, mappedMin, mappedMax) => {
    return (max - val) / (max - min) * (mappedMax - mappedMin) + mappedMin;
}