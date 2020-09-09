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
    let prevLength = 0;
    const timeBetweenDataFetches = 1000;
    // Timeout to warn the user when we haven't received any new data for a while
    let dataFetchTimeout = null;
    const connectionModal = document.getElementById("connectionModal");
    const timeoutNotification = document.getElementById("noNewDataWarning");
    const settingsModal = document.getElementById("settingsModal");
    let errorSound = null;

    const showConnectionModal = () => connectionModal.classList.add("visible");
    const hideConnectionModal = () => connectionModal.classList.remove("visible");
    let dataFetchTimeoutErrorSoundInterval = null;
    const showDataTimeoutNotification = () => {
        timeoutNotification.classList.add("visible");
        errorSound.play();
        dataFetchTimeoutErrorSoundInterval = setInterval(() => errorSound.play(), timeBetweenDataFetches);
    }
    const hideDataTimeoutNotification = () => {
        timeoutNotification.classList.remove("visible");
        clearInterval(dataFetchTimeoutErrorSoundInterval);
    }

    const fetchData = () => {
        fetch(new Request("/data"))
        .then(res => res.json())
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
                prevColumns = window.data.columns;
                window.dispatchEvent(new CustomEvent("DOASColumnsReceived", { detail: window.data.columns }));
            } else {
                if (measurements.length != prevLength) {
                    hideDataTimeoutNotification();
                    clearTimeout(dataFetchTimeout);
                    dataFetchTimeout = null;
                    prevLength = measurements.length;
                    processData();
                } else {
                    if (dataFetchTimeout == null) {
                        dataFetchTimeout = setTimeout(showDataTimeoutNotification, 1000*window.settings.measurementsTimeout);
                    }
                }
            }
        }).catch(_e => {
            showConnectionModal();
            errorSound.play();
        });
    }

    const processData = () => {
        // Check if a) we know which fields we want to use
        // and b) if the fields that we use are present in the data
        if (
            !window.settings.latCol || !window.data.columns.includes(window.settings.latCol) ||
            !window.settings.longCol || !window.data.columns.includes(window.settings.longCol) ||
            !window.settings.visualizeCol || !window.data.columns.includes(window.settings.visualizeCol)
        ) {
            settingsModal.classList.add("visible");
            return;
        }

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

    setInterval(fetchData, timeBetweenDataFetches);
    fetchData();
})();