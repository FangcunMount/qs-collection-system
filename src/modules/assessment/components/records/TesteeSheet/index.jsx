import React from "react";
import { View, Text, Image } from "@tarojs/components";
import { formatRelation } from "@/shared/lib/formatters";
import boyPng from "@/assets/images/boy.png";
import girlPng from "@/assets/images/girl.png";
import "./index.less";

/**
 * 受试者选择弹层组件
 */
const TesteeSheet = ({ 
  testeeList = [],
  selectedTesteeId = '',
  onSelectTestee
}) => {
  // 获取受试者头像（根据性别使用注册页面的头像图片）
  const getTesteeAvatar = (testee) => {
    const gender = testee.gender || testee.sex;
    if (gender === 1 || gender === '1') {
      return boyPng; // 男孩头像
    } else if (gender === 2 || gender === '2') {
      return girlPng; // 女孩头像
    }
    return boyPng; // 默认使用男孩头像
  };

  return (
    <View className="testee-sheet-content">
      <View className="testee-sheet-list">
        {testeeList && testeeList.length > 0 ? (
          testeeList.map((testee) => {
            const isSelected = selectedTesteeId === testee.id;
            return (
              <View
                key={testee.id}
                className={`testee-sheet-item ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectTestee && onSelectTestee(testee.id)}
              >
                <View className="testee-sheet-item-avatar">
                  <Image 
                    className="testee-sheet-item-avatar-image"
                    src={getTesteeAvatar(testee)}
                    mode="aspectFill"
                  />
                </View>
                <View className="testee-sheet-item-content">
                  <View className="testee-sheet-item-header">
                    <Text className="testee-sheet-item-name">
                      {testee.legalName || testee.name || '未命名'}
                    </Text>
                    {(testee.relationship || testee.relation) && (
                      <View className={`testee-sheet-item-tag ${isSelected ? 'tag-primary' : 'tag-secondary'}`}>
                        <Text className="testee-sheet-item-tag-text">
                          {testee.relationship || formatRelation(testee.relation)}
                        </Text>
                      </View>
                    )}
                  </View>
                  {testee.relation && (
                    <Text className="testee-sheet-item-relation">
                      {formatRelation(testee.relation)}
                    </Text>
                  )}
                </View>
                <View className={`testee-sheet-item-check ${isSelected ? 'checked' : 'unchecked'}`}>
                  {isSelected && (
                    <Text className="testee-sheet-item-check-icon">✓</Text>
                  )}
                </View>
              </View>
            );
          })
        ) : (
          <View className="testee-sheet-empty">
            <Text className="testee-sheet-empty-text">暂无档案</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default TesteeSheet;
