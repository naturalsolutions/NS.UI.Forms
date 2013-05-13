var NS = window.NS || {};

NS.UI = (function(ns) {
    "use strict";

    var validators = {};

	// Declare an exception class for validation errors
	var ValidationError = function(error) {
        this.message = error;
	};

    // FIXME: use cleaner OOP for validators
	validators.Number = function() {
		this.msg = 'A number is expected here';
		this.validate = function(value) {
			if (typeof value === 'number' || /^-?[0-9]+(.[0-9]*)?$/.test(value))
				return value;
			throw new ValidationError(this.msg);
		};
	}

	validators.Required = function() {
		this.msg = 'Blank value not allowed here';
		this.validate = function(value) {
			if (typeof value === 'undefined')
                throw new ValidationError(this.msg);
            return value;
		};
	}

    var editors = {};

	// Base class for all editors
    var BaseEditor = eCollection.utilities.BaseView.extend({
        prefix: eCollection.config.root + '/templates/form/',

        validOptions: ['id', 'name', 'initialData', 'label', 'template', 'required', 'helpText', 'inline'],

		validators: [],

		defaults: {
            helpText: '',
            inline: false,
            required: false
        },

        initialize: function(options) {
            eCollection.utilities.BaseView.prototype.initialize.apply(this, arguments);
            _.defaults(options, this.defaults);
            _.extend(this, _.pick(options, this.validOptions));
            if (this.required) this.validators.push(new validators.Required());
        },

        addEvents: function(events) {
            this.events = _.result(this, 'events') || {};
            _.extend(this.events, events);
            this.delegateEvents();
        },

        getValue: function() {
			// To be implemented by child classes
			// must return parsed user input
			return ;
        },

        getLabel: function() {
            return {label: this.label, required: this.required};
        },

        validate: function() {
			var value = this.getValue();
			this.clearValidationErrors();
			try {
				_.each(this.validators, function (validator) {
                    if (this.required || typeof value != 'undefined') {
                        if (typeof validator === 'string') {
                            validator = new validators[validator]();
                        }
                        value = validator.validate(value);
                    }
				}, this);
			} catch (err) {
				if (err instanceof ValidationError) {
					this.handleValidationError(err);
                    return this.trigger('valid:fail', this.name, err.message);
				}
			}
            return this.trigger('valid:pass', this.name, this.postProcessData(value));
		},

		clearValidationErrors: function () {
			// May be implemented by child classes
			this.$el.removeClass('error');
		},

		handleValidationError: function (err) {
			// May be implemented by child classes
			this.$el.addClass('error');
		},

		postProcessData: function (rawData) {
			// May be implemented by child classes
			// must return formatted data
			return rawData;
        },

        serialize: function() {
            return _.pick(this, this.validOptions);
        }
    });

    editors.Text = BaseEditor.extend({
        template: 'editor-text',

        events: {
            'blur input': function(e) {this.validate();}
        },

		clearValidationErrors: function () {
			BaseEditor.prototype.clearValidationErrors.apply(this, arguments);
            this.$el.find('.help-inline').html('');
		},

		handleValidationError: function (err) {
			BaseEditor.prototype.handleValidationError.apply(this, arguments);
            this.$el.find('.help-inline').html(err.message);
		},

        getValue: function() {
            if (this.$el) {
                var value = this.$el.find('[name=' + this.name + ']').val();
                return (value === '') ? undefined : value;
            }
        }
    });

    editors.Number = editors.Text.extend({
		validators: [new validators.Number()],

		postProcessData: function (rawData) {
			return parseFloat(rawData);
        }
	});

    editors.Boolean = BaseEditor.extend({
        template: 'editor-boolean',

		value_yes: 'yes',
		value_no: 'no',

		label_yes: 'Yes',
		label_no: 'No',

        events: {
            'blur input': function(e) {this.validate();}
        },

        initialize: function() {
			this.validOptions = this.validOptions.concat(['label_yes', 'label_no', 'value_yes', 'value_no']);
            BaseEditor.prototype.initialize.apply(this, arguments);
        },

        getValue: function() {
            if (this.$el) {
                switch(this.$el.find(':checked[name=' + this.name + ']').val()) {
                    case this.value_yes:
                        return true;
                    case this.value_no:
                        return false;
                    default: // No radio button is checked
                        return undefined;
                }
            }
        },

		clearValidationErrors: function () {
			BaseEditor.prototype.clearValidationErrors.apply(this, arguments);
            this.$el.find('.help-inline').html('');
		},

		handleValidationError: function (err) {
			BaseEditor.prototype.handleValidationError.apply(this, arguments);
            this.$el.find('.help-inline').html(err.message);
		}
    });

	editors.Select = BaseEditor.extend({
        template: 'editor-select',

        multiple: false,

        nullValue: '',

        initialize: function(options) {
			this.validOptions = this.validOptions.concat(['multiple']);
            if (!('initialData' in options)) {
                options.initialData = [];
            // Store data in array even when select is not 'multiple'
            } else if (!_.isArray(options.initialData)) {
                options.initialData = [options.initialData];
            }
            // When the select source is a collection, initialData are model instances.
            options.initialData = _.map(options.initialData, function(d) {
                return _.isObject(d) ? d.id : d;
            });
            BaseEditor.prototype.initialize.apply(this, arguments);
            // /!\ options should not be added to validOptions because it would override this.options (which is an internal property used by LayoutManager
            this.optionConfig = options.options;
        },

        getValue: function() {
            if (this.$el) {
                var val = this.$el.find('select').val();
                if (val === this.nullValue || val === null) return undefined;
                if (! this.multiple) return [val];
                return val;
            }
        },

		postProcessData: function (rawData) {
			return (this.multiple) ? rawData : rawData[0];
        },

        serialize: function() {
            var viewData = BaseEditor.prototype.serialize.apply(this, arguments);
            var options = [];
            var optionConfig = _.result(this, 'optionConfig');
            if (optionConfig instanceof Backbone.Collection) {
                optionConfig.each(function(item) {
                    options.push({val: item.id, label: item.toString()});
                });
            } else {
                options = optionConfig;
            }
            if (!this.required && !this.multiple) options.unshift({val: '', label: '--'});
            viewData.options = [{label: '', options: options}];
            return viewData;
        }
    });

	editors._Composite = BaseEditor.extend({
        // Selector for field area (an element in the template where items will be placed)
        fieldRegion: '',

        initialize: function(options) {
			this.validOptions = this.validOptions.concat(['fieldRegion']);
            BaseEditor.prototype.initialize.apply(this, arguments);

			this.childNamePrefix = (!this.childNamePrefix && this.name) ? this.name + '_' : '';
            this.data = {};
            this.errors = {};
            this.names = {};

			_.each(this.getFields(), function(fieldDefinition) {
				this.addEditor.apply(this, _.values(fieldDefinition));
			}, this);
		},

		getFields: function () {
			// To be implemented by child classes
			// must return a list of field definition: [{name: '', editor: Editor, options: {}}]
			return [];
		},

		addEditor: function (name, Editor, options) {
			// Do not proceed for readonly fields
			if ('editable' in options && !options.editable ) return;
			var view = new Editor(_.extend({}, options, {
				id: this.id + '_' + name,
				name: this.childNamePrefix + name,
				label: options.title || name
			}));
			this.insertView(this.fieldRegion, view);
			this.names[view.name] = name;
            this.listenTo(view, 'valid:pass', this.onFieldValidate);
            this.listenTo(view, 'valid:fail', this.onFieldError);
			return view;
		},

        onFieldValidate: function(fieldName, data) {
            if (fieldName in this.names) { // BB does not support controlling event propagation, use explicit filtering instead
                var idx = this.names[fieldName];
                this.data[idx] = data;
                // forget previous validation errors if any
                delete this.errors[fieldName];
                if ($.isEmptyObject(this.errors))
                    this.trigger('valid:pass', this.name, this.postProcessData(this.data));
            }
        },

        onFieldError: function(fieldName, error) {
            if (fieldName in this.names) { // BB does not support controlling event propagation, use explicit filtering instead
                this.errors[fieldName] = error;
                return this.trigger('valid:fail', this.name, this.errors);
            }
		},

        validate: function() {
            // Relay validation to each subfield
            this.getViews(this.fieldRegion).each(function(view) {
                if (view instanceof BaseEditor)
                    view.validate();
            });
        },

        clearValidationErrors: function () {
            BaseEditor.prototype.clearValidationErrors.apply(this, arguments);
            this.getViews(this.fieldRegion).each(function(view) {
                if (view instanceof BaseEditor)
                    view.clearValidationErrors(); // Relay to subview
            });
        }
	});

    editors.NestedModel = editors._Composite.extend({
        template: 'subform',

        initialize: function(options) {
			// Initialize schema+initialData depending on provided input (model instance? model class? raw schema/data)
			if (options.initialData && options.initialData instanceof Backbone.Model) {
				// /!\ Should we check whether initialData is actually a model instance ?
				this.instance = options.initialData;
				this.schema = this.instance.schema;
				options.initialData = options.initialData.attributes;
			} else if (options.model) {
				this.Model = options.model;
				options.initialData = (options.initialData) ? options.initialData : {};
				this.instance = new this.Model(options.initialData);
				this.schema = this.instance.schema;
			} else {
				this.schema = options.schema;
				options.initialData = (options.initialData) ? options.initialData : {};
			}

            // Ensure we have a model class before going further
            if (typeof this.schema === 'undefined')
				throw new Error('Could not find a schema for form');

            // Use all fields if fields are not explicitly set
			this.fields = (options.fields) ? options.fields : _.keys(this.schema);

            editors._Composite.prototype.initialize.apply(this, arguments);
        },

		getFields: function () {
			var fields = [];
			_.each(this.fields, function(name) {
				var field = this.schema[name];
				field.initialData = this.initialData[name];
				field.inline = field.inline || this.inline;

				var editor = editors[field.type];
				if (editor)
					fields.push({name: name, editor: editor, options: field});
			}, this);
			return fields;
		},

        getLabel: function() {
            var labels = [];
            this.getViews(this.fieldRegion).each(function(view) {
                if (view instanceof BaseEditor) {
                    labels.push(view.getLabel());
                }
            });
            return labels;
        },

		postProcessData: function (rawData) {
			if (this.instance) {
				this.instance.set(rawData);
				return this.instance;
			} else {
				return rawData;
			}
		},

        serialize: function() {
            return {title: this.label, helpText: this.helpText, inline: this.inline};
        }
    });

    editors.List = editors._Composite.extend({
        template: 'editor-list',
        fieldRegion: '.items',
        headRegion: 'thead',

        events: {
            'click .add-item': 'addItem'
        },

        initialize: function(options) {
            // Ensure we have a model class before going further
            if (typeof options.model === 'undefined')
				throw new Error('Could not find model class for List form');

            this.validOptions = this.validOptions.concat(['headRegion']);

			// Initialize specific options
            this.defaults = _.extend({}, this.defaults, {
                inline: true,
                initialData: []
            });
            this._counter = 0;

            this.headerView = new this.constructor.Header();
            this.insertView(this.headRegion, this.headerView);

            editors._Composite.prototype.initialize.apply(this, arguments);

            this.data = [];

            // If list is not empty, display labels as an header row
            if (this._counter > 0) {
                var anyRowView = this.getView(this.fieldRegion); // LM will return the first matching view
                this.headerView.options.headers = anyRowView.getLabel();
            }
        },

		getFields: function () {
			var fields = [];
			_.each(this.initialData, function(instance) {
				var options = this.getItemOptions();
				options.initialData = instance;

				fields.push({
					name: this._counter++,
					editor: editors.NestedModel,
					options: options
				});
			}, this);
			return fields;
        },

        getItemOptions: function() {
            return _.pick(this, 'model', 'inline');
        },

        addItem: function(e) {
			var view = this.addEditor(
							this._counter++,
							editors.NestedModel,
							this.getItemOptions());

            // If item is the first item, also display labels as an header row
            if (this._counter == 1) {
                this.headerView.options.headers = view.getLabel();
                this.headerView.render();
            }

			// Render the new editor
            var doneCallback = $.proxy(function(view) {
                // Call LM internal method to attach a rendered subview (known as "partially render the view")
                this.options.partial(this.$el, view.$el, this.__manager__, view.__manager__);
            }, this);
            view.render().done(doneCallback);
        }
    });

    editors.List.Header = eCollection.utilities.BaseView.extend({
        prefix: BaseEditor.prototype.prefix,
        template: 'editor-listheader',

        serialize: function() {
            return ('headers' in this.options) ? _.pick(this.options, 'headers') : {headers: []};
        }
    });

    ns.Form = editors.NestedModel.extend({
		template: 'form',

        events: {
            'submit': 'onSubmit',
            'reset': 'onReset'
        },

        // Selector for field area
        fieldRegion: '.form-content',

        initialize: function(options) {
            // Set default configuration
            this.defaults = _.extend({}, this.defaults, {
                id: _.uniqueId('form_'),
                label: ''
            });

            // Infere configuration from the model instance if any
            if (options.initialData && options.initialData instanceof Backbone.Model) {
                var instance = options.initialData;
                this.defaults = _.extend({}, this.defaults, {
                    id: (instance.isNew()) ? this.defaults.id : 'form_' + instance.id,
                    label: (instance.isNew()) ? 'New ' + instance.constructor.verboseName.toLowerCase() : instance.constructor.verboseName + ' ' + instance.id
                });
            }

            editors.NestedModel.prototype.initialize.call(this, options);
        },

        onFieldValidate: function(fieldName, data) {
            editors.NestedModel.prototype.onFieldValidate.apply(this, arguments);
            if (fieldName in this.names && $.isEmptyObject(this.errors))
                this.toggleSubmit(false);
        },

        onFieldError: function(fieldName, error) {
            editors.NestedModel.prototype.onFieldError.apply(this, arguments);
            if (fieldName in this.names)
                this.toggleSubmit(true);
        },

        toggleSubmit: function(disabled) {
            this.$el.find('input[type="submit"]').prop('disabled', disabled);
        },

        onReset: function(e) {
            this.clearValidationErrors();
            this.toggleSubmit(false);
            this.data = {};
        },

        onSubmit: function(e) {
            e.preventDefault();

            // /!\ We rely on .trigger() being synchronous here. It feels weak.
            this.validate();

            if ($.isEmptyObject(this.errors)) {
                this.trigger('submit:valid', this.postProcessData(this.data));
            } else {
                this.trigger('submit:invalid', this.errors);
            }
        }
    });

    return ns;
})(NS.UI || {});