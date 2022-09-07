import JSZip from 'jszip';
import { jsPDF } from 'jspdf';

export default class Export {

  /**
   * Export PDF.
   *
   * @param {object} [params={}] Parameters.
   * @param {object[]} params.imageBlobs Imageblob data.
   * @param {string} params.filename Filename for export.
   */
  static exportPDF(params = {}) {
    if (!Array.isArray(params.imageBlobs)) {
      return;
    }

    params.filename = params.filename ||
      `${H5P.createUUID()}-${Date.now()}.pdf`;

    const marginMM = 10; // Margin

    const pageWidthMM = 210; // 210 is DinA4 width in mm
    const pageHeightMM = 297; // 297 is DinA4 height in mm

    const widthMaxMM = pageWidthMM - 2 * marginMM;
    const heightMaxMM = pageHeightMM - 2 * marginMM;

    const pdf = new jsPDF();

    let remainingHeightMM = heightMaxMM;
    let hasPageImage = false;

    params.imageBlobs.forEach((entry, index) => {
      if (index > 0 && (entry.title || remainingHeightMM <= 0)) {
        pdf.addPage();
        remainingHeightMM = heightMaxMM;
      }

      if (entry.title) {
        pdf.text(entry.title || entry.name, marginMM, 1.5 * marginMM);
        remainingHeightMM -= marginMM; // Assuming text height = marginMM
      }

      const image = document.createElement('img');
      image.src = URL.createObjectURL(entry.blob);

      const imageSize = pdf.getImageProperties(image);
      const imageRatio = imageSize.width / imageSize.height;

      // Determine image size at full width
      let imageSizeScaled = {
        width: widthMaxMM,
        height: widthMaxMM / imageRatio
      };

      // Handle not enough space for image
      if (imageSizeScaled.height > remainingHeightMM) {

        // Not first image, so use new page
        if (hasPageImage) {
          pdf.addPage();
          remainingHeightMM = heightMaxMM;
          hasPageImage = false;

          if (imageSizeScaled.height > remainingHeightMM) {
            imageSizeScaled = {
              width: remainingHeightMM * imageRatio,
              height: remainingHeightMM
            };
          }
        }
        else {
          imageSizeScaled = {
            width: remainingHeightMM * imageRatio,
            height: remainingHeightMM
          };
        }
      }

      pdf.addImage(
        image, 'JPEG',
        marginMM, marginMM + heightMaxMM - remainingHeightMM,
        imageSizeScaled.width, imageSizeScaled.height
      );
      hasPageImage = true;

      remainingHeightMM -= imageSizeScaled.height;
      remainingHeightMM -= 10; // gap between images
    });

    pdf.save(params.filename);
  }

  /**
   * Create ZIP blob.
   *
   * @param {object[]} data File data.
   * @returns {Blob} ZIP file blob.
   */
  static async createZip(data = []) {
    return await new Promise(resolve => {
      if (!Array.isArray(data)) {
        resolve(null);
      }

      // Sanitize data
      data = data
        .filter(entry => entry.blob instanceof Blob)
        .map(entry => {
          if (typeof entry.name !== 'string') {
            entry.name = `${H5P.createUUID()}.${entry.blob.type.split('/')[1]}`;
          }
          return entry;
        });

      if (!data.length) {
        resolve(null);
      }

      const zip = new JSZip();
      data.forEach(data => {
        zip.file(data.name, data.blob);
      });

      zip.generateAsync({ type: 'blob' }).then(content => {
        resolve(content);
      });
    });
  }

  /**
   * Offer blob for download.
   *
   * @param {object} [params={}] Parameters.
   * @param {Blob} params.blob Blob.
   * @param {string} [params.filename] Filename.
   */
  static offerDownload(params = {}) {
    if (!params.blob) {
      return;
    }

    if (!params.filename) {
      params.filename = Date.now().toString();
    }

    const url = URL.createObjectURL(params.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = params.filename;

    const clickHandler = () => {
      setTimeout(() => {
        URL.revokeObjectURL(url);
        a.removeEventListener('click', clickHandler);
      }, 150);
    };
    a.addEventListener('click', clickHandler, false);

    a.click();
  }
}
