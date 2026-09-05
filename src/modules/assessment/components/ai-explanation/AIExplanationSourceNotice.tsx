import React from 'react';
import { Text, View } from '@tarojs/components';
import type { SourceState } from '@/services/api/aiExplanationApi';
import { aiSourceNotice } from '../../viewModels/aiExplanation';

export default function AIExplanationSourceNotice({ state }: { state: SourceState }) {
  return <View className={state === 'current' ? 'ai-explanation__caption' : 'ai-explanation__notice'}>
    <Text>{aiSourceNotice(state)}</Text>
  </View>;
}
