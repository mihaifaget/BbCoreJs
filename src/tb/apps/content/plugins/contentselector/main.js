define(
    [
        'content.pluginmanager',
        'Core',
        'component!contentselector',
        'component!translator',
        'jquery',
        'content.manager',
        'content.repository',
        'component!popin',
        'jsclass'
    ],
    function (
        PluginManager,
        Core,
        ContentSelector,
        Translator,
        jQuery,
        ContentManager,
        ContentRepository,
        PopInManager
    ) {
        'use strict';

        PluginManager.registerPlugin('contentselector', {
            onInit: function () {
                this.contentSelector = ContentSelector.createContentSelector({
                    mode: 'edit'
                });
                this.contentSelector.on('close', jQuery.proxy(this.handleContentSelection, this));
            },

            handleContentSelection: function (selections) {
                var contentInfos,
                    position,
                    content,
                    offlineArticlePopin,
                    self = this;
                if (!selections.length) {
                    return;
                }
                jQuery.each(selections, function (i) {
                    try {
                        contentInfos = selections[i];
                        content = ContentManager.buildElement(contentInfos);
                        position = self.getConfig("appendPosition");
                        position = (position === "bottom") ? "last" : 0;
                        self.getCurrentContent().append(content, position).done(function () {
                            if (content.type === 'Article/Article') {
                                ContentRepository.findData('Article/Article', content.uid).done(function (article) {
                                    if (article.is_mainnode_online === false) {
                                        offlineArticlePopin = PopInManager.createPopIn();
                                        offlineArticlePopin.setContent(Translator.translate('offline_article_alert'));
                                        offlineArticlePopin.display();
                                    }
                                });
                            }
                        });
                    } catch (e) {
                        Core.exception('ContentSelectorPluginException', 50000, e);
                    }
                });
            },

            showContentSelector: function () {
                /* set Accept and other things */
                var currentContent = this.getCurrentContent(),
                    accept = ContentManager.replaceChars(currentContent.getAccept(), '\\', '/');

                this.contentSelector.setContenttypes(accept);
                this.contentSelector.display();
            },

            canApplyOnContext: function () {
                var content = this.getCurrentContent(),
                    check = false;

                if (content.isAContentSet()) {
                    if (content.maxEntry) {
                        if (content.getNodeChildren().length < content.maxEntry) {
                            check = true;
                        }
                    } else {
                        check = true;
                    }
                }

                return check;
            },

            getActions: function () {
                var self = this;
                return [{
                    ico: 'fa fa-th-large',
                    cmd: self.createCommand(self.showContentSelector, self),
                    label: Translator.translate('content_selector'),
                    checkContext: function () {
                        return self.canApplyOnContext();
                    }
                }];
            }
        });
    }
);
