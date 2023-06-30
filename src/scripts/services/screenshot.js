import html2canvas from 'html2canvas';

export default class Screenshot {

  /**
   * Take screenshot of DOM element.
   * @param {object} params Parameters.
   * @param {HTMLElement} [params.element] Element to
   *   take screenshot from.
   * @param {boolean} [params.enforceImage] If true, always return some image.
   * @returns {Blob} Image blob.
   */
  static async takeScreenshot(params = {}) {
    if (!params.element) {
      params.element = document.body; // Could have been null
    }

    const canvas = await html2canvas(params.element);
    if (params.enforceImage &&
      canvas.getAttribute('height') === '0' ||
      canvas.getAttribute('width') === '0'
    ) {
      canvas.setAttribute('height', '1');
      canvas.setAttribute('width', '1');
    }

    return await new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png');
    });
  }
}
