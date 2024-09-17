import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import {
  Document, Paragraph, TextRun, Packer, ImageRun, HeadingLevel,
  convertMillimetersToTwip, PageOrientation
} from 'docx';

/** @constant {number} TOP_MARGIN_FACTOR Page margin factor. */
const TOP_MARGIN_FACTOR = 1.5;

/** @constant {number} PAGE_WIDTH_MM Page width in mm. */
const PAGE_WIDTH_MM = 210; // 210 is DinA4 width in mm

/** @constant {number} PAGE_HEIGHT_MM Page height in mm. */
const PAGE_HEIGHT_MM = 297; // 297 is DinA4 height in mm

/** @constant {number} PAGE_MARGIN_MM Default gap between elements in mm. */
const PAGE_MARGIN_MM = 10; // Default gap between elements in mm

/** @constant {number} PAGE_WIDTH_MAX_MM Max width in mm. */
// eslint-disable-next-line no-magic-numbers
const PAGE_WIDTH_MAX_MM = PAGE_WIDTH_MM - 2 * PAGE_MARGIN_MM;

/** @constant {number} PAGE_HEIGHT_MAX_MM Max width in mm. */
// eslint-disable-next-line no-magic-numbers
const PAGE_HEIGHT_MAX_MM = PAGE_HEIGHT_MM - 2 * PAGE_MARGIN_MM;

/** @constant {number} MM_EQUALS_PX Pixels that equal one mm */
const MM_EQUALS_PX = 3.7795275591;

/** @constant {number} IMAGE_GAP_MM Image gap in mm. */
const IMAGE_GAP_MM = 10;

/** @constant {number} URL_GENERATION_DELAY_MS URL generation delay in ms. */
const URL_GENERATION_DELAY_MS = 150;

export default class Export {

