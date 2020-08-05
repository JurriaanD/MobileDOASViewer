"use strict";
(() => {
    const latSelect = document.getElementById("settingsSelectLat");
    const longSelect = document.getElementById("settingsSelectLong");
    const visualizeSelect = document.getElementById("settingsSelectVisualize");
    const scaleLowerBoundInput = document.getElementById("settingsLowerBound");
    const scaleUpperBoundInput = document.getElementById("settingsUpperBound");
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

    let knownPatterns = [{
        matches: cols => cols.includes("lat") && cols.includes("long") && cols.includes("VCBira"),
        mappings: {
            getLat: () => "lat",
            getLong: () => "long",
            getVisualize: () => "VCBira",
        }
    }, ]

    window.addEventListener("DOASColumnsReceived", e => {
        let cols = e.detail;
        let okFlag = false;
        for (let pattern of knownPatterns) {
            if (pattern.matches(cols)) {
                let mapper = pattern.mappings;
                window.settings.latCol = mapper.getLat();
                window.settings.longCol = mapper.getLong();
                window.settings.visualizeCol = mapper.getVisualize();
                okFlag = true;
                break;
            }
        }

        latSelect.length = 0;
        longSelect.length = 0;
        visualizeSelect.length = 0;

        cols.forEach((col, idx) => {
            latSelect[idx] = new Option(col, col);
            longSelect[idx] = new Option(col, col);
            visualizeSelect[idx] = new Option(col, col);
        });

        if (okFlag) {
            latSelect.value = window.settings.latCol;
            longSelect.value = window.settings.longCol;
            visualizeSelect.value = window.settings.visualizeCol;
        }
        fireColumnChangeEvent();
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