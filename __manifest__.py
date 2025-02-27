# -*- coding: utf-8 -*-
{
    'name': "Sales Performance Dashboard",

    'summary': "Sales Performance Dashboard",

    'description': """
Sales Performance Dashboard
    """,

    'author': "Doodex",
    'website': "https://www.doodex.net",
    'category': 'Uncategorized',
    'version': '0.1',
    'sequence': -1,

    # any module necessary for this one to work correctly
    'depends': ['base', 'sale_management', 'account', 'sale'],

    # always loaded
    'data': [
        'security/ir.model.access.csv',
        'views/sales_performance_dashboard_views.xml',
        'views/menuitems.xml'
    ],
    'assets': {
        'web.assets_backend': [
            'Dashboard-Doodex2/static/lib/js/*.js',
            'Dashboard-Doodex2/static/src/components/**/*',
            'Dashboard-Doodex2/static/src/scss/**/*',
            'Dashboard-Doodex2/static/src/js/**/*',
            'Dashboard-Doodex2/static/src/xml/**/*'
        ],
    },
    'installable': True,
    'application': True,
}
