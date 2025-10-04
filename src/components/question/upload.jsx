import React from "react";
import Taro from "@tarojs/taro";
import { View, Image, Video } from "@tarojs/components";
import "taro-ui-fc/dist/styles/radio.less";
import "taro-ui-fc/dist/styles/input.less";

import ShowContainer from "./widget/showContainer";
import { getOSSSignature, saveUploadFile } from "../../services/api/oss";
import { isEmpty } from "lodash";

const FcText = props => {
  const { item, index, disabled } = props;
  const { onChangeValue } = props;

  const handleChooseMedia = async () => {
    if (disabled) return;

    try {
      const chooseRes = await WxChooseMedia(item.file_type);

      const tempFiles = chooseRes.tempFiles;
      await handleUploadMedia(tempFiles[0].tempFilePath, item.file_type);
    
    } catch (error) {
      Taro.showToast({ title: error, icon: "none" });
    }
  };

  const handleUploadMedia = async (filePath, type) => {
    const sceneType = "qs-collection-system";
    try {
      const res = await getOSSSignature(sceneType);

      const suffix = filePath.slice(filePath.lastIndexOf("."));
      const filename = Date.now() + suffix;
      const fileUrl = res.dir + filename;

      await WxUploadFile({
        host: res.host,
        filePath,
        ossInfo: {
          policy: res.policy,
          accessid: res.accessid,
          signature: res.signature,
          fileUrl
        }
      });

      const saveRes = await saveUploadFile({
        type,
        name: filePath.slice(filePath.lastIndexOf("/") + 1),
        pathname: fileUrl,
        scene_type: sceneType
      });

      onChangeValue(saveRes.url, index);
    } catch (error) {
      const errMsg = `上传失败！ ${typeof error === "string" ? error : ""}`;
      Taro.showToast({
        title: errMsg,
        icon: "none"
      });
      console.log(error);
    }
  };

  const WxChooseMedia = mediaType => {
    console.log(mediaType);
    return new Promise((resolve, reject) => {
      Taro.chooseMedia({
        count: 1,
        mediaType,
        sizeType: ["compressed"],
        sourceType: ["album", "camera"],
        success: function(res) {
          resolve(res);
        },
        fail: res => {
          if (res.errMsg === "chooseMedia:fail cancel") {
            reject("取消选择");
          } else {
            console.log("fail: ---------", res);
            reject(res.errMsg);
          }
        }
      });
    });
  };

  const WxUploadFile = ({ host, filePath, ossInfo }) => {
    return new Promise((resolve, reject) => {
      const { fileUrl, policy, accessid, signature } = ossInfo;
      const param = {
        key: fileUrl,
        policy: policy,
        OSSAccessKeyId: accessid,
        signature: signature,
        "x-oss-object-acl": "public-read",
        success_action_status: "200"
      };
      Taro.uploadFile({
        url: host, // 开发者服务器的URL。
        filePath: filePath,
        name: "file", // 必须填file。
        formData: param,
        success: res => {
          if (res.statusCode === 204 || res.statusCode === 200) {
            resolve(res.data);
          } else {
            reject(res.errMsg);
          }
        },
        fail: err => {
          reject(err.errMsg);
        }
      });
    });
  };

  const getPreviewElement = () => {
    if (item.file_type === "image") {
      return (
        <Image
          src={item.value}
          mode="heightFix"
          style={{
            height: 100,
            fontSize: 20,
            borderRadius: 8,
            border: "1px dashed #ccc"
          }}
          onClick={e => {
            e.stopPropagation();
            Taro.previewImage({
              urls: [item.value]
            });
          }}
        />
      );
    } else {
      return (
        <Video
          src={item.value}
          style={{
            width: 160,
            height: 100,
            fontSize: 20,
            borderRadius: 8,
            border: "1px dashed #ccc"
          }}
          onClick={e => e.stopPropagation()}
        />
      );
    }
  };

  const delMediaElement = () => {
    if (disabled) return null;
    return (
      <View
        style={{
          position: "absolute",
          right: 10,
          top: 0,
          color: "#ccc",
          fontSize: 20,
          zIndex: 50
        }}
        onClick={e => {
          e.stopPropagation();
          setTimeout(() => {
            onChangeValue("", index);
          }, 100);
        }}
      >
        ×
      </View>
    );
  };

  return (
    <ShowContainer
      title={item.title}
      tips={item.tips}
      index={index}
      required={item?.validate_rules?.required == "1"}
    >
      <View className="s-row">
        <View
          className="s-ml-md"
          style={{
            minWidth: 80,
            height: 100,
            fontSize: 20,
            borderRadius: 8,
            border: "1px dashed #ccc",
            color: "#ccc",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "relative"
          }}
          onClick={handleChooseMedia}
        >
          {!isEmpty(item.value) ? delMediaElement() : null}
          {isEmpty(item.value) ? "+" : getPreviewElement()}
        </View>
      </View>
    </ShowContainer>
  );
};

export default FcText;