  /**
   * Export PDF.
   * @param {object} [params] Parameters.
   * @param {object[]} params.imageBlobs Imageblob data.
   * @param {string} params.filename Filename for export.
   * @param {AbortSignal} [abortSignal] Abort signal.
   */
  static exportPDF(params = {}, abortSignal) {
    if (abortSignal.aborted) {
      return;
    }

    abortSignal.addEventListener('abort', () => {
      return;
    });

    if (!Array.isArray(params.imageBlobs)) {
      return;
    }

    params.filename = params.filename ||
      `${H5P.createUUID()}-${Date.now()}.pdf`;

    const pdf = new jsPDF();

    let remainingHeightMM = PAGE_HEIGHT_MAX_MM;
    let hasPageImage = false;

    params.imageBlobs.forEach((entry, index) => {
      if (abortSignal.aborted) {
        return;
      }

      if (index > 0 && (entry.title || remainingHeightMM <= 0)) {
        pdf.addPage();
        remainingHeightMM = PAGE_HEIGHT_MAX_MM;
      }

      if (entry.title) {
        pdf.text(entry.title || entry.name, PAGE_MARGIN_MM, TOP_MARGIN_FACTOR * PAGE_MARGIN_MM);
        // Assuming text height = marginMM
        remainingHeightMM -= PAGE_MARGIN_MM;
      }

      const image = document.createElement('img');
      image.src = URL.createObjectURL(entry.blob);

      const imageSize = pdf.getImageProperties(image);
      const imageRatio = imageSize.width / imageSize.height;

      if (imageSize.height === 1 && imageSize.width === 1) {
        return; // Empty image, e.g. no content set
      }

      // Determine image size at full width
      let imageSizeScaled = {
        width: PAGE_WIDTH_MAX_MM,
        height: PAGE_WIDTH_MAX_MM / imageRatio
      };

      // Handle not enough space for image
      if (imageSizeScaled.height > remainingHeightMM) {

        // Not first image, so use new page
        if (hasPageImage) {
          pdf.addPage();
          remainingHeightMM = PAGE_HEIGHT_MAX_MM;
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
        PAGE_MARGIN_MM,
        PAGE_MARGIN_MM + PAGE_HEIGHT_MAX_MM - remainingHeightMM,
        imageSizeScaled.width,
        imageSizeScaled.height
      );
      hasPageImage = true;

      remainingHeightMM -= imageSizeScaled.height;
      remainingHeightMM -= IMAGE_GAP_MM; // gap between images
    });

    if (abortSignal.aborted) {
      return;
    }

    pdf.save(params.filename);
  }

  /**
   * Create ZIP blob.
   * @param {object} [params] Parameters.
   * @param {object[]} params.imageBlobs Imageblob data.
   * @param {string} params.filename Filename for export.
   * @param {AbortSignal} [abortSignal] Abort signal.
   * @returns {Blob} ZIP file blob.
   */
  static async createDOCX(params = {}, abortSignal) {
    if (abortSignal.aborted) {
      return;
    }

    abortSignal.addEventListener('abort', () => {
      return;
    });

    const sectionChildren = [];
    const imagePromises = [];

    for (let i = 0; i < params.imageBlobs.length; i++) {
      if (abortSignal.aborted) {
        return;
      }

      if (params.imageBlobs[i].title) {
        sectionChildren.push(new Paragraph({
          children: [new TextRun(params.imageBlobs[i].title)],
          heading: HeadingLevel.HEADING_1,
          pageBreakBefore: true,
          spacing: { after: convertMillimetersToTwip(PAGE_MARGIN_MM) }
        }));
      }

      imagePromises.push(Export.getImage(params.imageBlobs[i].blob));
    }

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const imageRatio = image.naturalWidth / image.naturalHeight;

      if (image.naturalWidth === 1 && image.naturalHeight === 1) {
        continue; // Empty image, e.g. no content set
      }

      // Determine image size at full width
      let imageSizeScaled = {
        width: PAGE_WIDTH_MAX_MM * MM_EQUALS_PX,
        height: PAGE_WIDTH_MAX_MM * MM_EQUALS_PX / imageRatio
      };

      // Handle not enough space for image
      if (
        imageSizeScaled.height > PAGE_HEIGHT_MAX_MM * MM_EQUALS_PX
      ) {
        imageSizeScaled = {
          width: PAGE_HEIGHT_MAX_MM * MM_EQUALS_PX * imageRatio,
          height: PAGE_HEIGHT_MAX_MM * MM_EQUALS_PX
        };
      }

      sectionChildren.push(new Paragraph({
        children: [new ImageRun({
          data: params.imageBlobs[i].blob,
          transformation: {
            width: imageSizeScaled.width,
            height: imageSizeScaled.height
          }
        })],
        spacing: { after: convertMillimetersToTwip(PAGE_MARGIN_MM) }
      }));
    }

    if (abortSignal.aborted) {
      return;
    }

    // Create document
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            size: {
              orientation: PageOrientation.PORTRAIT,
              height: convertMillimetersToTwip(PAGE_HEIGHT_MM),
              width: convertMillimetersToTwip(PAGE_WIDTH_MM)
            },
            margin: {
              top: convertMillimetersToTwip(PAGE_MARGIN_MM),
              right: convertMillimetersToTwip(PAGE_MARGIN_MM),
              bottom: convertMillimetersToTwip(PAGE_MARGIN_MM),
              left: convertMillimetersToTwip(PAGE_MARGIN_MM)
            },
          },
        },
        children: sectionChildren
      }]
    });

    if (abortSignal.aborted) {
      return;
    }

    return await Packer.toBlob(doc).then((blob) => {
      return blob;
    });
  }

  /**
   * Create ZIP blob.
   * @param {object[]} data File data.
   * @param {string} data[].name Filename.
   * @param {Blob} data[].blob Blob.
   * @param {AbortSignal} [abortSignal] Abort signal.
   * @returns {Blob} ZIP file blob.
   */
  static async createZip(data = [], abortSignal) {
    return await new Promise((resolve) => {
      if (abortSignal.aborted) {
        resolve(null);
      }

      abortSignal.addEventListener('abort', () => {
        resolve(null);
      });

      if (!Array.isArray(data)) {
        resolve(null);
      }

      // Sanitize data
      data = data
        .filter((entry) => entry.blob instanceof Blob)
        .map((entry) => {
          if (typeof entry.name !== 'string') {
            entry.name = `${H5P.createUUID()}.${entry.blob.type.split('/')[1]}`;
          }
          return entry;
        });

      if (!data.length) {
        resolve(null);
      }

      const zip = new JSZip();
      data.forEach((data) => {
        if (abortSignal.aborted) {
          resolve(null);
        }

        zip.file(data.name, data.blob);
      });

      if (abortSignal.aborted) {
        resolve(null);
      }

      zip.generateAsync({ type: 'blob' }).then((content) => {
        resolve(content);
      });
    });
  }

  /**
   * Get image from blob.
   * @param {Blob} imageBlob Image blob.
   * @returns {HTMLElement|null} Image element or null if error.
   */
  static async getImage(imageBlob) {
    return await new Promise((resolve, reject) => {
      const image = document.createElement('img');
      image.addEventListener('load', () => {
        resolve(image);
      });
      image.addEventListener('error', () => {
        reject(null);
      });
      image.src = URL.createObjectURL(imageBlob);
    });
  }

  /**
   * Offer blob for download.
   * @param {object} [params] Parameters.
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
      }, URL_GENERATION_DELAY_MS);
    };
    a.addEventListener('click', clickHandler, false);

    a.click();
  }
}
