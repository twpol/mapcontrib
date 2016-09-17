
import Marionette from 'backbone.marionette';
import template from './template.ejs';


export default Marionette.ItemView.extend({
    template,

    ui: {
        input: '.form-control',
        removeBtn: '.remove_btn',
    },

    events: {
        'blur @ui.input': 'updateInput',
        'keyup @ui.input': 'updateInput',
        'click @ui.removeBtn': 'onClickRemoveBtn',
    },

    onRender() {
        document.l10n.localizeNode( this.el );
    },

    updateInput() {
        this.model.set(
            'value',
            this.ui.input.val().trim()
        );
    },

    onClickRemoveBtn() {
        this.model.destroy();
    },

    enable() {
        this.ui.input.prop('disabled', false);
    },

    disable() {
        this.ui.input.prop('disabled', true);
    },

    enableRemoveBtn() {
        this.ui.removeBtn.prop('disabled', false);
    },

    disableRemoveBtn() {
        this.ui.removeBtn.prop('disabled', true);
    },

    setFocus() {
        this.ui.input.focus();
    },
});
