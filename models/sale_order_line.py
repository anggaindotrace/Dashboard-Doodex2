from odoo import models, fields, api

class SaleOrderLine(models.Model):
    _inherit = 'sale.order.line'
    waiting_for_payment = fields.Float(string='Waiting for Payment', compute='_compute_waiting_for_payment_research', store=True)
    amount_received = fields.Float(string='Amount Received', compute='_compute_amount_received_research', store=True)
    amount_to_invoice = fields.Float(string='Amount Received', compute='_compute_amount_to_invoice', store=True)
    price_reduce = fields.Float(string='Price Reduce', store=True)

    @api.depends('waiting_for_payment', 'amount_received', 'state', 'price_reduce', 'product_id', 'untaxed_amount_invoiced', 'qty_delivered', 'product_uom_qty', 'invoice_lines.move_id.amount_paid')
    def _compute_amount_to_invoice(self):
        """ Total of remaining amount to invoice on the sale order line (taxes excl.) as
                total_sol - amount already invoiced
            where Total_sol depends on the invoice policy of the product.

            Note: Draft invoice are ignored on purpose, the 'to invoice' amount should
            come only from the SO lines.
        """
        for line in self:
            amount_to_invoice = 0.0
            if line.state in ['sale']:
                # Note: do not use price_subtotal field as it returns zero when the ordered quantity is
                # zero. It causes problem for expense line (e.i.: ordered qty = 0, deli qty = 4,
                # price_unit = 20 ; subtotal is zero), but when you can invoice the line, you see an
                # amount and not zero. Since we compute untaxed amount, we can use directly the price
                # reduce (to include discount) without using `compute_all()` method on taxes.
                price_subtotal = 0.0
                uom_qty_to_consider = line.qty_delivered if line.product_id.invoice_policy == 'delivery' else line.product_uom_qty
                price_reduce = line.price_unit * (1 - (line.discount or 0.0) / 100.0)
                price_subtotal = price_reduce * uom_qty_to_consider
                if len(line.tax_id.filtered(lambda tax: tax.price_include)) > 0:
                    # As included taxes are not excluded from the computed subtotal, `compute_all()` method
                    # has to be called to retrieve the subtotal without them.
                    # `price_reduce_taxexcl` cannot be used as it is computed from `price_subtotal` field. (see upper Note)
                    price_subtotal = line.tax_id.compute_all(
                        price_reduce,
                        currency=line.currency_id,
                        quantity=uom_qty_to_consider,
                        product=line.product_id,
                        partner=line.order_id.partner_shipping_id)['total_excluded']
                inv_lines = line._get_invoice_lines()
                if any(inv_lines.mapped(lambda l: l.discount != line.discount)):
                    # In case of re-invoicing with different discount we try to calculate manually the
                    # remaining amount to invoice
                    amount = 0
                    for l in inv_lines:
                        if len(l.tax_ids.filtered(lambda tax: tax.price_include)) > 0:
                            amount += l.tax_ids.compute_all(
                                l.currency_id._convert(l.price_unit, line.currency_id, line.company_id,
                                                       l.date or fields.Date.today(), round=False) * l.quantity)[
                                'total_excluded']
                        else:
                            amount += l.currency_id._convert(l.price_unit, line.currency_id, line.company_id,
                                                             l.date or fields.Date.today(), round=False) * l.quantity

                    amount_to_invoice = max(price_subtotal - amount, 0)
                else:
                    amount_to_invoice = line.price_subtotal - (line.waiting_for_payment + line.amount_received)

            line.amount_to_invoice = amount_to_invoice

    @api.depends('amount_received', 'amount_to_invoice', 'order_id', 'invoice_lines',
                 'invoice_lines.price_total', 'invoice_lines.move_id.state', 'invoice_lines.move_id.payment_state',
                 'invoice_lines.move_id.move_type', 'invoice_lines.move_id.amount_residual',
                 'invoice_lines.move_id.amount_paid')
    def _compute_waiting_for_payment_research(self):
        for line in self:
            amount_dp_nopaid = 0.0
            amount_dp_nopaid_dp = 0.0
            fixed_waiting_for_payment = 0.0
            amount_residual = 0.0
            for invoice_line in line._get_invoice_lines():
                if invoice_line.move_id.state != 'cancel':
                    if invoice_line.move_id.payment_state == "not_paid" or invoice_line.move_id.payment_state == "partial":
                        invoice_date = invoice_line.move_id.invoice_date or fields.Date.today()
                        amount_total = invoice_line.move_id.amount_untaxed
                        amount_dp_nopaid = invoice_line.move_id.amount_dp_nopaid + invoice_line.move_id.amount_dp2_nopaid - invoice_line.move_id.amount_refund_nopaid
                        amount_dp_nopaid_dp += invoice_line.move_id.amount_dp_nopaid + invoice_line.move_id.amount_dp2_nopaid - invoice_line.move_id.amount_refund_nopaid
                        amount_residual = invoice_line.move_id.amount_residual
                        check = self.env['account.move.line'].search(
                            [('move_id', '=', invoice_line.move_id.id), ('product_id.name', 'ilike', 'Down payment')])
                        if invoice_line.move_id.move_type == 'out_invoice':
                            waiting_for_payment = invoice_line.currency_id._convert(invoice_line.price_subtotal, line.currency_id,line.company_id, invoice_date)
                            if amount_total == 0:
                                fixed_waiting_for_payment += 0
                            else:
                                if check:
                                    dp_proportion = ( waiting_for_payment / (amount_total - invoice_line.move_id.amount_dp_nopaid) * invoice_line.move_id.amount_dp_nopaid)
                                    fixed_waiting_for_payment += (amount_residual - amount_dp_nopaid) * ((waiting_for_payment+dp_proportion) / (amount_total))
                                else:
                                    fixed_waiting_for_payment += (amount_residual) * ((waiting_for_payment) / (amount_total))

                        elif invoice_line.move_id.move_type == 'out_refund':
                            waiting_for_payment = invoice_line.currency_id._convert(invoice_line.price_subtotal,line.currency_id, line.company_id,invoice_date)
                            if amount_total == 0:
                                fixed_waiting_for_payment -= 0
                            else:
                                if check:
                                    dp_proportion = ( waiting_for_payment / (amount_total - invoice_line.move_id.amount_dp_nopaid) * invoice_line.move_id.amount_dp_nopaid)
                                    fixed_waiting_for_payment -= (amount_residual - amount_dp_nopaid) * ((waiting_for_payment + dp_proportion) / (amount_total))
                                else:
                                    fixed_waiting_for_payment -= (amount_residual) * ((waiting_for_payment) / (amount_total))

            if (amount_residual == 0 or line.amount_received == line.price_subtotal) and line.product_template_id.name != "Down payment":
                line.waiting_for_payment = 0
            elif line.product_template_id.name == "Down payment":
                line.waiting_for_payment = amount_dp_nopaid_dp
            else:
                line.waiting_for_payment = fixed_waiting_for_payment

    @api.depends('waiting_for_payment', 'amount_to_invoice', 'order_id',
                 'invoice_lines', 'invoice_lines.price_total', 'invoice_lines.move_id.state',
                 'invoice_lines.move_id.payment_state', 'invoice_lines.move_id.move_type',
                 'invoice_lines.move_id.amount_residual', 'invoice_lines.move_id.amount_paid')
    def _compute_amount_received_research(self):
        for line in self:
            amount_dp_paid = 0.0
            amount_paid = 0.0
            fix_amount_received = 0.0
            for invoice_line in line._get_invoice_lines():
                if invoice_line.move_id.state != 'cancel':
                    if invoice_line.move_id.payment_state in ['paid', 'in_payment', 'partial']:
                        invoice_date = invoice_line.move_id.invoice_date or fields.Date.today()
                        amount_total = invoice_line.move_id.amount_untaxed
                        amount_paid = invoice_line.move_id.amount_paid
                        amount_paid_cn = invoice_line.move_id.amount_paid_cn
                        amount_dp_paid += invoice_line.move_id.amount_dp2 + invoice_line.move_id.amount_dp - invoice_line.move_id.amount_refund
                        check = self.env['account.move.line'].search([('move_id','=',invoice_line.move_id.id),('product_id.name', 'ilike', 'Down payment')])
                        if invoice_line.move_id.move_type == 'out_invoice':
                            amount_received = invoice_line.currency_id._convert(invoice_line.price_subtotal, line.currency_id,line.company_id, invoice_date)
                            if amount_total == 0:
                                fix_amount_received += 0
                            else:
                                if check:
                                    dp_proportion = (amount_received / (amount_total - invoice_line.move_id.amount_dp_nopaid) * invoice_line.move_id.amount_dp_nopaid)
                                    fix_amount_received += amount_paid * ((amount_received+dp_proportion) / (amount_total))
                                else:
                                    fix_amount_received += amount_paid * ((amount_received) / (amount_total))
                        elif invoice_line.move_id.move_type == 'out_refund':
                            amount_received = invoice_line.currency_id._convert(invoice_line.price_subtotal, line.currency_id,line.company_id, invoice_date)
                            if amount_total == 0:
                                fix_amount_received -= 0
                            else:
                                if check:
                                    dp_proportion = (amount_received / (amount_total - invoice_line.move_id.amount_dp_nopaid) * invoice_line.move_id.amount_dp_nopaid)
                                    fix_amount_received -= amount_paid_cn * ((amount_received+dp_proportion) / (amount_total))
                                else:
                                    fix_amount_received -= amount_paid_cn * ((amount_received) / (amount_total))

            if line.product_template_id.name == "Down payment":
                line.amount_received = amount_dp_paid
            elif amount_paid == 0 and line.product_template_id.name != "Down payment":
                line.amount_received = 0
            else:
                line.amount_received = fix_amount_received
