import Readspeaker from '@services/readspeaker.js';

/**
 * Mixin containing methods for preview related stuff.
 */
export default class Preview {
  /**
   * Toggle preview.
   * @param {object} [params] Parameters
   * @param {boolean} params.active If true, show preview, else hide.
   * @param {boolean} params.cloaked If true, show preview invisble.
   */
  togglePreview(params = {}) {
    if (typeof params.active !== 'boolean') {
      return;
    }

    if (params.active) {
      this.toolBar.forceButton('export', false);
      this.toolBar.disableButton('deleteHidden');
      this.openPreview();
    }
    else {
      if (this.allChildrenDone && !this.toolBar.isButtonActive('export')) {
        this.toolBar.enableButton('deleteHidden');
      }
      this.closePreview();
    }
  }

  /**
   * Open preview.
   */
  openPreview() {
    this.createPreviewInstance();
    if (!this.previewInstance) {
      return;
    }

    this.chapterNavigation.hide();
    this.chaptersDOM.classList.add('display-none');

    this.previewOverlay.show();
    this.previewOverlay.attachInstance(this.previewInstance);

    Readspeaker.read(this.dictionary.get('a11y.previewOpened'));
  }

  /**
   * Close preview.
   */
  closePreview() {
    this.previewInstance = null;
    this.previewOverlay.decloak();
    this.previewOverlay.hide();
    this.chapterNavigation.show();
    this.chaptersDOM.classList.remove('display-none');

    Readspeaker.read(this.dictionary.get('a11y.previewClosed'));
  }

  /**
   * Create preview instance.
   */
  createPreviewInstance() {
    const libraryUberName = Object.keys(H5PEditor.libraryLoaded)
      .find((library) => library.split(' ')[0] === 'H5P.Portfolio');

    // Copy of params without certain contents in preview.
    const contentParams =
      this.filterContentTypesNotPreviewable(this.parent.params);
    contentParams.behaviour.isPreview = true;

    this.previewInstance = H5P.newRunnable(
      {
        library: libraryUberName,
        params: contentParams
      },
      H5PEditor.contentId || 1,
      undefined,
      undefined,
      { metadata: { title: this.contentTitle } }
    );

    if (!this.previewInstance) {
      return;
    }
  }

  /**
   * Replace content types that cannot be previewed with message.
   * @param {object} [params] Instance parameters.
   * @returns {object} Filtered parameters.
   */
  filterContentTypesNotPreviewable(params = {}) {
    // Not tampering with original values
    const filteredParams = JSON.parse(JSON.stringify(params));

    const portfolioChapters = filteredParams?.portfolio?.chapters;
    if (!portfolioChapters || !Array.isArray(portfolioChapters)) {
      return params;
    }

    const filteredChapters = portfolioChapters.map((chapter) => {
      let contents = chapter.content?.params?.chapter?.contents;
      if (!contents) {
        return chapter;
      }

      contents = contents.map((content) => {
        let fields = content?.content?.params?.placeholder?.fields;
        if (!fields) {
          return content;
        }

        fields = fields.map((field) => {
          const machineName = field?.content?.library?.split(' ').shift();
          if (Preview.CONTENT_TYPES_WITHOUT_PREVIEW.includes(machineName)) {
            field.content = {
              library: 'H5P.AdvancedText 1.1',
              params: {
                text: `<p align="center">${machineName.split('.')[1]}</p>\
                  <p align="center">\
                    ${this.dictionary.get('l10n.noPreviewPossible')}\
                  </p>`
              }
            };
          }

          return field;
        });

        return content;
      });
      chapter.content.params.chapter.contents = contents;

      return chapter;
    });

    filteredParams.portfolio.chapters = filteredChapters;

    return filteredParams;
  }
}

/** @constant {string[]} Content types that cannot render preview */
Preview.CONTENT_TYPES_WITHOUT_PREVIEW = [
  'H5P.Timeline' // Seems to require some extra treatment when attaching, cmp. https://github.com/h5p/h5p-timeline/pull/68
];
