import Export from '@services/export';
import Screenshot from '@services/screenshot';
import Util from '@services/util';
import './chapterchooser.scss';

/** Class for an activity indicator aka spinner */
export default class ChapterChooser {
  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onExportStarted] Callback export started.
   * @param {function} [callbacks.onExportProgress] Callback export progress.
   * @param {function} [callbacks.onExportEnded] Callback export ended.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);

    this.callbacks = Util.extend({
      onExportStarted: () => {},
      onExportProgress: () => {},
      onExportEnded: () => {}
    }, callbacks);

    // Keep track of checkboxes.
    this.checkboxes = [];

    this.dom = document.createElement('div');
    this.dom.classList.add('chapter-chooser-overlay');

    const content = document.createElement('div');
    content.classList.add('chapter-chooser-content');
    this.dom.appendChild(content);

    const title = document.createElement('div');
    title.classList.add('chapter-chooser-title');
    title.innerHTML = this.params.dictionary.get('l10n.chooseChapters');
    content.appendChild(title);

    const description = document.createElement('div');
    description.classList.add('chapter-chooser-description');
    description.innerHTML =
      this.params.dictionary.get('l10n.chooseChaptersDescription');
    content.appendChild(description);

    const wrapper = document.createElement('div');
    wrapper.classList.add('chapter-chooser-actions');
    content.appendChild(wrapper);

    // Toggle all
    const toggleAllWrapper = document.createElement('div');
    toggleAllWrapper.classList.add('chapter-chooser-toggle-all-wrapper');
    wrapper.appendChild(toggleAllWrapper);

    this.toggleAll = document.createElement('input');
    this.toggleAll.classList.add('chapter-chooser-checkbox');
    this.toggleAll.setAttribute('type', 'checkbox');
    this.toggleAll.setAttribute('id', 'chapter-chooser-checkbox-toggle-all');
    this.toggleAll.setAttribute(
      'aria-label', this.params.dictionary.get('a11y.selectAll')
    );
    this.toggleAll.addEventListener('change', () => {
      if (this.toggleAll.checked) {
        this.toggleAll.setAttribute(
          'aria-label', this.params.dictionary.get('a11y.unselectAll')
        );
      }
      else {
        this.toggleAll.setAttribute(
          'aria-label', this.params.dictionary.get('a11y.selectAll')
        );
      }

      this.checkboxes.forEach((checkbox) => {
        checkbox.checked = this.toggleAll.checked;
      });
      this.updateButtons();
    });
    toggleAllWrapper.appendChild(this.toggleAll);

    this.toggleAllLabel = document.createElement('label');
    this.toggleAllLabel.classList.add('chapter-chooser-label-toggle-all');
    this.toggleAllLabel.innerText =
      this.params.dictionary.get('l10n.selectAll');
    toggleAllWrapper.appendChild(this.toggleAllLabel);

    // Options
    this.optionsList = document.createElement('ul');
    this.optionsList.classList.add('chapter-chooser-list');
    wrapper.appendChild(this.optionsList);

    // Buttons
    const buttonsWrapper = document.createElement('div');
    buttonsWrapper.classList.add('chapter-chooser-buttons-wrapper');
    wrapper.appendChild(buttonsWrapper);

    this.buttonExportImages = document.createElement('button');
    this.buttonExportImages.classList.add('h5peditor-button');
    this.buttonExportImages.classList.add('h5peditor-button-textual');
    this.buttonExportImages.classList.add('chapter-chooser-export-button');
    this.buttonExportImages.innerText =
      this.params.dictionary.get('l10n.exportImages');
    this.buttonExportImages.addEventListener('click', () => {
      this.handleExport('images');
    });
    buttonsWrapper.appendChild(this.buttonExportImages);

    this.buttonExportPDF = document.createElement('button');
    this.buttonExportPDF.classList.add('h5peditor-button');
    this.buttonExportPDF.classList.add('h5peditor-button-textual');
    this.buttonExportPDF.classList.add('chapter-chooser-export-button');
    this.buttonExportPDF.innerText =
      this.params.dictionary.get('l10n.exportPDF');
    this.buttonExportPDF.addEventListener('click', () => {
      this.handleExport('pdf');
    });
    buttonsWrapper.appendChild(this.buttonExportPDF);

    this.buttonExportDOCX = document.createElement('button');
    this.buttonExportDOCX.classList.add('h5peditor-button');
    this.buttonExportDOCX.classList.add('h5peditor-button-textual');
    this.buttonExportDOCX.classList.add('chapter-chooser-export-button');
    this.buttonExportDOCX.innerText =
      this.params.dictionary.get('l10n.exportDOCX');
    this.buttonExportDOCX.addEventListener('click', () => {
      this.handleExport('docx');
    });
    buttonsWrapper.appendChild(this.buttonExportDOCX);

    this.hide();
    this.updateButtons();
  }

  /**
   * Get the DOM.
   * @returns {HTMLElement} Chapter chooser DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Update chooser.
   * @param {object} [params] Parameters.
   * @param {H5P.ContentType} params.instance Preview instance.
   */
  update(params = {}) {
    if (!params.instance) {
      return;
    }

    this.instance = params.instance;

    this.toggleAll.checked = false;

    this.checkboxes = [];

    this.optionsList.innerHTML = '';

    let chapterIndexOffset = 0;

    if (this.instance.params.showCoverPage) {
      const fakeChapterParams = {
        hierarchy: '0',
        title: this.params.dictionary.get('l10n.coverPage')
      };

      const { li, checkbox } = this.buildListItem(fakeChapterParams, 0);

      this.checkboxes.push(checkbox);
      this.optionsList.appendChild(li);

      chapterIndexOffset++;
    }

    this.instance.getChaptersInformation().forEach((chapter, index) => {
      const { li, checkbox } = this.buildListItem(
        chapter, index + chapterIndexOffset
      );

      this.checkboxes.push(checkbox);
      this.optionsList.appendChild(li);
    });

    this.updateButtons();
  }

  /**
   * Build list item.
   * @param {object} chapter Chapter params.
   * @param {number} index Index.
   * @returns {HTMLLIElement} List item.
   */
  buildListItem(chapter, index) {
    const li = document.createElement('li');
    li.classList.add('chapter-chooser-list-item');
    li.classList.add(`hierarchy-${chapter.hierarchy.split('-').length}`);

    const uuid = H5P.createUUID();

    const checkbox = document.createElement('input');
    checkbox.classList.add('chapter-chooser-checkbox');
    checkbox.setAttribute('type', 'checkbox');
    checkbox.setAttribute('id', `chapter-chooser-checkbox-${index}-${uuid}`);
    checkbox.setAttribute('aria-label', chapter.title);
    checkbox.addEventListener('change', () => {
      this.updateButtons();
    });
    li.appendChild(checkbox);

    const label = document.createElement('label');
    label.classList.add('chapter-chooser-label');
    label.setAttribute('for', `chapter-chooser-checkbox-${index}-${uuid}`);
    label.innerText = chapter.title;
    li.appendChild(label);

    return { li, checkbox };
  }

  /**
   * Update buttons.
   */
  updateButtons() {
    // Update toggle label
    if (this.checkboxes.every((checkbox) => checkbox.checked)) {
      this.toggleAllLabel.innerHTML =
        this.params.dictionary.get('l10n.unselectAll');
    }
    else {
      this.toggleAllLabel.innerHTML =
        this.params.dictionary.get('l10n.selectAll');
    }

    // Update export buttons
    if (this.checkboxes.some((checkbox) => checkbox.checked)) {
      this.buttonExportImages.removeAttribute('disabled');
      this.buttonExportPDF.removeAttribute('disabled');
      this.buttonExportDOCX.removeAttribute('disabled');
    }
    else {
      this.buttonExportImages.setAttribute('disabled', 'disabled');
      this.buttonExportPDF.setAttribute('disabled', 'disabled');
      this.buttonExportDOCX.setAttribute('disabled', 'disabled');
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
   * Get cover.
   * @param {boolean} enforceImage If true, enforce image in return.
   * @returns {Blob} Screenshot.
   */
  async getCover(enforceImage) {
    const dom = this.instance.getCoverDOM();

    // Hide read button
    const button = dom.querySelector('.h5p-portfolio-cover-readbutton');
    if (button) {
      button.classList.add('display-none');
    }

    const coverBlob = await Screenshot.takeScreenshot(
      { element: dom, enforceImage: enforceImage }
    );

    if (button) {
      button.classList.remove('display-none');
    }

    return coverBlob;
  }

  /**
   * Get screenshots of chapter.
   * @param {number} chapterId Chapter's id.
   * @param {boolean} enforceImage If true, enforce image in return.
   * @returns {Blob[]} Screenshots.
   */
  async getScreenshots(chapterId, enforceImage) {
    return await new Promise((resolve) => {
      this.instance.moveTo({ id: chapterId });

      setTimeout(async () => {
        const screenshots = [];
        const doms = this.instance.getChaptersInformation(chapterId)
          ?.placeholderDOMs || [];

        for (let i = 0; i < doms.length; i++) {
          const screenshot = await Screenshot.takeScreenshot(
            { element: doms[i], enforceImage: enforceImage }
          );

          if (!screenshot) {
            continue; // Probably empty chapter
          }

          screenshots.push(screenshot);
        }

        resolve(screenshots);
      }, 500); // Animation time + buffer for resize
    });
  }

  /**
   * Handle export.
   * @param {string} type Type of export.
   */
  async handleExport(type) {
    if (typeof type !== 'string') {
      return;
    }

    this.callbacks.onExportStarted();

    window.setTimeout(async () => {
      // Retrieve information for chosen chapters
      const chapterInfo = this.instance.getChaptersInformation();
      const chosenChapters = this.checkboxes.reduce((checked, current, index) => {
        let chapterIndex = index;
        if (this.instance.params.showCoverPage) {
          if (index === 0) {
            return checked;
          }
          else {
            chapterIndex--;
          }
        }

        if (!current.checked) {
          return checked;
        }

        const chosen = {
          index: chapterIndex,
          hierarchy: chapterInfo[chapterIndex].hierarchy,
          title: chapterInfo[chapterIndex].title
        };
        return [...checked, chosen];
      }, []);

      let imageBlobs = [];

      if (
        this.instance.params.showCoverPage && this.checkboxes[0].checked
      ) {
        this.callbacks.onExportProgress({
          text: this.params.dictionary.get('l10n.processingCover')
        });

        const coverBlob = await this.getCover(type !== 'images');
        if (coverBlob) {
          // Sanitize name for file output
          const name = this.params.dictionary.get('l10n.coverPage')
            .replace(/[/\\?%*:|"<>]/g, '-')
            .toLowerCase();

          imageBlobs.push({
            title: null,
            name: `${name}.${coverBlob.type.split('/')[1]}`,
            blob: coverBlob
          });
        }
      }

      // Close cover and close menu
      this.instance.handleCoverRemoved({ skipFocus: true });
      if (this.instance.isMenuOpen()) {
        this.instance.toggleMenu();
      }

      for (let i = 0; i < chosenChapters.length; i++) {
        this.callbacks.onExportProgress({
          number: i + 1,
          of: chosenChapters.length
        });

        // Get screenshots
        const screenshots = await this.getScreenshots(
          chosenChapters[i].index,
          type !== 'images' // Enforce pixel for pdf/docx
        );

        if (!screenshots.length) {
          continue;
        }

        // Build objects, could be improved in non image export (title value used for layout)
        for (let j = 0; j < screenshots.length; j++) {
          imageBlobs.push({
            title: (j === 0) ? chosenChapters[i].title : null,
            name: `${chosenChapters[i].hierarchy}_${j}.${screenshots[j].type.split('/')[1]}`,
            blob: screenshots[j]
          });
        }
      }

      this.callbacks.onExportProgress({
        text: this.params.dictionary.get('l10n.creatingExportFile')
      });

      if (type === 'images') {
        Export.offerDownload({
          blob: await Export.createZip(imageBlobs),
          filename: `${ChapterChooser.FILENAME_PREFIX}-${Date.now()}.zip`
        });
      }
      else if (type === 'pdf') {
        Export.exportPDF({
          imageBlobs: imageBlobs,
          filename: `${ChapterChooser.FILENAME_PREFIX}-${Date.now()}.pdf`
        });
      }
      else if (type === 'docx') {
        Export.offerDownload({
          blob: await Export.createDOCX({ imageBlobs: imageBlobs }),
          filename: `${ChapterChooser.FILENAME_PREFIX}-${Date.now()}.docx`
        });
      }

      this.callbacks.onExportEnded();
    }, 0);
  }
}

/** @constant {string} Export file name prefix. */
ChapterChooser.FILENAME_PREFIX = 'H5P.Portfolio-Export';
