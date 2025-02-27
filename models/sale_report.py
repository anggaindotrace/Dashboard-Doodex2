# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import fields, models, api

class SaleReport(models.Model):
    _inherit = "sale.report"

    amount_received = fields.Float(string='Amount Received', readonly=True)
    amount_to_invoice = fields.Float(string='Amount To Invoice', readonly=True)
    waiting_for_payment = fields.Float(string='Waiting for Payment', readonly=True)


    def _group_by_sale(self):
        res = super()._group_by_sale()
        res += """, l.amount_received, l.waiting_for_payment, l.amount_to_invoice"""
        return res

    def _select_sale(self):
        return super()._select_sale() + """, CASE WHEN l.product_id IS NOT NULL THEN SUM(l.amount_received) 
                                            ELSE 0 END AS amount_received
                                            , CASE WHEN l.product_id IS NOT NULL THEN SUM(l.waiting_for_payment) 
                                            ELSE 0 END AS waiting_for_payment
                                            , CASE WHEN l.product_id IS NOT NULL THEN SUM(l.amount_to_invoice) 
                                            ELSE 0 END AS amount_to_invoice
                                            """