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
            averageSaleOrder: 0,
            top3ProductsBySales: [],
            dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
            dateTo: new Date().toISOString().split('T')[0],
            dateFilterHeader: "This Month",
            isValueActive: true,
            isQtyActive: false,
            customerList: {},
            customerId: null,
            customerNameHeader: "All",
            productList: {},
            productNameHeader: "All",
            productId: null,
            productCategoryList: {},
            productCategoryId: null,
            productCategoryNameHeader: "-"
        });
        onMounted(async () => {
            await this.getSalesPerformanceData();
            await this.getProductDatas();
            await this.getProductCategoryDatas();
            await this.graph.renderTopSellingProducts(this.state.top3ProductsBySales, 'value');
            this.state.customerList = this.getCustomerList(this.state.salesPerformanceData);
            await this.graph.renderTopSellingProducts(this.state.salesPerformanceData);
            await this.graph.renderComboCharts('#sales-temporal-analysis');
        });
    }


    async onDateFilterSelect(dateFilter) {
        this.state.dateFilterHeader = dateFilter;
        const today = new Date();
        if (dateFilter === "This Month") {
            this.state.dateFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
            this.state.dateTo = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
        } else if (dateFilter === "This Quarter") {
            const currentQuarter = Math.floor(today.getMonth() / 3);
            this.state.dateFrom = new Date(today.getFullYear(), currentQuarter * 3, 1).toISOString().split('T')[0];
            this.state.dateTo = new Date(today.getFullYear(), (currentQuarter + 1) * 3, 0).toISOString().split('T')[0];
        } else if (dateFilter === "This Financial Year") {
            this.state.dateFrom = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
            this.state.dateTo = new Date(today.getFullYear(), 11, 32).toISOString().split('T')[0];
        } else if (dateFilter === "Last Month") {
            this.state.dateFrom = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
            this.state.dateTo = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
        } else if (dateFilter === "Last Quarter") {
            const lastQuarter = Math.floor((today.getMonth() - 3) / 3);
            this.state.dateFrom = new Date(today.getFullYear(), lastQuarter * 3, 1).toISOString().split('T')[0];
            this.state.dateTo = new Date(today.getFullYear(), (lastQuarter + 1) * 3, 0).toISOString().split('T')[0];
        } else if (dateFilter === "Last Financial Year") {
            this.state.dateFrom = new Date(today.getFullYear() - 1, 0, 1).toISOString().split('T')[0];
            this.state.dateTo = new Date(today.getFullYear() - 1, 11, 32).toISOString().split('T')[0];
        } else if (dateFilter === "Custom") {
            const dateFromInput = document.getElementById('dateFrom').value;
            const dateToInput = document.getElementById('dateTo').value;
            this.state.dateFrom = dateFromInput;
            this.state.dateTo = dateToInput;
            const formatDate = (date) => {
                const [year, month, day] = date.split('-');
                return `${day}/${month}/${year}`;
            };
            this.state.dateFilterHeader = `${formatDate(dateFromInput)} - ${formatDate(dateToInput)}`;
        }
        await this.getSalesPerformanceData();
        // this.state.customerList = this.getCustomerList(this.state.salesPerformanceData);
        // this.state.customerNameHeader = "All"
        // this.state.customerId = null
        await this.graph.renderTopSellingProducts(this.state.top3ProductsBySales, this.state.isValueActive ? 'value' : 'quantity');
    }

    async onCustomerSelect(customerId) {
        if (customerId === "All") {
            this.state.customerId = null;
            this.state.customerNameHeader = "All";
        } else {
            this.state.customerId = customerId;
            this.state.customerNameHeader = this.state.customerList[customerId];
        }
        await this.getSalesPerformanceData();
        await this.graph.renderTopSellingProducts(this.state.top3ProductsBySales, this.state.isValueActive ? 'value' : 'quantity');
    }


    async onProductSelect(productId) {
        if (productId === "All") {
            this.state.productId = null;
            this.state.productNameHeader = "All";
        } else {
            this.state.productId = productId;
            this.state.productNameHeader = this.state.productList[productId];
        }
        await this.getSalesPerformanceData();
        await this.graph.renderTopSellingProducts(this.state.top3ProductsBySales, this.state.isValueActive ? 'value' : 'quantity');
    }

    async onProductCategorySelect(productCategoryId) {
        if (productCategoryId === "-") {
            this.state.productCategoryId = null;
            this.state.productCategoryNameHeader = "-";
        } else {
            this.state.productCategoryId = productCategoryId;
            this.state.productCategoryNameHeader = this.state.productCategoryList[productCategoryId];
        }
        await this.getSalesPerformanceData();
        await this.graph.renderTopSellingProducts(this.state.top3ProductsBySales, this.state.isValueActive ? 'value' : 'quantity');
    }

    filterByValue() {
        this.state.isValueActive = true;
        this.state.isQtyActive = false;
        this.graph.renderTopSellingProducts(this.state.top3ProductsBySales, 'value');
    }

    filterByQty() {
        this.state.isValueActive = false;
        this.state.isQtyActive = true;
        this.graph.renderTopSellingProducts(this.state.top3ProductsBySales, 'quantity');
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

    getTop3ProductsBySales(salesPerformanceData) {
        if (!salesPerformanceData || salesPerformanceData.length === 0) {
            return [];
        }
        console.log("salesPerformanceData", salesPerformanceData);
        // Aggregate sales data by product
        const productSales = salesPerformanceData.reduce((products, sale) => {
            if (sale.product_name) {
                // Attempt to get the product name using 'en_US', otherwise pick any available key
                const productName = sale.product_name['en_US'] || Object.values(sale.product_name)[0];
                if (!products[productName]) {
                    products[productName] = {
                        totalQuantity: 0,
                        totalValue: 0
                    };
                }
                products[productName].totalQuantity += sale.quantity;
                products[productName].totalValue += sale.amount;
            }
            return products;
        }, {});

        // Convert the aggregated data to an array
        const productSalesArray = Object.keys(productSales).map(productName => ({
            product: productName,
            totalValue: productSales[productName].totalValue,
            totalQuantity: productSales[productName].totalQuantity
        }));

        // Sort the array by total value and total quantity
        const top3ProductsByValue = productSalesArray.slice().sort((a, b) => b.totalValue - a.totalValue).slice(0, 3);
        const top3ProductsByQuantity = productSalesArray.slice().sort((a, b) => b.totalQuantity - a.totalQuantity).slice(0, 3);

        return {
            top3ProductsByValue,
            top3ProductsByQuantity
        };
    }
    
    getCustomerList(salesPerformanceData) {
        if (!salesPerformanceData || salesPerformanceData.length === 0) {
            return {};
        }

        // Extract unique customers with their IDs from sales performance data
        const customers = salesPerformanceData.reduce((customerMap, sale) => {
            if (sale.customer && sale.customer_id && !customerMap[sale.customer_id]) {
                customerMap[sale.customer_id] = sale.customer;
            }
            return customerMap;
        }, {});

        return customers;
    }
    async getSalesPerformanceData() {
        try {
            await rpc("/web/dataset/call_kw/sales.dashboard/get_sales_performance_data", {
                model: "sales.dashboard",
                method: "get_sales_performance_data",
                args: [[], this.state.dateFrom, this.state.dateTo, this.state.customerId, this.state.productId, this.state.productCategoryId],
                kwargs: {}
            }).then(res => {
                this.state.currency = res[1];
                this.state.salesPerformanceData = res[0];
                this.state.totalSalesValidatedAmount = this.getTotalSalesValidatedAmount(res[0]);
                this.state.quoteToOrderConversionRate = this.getQuoteToOrderConversionRate(res[0]);
                this.state.totalValidatedInvoice = this.getTotalValidatedInvoice(res[0]);
                this.state.totalOverdueInvoice = this.getTotalOverdueInvoice(res[0]);
                this.state.averageSaleOrder = this.getAverageSaleOrder(res[0]);
                this.state.top3ProductsBySales = this.getTop3ProductsBySales(res[0]);
            });
        } catch (error) {
            console.log(error);
        }
    }
    async getProductDatas() {
        try {
            await rpc("/web/dataset/call_kw/sales.dashboard/get_product_datas", {
                model: "sales.dashboard",
                method: "get_product_datas",
                args: [[]],
                kwargs: {}
            }).then(res => {
                console.log("res", res);
                this.state.productList = res.reduce((productMap, product) => {
                    productMap[product.product_id] = product.product_name['en_US'] || Object.values(product.product_name)[0];;
                    return productMap;
                }, {});
            });
        } catch (error) {
            console.log(error);
        }
    }

    async getProductCategoryDatas() {
        try {
            await rpc("/web/dataset/call_kw/sales.dashboard/get_product_category_datas", {
                model: "sales.dashboard",
                method: "get_product_category_datas",
                args: [[]],
                kwargs: {}
            }).then(res => {
                this.state.productCategoryList = res.reduce((categoryMap, category) => {
                    categoryMap[category.product_category_id] = category.product_category_name;
                    return categoryMap;
                }, {});
            });
        } catch (error) {
            console.log(error);
        }
    }
}

registry.category('actions').add('sales_performance_dashboard', SalesPerformanceDashboard);
