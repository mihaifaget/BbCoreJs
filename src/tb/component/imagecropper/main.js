/*
 * Copyright (c) 2011-2016 Lp digital system
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

require.config({
    paths: {
        'ls-templates': 'src/tb/component/imagecropper/templates'
    }
});

define(
    [
        'Core',
        'Core/Renderer',
        'crop.repository',
        'content.repository',
        'jquery',
        'component!popin',
        'component!translator',
        'content.models.ContentSet',
        'definition.manager',
        'text!ls-templates/layout.twig',
        'jquery-layout',
        'jsclass',
        'cropper'
    ],
    function (Core,
        Renderer,
        CropRepository,
        ContentRepository,
        jQuery,
        PopInManager,
        Translator,
        ContentSet,
        DefinitionManager,
        layoutTemplate
        ) {

        "use strict";

        var ImageCropper = new JS.Class({

            initialize: function () {
                var self = this,
                    croppableElements = Core.config('croppable_elements'),
                    popin_config = {
                        title: Translator.translate('crop_image'),
                        id: 'cropper-popin',
                        width: 500,
                        top: 15,
                        height: 'auto',
                        open: jQuery.proxy(function () { self.onOpen(self); }, null, this),
                        close: jQuery.proxy(function () { self.onClose(self); }, null, this)
                    };
                this.popin = PopInManager.createPopIn(popin_config);

                if (croppableElements === undefined) {
                    return require('component!notify').error('No config for crop elements');
                }
                this.croppableElements = croppableElements;
            },

            show: function (imageUid) {
                var self = this,
                    imageUrl = '',
                    available_proportions = [
                        ['16/9', '1.77'],
                        ['3/2', '1.5'],
                        ['5/3', '1.66'],
                        ['4/3', '1.33'],
                        ['5/4', '1.25'],
                        ['7/5', '1.4'],
                        [Translator.translate('square'), '1'],
                        [Translator.translate('custom'), 'NaN']
                    ];

                if (null === imageUid || '' === imageUid) {
                    this.popin.destroy();
                    return require('component!notify').error(Translator.translate('image_could_not_load'));
                }

                ContentRepository.find(self.croppableElements.image_element, imageUid).done(function (response) {
                    if (response.hasOwnProperty('image')) {
                        imageUrl = response.image;
                    }

                    if (null === imageUrl || '' === imageUrl) {
                        self.popin.destroy();
                        return require('component!notify').error(Translator.translate('image_could_not_load'));
                    }

                    self.popin.setContent(Renderer.render(layoutTemplate, { imageUid: imageUid, imageUrl: imageUrl + '?' + new Date().getTime(), available_proportions: available_proportions }));
                    if (self.isShown !== true) {
                        self.widget = jQuery(Renderer.render(layoutTemplate)).clone();
                    }
                    self.popin.display();
                    self.isShown = true;
                    self.imageUid = imageUid;
                });
            },

            onOpen: function (self) {
                var cropperW,
                    cropperH,
                    cropperX,
                    cropperY,
                    cropRatio,
                    cropLockdim = jQuery('.crop-lockdim'),
                    popin_parent = jQuery('#cropper-popin').parent('.ui-dialog:first'),
                    cropImage = jQuery('#cropImage'),
                    cropWidthInput = jQuery('.crop-width'),
                    cropHeightInput = jQuery('.crop-height'),
                    proportionsSelect = jQuery('.proportions-select'),
                    selectedProportion = proportionsSelect.find('option:eq(0)').text(),
                    cropNewBtn = jQuery('.btn-crop-new'),
                    cropReplaceBtn = jQuery('.btn-crop-replace'),
                    contentConfig = {},
                    contentImage,
                    options = {
                        aspectRatio: 16 / 9,
                        preview: '.crop-preview',
                        zoomable: false,
                        crop: function (e) {
                            cropperX = Math.round(e.x);
                            cropperY = Math.round(e.y);
                            cropperH = Math.round(e.height);
                            cropperW = Math.round(e.width);
                            cropWidthInput.val(cropperW);
                            cropHeightInput.val(cropperH);
                            cropRatio = cropperW / cropperH;
                        }
                    };

                popin_parent.css({
                    top: 15
                });

                cropImage.cropper(options);
                proportionsSelect.on('change', function () {
                    options.aspectRatio = jQuery(this).val();
                    cropImage.cropper('destroy').cropper(options);
                    selectedProportion = jQuery(this).find('option:selected').text();
                });

                cropLockdim.on('change', function () {
                    if (jQuery(this).is(':checked')) {
                        cropWidthInput.prop('readonly', true).unbind('change').val(cropperW);
                        cropHeightInput.prop('readonly', true).unbind('change').val(cropperH);
                    } else {
                        cropWidthInput.prop('readonly', false).on('change', function () {
                            cropHeightInput.val(Math.round(cropWidthInput.val() / cropRatio));
                        });
                        cropHeightInput.prop('readonly', false).on('change', function () {
                            cropWidthInput.val(Math.round(cropHeightInput.val() * cropRatio));
                        });
                    }
                });

                cropNewBtn.on('click', function () {
                    CropRepository.postData({
                        cropAction: 'new',
                        imagePath: self.imagePath,
                        originalUid: self.imageUid,
                        cropX: cropperX,
                        cropY: cropperY,
                        cropW: cropperW,
                        cropH: cropperH,
                        cropNewW: cropWidthInput.val(),
                        cropNewH: cropHeightInput.val(),
                        selectedProportion: selectedProportion
                    }).done(function () {
                        require('component!notify').success(Translator.translate('new_cropimage_created'));
                    }).fail(function () {
                        require('component!notify').error(Translator.translate('invalid_element'));
                    });
                });

                cropReplaceBtn.on('click', function () {
                    CropRepository.postData({
                        cropAction: 'replace',
                        imagePath: self.imagePath,
                        originalUid: self.imageUid,
                        cropX: cropperX,
                        cropY: cropperY,
                        cropW: cropperW,
                        cropH: cropperH,
                        cropNewW: cropWidthInput.val(),
                        cropNewH: cropHeightInput.val(),
                        selectedProportion: selectedProportion
                    }).done(function () {
                        require('component!notify').success(Translator.translate('image_was_cropped'));
                        self.popin.destroy();
                        jQuery('.ui-dialog:last').find('.ui-dialog-content').dialog('destroy').remove();
                        contentConfig.type = self.croppableElements.image_element;
                        contentConfig.uid = self.imageUid;
                        contentConfig.definition = DefinitionManager.find(contentConfig.type);
                        contentImage = new ContentSet(contentConfig);
                        contentImage.refresh();
                    }).fail(function () {
                        require('component!notify').error(Translator.translate('invalid_element'));
                    });
                });
            },

            onClose: function (self) {
                jQuery('#cropImage').cropper('destroy');
                self.popin.destroy();
            }
        });
        return {
            create: function () {
                var cropper = new ImageCropper();

                jQuery.extend(cropper, {}, Backbone.Events);

                return cropper;
            }
        };
    }
);