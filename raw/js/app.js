_.templateSettings = {
  evaluate:    /\{\{#([\s\S]+?)\}\}/g,
  interpolate: /\{\{[^#\{]([\s\S]+?)[^\}]\}\}/g,
  escape:      /\{\{\{([\s\S]+?)\}\}\}/g,
}

var app = app || {};

$(function(){

	if (typeof String.prototype.endsWith !== 'function') {
	    String.prototype.endsWith = function(suffix) {
	        return this.indexOf(suffix, this.length - suffix.length) !== -1;
	    };
	}

    function showOverlay(overlay) {
        $('#'+overlay+'.overlay').show();
        $('.hamburger').addClass('active close-overlay');
    }
    function closeOverlay() {
        $('.overlay').hide();
        $('.hamburger').removeClass('active close-overlay');
        Backbone.history.navigate('/timeline', {trigger: true});
    }

    // Notification
    app.deleteTimeoutID;
    app.lastHeader;

    app.nmodel = Backbone.View.extend({
        tagName: 'li',
        events: {
            'click .close': 'close'
        },
        template: _.template('<span{{ success ? \' class="success"\' : \'\' }}>{{ msg }} <a href="#" class="close">&times;</a></span>'),
        close: function(){
            this.$el.fadeOut('slow', function(){
                $(this).remove();
            });
        },
        render: function(){
            this.$el.html(this.template(this.model));
            setTimeout(function(){
                this.$('.close').trigger('click');
            }, 20000);
            return this;
        }
    });
    app.notify = function(msg, success){
        var view = typeof success == 'undefined' ?
                        new app.nmodel({model: {msg: msg, success: false}}) :
                        new app.nmodel({model: {msg: msg, success: success}});
        $('.gritter').prepend(view.render().el);
    };

    // Activities model
    app.Activity = Backbone.Model.extend({
        defaults: {}
    });
    // Activities collection
    var _Activities = Backbone.Collection.extend({
        local: true,
        url: 'api/activities',
        model: app.Activity
    });
    window.app.Activities = new _Activities();
    // Item entry model
	app.Item = Backbone.Model.extend({
		defaults: {}
	});
    // Item collection
	var _Items = Backbone.Collection.extend({
		local: true,
		url: 'api/entries',
		model: app.Item,
        comparator: function(model) {
          return -model.get('date');
        }
	});
    window.app.Items = new _Items();
    // Item View
    app.ItemView = Backbone.View.extend({
        tagName: 'li',
        className: 'timeline-item',
        events: {
            'click a.delete': 'delete'
        },
        template: _.template($('#templates-item').html()),
        initialize: function() {
            this.model.on('destroy', this.deleteCallback, this);
        },
        delete: function() {
            /*if ($('.delete', this.$el).hasClass('confirm-delete')) {
                this.model.destroy();
            }
            else {
                $('.delete', this.$el).html('Sure?').addClass('confirm-delete');
                $('.delete', this.$el).on('mouseout', function() {
                    $(this).html('Delete');
                    $(this).removeClass('confirm-delete');
                });
            }*/
            this.$el.remove();
            deleteTimeoutID = setTimeout(this.model.destroy(), 10*1000);
            return false;
        },
        deleteCallback: function() {
        },
        render: function() {
            var json = this.model.toJSON();
            // Hashtag replacement
            json.description = json.description.replace(/#([^\W]+)/, '<a href="filter/$1" class="hash">#$1</a>');
            // User
            json.description = json.description.replace(/@([^\W]+)/, '<a href="user/$1" class="user">@$1</a>');

            this.$el.html(this.template(json));
            this.$el.addClass(json.type == 'c' ? 'cr' : 'dr');

            return this;
        }
    });

	// Core
	app.AppView = Backbone.View.extend({
		el: 'body',
		events: {
            'change select[name=type]':'changeOverlayBGColor',

            'click a.get-started':'showApp',

            'submit #form-settings':'submitSettings',

            'submit #form-add':'submitItem',
            'click a.undo-delete':'undoDelete',
            'click a.add-new':'route',
            'click a.close-overlay':'closeOverlay',
            'click a.hamburger:not(.close-overlay)':'toggleMenu'
		},
		initialize: function() {
            // Items
			window.app.Items.on('add', this.addItem, this);
			_.bindAll(this, 'onItemFetch');
			window.app.Items.fetch({success: this.onItemFetch, silent: true});

			window.onpopstate = this.popState.bind(this);
		},
        popState: function() {
            // Handle back button
            var href = document.location.href;
            /*if (href.endsWith('new')) {
                this.addView();
            }
            else if (href.endsWith('/')) {
                this.homeView();
            }*/
        },

        closeOverlay: function() {
            closeOverlay();
        },

        route: function(e) {
            // Delegate click handler to backbone route
            var href = $(e.target).attr('href') ?
                                $(e.target).attr('href') : $(e.target).parent().attr('href');
            Backbone.history.navigate(href, {trigger: true});

            return false;
        },
        showApp: function() {
            this.$('#home').hide();
            this.$('#timeline').show();
            this.$('header').show();

            Backbone.history.navigate('/timeline', {trigger: true});

            if (!app.settings.currency) {
                Backbone.history.navigate('/settings', {trigger: true});
            }

            return false;
        },

        toggleMenu: function() {
            if (this.$('.hamburger').hasClass('active')) {
                this.$('.hamburger').removeClass('active');
                this.$('.menu').hide();
            }
            else {
                this.$('.menu').show();
                this.$('.hamburger').addClass('active');
            }
        },

        onItemFetch: function() {
            // Sort first before adding
            app.Items.sort();
            // Now add
            app.Items.each(this.addItemAppended, this);
        },
        addItem: function(model) {
            // Re-render views
            // Because of date headers
            app.lastHeader = null;
            this.$('#timeline').empty();
            app.Items.each(this.addItemAppended, this);
        },
        addItemAppended: function(model) {
            // Get models date and categorize
            var date = model.get('date');
            var category = moment(date).calendar(null, {
                sameDay: '[Today]',
                nextDay: '[Tomorrow]',
                lastDay: '[Yesterday]',
                lastWeek: '[Last week]',
                sameElse: '[Others]'
            });
            // If lastheader is not category, add header
            if (app.lastHeader != category) {
                app.lastHeader = category;
                this.$('#timeline').append('<ul class="timeline h-'+app.lastHeader.toLowerCase().replace(/\W/g, '')+'">\
                    <li class="timeline-line"></li>\
                    <li class="timeline-group"><h5>'+app.lastHeader+'</h5></li>');
            }

            var view = new app.ItemView({model: model});
            this.$('.h-'+app.lastHeader.toLowerCase().replace(/\W/g, '')).append(view.render().el);
        },

        changeOverlayBGColor: function() {
            var type = $('#form-add select[name=type]').val();
            if (type == 'c')
                $('#newform.overlay').addClass('cr');
            else
                $('#newform.overlay').removeClass('cr');
        },
        undoDelete: function() {
            if (app.deleteTimeoutID) {
                clearTimeout(app.deleteTimeoutID);
                app.deleteTimeoutID = null;

                // todo: refresh TL
            }
        },
        submitSettings: function() {
            // Validation
            var currency = $('#form-settings input[name=currency]').val().trim();
            if (_.isEmpty(currency)) {
                app.notify('Enter the currency symbol.');
                $('#form-add input[name=amount]').focus();
                return false;
            }

            localStorage.setItem('currency', currency);
            app.settings.currency = currency;

            //this.homeView();
            Backbone.history.navigate('/timeline', {trigger: true});

            return false;
        },
		submitItem: function() {
            // Validation
            // Description
            var description = $('#form-add input[name=description]').val().trim();
            if (_.isEmpty(description)) {
                app.notify('You did not enter the description.');
                $('#form-add input[name=description]').focus();
                return false;
            }
            // Amount
            var amount = $('#form-add input[name=amount]').val().replace(/[^0-9\.]/g, '');
            if (_.isEmpty(amount)) {
                app.notify('Enter the amount.');
                $('#form-add input[name=amount]').focus();
                return false;
            }
            // Date
            var date = $('#form-add input[name=date]').val().trim();
            if (_.isEmpty(date)) {
                date = moment();
            }
            else if (!moment(date).isValid()) {
                app.notify('Enter the valid date.');
                $('#form-add input[name=date]').focus();
                return false;
            }
            else if (moment() < moment(date)) {
                app.notify('Future dates not allowed.');
                $('#form-add input[name=date]').focus();
                return false;
            }
            // Type
            var type = $('#form-add select[name=type]').val();
            if (type != 'c' && type != 'd') {
                app.notify('You did not select the type.');
                $('#form-add select[name=type]').focus();
                return false;
            }

            app.Items.create({
                'description': description,
                'amount': amount,
                'type': type,
                'date': moment(date).valueOf()
            });

            //this.homeView();
            Backbone.history.navigate('/timeline', {trigger: true});

			return false;
		}
	});

    var router = Backbone.Router.extend({
      routes: {
          'timeline' : 'TL',
          'add' : 'addNew',
          'settings': 'showSettings'
      },
      TL: function(){
        document.title = 'Billtab';
        closeOverlay();

        $('#form-add')[0].reset();
        $('.overlay').removeClass('cr');

        return false;
      },
      addNew: function() {
        document.title = 'Add new item';

        if (!app.settings.currency) {
            app.notify('Set your currency');
            Backbone.history.navigate('/settings', {trigger: true});
            return false;
        }

        showOverlay('newform');
        $('#form-add input[name=description]').focus();

        return false;
      },
      showSettings: function() {
        document.title = 'Settings';
        showOverlay('settings');
      }
    });

    app.router = new router();
    Backbone.history.start({pushState: true});

});
