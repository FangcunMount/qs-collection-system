import React, { useEffect, useState } from "react";
import Taro from "@tarojs/taro";
import { View, Button, Canvas } from "@tarojs/components";
import { Dialog } from "@/shared/ui";

import QuestionToCanvas from "./QuestionToCanvas";

const ExportImageDialog = ({ questions, flag, onClose, onOk }) => {
  const [canvasHeight, setCanvasHeight] = useState(20);
  const [questionsCanvas, setQuestionsCanvas] = useState(null);

  useEffect(() => {
    Taro.showLoading();
    Taro.nextTick(() => {
      const analysisToCanvas = new QuestionToCanvas();
      analysisToCanvas.initCanvas("canvas").then(() => {
        setCanvasHeight(analysisToCanvas.getCanvasHeight(questions));
        Taro.nextTick(() => {
          analysisToCanvas.draw(questions);
          setQuestionsCanvas(analysisToCanvas);
          Taro.hideLoading();
        });
      });
    });
  }, [questions]);

  useEffect(() => {
    if (canvasHeight > 2048) {
      setCanvasHeight(2048);
    }
  }, [canvasHeight]);

  const exportImage = () => {
    questionsCanvas
      .exportImage()
      .then(() => {
        Taro.showToast({ title: "保存成功，请前往相册查看", icon: "none" });
        onOk();
      })
      .catch(err => {
        Taro.showToast({ title: String(err?.errmsg ?? err?.message ?? err ?? '保存失败'), icon: "none" });
      });
  };

  return (
    <Dialog
      open={flag}
      title="导出原始答卷"
      closeOnBackdrop={false}
      onClose={onClose}
      footer={(
        <>
          <Button onClick={onClose}>取消</Button>
          <Button onClick={exportImage}>保存到相册</Button>
        </>
      )}
    >
      <View className='s-row-center'>
        <View>
          <View style={{ textAlign: "center", width: "100%", color: "#999" }}>
            预览不影响导出效果
          </View>
          <Canvas
            id='canvas'
            type='2d'
            style={{
              width: "200%",
              height: `${canvasHeight}px`
            }}
          ></Canvas>
        </View>
      </View>
    </Dialog>
  );
};

export default ExportImageDialog;
