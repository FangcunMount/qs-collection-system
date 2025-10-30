import React, { useEffect, useState } from "react";
import { View, Button, Canvas } from "@tarojs/components";
import { AtModal, AtModalHeader, AtModalAction, AtModalContent } from "taro-ui";
import Taro from "@tarojs/taro";

import AnalysisToCanvas from "./AnalysisToCanvas";

const ExportImageDialog = ({ total, factors, flag, onClose }) => {
  const [canvasHeight, setCanvasHeight] = useState(269);
  const [analysisCanvas, setAnalysisCanvas] = useState(null);

  useEffect(() => {
    Taro.showLoading();
    Taro.nextTick(() => {
      const analysisToCanvas = new AnalysisToCanvas();
      analysisToCanvas.initCanvas("canvas").then(() => {
        setCanvasHeight(analysisToCanvas.getCanvasHeight(total, factors));
        analysisToCanvas.draw(total, factors);
        setAnalysisCanvas(analysisToCanvas);
        Taro.hideLoading();
      });
    });
  }, [total, factors]);

  const exportImage = () => {
    analysisCanvas
      .exportImage()
      .then(() => {
        Taro.showToast({ title: "保存成功，请前往相册查看", icon: "none" });
      })
      .catch(err => {
        Taro.showToast({ title: err, icon: "none" });
      });
    onClose();
  };

  return (
    <AtModal isOpened={flag} closeOnClickOverlay={false}>
      <AtModalHeader>导出解读报告</AtModalHeader>
      <AtModalContent className='s-row-center'>
        <View style={{ width: "100%", overflow: "auto" }}>
          <Canvas
            id='canvas'
            type='2d'
            style={{ width: "200%", height: `${canvasHeight}px` }}
          ></Canvas>
        </View>
      </AtModalContent>
      <AtModalAction>
        <Button onClick={onClose}>取消</Button>
        <Button onClick={exportImage}>保存到相册</Button>
      </AtModalAction>
    </AtModal>
  );
};

export default ExportImageDialog;
