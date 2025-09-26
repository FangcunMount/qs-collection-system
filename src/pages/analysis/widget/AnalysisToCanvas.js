import { BaseCanvas } from "../../../util/canvasUtils";

class AnalysisToCanvas extends BaseCanvas {
  constructor() {
    super()
  }

  async initCanvas(canvasid) {
    await super.initCanvas(canvasid);
  }

  draw(total, factors) {
    this.ctx.fillStyle = "#fff";
    this.ctx.fillRect(0, 0, this.canvasEl.width, this.canvasEl.height);
    this.drawY = 0;
    this.drawTotal(total);
    this.drawFactors(factors);
    this.drawY += this.padding;

    return this.drawY;
  }

  drawTotal(total) {
    super.drawTitle(`${total.title}（${total.score}）`);
    super.drawContent(total.content);
  }

  drawFactors(factors) {
    factors.map(factor => {
      this.drawY += this.padding;
      super.drawTitle(factor.title);
      this.drawProgress(factor.score, factor.max_score)
      super.drawContent(factor.content);
    })
  }

  drawProgress(score, max) {
    this.ctx.font = `${this.contentStyle.fontSize}px sans-serif`;
    this.ctx.fillStyle = this.contentStyle.fontColor;
    this.ctx.fillText(`${score}/${max}`, this.padding + this.canvasWidth / 2 + 10 * this.dpr, this.drawY + this.progressStyle.padding + this.contentStyle.fontSize);
    super.drawProgress(score / max);
  }

  getCanvasHeight(total, factors) {
    const height = this.draw(total, factors)

    // 如果长度超了， 调整 dpr 调整清晰度重新渲染
    if (height > 4096) {
      this.dpr = 4096 / (height / this.dpr);
      return this.getCanvasHeight(total, factors)
    }

    this.canvasBaseSize = {
      width: this.canvasBaseSize.width,
      height: height / this.dpr
    }

    this.canvasEl.height = this.canvasHeight;
    this.canvasEl.width = this.canvasWidth;

    return height / this.dpr;
  }

  exportImage() {
    return new Promise((resolve, reject) => {
      super.exportImage()
        .then((result) => {
          resolve(result)
        }).catch((err) => {
          reject(err)
        });
    })
  }
}


export default AnalysisToCanvas