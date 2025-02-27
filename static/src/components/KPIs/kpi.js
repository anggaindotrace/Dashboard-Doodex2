/** @odoo-module **/

import { Component, useState } from "@odoo/owl";

export class KPI extends Component {
    static template = "sales_performance_dashboard.KPI";
    static props = {
        name: { type: String, optional: false },
        value: { type: String, optional: false },
    };
    setup() {}
}
