import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { LayoutChoice } from '@/components/map/layout-choice';
import { SetupPage } from '@/components/setup';
import { Button } from '@/components/ui';
import { countryHouse } from '@/data/garden-layouts';
import type { DrawnLayout } from '@/map/scenes';
import { spacing } from '@/theme';

export default function SetupModelScreen() {
  const [layout, setLayout] = useState<DrawnLayout>(countryHouse);

  return (
    <SetupPage
      step="Étape 1 sur 2"
      title="Votre maison"
      intro="Choisissez le dessin qui ressemble le plus à chez vous. Ce n'est pas un plan, juste le décor de vos espaces."
      footer={
        <Button
          title="Continuer"
          icon="arrow-forward"
          onPress={() => router.push({ pathname: '/setup/spaces', params: { layout } })}
        />
      }>
      <View style={{ paddingHorizontal: spacing.md }}>
        <LayoutChoice value={layout} onChange={setLayout} />
      </View>
    </SetupPage>
  );
}
