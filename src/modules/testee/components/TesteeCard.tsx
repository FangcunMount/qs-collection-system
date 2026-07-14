import React from "react";
import { Text, View } from "@tarojs/components";

import ActionButton from "@/shared/ui/ActionButton";
import SurfaceCard from "@/shared/ui/SurfaceCard";
import type { Testee } from "@/store/testeeStore";
import { calculateTesteeAge, formatTesteeGender, formatTesteeIdType, formatTesteeRelation } from "../lib/testeeForm";

export interface TesteeCareContext {
  clinician_name?: string;
  relation_type?: string;
  entry_title?: string;
}

interface TesteeCardProps {
  testee: Testee;
  selected: boolean;
  careContext?: TesteeCareContext | null;
  onOpen: () => void;
  onSelect: () => void;
}

const TesteeCard = ({ testee, selected, careContext, onOpen, onSelect }: TesteeCardProps) => (
  <SurfaceCard interactive className="testee-card" onClick={onOpen}>
    <View className="testee-card__header">
      <View className="testee-card__avatar">{testee.gender === 1 ? "👦" : testee.gender === 2 ? "👧" : "👤"}</View>
      <View className="testee-card__identity">
        <View className="testee-card__name-row">
          <Text className="testee-card__name">{testee.legalName || "未命名"}</Text>
          {selected ? <Text className="testee-card__current">当前档案</Text> : null}
        </View>
        <Text className="testee-card__meta">
          {[formatTesteeGender(testee.gender), calculateTesteeAge(testee.dob), testee.relation ? formatTesteeRelation(testee.relation) : ""]
            .filter(Boolean).join(" · ")}
        </Text>
      </View>
      <Text className="testee-card__arrow">›</Text>
    </View>
    <View className="testee-card__details">
      {testee.dob ? <View className="testee-card__row"><Text>出生日期</Text><Text>{testee.dob}</Text></View> : null}
      {testee.idType && testee.idType !== "none" ? <View className="testee-card__row"><Text>证件类型</Text><Text>{formatTesteeIdType(testee.idType)}</Text></View> : null}
      {careContext?.clinician_name ? (
        <View className="testee-card__row"><Text>跟进人员</Text><Text>{careContext.clinician_name}{careContext.relation_type ? ` · ${careContext.relation_type}` : ""}</Text></View>
      ) : null}
      {careContext?.entry_title ? <View className="testee-card__row"><Text>入口来源</Text><Text>{careContext.entry_title}</Text></View> : null}
      {!selected ? (
        <ActionButton
          variant="secondary"
          tone="medical"
          className="testee-card__select"
          onClick={(event) => {
            (event as { stopPropagation?: () => void }).stopPropagation?.();
            onSelect();
          }}
        >
          设为当前档案
        </ActionButton>
      ) : null}
    </View>
  </SurfaceCard>
);

export default TesteeCard;
