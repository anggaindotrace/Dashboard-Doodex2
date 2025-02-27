/* global owl:readonly */
import { isMobileOS } from "@web/core/browser/feature_detection";
import { Component, useState, useRef, onMounted,onWillStart } from "@odoo/owl";

import { rpc } from "@web/core/network/rpc";
// import { DashboardController } from "@Dashboard-Doodex/components/controller";

export class Graph{
    constructor(root){
        this.root = root;
        // this.dashboardController = new DashboardController();
        // this.options = useState(this.dashboardController)
    }

    async initChart(referenceId) {
        console.log("initChart", referenceId);
        console.log("this.root", this.root);
        const ref = this.root.el.querySelector(referenceId);
        if (ref._root) {
            ref._root.dispose();
            ref._root = null;
        }
        var root = am5.Root.new(ref);
        ref._root = root;
        root.setThemes([am5themes_Animated.new(root)]);
        return root;
    }

    async renderTopSellingProducts(data) {
        // Example random data
        data = [
            { product: "Product A", totalValue: 5000, totalQuantity: 150 },
            { product: "Product B", totalValue: 3000, totalQuantity: 120 },
            { product: "Product C", totalValue: 7000, totalQuantity: 200 }
        ];

        const root = await this.initChart("#top-3-sales-by-product");
        console.log("root", root);
        var chart = root.container.children.push(
            am5xy.XYChart.new(root, {
                panY: false,
                wheelY: "zoomX",
                layout: root.verticalLayout,
                maxTooltipDistance: 0
            })
        );

        // Create X-Axis for products
        var xAxis = chart.xAxes.push(
            am5xy.CategoryAxis.new(root, {
                categoryField: "product",
                renderer: am5xy.AxisRendererX.new(root, {})
            })
        );
        xAxis.data.setAll(data);

        // Create left Y-Axis for total value
        var yAxisLeft = chart.yAxes.push(
            am5xy.ValueAxis.new(root, {
                renderer: am5xy.AxisRendererY.new(root, {})
            })
        );

        // Create right Y-Axis for total quantity
        var yAxisRight = chart.yAxes.push(
            am5xy.ValueAxis.new(root, {
                renderer: am5xy.AxisRendererY.new(root, { opposite: true })
            })
        );

        // Create series for total value
        var valueSeries = chart.series.push(
            am5xy.ColumnSeries.new(root, {
                name: "Total Value",
                xAxis: xAxis,
                yAxis: yAxisLeft,
                valueYField: "totalValue",
                categoryXField: "product",
                fill: am5.color(0x008080),
                stroke: am5.color(0x008080)
            })
        );
        valueSeries.data.setAll(data);

        // Create series for total quantity
        var quantitySeries = chart.series.push(
            am5xy.ColumnSeries.new(root, {
                name: "Total Quantity",
                xAxis: xAxis,
                yAxis: yAxisRight,
                valueYField: "totalQuantity",
                categoryXField: "product",
                fill: am5.color(0x00bfff),
                stroke: am5.color(0x00bfff)
            })
        );
        quantitySeries.data.setAll(data);


        // Add legend and set it on top
        var legend = chart.children.unshift(am5.Legend.new(root, {
            centerX: am5.p50,
            x: am5.p50,
            centerY: am5.p0,
            y: am5.p0
        }));
        legend.data.setAll(chart.series.values);
    }
}