NS.UI.Forms
===========

Generate forms for Backbone models

## Status ##

Work in progress, use at your own risk...

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

### Not so FAQ ###

#### How do I set a default value? ####

If your form is initialized with a `model` instance, you can use Backbone's [`defaults`](http://backbonejs.org/#Model-defaults) option. Otherwise, the form's `initialData` may be an option. There is currently no option to set a default value directly in the `schema` definition.

#### How do I customize editors' template? ####

TODO

#### How do I write a custom editor? ####

TODO

## Contributors ##

Gilles Bassière, [Natural Solutions](http://natural-solutions.eu/)
