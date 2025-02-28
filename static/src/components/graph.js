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

    async renderTopSellingProducts(data, type) {
        if (type === 'value') {
            if (data && data.top3ProductsByValue) {
                data = data.top3ProductsByValue;
            } else {
                data = [];
            }
        } else {
            if (data && data.top3ProductsByQuantity) {
                data = data.top3ProductsByQuantity;
            } else {
                data = [];
            }
        }
        console.log("data", data);
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
                fill: am5.color(0x004040),
                stroke: am5.color(0x004040),
                clustered: true, // Ensure bars are on different sides
                tooltip: am5.Tooltip.new(root, {
                    labelText: "{name}: {valueY}"
                }),
                width: 0.5
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
                fill: am5.color(0x01B8B8),
                stroke: am5.color(0x01B8B8),
                clustered: true, // Ensure bars are on different sides
                tooltip: am5.Tooltip.new(root, {
                    labelText: "{name}: {valueY}"
                }),
                width: 0.5
            })
        );
        quantitySeries.data.setAll(data);
        
        chart.set("cursor", am5xy.XYCursor.new(root, {}));
        // Add legend and set it on top
        var legend = chart.children.unshift(am5.Legend.new(root, {
            centerX: am5.p50,
            x: am5.p50,
            centerY: am5.p0,
            y: am5.p0
        }));
        legend.data.setAll(chart.series.values);

        chart.appear(1000, 100);
    }

    async renderComboCharts(referenceId){
        const root = await this.initChart(referenceId);

        var chart = root.container.children.push(
            am5xy.XYChart.new(root, {
              panX: true,
              panY: true,
              wheelX: "panX",
              wheelY: "zoomX",
              paddingLeft: 0,
              paddingBottom: 30,
              layout: root.verticalLayout
            })
          );
          
          chart.get("colors").set("step", 5);
          
          // Add cursor
          // https://www.amcharts.com/docs/v5/charts/xy-chart/cursor/
          var cursor = chart.set(
            "cursor",
            am5xy.XYCursor.new(root, {
              behavior: "none"
            })
          );
          cursor.lineY.set("visible", false);
          
          // Create axes
          // https://www.amcharts.com/docs/v5/charts/xy-chart/axes/
          var xAxis = chart.xAxes.push(
            am5xy.CategoryAxis.new(root, {
              categoryField: "period",
              renderer: am5xy.AxisRendererX.new(root, {
                minorGridEnabled: true,
                minGridDistance: 70
              }),
              tooltip: am5.Tooltip.new(root, {})
            })
          );
          
          var yAxis = chart.yAxes.push(
            am5xy.ValueAxis.new(root, {
              renderer: am5xy.AxisRendererY.new(root, {})
            })
          );

          function makeBarSeries(name, fieldName, color){
            var series = chart.series.push(
              am5xy.ColumnSeries.new(root, {
                name: name,
                xAxis: xAxis,
                yAxis: yAxis,
                valueYField: fieldName,
                categoryXField: "period",
                tooltip: am5.Tooltip.new(root, {
                  pointerOrientation: "horizontal",
                  labelText: "{name} in {categoryX}: {valueY} {info}",
                  layer: 60
                }),
                fill: color,
                stroke: color,
                layer: 60,
              })
            );
            
            series.columns.template.setAll({
              tooltipY: am5.percent(10),
              templateField: "columnSettings"
            });
            
            series.data.setAll(data);
            series.appear();
          } 
          
          // Add series
          // https://www.amcharts.com/docs/v5/charts/xy-chart/series/
          var series1 = chart.series.push(
            am5xy.SmoothedXLineSeries.new(root, {
              name: "Untaxed Total",
              xAxis: xAxis,
              yAxis: yAxis,
              valueYField: "untaxed_total",
              openValueYField: "amount_received",
              categoryXField: "period",
              stroke: am5.color("#F4D06F"),
              fill: am5.color("#F4D06F"),
              tooltip: am5.Tooltip.new(root, {
                pointerOrientation: "horizontal",
                labelText: "{name} in {categoryX}: {valueY} {info}",
                layer: 60
              }),
            })
          );
          
          series1.fills.template.setAll({
            fillOpacity: 0.3,
            visible: true
          });
          
          var series2 = chart.series.push(
            am5xy.SmoothedXLineSeries.new(root, {
              name: "Amount Received",
              xAxis: xAxis,
              yAxis: yAxis,
              valueYField: "amount_received",
              categoryXField: "period",
              stroke: am5.color("#F4D06F"),
              fill: am5.color("#F4D06F"),
              tooltip: am5.Tooltip.new(root, {
                pointerOrientation: "horizontal",
                labelText: "{name} in {categoryX}: {valueY} {info}",
                layer: 60
              }),
            })
          );
          
          var data = [
            {
              period: "August 2023",
              untaxed_total: 1355483.35,
              amount_to_invoice: 5588.93,
              amount_received: 1351485.60,
              waiting_for_payment: 1209.71,
              overdue: 1427.80
            },
            {
              period: "September 2023",
              untaxed_total: 393202.64,
              amount_to_invoice: 0.00,
              amount_received: 395969.00,
              waiting_for_payment: 0.00,
              overdue: 0.00
            },
            {
              period: "October 2023",
              untaxed_total: 668641.60,
              amount_to_invoice: 0.00,
              amount_received: 675155.42,
              waiting_for_payment: 0.00,
              overdue: 0.00
            },
            {
              period: "November 2023",
              untaxed_total: 798845.65,
              amount_to_invoice: 0.00,
              amount_received: 804156.59,
              waiting_for_payment: 0.00,
              overdue: 0.00
            },
            {
              period: "December 2023",
              untaxed_total: 1118137.82,
              amount_to_invoice: 0.00,
              amount_received: 1120649.00,
              waiting_for_payment: 0.00,
              overdue: 0.00
            },
            {
              period: "January 2024",
              untaxed_total: 74952.24,
              amount_to_invoice: 0.00,
              amount_received: 754270.41,
              waiting_for_payment: 30790.00,
              overdue: 25347.36
            },
            {
              period: "February 2024",
              untaxed_total: 1201906.90,
              amount_to_invoice: 0.00,
              amount_received: 978993.40,
              waiting_for_payment: 232237.00,
              overdue: 266252.86
            },
            {
              period: "March 2024",
              untaxed_total: 894261.24,
              amount_to_invoice: 107194.27,
              amount_received: 614329.18,
              waiting_for_payment: 173833.50,
              overdue: 180864.37
            },
            {
              period: "April 2024",
              untaxed_total: 679582.94,
              amount_to_invoice: 8948.87,
              amount_received: 229562.59,
              waiting_for_payment: 451226.00,
              overdue: 488781.10
            },
            {
              period: "May 2024",
              untaxed_total: 1136836.11,
              amount_to_invoice: 749840.51,
              amount_received: 90440.90,
              waiting_for_payment: 298306.30,
              overdue: 241101.23
            },
            {
              period: "June 2024",
              untaxed_total: 715509.53,
              amount_to_invoice: 601052.31,
              amount_received: 29894.57,
              waiting_for_payment: 86604.50,
              overdue: 102883.02
            },
            {
              period: "July 2024",
              untaxed_total: 588953.90,
              amount_to_invoice: 540474.83,
              amount_received: 46511.39,
              waiting_for_payment: 1969.00,
              overdue: 2230.83
            }
          ];
          
          // Set data
          xAxis.data.setAll(data);
          series1.data.setAll(data);
          series2.data.setAll(data);

          makeBarSeries("Amount to Invoice", "amount_to_invoice", "#004040");
          makeBarSeries("Waiting for Payment", "waiting_for_payment", "#009696");
          makeBarSeries("Overdue", "overdue", "#02DEDE");
          
          // Create ranges
          var rangeDataItem;
          
          // Process each data point to create ranges
          for (var i = 0; i < data.length; i++) {
            var currentData = data[i];
            
            // Check if amount_received is greater than untaxed_total
            if (currentData.amount_received > currentData.untaxed_total) {
              // If we don't have an active range, create one
              if (!rangeDataItem) {
                rangeDataItem = xAxis.makeDataItem({});
                var range = series1.createAxisRange(rangeDataItem);
                rangeDataItem.set("category", currentData.period);
                
                range.fills.template.setAll({
                  fill: am5.color("#F4D06F"),
                  fillOpacity: 0.3,
                  visible: true
                });
                
                range.strokes.template.setAll({
                  stroke: am5.color("#F4D06F"),
                  strokeWidth: 4
                });
              }
            } else {
              // If we have an active range and now untaxed_total is greater, end the range
              if (rangeDataItem) {
                rangeDataItem.set("endCategory", currentData.period);
                rangeDataItem = undefined;
              }
            }
            
            // If this is the last item and we have an open range, close it
            if (i === data.length - 1 && rangeDataItem) {
              rangeDataItem.set("endCategory", currentData.period);
              rangeDataItem = undefined;
            }
          }
          
          series1.strokes.template.setAll({
                  strokeWidth: 4,
                });
          
          series2.strokes.template.setAll({
                  strokeWidth: 4,
                });
          
          series1.bullets.push(
            function () {
                  return am5.Bullet.new(root, {
                    locationY: 0,
                    sprite: am5.Circle.new(root, {
                      radius: 6,
                      stroke: root.interfaceColors.get("background"),
                      strokeWidth: 2,
                      fill: series1.get("fill")
                    }),
                  });
                }
          )
          series2.bullets.push(
            function () {
                  return am5.Bullet.new(root, {
                    locationY: 0,
                    sprite: am5.Circle.new(root, {
                      radius: 6,
                      stroke: root.interfaceColors.get("background"),
                      strokeWidth: 2,
                      fill: series2.get("fill")
                    }),
                  });
                }
          )
          var legend = chart.children.push(
            am5.Legend.new(root, {
              centerX: am5.p50,
              x: am5.p50,
              y: am5.p100
            })
          );
          legend.data.setAll(chart.series.values);

          chart.zoomOutButton.set("forceHidden", true);
          series1.appear(1000);
          series2.appear(1000);
          chart.appear(1000, 100);
    }

    async renderHierarchyChart(referenceId){
        const root = await this.initChart(referenceId);
        var data = {
          value: 0,
          children: [
            {
              name: "Flora",
              children: [
                {
                  name: "Black Tea",
                  value: 1
                },
                {
                  name: "Floral",
                  children: [
                    {
                      name: "Chamomile",
                      value: 1
                    },
                    {
                      name: "Rose",
                      value: 1
                    },
                    {
                      name: "Jasmine",
                      value: 1
                    }
                  ]
                }
              ]
            },
            {
              name: "Fruity",
              children: [
                {
                  name: "Berry",
                  children: [
                    {
                      name: "Blackberry",
                      value: 1
                    },
                    {
                      name: "Raspberry",
                      value: 1
                    },
                    {
                      name: "Blueberry",
                      value: 1
                    },
                    {
                      name: "Strawberry",
                      value: 1
                    }
                  ]
                },
                {
                  name: "Dried Fruit",
                  children: [
                    {
                      name: "Raisin",
                      value: 1
                    },
                    {
                      name: "Prune",
                      value: 1
                    }
                  ]
                },
                {
                  name: "Other Fruit",
                  children: [
                    {
                      name: "Coconut",
                      value: 1
                    },
                    {
                      name: "Cherry",
                      value: 1
                    },
                    {
                      name: "Pomegranate",
                      value: 1
                    },
                    {
                      name: "Pineapple",
                      value: 1
                    },
                    {
                      name: "Grape",
                      value: 1
                    },
                    {
                      name: "Apple",
                      value: 1
                    },
                    {
                      name: "Peach",
                      value: 1
                    },
                    {
                      name: "Pear",
                      value: 1
                    }
                  ]
                },
                {
                  name: "Citrus Fruit",
                  children: [
                    {
                      name: "Grapefruit",
                      value: 1
                    },
                    {
                      name: "Orange",
                      value: 1
                    },
                    {
                      name: "Lemon",
                      value: 1
                    },
                    {
                      name: "Lime",
                      value: 1
                    }
                  ]
                }
              ]
            },
            {
              name: "Sour/Fermented",
              children: [
                {
                  name: "Sour",
                  children: [
                    {
                      name: "Sour Aromatics",
                      value: 1
                    },
                    {
                      name: "Acetic Acid",
                      value: 1
                    },
                    {
                      name: "Butyric Acid",
                      value: 1
                    },
                    {
                      name: "Isovaleric Acid",
                      value: 1
                    },
                    {
                      name: "Citric Acid",
                      value: 1
                    },
                    {
                      name: "Malic Acid",
                      value: 1
                    }
                  ]
                },
                {
                  name: "Alcohol/Fremented",
                  children: [
                    {
                      name: "Winey",
                      value: 1
                    },
                    {
                      name: "Whiskey",
                      value: 1
                    },
                    {
                      name: "Fremented",
                      value: 1
                    },
                    {
                      name: "Overripe",
                      value: 1
                    }
                  ]
                }
              ]
            },
            {
              name: "Green/Vegetative",
              children: [
                {
                  name: "Olive Oil",
                  value: 1
                },
                {
                  name: "Raw",
                  value: 1
                },
                {
                  name: "Green/Vegetative",
                  children: [
                    {
                      name: "Under-ripe",
                      value: 1
                    },
                    {
                      name: "Peapod",
                      value: 1
                    },
                    {
                      name: "Fresh",
                      value: 1
                    },
                    {
                      name: "Dark Green",
                      value: 1
                    },
                    {
                      name: "Vegetative",
                      value: 1
                    },
                    {
                      name: "Hay-like",
                      value: 1
                    },
                    {
                      name: "Herb-like",
                      value: 1
                    }
                  ]
                },
                {
                  name: "Beany",
                  value: 1
                }
              ]
            },
            {
              name: "Other",
              children: [
                {
                  name: "Papery/Musty",
                  children: [
                    {
                      name: "Stale",
                      value: 1
                    },
                    {
                      name: "Cardboard",
                      value: 1
                    },
                    {
                      name: "Papery",
                      value: 1
                    },
                    {
                      name: "Woody",
                      value: 1
                    },
                    {
                      name: "Moldy/Damp",
                      value: 1
                    },
                    {
                      name: "Musty/Dusty",
                      value: 1
                    },
                    {
                      name: "Musty/Earthy",
                      value: 1
                    },
                    {
                      name: "Animalic",
                      value: 1
                    },
                    {
                      name: "Meaty Brothy",
                      value: 1
                    },
                    {
                      name: "Phenolic",
                      value: 1
                    }
                  ]
                },
                {
                  name: "Chemical",
                  children: [
                    {
                      name: "Bitter",
                      value: 1
                    },
                    {
                      name: "Salty",
                      value: 1
                    },
                    {
                      name: "Medicinal",
                      value: 1
                    },
                    {
                      name: "Petroleum",
                      value: 1
                    },
                    {
                      name: "Skunky",
                      value: 1
                    },
                    {
                      name: "Rubber",
                      value: 1
                    }
                  ]
                }
              ]
            },
            {
              name: "Roasted",
              children: [
                {
                  name: "Pipe Tobacco",
                  value: 1
                },
                {
                  name: "Tobacco",
                  value: 1
                },
                {
                  name: "Burnt",
                  children: [
                    {
                      name: "Acrid",
                      value: 1
                    },
                    {
                      name: "Ashy",
                      value: 1
                    },
                    {
                      name: "Smoky",
                      value: 1
                    },
                    {
                      name: "Brown, Roast",
                      value: 1
                    }
                  ]
                },
                {
                  name: "Cereal",
                  children: [
                    {
                      name: "Grain",
                      value: 1
                    },
                    {
                      name: "Malt",
                      value: 1
                    }
                  ]
                }
              ]
            },
            {
              name: "Spices",
              children: [
                {
                  name: "Pungent",
                  value: 1
                },
                {
                  name: "Pepper",
                  value: 1
                },
                {
                  name: "Brown Spice",
                  children: [
                    {
                      name: "Anise",
                      value: 1
                    },
                    {
                      name: "Nutmeg",
                      value: 1
                    },
                    {
                      name: "Cinnamon",
                      value: 1
                    },
                    {
                      name: "Clove",
                      value: 1
                    }
                  ]
                }
              ]
            },
            {
              name: "Nutty/Cocoa",
              children: [
                {
                  name: "Nutty",
                  children: [
                    {
                      name: "Peanuts",
                      value: 1
                    },
                    {
                      name: "Hazelnut",
                      value: 1
                    },
                    {
                      name: "Almond",
                      value: 1
                    }
                  ]
                },
                {
                  name: "Cocoa",
                  children: [
                    {
                      name: "Chocolate",
                      value: 1
                    },
                    {
                      name: "Dark Chocolate",
                      value: 1
                    }
                  ]
                }
              ]
            },
            {
              name: "Sweet",
              children: [
                {
                  name: "Brown Sugar",
                  children: [
                    {
                      name: "Molasses",
                      value: 1
                    },
                    {
                      name: "Maple Syrup",
                      value: 1
                    },
                    {
                      name: "Caramelized",
                      value: 1
                    },
                    {
                      name: "Honey",
                      value: 1
                    }
                  ]
                },
                {
                  name: "Vanilla",
                  value: 1
                },
                {
                  name: "Vanillin",
                  value: 1
                },
                {
                  name: "Overall Sweet",
                  value: 1
                },
                {
                  name: "Sweet Aromatics",
                  value: 1
                }
              ]
            }
          ]
        };
        
        var zoomableContainer = root.container.children.push(
          am5.ZoomableContainer.new(root, {
            width: am5.p100,
            height: am5.p100,
            wheelable: true,
            pinchZoom: true
          })
        );
        
        var zoomTools = zoomableContainer.children.push(am5.ZoomTools.new(root, {
          target: zoomableContainer
        }));
        
        zoomTools.homeButton.get("background").set("fill", "#004040")
        zoomTools.homeButton.get("background").states.create("hover", {}).setAll({
          fill: am5.color("#008080")
        })
        zoomTools.homeButton.get("background").states.create("down", {}).setAll({
          fill: am5.color("#01B8B8")
        })

        zoomTools.plusButton.get("background").set("fill", "#004040")
        zoomTools.plusButton.get("background").states.create("hover", {}).setAll({
          fill: am5.color("#008080")
        })
        zoomTools.plusButton.get("background").states.create("down", {}).setAll({
          fill: am5.color("#01B8B8")
        })

        zoomTools.minusButton.get("background").set("fill", "#004040")
        zoomTools.minusButton.get("background").states.create("hover", {}).setAll({
          fill: am5.color("#008080")
        })
        zoomTools.minusButton.get("background").states.create("down", {}).setAll({
          fill: am5.color("#01B8B8")
        })

        
        // Create series
        // https://www.amcharts.com/docs/v5/charts/hierarchy/#Adding
        var series = zoomableContainer.contents.children.push(am5hierarchy.ForceDirected.new(root, {
          maskContent:false, //!important with zoomable containers
          singleBranchOnly: true,
          downDepth: 1,
          topDepth: 1,
          initialDepth: 0,
          valueField: "value",
          categoryField: "name",
          childDataField: "children",
          idField: "name",
          linkWithField: "linkWith",
          manyBodyStrength: -20,
          centerStrength: 0.6
        }));
        
        series.get("colors").set("colors", [
          am5.color("#B5918C"),
          am5.color("#205353"),
          am5.color("#008080"),
          am5.color("#549D95"),
          am5.color("#F7B501"),
          am5.color("#E89B00"),
          am5.color("#CC6300"),
          am5.color("#B04700"),
          am5.color("#942A00"),
          am5.color("#6C1E20")
        ])
        
        series.get("colors").setAll({
          step: 1
        });
        
        series.links.template.set("strength", 2);
        series.labels.template.set("minScale", 0);
        
        series.data.setAll([data]);
        
        series.set("selectedDataItem", series.dataItems[0]);
        
        
        
        // Make stuff animate on load
        series.appear(1000, 100);
    }

    async renderBarChart(referenceId){
      const root = await this.initChart(referenceId);
      var chart = root.container.children.push(am5xy.XYChart.new(root, {
        panX: true,
        panY: true,
        wheelX: "panX",
        wheelY: "zoomX",
        pinchZoomX: true,
        paddingLeft:0,
        paddingRight:1
      }));
      
      // Add cursor
      // https://www.amcharts.com/docs/v5/charts/xy-chart/cursor/
      var cursor = chart.set("cursor", am5xy.XYCursor.new(root, {}));
      cursor.lineY.set("visible", false);
      
      
      // Create axes
      // https://www.amcharts.com/docs/v5/charts/xy-chart/axes/
      var xRenderer = am5xy.AxisRendererX.new(root, { 
        minGridDistance: 30, 
        minorGridEnabled: true
      });
      
      xRenderer.labels.template.setAll({
        centerY: am5.p50,
        centerX: am5.p50,
        paddingRight: 0
      });
      
      xRenderer.grid.template.setAll({
        location: 1
      })
      
      var xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, {
        maxDeviation: 0.3,
        categoryField: "country",
        renderer: xRenderer,
        tooltip: am5.Tooltip.new(root, {})
      }));
      
      var yRenderer = am5xy.AxisRendererY.new(root, {
        strokeOpacity: 0.1
      })
      
      var yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, {
        maxDeviation: 0.3,
        renderer: yRenderer
      }));
      
      // Create series
      // https://www.amcharts.com/docs/v5/charts/xy-chart/series/
      var series = chart.series.push(am5xy.ColumnSeries.new(root, {
        name: "Series 1",
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: "value",
        sequencedInterpolation: true,
        categoryXField: "country",
        tooltip: am5.Tooltip.new(root, {
          labelText: "{valueY}"
        }),
        fill: "#008080",
        stroke: "#008080"
      }));
      
      // Set data
      var data = [{
        country: "USA",
        value: 2025
      }, {
        country: "China",
        value: 1882
      }, {
        country: "Japan",
        value: 1809
      }, {
        country: "Germany",
        value: 1322
      }, {
        country: "UK",
        value: 1122
      }, {
        country: "France",
        value: 1114
      }, {
        country: "India",
        value: 984
      }, {
        country: "Spain",
        value: 711
      }, {
        country: "Netherlands",
        value: 665
      }, {
        country: "South Korea",
        value: 443
      }, {
        country: "Canada",
        value: 441
      }];
      
      xAxis.data.setAll(data);
      series.data.setAll(data);
      
      chart.zoomOutButton.set("forceHidden", true);
      // Make stuff animate on load
      // https://www.amcharts.com/docs/v5/concepts/animations/
      series.appear(1000);
      chart.appear(1000, 100);
      
    }
}
