import React from "react";
import { Text, View } from "@tarojs/components";
import { AtIcon } from "taro-ui";

import FilterChip from "@/shared/ui/FilterChip";
import type { DomainTone } from "@/shared/ui/types";

import type { AssessmentRecordScaleOption } from "../../types";
import "./AssessmentRecordFilterBar.less";

export interface RecordTesteeOption {
  id: string;
  legalName?: string;
  name?: string;
  gender?: string | number;
  sex?: string | number;
  relationship?: string;
  relation?: string | number;
}

interface AssessmentRecordFilterBarProps {
  tone: DomainTone;
  testee?: RecordTesteeOption | null;
  testeeCount: number;
  statusFilter: string;
  scaleOptions?: AssessmentRecordScaleOption[];
  selectedScale?: AssessmentRecordScaleOption;
  onOpenTestee: () => void;
  onOpenScale?: () => void;
  onOpenAdvanced: () => void;
  onStatusChange: (status: string) => void;
}

const STATUS_TABS = [
  { key: "", label: "全部" },
  { key: "pending", label: "待解读" },
  { key: "done", label: "已出报告" },
  { key: "failed", label: "失败" },
];

const AssessmentRecordFilterBar = ({
  tone,
  testee,
  testeeCount,
  statusFilter,
  scaleOptions = [],
  selectedScale,
  onOpenTestee,
  onOpenScale,
  onOpenAdvanced,
  onStatusChange,
}: AssessmentRecordFilterBarProps) => (
  <View className="record-filter">
    <View className="record-filter__selectors">
      <View className="record-filter__selector-list">
        {testee && testeeCount > 1 ? (
          <View
            className="record-filter__selector"
            hoverClass="record-filter__selector--pressed"
            role="button"
            aria-label="选择受试者"
            onClick={onOpenTestee}
          >
            <Text className="record-filter__selector-label">受试者</Text>
            <Text className="record-filter__selector-value">
              {testee.legalName || testee.name || "未命名"}
            </Text>
            <Text className="record-filter__selector-arrow">▾</Text>
          </View>
        ) : null}
        {scaleOptions.length > 1 && onOpenScale ? (
          <View
            className="record-filter__selector"
            hoverClass="record-filter__selector--pressed"
            role="button"
            aria-label="选择量表"
            onClick={onOpenScale}
          >
            <Text className="record-filter__selector-label">量表</Text>
            <Text className="record-filter__selector-value">
              {selectedScale?.name || "全部量表"}
            </Text>
            <Text className="record-filter__selector-arrow">▾</Text>
          </View>
        ) : null}
      </View>
      <View
        className="record-filter__advanced"
        hoverClass="record-filter__advanced--pressed"
        role="button"
        aria-label="打开高级筛选"
        onClick={onOpenAdvanced}
      >
        <AtIcon value="filter" size="18" />
      </View>
    </View>
    <View className="record-filter__statuses">
      {STATUS_TABS.map((tab) => (
        <FilterChip
          key={tab.key || "all"}
          tone={tone}
          selected={statusFilter === tab.key}
          onClick={() => onStatusChange(tab.key)}
        >
          {tab.label}
        </FilterChip>
      ))}
    </View>
  </View>
);

export default AssessmentRecordFilterBar;
