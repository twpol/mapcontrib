

define([

    'underscore',
    'backbone',
    'marionette',
    'bootstrap',
    'templates',
    'const',
],
function (

    _,
    Backbone,
    Marionette,
    Bootstrap,
    templates,
    CONST
) {

    'use strict';

    return Marionette.LayoutView.extend({

        template: JST['editTileColumn.html'],
        templateListItem: JST['tileListItem.html'],

        behaviors: {

            'l20n': {},
            'column': {},
        },

        ui: {

            'column': '#edit_tile_column',
            'tileList': '.tile_list',
            'tiles': '.tile_list input',
        },

        events: {

            'submit': 'onSubmit',
            'reset': 'onReset',
        },

        initialize: function () {

            var self = this;

            this._radio = Backbone.Wreqr.radio.channel('global');

            this._oldModel = this.model.clone();
        },

        open: function () {

            this._radio.vent.trigger('column:closeAll');
            this._radio.vent.trigger('widget:closeAll');

            this.triggerMethod('open');
        },

        close: function () {

            this.triggerMethod('close');
        },

        onRender: function () {

            var tile, thumbnail,
            tiles = this.model.get('tiles'),
            html = '';

            for (var id in CONST.map.tiles) {

                tile = CONST.map.tiles[id];

                thumbnail = tile.urlTemplate.replace('{s}', 'a');
                thumbnail = thumbnail.replace('{z}', '9');
                thumbnail = thumbnail.replace('{x}', '265');
                thumbnail = thumbnail.replace('{y}', '181');

                html += this.templateListItem({

                    'name': tile.name,
                    'id': id,
                    'thumbnail': thumbnail,
                    'checked': (tiles.indexOf(id) > -1) ? ' checked' : '',
                });
            }

            this.ui.tileList.html( html );

            this.bindUIElements();
        },

        onSubmit: function (e) {

            e.preventDefault();

            var self = this,
            tiles = [];

            this.ui.tiles.each(function (i, tileInput) {

                if ( tileInput.checked ) {

                    tiles.push( tileInput.value );
                }
            });

            if ( tiles.length === 0 ) {

                tiles = ['osm'];
            }

            this.model.set('tiles', tiles);

            this.model.save({}, {

                'success': function () {

                    self._oldModel = self.model.clone();

                    self._radio.commands.execute('map:setTileLayer', tiles[0]);

                    self.close();
                },
                'error': function () {

                    // FIXME
                    console.error('nok');
                },
            });
        },

        onReset: function () {

            this.model.set( this._oldModel.toJSON() );

            this.ui.column.one('transitionend', this.render);

            this.close();
        },
    });
});
