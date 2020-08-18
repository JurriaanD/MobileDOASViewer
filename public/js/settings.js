"use strict";
(() => {
    const latSelect = document.getElementById("settingsSelectLat");
    const longSelect = document.getElementById("settingsSelectLong");
    const visualizeSelect = document.getElementById("settingsSelectVisualize");
    const scaleLowerBoundInput = document.getElementById("settingsLowerBound");
    const scaleUpperBoundInput = document.getElementById("settingsUpperBound");
    const chartMinInput = document.getElementById("settingsChartMin");
    const chartMaxInput = document.getElementById("settingsChartMax");
    const logScaleCheck = document.getElementById("settingsCheckUseLog");
    const nbPointsToTrackInput = document.getElementById("settingsNbPointsToTrack");

    if (!window.settings) window.settings = {};

    latSelect.addEventListener("change", e => {
        window.settings.latCol = e.target.value;
        fireColumnChangeEvent();
    });

    longSelect.addEventListener("change", e => {
        window.settings.longCol = e.target.value;
        fireColumnChangeEvent();
    });

    visualizeSelect.addEventListener("change", e => {
        window.settings.visualizeCol = e.target.value;
        fireColumnChangeEvent();
    });

    const fireColumnChangeEvent = () => {
        window.dispatchEvent(new CustomEvent("DOASColumnSettingsChanged", {
            detail: {
                latCol: window.settings.latCol,
                longCol: window.settings.longCol,
                visualizeCol: window.settings.visualizeCol
            }
        }));
    }

    window.addEventListener("DOASColumnsReceived", e => {
        let cols = e.detail;

        fetch(new Request("/columns"))
        .then(res => {
            if (res.status === 200) {
                return res.json();
            }
        }).then(defaults => {
            latSelect.length = 0;
            longSelect.length = 0;
            visualizeSelect.length = 0;
    
            cols.forEach((col, idx) => {
                latSelect[idx] = new Option(col, col);
                longSelect[idx] = new Option(col, col);
                visualizeSelect[idx] = new Option(col, col);
            });

            if (cols.includes(defaults.lat_column)) {
                window.settings.latCol = defaults.lat_column;
                latSelect.value = window.settings.latCol;
            }
            if (cols.includes(defaults.long_column)) {
                window.settings.longCol = defaults.long_column;
                longSelect.value = window.settings.longCol;
            }
            if (cols.includes(defaults.data_column)) {
                window.settings.visualizeCol = defaults.data_column;
                visualizeSelect.value = window.settings.visualizeCol;
            }

            fireColumnChangeEvent();
        });
    });

    /* Scale bounds */
    window.settings.bounds = {
        min: null,
        max: null
    };
    // Lose focus/submit when the user presses Enter
    const blurOnEnter = e => {
        if (e.which == 13) e.target.blur();
    };
    scaleLowerBoundInput.addEventListener("keyup", blurOnEnter);
    scaleUpperBoundInput.addEventListener("keyup", blurOnEnter);
    scaleLowerBoundInput.addEventListener("blur", e => {
        if (e.target.checkValidity()) {
            window.settings.bounds.min = e.target.value === "" ? null : Number(e.target.value);
            window.dispatchEvent(new CustomEvent("DOASBoundsChange", {
                detail: window.settings.bounds
            }));
        }
    });
    scaleUpperBoundInput.addEventListener("blur", e => {
        if (e.target.checkValidity()) {
            window.settings.bounds.max = e.target.value === "" ? null : Number(e.target.value);
            window.dispatchEvent(new CustomEvent("DOASBoundsChange", {
                detail: window.settings.bounds
            }));
        }
    });


    window.settings.chart = {
        min: null,
        max: null
    };
    chartMinInput.addEventListener("keyup", blurOnEnter);
    chartMaxInput.addEventListener("keyup", blurOnEnter);
    chartMinInput.addEventListener("blur", e => {
        if (e.target.checkValidity()) {
            window.settings.chart.min = e.target.value === "" ? null : Number(e.target.value);
            window.dispatchEvent(new CustomEvent("DOASChartRangeChange", {
                detail: window.settings.chart
            }));
        }
    });
    chartMaxInput.addEventListener("blur", e => {
        if (e.target.checkValidity()) {
            window.settings.chart.max = e.target.value === "" ? null : Number(e.target.value);
            window.dispatchEvent(new CustomEvent("DOASChartRangeChange", {
                detail: window.settings.chart
            }));
        }
    });


    /* Log scale toggle */
    logScaleCheck.addEventListener("change", e => {
        window.settings.useLogScale = e.target.checked;
        window.dispatchEvent(new CustomEvent("DOASScaleChanged", {
            detail: e.target.value
        }))
    });
    logScaleCheck.checked = true;
    const initCheckEvent = document.createEvent("HTMLEvents");
    initCheckEvent.initEvent('change', false, true);
    logScaleCheck.dispatchEvent(initCheckEvent);

    /* Number of points to keep in viewport */
    window.settings.nbPointsToTrack = 10;
    nbPointsToTrackInput.value = "10";
    nbPointsToTrackInput.addEventListener("keyup", blurOnEnter);
    nbPointsToTrackInput.addEventListener("blur", e => {
        window.settings.nbPointsToTrack = nbPointsToTrackInput.value == "" ? 0 : nbPointsToTrackInput.value;
    });
})();