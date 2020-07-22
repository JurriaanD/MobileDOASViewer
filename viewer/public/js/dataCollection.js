"use strict";
(() => {
    let prevColumns = null;

    const fetchData = () => {
        fetch(new Request("/data"))
        // TODO: handle non-200 OK responses
        .then(res => res.json())
        .then(measurements => {
            if (!window.data) window.data = {};

            window.data.raw = measurements;
    
            // The data either wasn't an array, or has length 0
            if (!measurements.length) return;
    
            // Only fire an event for the columns if they've changed
            // This will most likely only happen on startup (null -> actual value)
            window.data.columns = Object.getOwnPropertyNames(measurements[0]);
            if (window.data.columns != prevColumns) {
                prevColumns = window.data.columns;
                window.dispatchEvent(new CustomEvent("DOASColumnsReceived", { detail: window.data.columns }));
            } else {
                processData();
            }
        });
    }

    const processData = () => {
        // Check if a) we know which fields we want to use
        // and b) if the fields that we use are present in the data
        if (!window.settings.latCol) return;
        if (!window.data.columns.includes(window.settings.latCol)) return;
        if (!window.settings.longCol) return;
        if (!window.data.columns.includes(window.settings.longCol)) return;
        if (!window.settings.visualizeCol) return;
        if (!window.data.columns.includes(window.settings.visualizeCol)) return;

        // Check for NaN
        window.data.processed = window.data.raw.map(m => ({
            lat: Number(m[window.settings.latCol]),
            long: Number(m[window.settings.longCol]),
            value: Number(m[window.settings.visualizeCol])
        }));
        window.dispatchEvent(new CustomEvent("DOASDataReceived", { detail: window.data.processed }));
    }

    window.addEventListener("DOASColumnSettingsChanged", processData);

    fetchData();
    // setInterval(5000, fetchData);
})();