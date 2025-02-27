/** @odoo-module **/

import { Component, useState, useRef, onMounted,onWillStart } from "@odoo/owl";
import { registry } from "@web/core/registry";
// import { rpc } from "@web/core/network/rpc";
// import { DashboardFilters } from "@Dashboard-Doodex/components/filters/filters";
import { KPI } from "@Dashboard-Doodex2/components/KPIs/kpi";
// import { Graph } from "@Dashboard-Doodex/components/graph";
// import { DashboardController } from "@Dashboard-Doodex/components/controller";

export class SalesPerformanceDashboard extends Component {
    static template = "SalesPerformanceDashboard";
    static components = {
        KPI
    };
    setup() {
    }
}

registry.category('actions').add('sales_performance_dashboard', SalesPerformanceDashboard);
