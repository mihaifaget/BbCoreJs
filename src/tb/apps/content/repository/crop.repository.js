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
        'Core/DriverHandler',
        'Core/RestDriver'
    ],
    function (CoreDriverHandler, CoreRestDriver) {

        'use strict';

        var restAction = 'crop',

            /**
             * Crop repository class
             * @type {Object} JS.Class
             */
            CropRepository = new JS.Class({

                /**
                 * Initialize of Page repository
                 */
                initialize: function () {
                    CoreDriverHandler.addDriver('rest', CoreRestDriver);
                },

                /**
                 * Rest action for cropped image
                 * @param {object} data
                 */
                postData: function (data) {
                    return CoreDriverHandler.create(restAction, data);
                }
            });

        return new JS.Singleton(CropRepository);
    }
);
