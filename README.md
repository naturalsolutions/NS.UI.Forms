NS.UI.Forms
===========

Generate forms for Backbone models

## Status ##

Work in progress, use at your own risk...

## Features ##

* Automatically generate forms based on model schema
* On-the-fly validation
* Classic stacked layout (one field per line) or inline layout (useful for tabular list of related objects)
* Extendable, customizable

## Documentation (draft) ##

### Configuration ###

Forms are generate automatically based on your schema declaration:

    MyModel = Backbone.Model.extend({
        // Put whatever you need at instance level
    }, {
        // Declare schema and verbose name at model level
        schema: {
            id: {title: 'ID', type: 'Number', editable: false},
            name: {title: 'Name', type: 'Text', required: true}
        },
        verboseName: 'My model'
    });

The `schema` object provides configuration options for each model attributes.

### Supported editors ###

#### Text ####

TODO

#### Number ####

TODO

#### Boolean ####

TODO

#### Select ####

Set a field's type as `Select` and it will be presented using a classic HTML dropdown list. You can feed the select's options with:
- a Collection: each collection item will result in an option with item.id as the value and item.toString() as the label;
- an array of plain objects, each object must expose two properties: `val` (the value) and `label` (the label);
- an array of literal values (number, string, ...) which will be used as the value and the label.
You can actually mix the literal values and plain objects in the same array.

Use the `multiple` option to enable or disable multiple selection.

#### NestedModel ####

TODO

#### List ####

TODO

#### MultiSchema ####

TODO

### Validation ###

Validation is triggered whenever a `blur` event occurs on a field. The
validation process runs every declared validator for each field and intercepts
`ValidationError` if any.

A `validator` is an object with a `validation()` method which takes the value
to validate as an arguments. This method either returns the validated (and
optionnaly cleaned) value or raises an exception.

As an example, this validator is enabled when you mark a field as `required`:

	NS.UI.Form.validators.Required = function() {
		this.msg = 'Blank value not allowed here';
		this.validate = function(value) {
			if (typeof value === 'undefined')
                throw new ValidationError(this.msg);
            return value;
		};
	};

You can easily implement your custom validators. For example, if you want to
ensure a number is positive, you would declare a validator like so:

    // Place this code after Form library has loaded and before you initialize your form
	NS.UI.Form.validators.Positive = function() {
		this.validate = function(value) {
			if (value < 0)
                throw new NS.UI.Form.ValidationError('Positive value is expected here');
            return value;
		};
	};

Then, you can enable this validator in your `schema` declaration:

    Person = Backbone.Model.extend({
        ...
    }, {
        schema: {
            age: {title: 'Age', type: 'Number', validators: ['Positive']},
            ...
        }
    });

### Not so FAQ ###

#### How do I set a default value? ####

If your form is initialized with a `model` instance, you can use Backbone's [`defaults`](http://backbonejs.org/#Model-defaults) option. Otherwise, the form's `initialData` may be an option. There is currently no option to set a default value directly in the `schema` definition.

#### How do I customize editors' template? ####

Every editor has a `templateSrc` static property with holds two template string, one for stacked mode and another for inline mode. You are free to change these strings in order to customize UI. Use the original template string as a model.

In the following example, we leverage this feature to enable HTML5's `<input type="number">` for Number editor in stacked mode:

    // Place this code after Form library has loaded and before you initialize your form
    NS.UI.Form.editors.Number.templateSrc.stacked = 
        '<div class="control-group">' +
        '    <label class="control-label" for="<%- data.id %>"><% if (data.required) { %><b>*</b><% } %> <%- data.label %></label>' +
        '    <div class="controls">' +
        '        <input type="number" id="<%- data.id %>" name="<%- data.name %>" value="<%- data.initialData %>" />' +
        '        <div class="help-inline"></div>' +
        '        <div class="help-block"><% if (data.helpText) { %><%- data.helpText %><% } %></div>' +
        '    </div>' +
        '</div>';

Note that all properties returned by `serialize()` are available through an object named `data`. This is because we use Underscore's `template()` with the `variable` option.

Of course, you can (and you are encouraged to) use your own template loading method. If your template loading mechanism is asynchronous, you will need to ensure that loading is over before initializing the form (hint: jQuery's [deferred objects](http://api.jquery.com/jQuery.Deferred/)).

#### How do I write a custom editor? ####

TODO

## Contributors ##

Gilles Bassière, [Natural Solutions](http://natural-solutions.eu/)
