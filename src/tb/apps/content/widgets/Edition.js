/*
 * Copyright (c) 2011-2013 Lp digital system
 *
 * This file is part of BackBee.
 *
 * BackBee is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * BackBee is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with BackBee. If not, see <http://www.gnu.org/licenses/>.
 */

define(
    [
        'Core',
        'jquery',
        'content.manager',
        'component!popin',
        'component!contentformbuilder',
        'component!formbuilder',
        'component!formsubmitter',
        'component!translator',
        'content.repository'
    ],
    function (Core, jQuery, ContentManager, PopinManager, ContentFormBuilder, FormBuilder, FormSubmitter, translator) {

        'use strict';

        var Edition = {

            popin: [],
            contentSetClass: '.contentset',
            config: {
                onSave: null,
                onValidate: null
            },

            show: function (content, config) {
                this.config = config || {};
                if (content !== undefined) {
                    if (this.popin && this.popin[content.uid]) {
                        this.popin[content.uid].destroy();
                    }
                    this.config.parent = null;
                    this.content = content;
                    if (this.config.options !== undefined && this.config.options.current_uid !== undefined && this.popin[this.config.options.current_uid] !== undefined) {
                        this.config.parent = this.popin[this.config.options.current_uid];
                    }
                    this.popin[this.content.uid] = this.createPopin('contentEdit-' + this.content.uid, this.config.parent);
                    this.edit();
                }
            },

            createPopin: function (name, parent) {
                var popin,
                    config = {
                        close: function () {
                            Core.ApplicationManager.invokeService('content.main.removePopin', name);
                        },
                        modal: true,
                        position: { my: "center top", at: "center top" + jQuery('#' + Core.get('menu.id')).height()}
                    };

                if (parent) {
                    popin = PopinManager.createSubPopIn(parent, config);
                } else {
                    popin = PopinManager.createPopIn(config);
                }

                popin.setTitle(translator.translate(this.config.title || 'edit'));
                popin.addOption('width', '500px');

                Core.ApplicationManager.invokeService('content.main.registerPopin', name, popin);

                return popin;
            },

            getDialog: function () {
                var dialog = this.popin[this.content.uid] || null;

                return dialog;
            },

            getFormConfig: function () {

                var self = this,
                    dfd = new jQuery.Deferred();

                this.content.getData('elements').done(function (elements) {
                    var key,
                        object,
                        element,
                        elementArray = [],
                        defaultOption;

                    for (key in elements) {
                        if (elements.hasOwnProperty(key)) {

                            element = elements[key];
                            defaultOption = self.content.definition.defaultOptions[key];

                            if (jQuery.isArray(element)) {
                                object = self.buildArrayObjectConfig(element, key, defaultOption);
                            } else {

                                if (null === element) {
                                    element = {};
                                    element.type = self.content.definition.accept[key][0];
                                }

                                object = {
                                    'type': (element.type === undefined) ? 'scalar' : element.type,
                                    'uid': element.uid,
                                    'name': key
                                };

                                if (defaultOption) {
                                    if (defaultOption.label) {
                                        object.label = defaultOption.label;
                                    }
                                }

                                if (object.type === 'scalar') {
                                    object.parent = self.content;
                                }
                            }

                            elementArray.push(object);
                        }
                    }
                    self.preLoadElements(elementArray).done(function () {
                        self.getElementsConfig(elementArray).done(function () {
                            dfd.resolve(self.buildConfig(arguments));
                        });
                    });
                });

                return dfd.promise();
            },

            preLoadElements: function (elementsArray) {
                var key,
                    dfd = jQuery.Deferred(),
                    object,
                    uids = [];

                for (key in elementsArray) {
                    if (elementsArray.hasOwnProperty(key)) {
                        object = elementsArray[key];
                        if (undefined !== object.uid) {
                            uids.push(object.uid);
                        }
                    }
                }

                if (uids.length > 0) {
                    require('content.repository').findByUids(uids).done(function (elements) {
                        var element,
                            key2,
                            key3;

                        for (key2 in elements) {
                            if (elements.hasOwnProperty(key2)) {
                                element = elements[key2];
                                for (key3 in elementsArray) {
                                    if (elementsArray.hasOwnProperty(key3)) {
                                        if (elementsArray[key3].uid === element.uid) {
                                            elementsArray[key3].content = ContentManager.buildElement({'type': element.type, 'uid': element.uid, 'elementData': element});
                                        }
                                    }
                                }
                            }
                        }

                        dfd.resolve();
                    });
                } else {
                    dfd.resolve();
                }

                return dfd.promise();
            },

            buildArrayObjectConfig: function (elements, key, defaultOption) {
                var accept = this.content.definition.accept[key],
                    object = {};

                if (undefined === accept) {
                    return null;
                }

                object.type = accept[0];
                object.name = key;
                object.elements = elements;

                if (defaultOption) {
                    if (defaultOption.label) {
                        object.label = defaultOption.label;
                    }
                }

                return object;
            },

            buildConfig: function (parameters) {
                var key,
                    param,
                    config = {
                        'elements': {},
                        'onSubmit': jQuery.proxy(this.onSubmit, this)
                    };

                if (this.config && this.config.hasOwnProperty("onValidate")) {
                    config.onValidate = this.config.onValidate;
                }

                config.form = {};
                config.form.popinInstance = this.popin[this.content.uid];
                config.form.content = this.content;

                for (key in parameters) {
                    if (parameters.hasOwnProperty(key)) {
                        param = parameters[key];

                        if (param !== null) {
                            config.elements[param.object_name] = param;
                        }
                    }
                }

                return config;
            },

            getElementsConfig: function (elementsArray) {

                var key,
                    promises = [],
                    object;

                for (key in elementsArray) {
                    if (elementsArray.hasOwnProperty(key)) {

                        object = elementsArray[key];
                        promises.push(ContentFormBuilder.getConfig(object.type, object, this.content));
                    }
                }

                return jQuery.when.apply(undefined, promises).promise();
            },

            /**
             * Edit the content
             */
            edit: function () {
                var self = this;

                this.popin[this.content.uid].display();
                this.popin[this.content.uid].mask();

                this.getFormConfig().done(function (config) {

                    config.options = {
                        'current_uid': self.content.uid
                    };
                    FormBuilder.renderForm(config).done(function (html) {
                        self.popin[self.content.uid].setContent(html);
                        self.popin[self.content.uid].unmask();
                    });
                });
            },

            onSubmit: function (data, form) {
                var self = this,
                    saveCallback = function () {
                        form.config.popinInstance.unmask();
                        form.config.popinInstance.hide();

                        if (typeof this.config.onSave === "function") {
                            this.config.onSave(data);
                        }
                        this.config.onSave = null;
                        this.config.onValidate = null;
                    };

                form.config.popinInstance.mask();

                FormSubmitter.process(data, form).done(function (res) {
                    self.computeData(res, form).done(function () {
                        Core.ApplicationManager.invokeService('content.main.save').done(function (promise) {
                            promise.done(function (nbContentsSaved) {
                                if (nbContentsSaved === 0) {
                                    saveCallback.apply(self);
                                } else {
                                    if (form.config.content.jQueryObject instanceof jQuery) {
                                        if (form.config.content.getParent() !== null) {
                                            form.config.content.getParent().refresh().done(saveCallback.bind(self));
                                        } else {
                                            form.config.content.refresh().done(saveCallback.bind(self));
                                        }
                                    } else {
                                        saveCallback.apply(self);
                                    }
                                }
                            });
                        });
                    });
                });
            },

            computeData: function (data, form) {
                var promises = [],
                    element,
                    content = form.config.content,
                    contentElements = content.data.elements,
                    type,
                    key,
                    item,
                    value,
                    formElement;

                for (key in data) {

                    if (data.hasOwnProperty(key)) {

                        value = data[key];
                        item = contentElements[key];

                        if (value !== null) {
                            if (typeof item === 'string' || typeof item === 'number') {
                                if (item !== value) {
                                    promises.push(content.addElement(key, value));
                                }
                            } else {

                                element = null;
                                if (item !== null) {
                                    element = ContentManager.buildElement(item);
                                } else {
                                    formElement = form.elements[key];
                                    if (formElement && formElement.element) {
                                        element = formElement.element;
                                    }
                                }

                                if (null === element) {
                                    type = content.definition.accept[key][0];
                                } else {
                                    type = element.type;
                                }

                                if (type === 'Element/Text') {
                                    if (element.get('value') !== value) {
                                        promises.push(element.set('value', value));
                                    }
                                } else if (type === 'Element/Keyword') {
                                    promises.push(this.setKeywordsElements(value, key, content));
                                } else {
                                    promises.push(element.setElements(value));
                                }
                            }
                        }
                    }
                }

                return jQuery.when.apply(undefined, promises).promise();
            },

            setKeywordsElements: function (values, key, content) {
                var data = [],
                    dfd = jQuery.Deferred(),
                    newKey = key;

                this.computeKeywords(values, key, content).done(function () {
                    var i;

                    for (i in arguments) {
                        if (arguments.hasOwnProperty(i)) {
                            data.push(arguments[i]);
                        }
                    }

                    content.addElement(newKey, data);
                    dfd.resolve();
                });

                return dfd.promise();
            },

            computeKeywords: function (values, key, content) {
                var i,
                    value,
                    promises = [],
                    currentValues = content[key + '_values'];

                if (undefined !== currentValues) {
                    for (i in values) {
                        if (values.hasOwnProperty(i)) {
                            value = values[i];

                            promises.push(this.findKeywordElement(value.uid, currentValues));
                        }
                    }
                }

                return jQuery.when.apply(undefined, promises).promise();
            },

            findKeywordElement: function (keywordUid, currentValues) {
                var dfd = jQuery.Deferred(),
                    key,
                    keyword,
                    element,
                    found = false,
                    object = {
                        'type': 'Element/Keyword'
                    };

                for (key in currentValues) {
                    if (currentValues.hasOwnProperty(key)) {

                        keyword = currentValues[key];
                        if (keyword.uid === keywordUid) {
                            found = true;
                            object.uid = keyword.object_uid;
                            dfd.resolve(object);
                        }
                    }
                }

                if (!found) {
                    ContentManager.createElement('Element/Keyword').done(function (data) {
                        element = ContentManager.buildElement({'type': 'Element/Keyword', 'uid': data.uid});
                        element.set('value', keywordUid);
                        object.uid = data.uid;
                        dfd.resolve(object);
                    });
                }

                return dfd.promise();
            }
        };

        return {
            show: jQuery.proxy(Edition.show, Edition),
            getDialog: jQuery.proxy(Edition.getDialog, Edition)
        };
    }
);
