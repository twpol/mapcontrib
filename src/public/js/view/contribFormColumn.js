
'use strict';


var _ = require('underscore');
var Backbone = require('backbone');
var Wreqr = require('backbone.wreqr');
var Marionette = require('backbone.marionette');
var L = require('leaflet');
var osmAuth = require('osm-auth');
var OsmEditHelper = require('../helper/osmEdit');
var MapUi = require('../ui/map');
var CONST = require('../const');
var settings = require('../settings');
var PoiLayerModel = require('../model/poiLayer');
var ContribNodeTagsListView = require('../ui/form/contribNodeTags/list');


module.exports = Marionette.LayoutView.extend({

    template: require('../../templates/contribFormColumn.ejs'),

    behaviors: {

        'l20n': {},
        'column': {},
    },

    regions: {

        'tagList': '.rg_tag_list',
    },

    ui: {

        'column': '#contrib_form_column',
        'addBtn': '.add_btn',
    },

    events: {

        'click @ui.addBtn': 'onClickAddBtn',

        'submit': 'onSubmit',
    },

    initialize: function () {

        this._radio = Wreqr.radio.channel('global');
        this._user = this._radio.reqres.request('model', 'user');
    },

    _buildNewMarker: function () {

        var pos = new L.LatLng(
            this.model.get('lat'),
            this.model.get('lng')
        ),
        icon = MapUi.buildPoiLayerIcon(
            new PoiLayerModel({
                'markerShape': settings.newPoiMarkerShape,
                'markerIconType': CONST.map.markerIconType.library,
                'markerIcon': settings.newPoiMarkerIcon,
                'markerColor': settings.newPoiMarkerColor
            })
        );

        return L.marker(pos, {

            'icon': icon
        });
    },

    onBeforeOpen: function () {

        this._radio.vent.trigger('column:closeAll');
        this._radio.vent.trigger('widget:closeAll');
    },

    open: function () {

        this.triggerMethod('open');
    },

    onAfterOpen: function () {

        this._tempMarker = this._buildNewMarker();
        this._radio.reqres.request('map').addLayer(this._tempMarker);
    },

    close: function () {

        this.triggerMethod('close');
    },

    onBeforeClose: function () {

        if (this._tempMarker) {

            this._radio.reqres.request('map').removeLayer(this._tempMarker);
        }
    },

    onRender: function () {

        this._tagList = new ContribNodeTagsListView();

        if (this.options.presetModel) {

            this._tagList.setTags(this.options.presetModel.get('tags'));
        }
        else {

            this._tagList.setTags([]);
        }

        this.getRegion('tagList').show( this._tagList );
    },

    onClickAddBtn: function () {

        this._tagList.addTag();
    },

    onSubmit: function (e) {

        e.preventDefault();

        this.model.set('tags', this._tagList.getTags());

        var map = this._radio.reqres.request('map'),
        osmEdit = new OsmEditHelper(
            osmAuth({

                'oauth_consumer_key': settings.oauthConsumerKey,
                'oauth_secret': settings.oauthSecret,
                'oauth_token': this._user.get('token'),
                'oauth_token_secret': this._user.get('tokenSecret'),
            })
        );

        osmEdit.setChangesetCreatedBy(CONST.osm.changesetCreatedBy);
        osmEdit.setChangesetComment(CONST.osm.changesetComment);
        osmEdit.setLatitude(this.model.get('lat'));
        osmEdit.setLongitude(this.model.get('lng'));
        osmEdit.setTags(this.model.get('tags'));
        osmEdit.setUid(this._user.get('osmId'));
        osmEdit.setDisplayName(this._user.get('displayName'));

        map.addLayer( this._buildNewMarker() );

        this.close();

        osmEdit.createNode()
        .then(function (nodeId) {

            var key = 'node-'+ nodeId,
            contributions = JSON.parse( localStorage.getItem('osmEdit-contributions') ) || {};

            this.model.set('version', 0);

            contributions[ key ] = this.model.attributes;

            localStorage.setItem( 'osmEdit-contributions', JSON.stringify( contributions ) );
        }.bind(this))
        .catch(function (err) {

            console.error(err);
        });
    },
});