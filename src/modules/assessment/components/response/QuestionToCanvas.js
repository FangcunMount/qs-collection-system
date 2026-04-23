import { BaseCanvas } from "../../lib/canvasUtils";

class QuestionToCanvas extends BaseCanvas {
  constructor() {
    super(
      {
        fontSize: 14,
        lineHeightAndFontSizeDiff: 4
      },
      {
        fontSize: 12,
        lineHeightAndFontSizeDiff: 4,
      }
    )
  }

  async initCanvas(canvasid) {
    await super.initCanvas(canvasid)
  }

  getQuestionDrawInfo(question) {
    let value = null;

    switch (question.type) {
      case "Radio":
        const radioOption = question.options.find(v => v.is_select == "1")
        value = radioOption ? radioOption.content : "未选择";
        break;
      case "Select":
        const selectOption = question.options.find(v => v.is_select == "1")
        value = selectOption ? selectOption.content : "未选择";
        break;
      case "ScoreRadio":
        const scoreRadioOption = question.options.find(v => v.is_select == "1")
        value = scoreRadioOption ? scoreRadioOption.content : "未选择";
        break;
      case "ImageRadio":
        const imageRadioOption = question.options.find(v => v.is_select == "1")
        value = imageRadioOption ? `图片-${imageRadioOption.content}` : "未选择";
        break;
      case "CheckBox":
        const checkBoxOptions = question.options.filter(v => v.is_select == "1");
        value = checkBoxOptions.length > 0 ? checkBoxOptions.map(o => o.content).join("、") : '未选择';
        break;
      case "ImageCheckBox":
        const imageCheckBoxOptions = question.options.filter(v => v.is_select == "1");
        value = imageCheckBoxOptions.length > 0 ? imageCheckBoxOptions.map(o => `图片-${o.content}`).join("、") : '未选择';
        break;
      case "Section":
        value = question.value;
        break;
      default:
        value = question.value ? question.value : '未填写';
        break;
    }

    return {
      title: question.title,
      tips: question.tips,
      value: value ? `答案：${value}` : ''
    };
  }

  drawQuestion(question) {
    const questionDrawInfo = this.getQuestionDrawInfo(question);

    super.drawTitle(questionDrawInfo.title);
    questionDrawInfo.tips && super.drawContent(questionDrawInfo.tips);
    questionDrawInfo.value && super.drawContent(questionDrawInfo.value);
  }

  draw(questions) {
    this.ctx.fillStyle = "#fff";
    this.ctx.fillRect(0, 0, this.canvasEl.width + 2 * this.dpr, this.canvasEl.height);
    this.drawY = this.padding;

    questions.map(v => {
      this.drawQuestion(v)
      this.drawY += 4 * this.dpr
    })

    this.drawY += this.padding;
    return this.drawY;
  }

  getCanvasHeight(questions) {
    const height = this.draw(questions);

    // 如果长度超了， 调整 dpr 调整清晰度重新渲染
    if (height > 4096) {
      this.dpr = 4096 / (height / this.dpr);
      return this.getCanvasHeight(questions)
    }

    this.canvasBaseSize = {
      width: this.canvasBaseSize.width,
      height: height / this.dpr
    }

    this.canvasEl.height = this.canvasHeight;
    this.canvasEl.width = this.canvasWidth;

    return height / this.dpr;
  }
}

export default QuestionToCanvas
