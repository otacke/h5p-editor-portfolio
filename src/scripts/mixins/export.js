import Readspeaker from '@services/readspeaker.js';

/**
 * Mixin containing methods for export related stuff.
 */
export default class Export {
  /**
   * Open screenshot dialog.
   */
  async openExportDialog() {
    /*
     * Your IDE may complain here, but it's fine: `this` refers to the
     * Portfolio class that is using this mixin.
     */
    this.createPreviewInstance(true);
    if (!this.previewInstance) {
      return;
    }

    this.chapterNavigation.hide();
    this.chaptersDOM.classList.add('display-none');

    this.previewOverlay.cloak();
    this.previewOverlay.show();
    this.previewOverlay.attachInstance(this.previewInstance);

    Readspeaker.read(this.dictionary.get('a11y.exportOpened'));

    this.chapterChooser.update({
      instance: this.previewInstance
    });
    this.chapterChooser.show();

    // Try to ensure rendering above actual viewport.
    window.requestAnimationFrame(() => {
      const rect = this.previewOverlay.getDOM().getBoundingClientRect();
      if (rect.top + rect.height > 0) {
        this.previewOverlay.setTop(`${-rect.height - screen.height}px`);
      }
    });
  }

  /**
   * Toggle exportDialog.
   * @param {boolean} active If true, show export dialog, else hide.
   */
  toggleExportDialog(active) {
    if (active) {
      this.toolBar.forceButton('preview', false);
      this.toolBar.disableButton('deleteHidden');
      this.openExportDialog();
    }
    else {
      if (this.allChildrenDone && !this.toolBar.isButtonActive('preview')) {
        this.toolBar.enableButton('deleteHidden');
      }
      this.closeExportDialog();
    }
  }

  /**
   * Show export spinner.
   */
  showExportSpinner() {
    this.spinner.setMessage(
      `${this.dictionary.get('l10n.generatingExport')}. ${this.dictionary.get('l10n.pleaseKeepTabActive')}`
    );
    this.spinner.setProgress(' ');
    this.spinner.show();
  }

  /**
   * Close export dialog.
   */
  closeExportDialog() {
    this.togglePreview({ active: false });

    this.previewInstance = null;
    this.previewOverlay.decloak();
    this.previewOverlay.hide();

    this.chapterNavigation.show();
    this.chaptersDOM.classList.remove('display-none');

    this.chapterChooser.hide();
    this.spinner.hide();

    Readspeaker.read(this.dictionary.get('a11y.exportClosed'));
  }
}
