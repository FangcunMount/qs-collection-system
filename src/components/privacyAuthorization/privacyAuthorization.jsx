/* eslint-disable no-undef */
import React, { useState, useEffect } from "react";
import { View, Button } from "@tarojs/components";
import "./privacyAuthorization.less";

let privacyHandler
let privacyResolves = new Set()
let closeOtherPagePopUpHooks = new Set()

if (wx.onNeedPrivacyAuthorization) {
    wx.onNeedPrivacyAuthorization(resolve => {
      if (typeof privacyHandler === 'function') {
        privacyHandler(resolve)
      }
    })
}

// 关闭其他页面的隐私弹窗
const closeOtherPagePopUp = (closePopUp) => {
    closeOtherPagePopUpHooks.forEach(hook => {
        if (closePopUp !== hook) {
            hook()
        }
    })
};

export const PrivacyAuthorization = () => {
    // 定义隐私协议弹窗的标题、描述等
    const [title] = useState("用户隐私保护提示");
    const [desc1] = useState("感谢您使用本产品，请您先阅井同意");
    const [urlTitle] = useState("《用户隐私保护指引》");
    const [desc2] = useState("当您点击同意并开始时用产品服务时，即表示你已理解并同息该条款内容，该条款将对您产生法律约束力。如您拒绝，将无法继续使用。");
   
    // 定义隐私协议弹窗的显示与隐藏
    let [hideDialog, setHideDialog] = useState(true);

    // 打开隐私协议
    const handleOpenPrivacyContract = () => {
        // 打开隐私协议页面
        wx.openPrivacyContract()
    };

    // 同意隐私协议
    const handleAgree = () => {
        // 用户同意后直接放行当前 pending 的隐私请求
        disPopUp();
        privacyResolves.forEach(resolve => {
            resolve({
                event: 'agree',
                buttonId: 'agree-btn'
            });
        });
        privacyResolves.clear();
    };

    // 不同意隐私协议
    const handleDisagree = () => {
        // 关闭隐私弹窗
        disPopUp()
       
        // 同时调用多个wx隐私接口时要如何处理：
        // 让隐私弹窗保持单例，点击一次同意按钮即可让所有pending中的wx隐私接口继续执行 
        privacyResolves.forEach(resolve => {
          resolve({
            event: 'disagree',
          })
        })
        privacyResolves.clear()
    };

    // 弹出隐私协议
    const popUp = () => {
        setHideDialog(false);
    };

    // 隐藏隐私协议
    const disPopUp = () => {
        setHideDialog(true);
    };

    // 监听页面显示
    useEffect(() => {        
        // 定义关闭隐私弹窗函数
        const closePopUp = () => {
            disPopUp()
        }

        // 定义隐私弹窗弹起的处理函数
        privacyHandler =  resolve => {
            console.log("------ in privacyHandler");

            // 保存resolve
            privacyResolves.add(resolve)

            // 隐私弹窗弹起
            popUp()
    
            // 额外逻辑：当前页面的隐私弹窗弹起的时候，关掉其他页面的隐私弹窗
            closeOtherPagePopUp(closePopUp)
        }

        // 关闭其他页面的隐私弹窗
        closeOtherPagePopUpHooks.add(closePopUp)

        return () => {
            closeOtherPagePopUpHooks.delete(closePopUp)
        }
    }, []);

    return (
        <>
            {
                hideDialog ? null : (
                    <View class="qs-xs-half-screen-dialog" hidden={hideDialog}>
                        <View class="qs-xs-half-screen-dialog-mask" ontap={handleDisagree}></View>
                        <View class="qs-xs-half-screen-dialog__hd">
                            <text class="qs-xs-half-screen-dialog__title">{ title }</text>
                        </View>
                        <View class="qs-xs-half-screen-dialog__bd">
                            <View class="qs-xs-half-screen-dialog__tips">{ desc1 }</View>
                            <View class="qs-xs-half-screen-dialog__tips privacy-contract-link"
                              onClick={handleOpenPrivacyContract}
                            >{ urlTitle }</View>
                            <View class="qs-xs-half-screen-dialog__tips">{ desc2 }</View>
                        </View>
                        <View class="qs-xs-half-screen-dialog__ft">
                        <View class="qs-xs-half-screen-dialog__btn-area">
                            <Button 
                              id="disagree-btn"
                              type="default"
                              class="qs-xs-btn btn-warning"
                              ontap={handleDisagree}
                            >不同意</Button>

                            <Button id="agree-btn"
                              type="primary"
                              class="qs-xs-btn btn-primary"
                              openType="agreePrivacyAuthorization"
                              onClick={handleAgree}
                            >同意</Button>


                        </View>
                        </View>
                    </View>    
                )
            }
        </>
    );
};

export const requestPrivacyAuthorization = () => {
    return new Promise((resolve, reject) => {
        if (!wx?.getPrivacySetting) {
            resolve();
            return;
        }

        wx.getPrivacySetting({
            success: res => {
                if (!res.needAuthorization) {
                    resolve(res);
                    return;
                }

                if (!wx?.requirePrivacyAuthorize) {
                    reject(new Error("当前微信版本不支持隐私授权"));
                    return;
                }

                wx.requirePrivacyAuthorize({
                    success: resolve,
                    fail: reject
                });
            },
            fail: reject
        });
    });
};
