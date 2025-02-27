from odoo import models, fields, api

class AccountMove(models.Model):
    _inherit = 'account.move'
    amount_paid = fields.Float(string='amount paid', compute='_compute_amount_paid', store=True)
    amount_paid_cn = fields.Float(string='amount paid cn', compute='_compute_amount_paid', store=True)
    amount_dp = fields.Float(string='amount dp', compute='_compute_amount_dp', store=True)
    amount_dp2 = fields.Float(string='amount dp', compute='_compute_amount_dp', store=True)
    amount_dp_nopaid = fields.Float(string='amount dp', compute='_compute_amount_dp', store=True)
    amount_dp2_nopaid = fields.Float(string='amount dp', compute='_compute_amount_dp', store=True)
    amount_refund = fields.Float(string='amount refund', compute='_compute_amount_dp', store=True)
    amount_refund_nopaid = fields.Float(string='amount refund', compute='_compute_amount_dp', store=True)

    @api.depends('amount_residual', 'invoice_line_ids.price_subtotal', 'invoice_line_ids')
    def _compute_amount_paid(self):
        for move in self:
            if move.move_type == "out_refund":
                if move.payment_state in ['paid', 'in_payment', 'partial']:
                    move.amount_paid_cn = move.amount_total - move.amount_residual
            elif move.move_type == "out_invoice":
                if move.payment_state in ['paid', 'in_payment', 'partial']:
                    move.amount_paid = move.amount_total - move.amount_residual

    @api.depends('amount_residual', 'invoice_line_ids.price_subtotal', 'invoice_line_ids', 'payment_state', 'move_type')
    def _compute_amount_dp(self):
        for move in self:
            amount_dp = 0.0
            amount_dp2 = 0.0
            amount_dp_nopaid = 0.0
            amount_dp2_nopaid = 0.0
            amount_refund = 0.0
            amount_refund_nopaid = 0.0
            if move.move_type == "out_refund":
                for line in move.invoice_line_ids:
                    if line.product_id.name == "Down payment":
                        if move.payment_state in ['paid', 'in_payment']:
                            amount_refund = line.price_subtotal
                            amount_refund_nopaid = 0
                        else:
                            amount_refund = 0
                            amount_refund_nopaid = line.price_subtotal
            elif move.move_type == "out_invoice":
                for line in move.invoice_line_ids:
                    if line.product_id.name == "Down payment" and line.price_subtotal < 0:
                        if move.payment_state in ['paid', 'in_payment']:
                            amount_dp = line.price_subtotal
                            amount_dp_nopaid = 0
                        else:
                            amount_dp = 0
                            amount_dp_nopaid = line.price_subtotal
                    elif line.product_id.name == "Down payment" and line.price_subtotal > 0:
                        if move.payment_state in ['paid', 'in_payment']:
                            amount_dp2 = line.price_subtotal
                            amount_dp2_nopaid = 0
                        else:
                            amount_dp2 = 0
                            amount_dp2_nopaid = line.price_subtotal

            move.amount_dp = amount_dp
            move.amount_dp2 = amount_dp2
            move.amount_dp_nopaid = amount_dp_nopaid
            move.amount_dp2_nopaid = amount_dp2_nopaid
            move.amount_refund = amount_refund
            move.amount_refund_nopaid = amount_refund_nopaid