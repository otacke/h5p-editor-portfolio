import html2canvas from 'html2canvas';

export default class Screenshot {

  /**
   * Take screenshot of DOM element.
   *
   * @param {object} params Parameters.
   * @param {HTMLElement} [params.element=document.body] Element to
   *   take screenshot from.
   * @returns {Blob} Image blob.
   */
  static async takeScreenshot(params = {}) {
    if (!params.element) {
      params.element = document.body; // Could have been null
    }

    const canvas = await html2canvas(params.element);

    return await new Promise(resolve => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', Screenshot.IMAGE_QUALITY);
    });
  }
}

/** @constant {number} Default image quality */
Screenshot.IMAGE_QUALITY = .9;
