import Taro from "@tarojs/taro";

export function rectStyleAndPosition(x, y, w, h) {
  return { x, y, width: w, height: h };
}

export function drawRoundedRect(rect, radius, ctx, color) {
  const point = (x, y) => ({ x, y });
  const ptA = point(rect.x + radius, rect.y);
  const ptB = point(rect.x + rect.width, rect.y);
  const ptC = point(rect.x + rect.width, rect.y + rect.height);
  const ptD = point(rect.x, rect.y + rect.height);
  const ptE = point(rect.x, rect.y);

  ctx.beginPath();
  ctx.moveTo(ptA.x, ptA.y);
  ctx.arcTo(ptB.x, ptB.y, ptC.x, ptC.y, radius);
  ctx.arcTo(ptC.x, ptC.y, ptD.x, ptD.y, radius);
  ctx.arcTo(ptD.x, ptD.y, ptE.x, ptE.y, radius);
  ctx.arcTo(ptE.x, ptE.y, ptA.x, ptA.y, radius);

  if (color) {
    ctx.fillStyle = color;
    ctx.fill();
  }

  ctx.stroke();
}

export class BaseCanvas {
  constructor(title = {}, content = {}) {
    this.canvasEl = null;
    this.ctx = null;
    this.dpr = 1;
    this.canvasBaseSize = {
      width: 0,
      height: 0
    };

    this.drawY = 0;
    this._padding = 12;
    this._titleStyle = {
      fontSize: 16,
      lineHeightAndFontSizeDiff: 8,
      fontColor: "#000",
      ...title,
    };
    this._contentStyle = {
      fontSize: 14,
      lineHeightAndFontSizeDiff: 4,
      fontColor: "#333",
      ...content,
    };
    this._progressStyle = {
      padding: 4,
      height: 16,
      borderColor: "#eee",
      color: "#478de2",
    };
  }

  get titleStyle() {
    return {
      fontSize: this._titleStyle.fontSize * this.dpr,
      fontColor: this._titleStyle.fontColor,
      lineHeightAndFontSizeDiff: this._titleStyle.lineHeightAndFontSizeDiff,
      lineHeight: (this._titleStyle.fontSize + this._titleStyle.lineHeightAndFontSizeDiff) * this.dpr
    };
  }

  get contentStyle() {
    return {
      fontSize: this._contentStyle.fontSize * this.dpr,
      fontColor: this._contentStyle.fontColor,
      lineHeightAndFontSizeDiff: this._contentStyle.lineHeightAndFontSizeDiff,
      lineHeight: (this._contentStyle.fontSize + this._contentStyle.lineHeightAndFontSizeDiff) * this.dpr
    };
  }

  get progressStyle() {
    return {
      padding: this._progressStyle.padding * this.dpr,
      height: this._progressStyle.height * this.dpr,
      color: this._progressStyle.color,
      borderColor: this._progressStyle.borderColor,
    };
  }

  get canvasWidth() {
    return this.canvasBaseSize.width * this.dpr;
  }

  get canvasHeight() {
    return this.canvasBaseSize.height * this.dpr;
  }

  get padding() {
    return this._padding * this.dpr;
  }

  initCanvas(canvasId) {
    return new Promise((resolve) => {
      const query = Taro.createSelectorQuery();
      query.select(`#${canvasId}`).fields({ node: true, size: true }).exec((res) => {
        this.canvasEl = res[0].node;
        this.ctx = this.canvasEl.getContext("2d");
        this.dpr = Taro.getSystemInfoSync().pixelRatio;

        this.canvasBaseSize = { width: res[0].width, height: res[0].height };
        this.canvasEl.width = this.canvasWidth;
        this.canvasEl.height = this.canvasHeight;

        resolve();
      });
    });
  }

  drawProgress(progress) {
    this.ctx.fillStyle = this.progressStyle.borderColor;
    const borderRect = rectStyleAndPosition(
      this.padding,
      this.drawY + this.progressStyle.padding,
      this.canvasWidth / 2,
      this.progressStyle.height
    );
    drawRoundedRect(borderRect, this.progressStyle.height / 2, this.ctx);

    const contentRect = rectStyleAndPosition(
      this.padding,
      this.drawY + this.progressStyle.padding,
      (this.canvasWidth / 2) * progress,
      this.progressStyle.height
    );
    drawRoundedRect(contentRect, this.progressStyle.height / 2, this.ctx, this.progressStyle.color);

    this.drawY += this.progressStyle.height + this.progressStyle.padding * 2;
  }

  drawText(text, style) {
    this.drawY += style.lineHeight;
    this.ctx.fillText(text, this.padding, this.drawY - style.lineHeightAndFontSizeDiff);
  }

  drawParagraph(text, style) {
    const texts = [];
    let current = "";

    for (let i = 0; i < text.length; i += 1) {
      const nextChar = text[i];
      if (this.ctx.measureText(current + nextChar).width < this.canvasWidth - this.padding * 2) {
        current += nextChar;
        if (i === text.length - 1) {
          texts.push(current);
        }
      } else {
        texts.push(current);
        current = nextChar;
      }
    }

    texts.forEach((line) => {
      this.drawText(line, style);
    });
  }

  drawContent(content) {
    this.ctx.font = `${this.contentStyle.fontSize}px sans-serif`;
    this.ctx.fillStyle = this.contentStyle.fontColor;
    this.drawParagraph(content, this.contentStyle);
  }

  drawTitle(title) {
    this.ctx.font = `normal bold ${this.titleStyle.fontSize}px sans-serif`;
    this.ctx.fillStyle = this.titleStyle.fontColor;
    this.drawParagraph(title, this.titleStyle);
  }

  exportImage() {
    return new Promise((resolve, reject) => {
      const dataUrl = this.canvasEl.toDataURL("image/jpg");
      const base64Data = dataUrl.slice(22, dataUrl.length);
      const fs = Taro.getFileSystemManager();
      const path = `${Taro.env.USER_DATA_PATH}/temp.jpg`;

      try {
        fs.writeFileSync(path, base64Data, "base64");
        Taro.saveImageToPhotosAlbum({
          filePath: path,
          success(saveRes) {
            resolve(saveRes);
          },
          fail() {
            reject("保存到相册失败");
          }
        });
      } catch (error) {
        reject("导出图片出现了一些问题。");
      }
    });
  }
}

export default {
  BaseCanvas,
  rectStyleAndPosition,
  drawRoundedRect,
};
