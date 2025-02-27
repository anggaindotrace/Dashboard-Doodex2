/** @odoo-module **/

import { Component, useState, useRef, onMounted, onWillStart } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { rpc } from "@web/core/network/rpc";
// import { DashboardFilters } from "@Dashboard-Doodex/components/filters/filters";
import { KPI } from "@Dashboard-Doodex2/components/KPIs/kpi";
import { Graph } from "@Dashboard-Doodex2/components/graph";
// import { DashboardController } from "@Dashboard-Doodex/components/controller";

export class SalesPerformanceDashboard extends Component {
    static template = "SalesPerformanceDashboard";
    static components = {
        KPI
    };
    
    setup() {
        this.root = useRef("root");
        this.graph = new Graph(this.root);
        this.state = useState({
            totalSalesValidatedAmount: 0,
            currency: [],
            quoteToOrderConversionRate: 0,
            totalValidatedInvoice: 0,
            totalOverdueInvoice: 0,
            averageSaleOrder: 0
        });
        onMounted(async () => {
            await this.getSalesPerformanceData();
            await this.graph.renderTopSellingProducts(this.state.salesPerformanceData);
        });
    }

    getTotalSalesValidatedAmount(salesPerformanceData) {
        if (!salesPerformanceData) {
            return 0;
        }
        const total = salesPerformanceData
            .filter(sale => sale.state === 'sale')
            .reduce((total, sale) => total + sale.amount, 0);
        return total.toLocaleString('en-US', {
            style: 'currency',
            currency: this.state.currency.currency_name,
            maximumFractionDigits: 2,
            minimumFractionDigits: 2
        });
    }

    getQuoteToOrderConversionRate(salesPerformanceData) {
        if (!salesPerformanceData || salesPerformanceData.length === 0) {
            return '0.0%';
        }

        // Group by sale_order_id to count unique orders
        const uniqueOrders = [...new Set(salesPerformanceData.map(sale => sale.sale_order_id))];
        const uniqueValidatedOrders = [...new Set(
            salesPerformanceData
                .filter(sale => sale.state === 'sale')
                .map(sale => sale.sale_order_id)
        )];

        const totalQuotes = uniqueOrders.length;
        const validatedSales = uniqueValidatedOrders.length;
        
        const conversionRate = (validatedSales / totalQuotes) * 100;
        return conversionRate.toFixed(1) + '%';
    }

    getTotalOverdueInvoice(salesPerformanceData) {
        if (!salesPerformanceData) {
            return 0;
        }

        const today = new Date();
        
        // Group by invoice_id first
        const invoiceGroups = salesPerformanceData.reduce((groups, sale) => {
            if (sale.invoice_id && sale.invoice_state === 'posted') {
                if (!groups[sale.invoice_id]) {
                    groups[sale.invoice_id] = {
                        invoice_amount_residual: sale.invoice_amount_residual
                    };
                }
            }
            return groups;
        }, {});

        // Sum up residual amounts from grouped invoices
        const total = Object.values(invoiceGroups)
            .filter(invoice => invoice.invoice_amount_residual > 0)
            .reduce((total, invoice) => total + invoice.invoice_amount_residual, 0);

        return total.toLocaleString('en-US', {
            style: 'currency',
            currency: this.state.currency.currency_name, 
            maximumFractionDigits: 2,
            minimumFractionDigits: 2
        });
    }


    getTotalValidatedInvoice(salesPerformanceData) {
        if (!salesPerformanceData) {
            return 0;
        }
        const total = salesPerformanceData
            .filter(sale => sale.invoice_state === 'posted')
            .reduce((total, sale) => total + sale.invoice_amount, 0);
        return total.toLocaleString('en-US', {
            style: 'currency', 
            currency: this.state.currency.currency_name,
            maximumFractionDigits: 2,
            minimumFractionDigits: 2
        });
    }

    getAverageSaleOrder(salesPerformanceData) {
        if (!salesPerformanceData || salesPerformanceData.length === 0) {
            return 0;
        }

        // Group sales by order ID to avoid counting line items separately
        const orderGroups = salesPerformanceData.reduce((groups, sale) => {
            if (sale.sale_order_id && sale.state === 'sale') {
                if (!groups[sale.sale_order_id]) {
                    groups[sale.sale_order_id] = {
                        total_amount: 0
                    };
                }
                groups[sale.sale_order_id].total_amount += sale.amount;
            }
            return groups;
        }, {});

        const orders = Object.values(orderGroups);
        if (orders.length === 0) {
            return 0;
        }

        const totalAmount = orders.reduce((sum, order) => sum + order.total_amount, 0);
        const average = totalAmount / orders.length;

        return average.toLocaleString('en-US', {
            style: 'currency',
            currency: this.state.currency.currency_name,
            maximumFractionDigits: 2,
            minimumFractionDigits: 2
        });
    }

    async getSalesPerformanceData() {
        try {
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            await rpc("/web/dataset/call_kw/sales.dashboard/get_sales_performance_data", {
                model: "sales.dashboard",
                method: "get_sales_performance_data",
                args: [[], firstDay.toISOString().split('T')[0], lastDay.toISOString().split('T')[0]],
                kwargs: {}
            }).then(res => {
                this.state.currency = res[1];
                this.state.totalSalesValidatedAmount = this.getTotalSalesValidatedAmount(res[0]);
                this.state.quoteToOrderConversionRate = this.getQuoteToOrderConversionRate(res[0]);
                this.state.totalValidatedInvoice = this.getTotalValidatedInvoice(res[0]);
                this.state.totalOverdueInvoice = this.getTotalOverdueInvoice(res[0]);
                this.state.averageSaleOrder = this.getAverageSaleOrder(res[0]);
            });
        } catch (error) {
            console.log(error);
        }
    }
}

registry.category('actions').add('sales_performance_dashboard', SalesPerformanceDashboard);
