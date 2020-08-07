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
                    type: "logarithmic",
                    ticks: {}
                }]
            },
            elements: {
                point: {
                    //radius: (ctx) => ctx.dataIndex == 5 ? 20 : 2
                }
            }
        }
    });

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
    });

    window.addEventListener("DOASChartRangeChange", () => {
        if (window.settings.chart.min == null) {
            delete chart.options.scales.yAxes[0].ticks.min;
        } else {
            chart.options.scales.yAxes[0].ticks.min = window.settings.chart.min;
        }
        if (window.settings.chart.max == null) {
            delete chart.options.scales.yAxes[0].ticks.max;
        } else {
            chart.options.scales.yAxes[0].ticks.max = window.settings.chart.max;
        }
        chart.update();
    });
})();