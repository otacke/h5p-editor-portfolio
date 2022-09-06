import Dictionary from './../../services/dictionary';
import Export from './../../services/export';
import Screenshot from './../../services/screenshot';
import Util from './../../h5peditor-portfolio-util';

import './chapterchooser.scss';

/** Class for an activity indicator aka spinner */
export default class ChapterChooser {
  /**
   * @class
   * @param {object} [params={}] Parameters.
   * @param {object} [callbacks={}] Callbacks.
   * @param {function} [callbacks.onExportStarted] Callback export started.
   * @param {function} [callbacks.onExportEnded] Callback export ended.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);

    this.callbacks = Util.extend({
      onExportStarted: () => {},
      onExportProgress: () => {},
      onExportEnded: () => {}
    }, callbacks);

    // Keep track of chosen chapters for export.
    this.chosenChapters = [];

    this.dom = document.createElement('div');
    this.dom.classList.add('chapter-chooser-overlay');

    const content = document.createElement('div');
    content.classList.add('chapter-chooser-content');
    this.dom.appendChild(content);

    const title = document.createElement('div');
    title.classList.add('chapter-chooser-title');
    title.innerHTML = Dictionary.get('l10n.chooseChapters');
    content.appendChild(title);

    const description = document.createElement('div');
    description.classList.add('chapter-chooser-description');
    description.innerHTML = Dictionary.get('l10n.chooseChaptersDescription');
    content.appendChild(description);

    const wrapper = document.createElement('div');
    wrapper.classList.add('chapter-chooser-actions');
    content.appendChild(wrapper);

    this.optionsList = document.createElement('ul');
    this.optionsList.classList.add('chapter-chooser-list');
    wrapper.appendChild(this.optionsList);

    const buttonsWrapper = document.createElement('div');
    buttonsWrapper.classList.add('chapter-chooser-buttons-wrapper');
    wrapper.appendChild(buttonsWrapper);

    this.buttonExportImages = document.createElement('button');
    this.buttonExportImages.classList.add('h5peditor-button');
    this.buttonExportImages.classList.add('h5peditor-button-textual');
    this.buttonExportImages.classList.add('chapter-chooser-export-button');
    this.buttonExportImages.innerText = Dictionary.get('l10n.exportImages');
    this.buttonExportImages.addEventListener('click', () => {
      this.handleExportImages();
    });
    buttonsWrapper.appendChild(this.buttonExportImages);

    this.hide();

    this.updateButtons();
  }

  /**
   * Get the DOM.
   *
   * @returns {HTMLElement} Chapter chooser DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Update chooser.
   *
   * @param {object} [params={}] Parameters.
   * @param {H5P.ContentType} params.instance Preview instance.
   */
  update(params = {}) {
    if (!params.instance) {
      return;
    }

    this.instance = params.instance;

    this.chosenChapters = [];

    this.optionsList.innerHTML = '';

    this.instance.getChaptersInformation().forEach((chapter, index) => {
      const li = document.createElement('li');
      li.classList.add('chapter-chooser-list-item');
      li.classList.add(`hierarchy-${chapter.hierarchy.split('-').length}`);

      const checkbox = document.createElement('input');
      checkbox.classList.add('chapter-chooser-checkbox');
      checkbox.setAttribute('type', 'checkbox');
      checkbox.setAttribute('id', `chapter-chooser-checkbox-${index}`);
      checkbox.setAttribute('aria-label', chapter.title);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          this.chosenChapters.push({
            index: index,
            hierarchy: chapter.hierarchy
          });
        }
        else {
          this.chosenChapters.splice(
            this.chosenChapters.findIndex(chapter => chapter.index === index), 1
          );
        }

        this.updateButtons();
      });
      li.appendChild(checkbox);

      const label = document.createElement('label');
      label.classList.add('chapter-chooser-label');
      label.setAttribute('for', `chapter-chooser-checkbox-${index}`);
      label.innerText = chapter.title;
      li.appendChild(label);

      this.optionsList.appendChild(li);
    });
  }

  /**
   * Update buttons.
   */
  updateButtons() {
    if (this.chosenChapters.length) {
      this.buttonExportImages.removeAttribute('disabled');
    }
    else {
      this.buttonExportImages.setAttribute('disabled', 'disabled');
    }
  }

  /**
   * Show chapter chooser.
   */
  show() {
    this.dom.classList.remove('display-none');
  }

  /**
   * Hide chapter chooser.
   */
  hide() {
    this.dom.classList.add('display-none');
  }

  /**
   * Get screenshot of chapter.
   *
   * @param {number} chapterId Chapter's id.
   */
  async getScreenshot(chapterId) {
    return await new Promise(resolve => {
      this.instance.moveTo({ id: chapterId });

      setTimeout(async () => {
        resolve (await Screenshot.takeScreenshot({
          element: this.instance.pageContent.getDOM() // TODO: function
        }));
      }, 500); // Animation time + buffer for resize
    });
  }

  /**
   * Handle export images.
   */
  async handleExportImages() {
    this.callbacks.onExportStarted();

    let blobs = [];

    for (let i = 0; i < this.chosenChapters.length; i++) {
      this.callbacks.onExportProgress({
        number: i + 1,
        of: this.chosenChapters.length
      });

      const blob = await this.getScreenshot(this.chosenChapters[i].index);
      if (blob === null) {
        continue;
      }

      blobs.push({
        name: `${this.chosenChapters[i].hierarchy}.${blob.type.split('/')[1]}`,
        blob: blob
      });
    }

    Export.offerDownload({ blob: await Export.createZip(blobs) });

    this.callbacks.onExportEnded();
  }
}
