'use strict';

var Backbone = require('backbone');

var Model = Backbone.Model.extend({
  initialize: function() {
    console.log('main backbone model');
  }
});

new Model();