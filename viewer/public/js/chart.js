"use strict";
(() => {
    const chart = new Chart("chartCanvas", {
        type: "line",
        data: {
            datasets: [],
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
                    type: "logarithmic"
                }]
            },
            elements: {
                point: {
                    //radius: (ctx) => ctx.dataIndex == 5 ? 20 : 2
                }
            }
        }
    });
    // Initializing the chart as logarithmic gives it nice properties (scientific notation and right number of ticks)
    // You can probably do this with some options, but this works
    chart.options.scales.yAxes[0].type = "linear"; chart.update();

    window.addEventListener("DOASDataReceived", e => {
        let label = window.settings.visualizeCol;
        let data = e.detail.map(({ value }) => value);

        let dataset = {
            label,
            data,
            fill: false,
            backgroundColor: "#2698de",
            borderColor: "#2698de",
            borderWidth: 1,
        }

        chart.data.labels = e.detail.map((_data, idx) => idx);
        if (chart.data.datasets.length === 0) {
            chart.data.datasets.push(dataset);
        } else {
            chart.data.datasets[0].label = label;
            chart.data.datasets[0].data = data;
        }
        chart.update();
    });

    window.addEventListener("DOASScaleChanged", e => {
        chart.options.scales.yAxes[0].type = window.settings.useLogScale ? "logarithmic" : "linear";
        chart.update();
    })
})();