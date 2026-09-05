import React, { useState } from 'react';
import { Image, View } from '@tarojs/components';
import illustration from '@/pages/assessment/ai-explanation/assets/report-lens-v1.webp';

export default function AIExplanationIllustration({ size = 'hero' }: { size?: 'hero' | 'entry' | 'small' }) {
  const [failed, setFailed] = useState(false);
  return <View className={`ai-explanation__art ai-explanation__art--${size}`} aria-hidden="true">
    {!failed && <Image src={illustration} mode="aspectFit" className="ai-explanation__image" onError={() => setFailed(true)} />}
  </View>;
}
