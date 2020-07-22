"use strict";
(() => {
    const latSelect = document.getElementById("settingsSelectLat");
    const longSelect = document.getElementById("settingsSelectLong");
    const visualizeSelect = document.getElementById("settingsSelectVisualize");

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
        window.dispatchEvent(new CustomEvent("DOASColumnSettingsChanged",
        {
            detail: {
                latCol: window.settings.latCol,
                longCol: window.settings.longCol,
                visualizeCol: window.settings.visualizeCol
            }
        }));
    }

    let knownPatterns = [
        {
            matches: cols => cols.includes("lat") && cols.includes("long") && cols.includes("VCBira"),
            mappings: {
                getLat: () => "lat",
                getLong: () => "long",
                getVisualize: () => "VCBira",
            }
        },
    ]

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

    window.settings.bounds = {
        min: null,
        max: null,
    }

})();