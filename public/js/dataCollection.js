"use strict";
(() => {
    const areArraysEqual = (a1, a2) => {
        if (!(a1 instanceof Array) || !(a2 instanceof Array)) return false;
        if (a1.length != a2.length) return false;
        for (let i = 0; i < a1.length; i++) {
            if (a1[i] !== a2[i]) return false;
        }
        return true;
    }

    let prevColumns = null;
    let dataFetchTimer = null;
    let connectionModal = document.getElementById("connectionModal");
    let errorSound = null;

    const showConnectionModal = () => connectionModal.classList.add("visible");
    const hideConnectionModal = () => connectionModal.classList.remove("visible");

    const fetchData = () => {
        fetch(new Request("/data"))
        // TODO: handle non-200 OK responses
        .then(res => {
            if (res.status === 200) { return res.json(); }
            return Promise.resolve(window.data.raw || []);
        })
        .then(measurements => {
            hideConnectionModal();

            if (!window.data) window.data = {};

            window.data.raw = measurements;
    
            // The data either wasn't an array, or has length 0
            if (!measurements.length) return;
    
            // Only fire an event for the columns if they've changed
            // This will most likely only happen on startup (null -> actual value)
            window.data.columns = Object.getOwnPropertyNames(measurements[0]);
            if (!areArraysEqual(window.data.columns, prevColumns)) {
                console.log("New Columns");
                prevColumns = window.data.columns;
                window.dispatchEvent(new CustomEvent("DOASColumnsReceived", { detail: window.data.columns }));
            } else {
                processData();
            }
        }).catch(error => {
            showConnectionModal();
            errorSound.play();
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

    errorSound = new Audio("/error.mp3");

    dataFetchTimer = setInterval(fetchData, 5000);
    fetchData();
})();