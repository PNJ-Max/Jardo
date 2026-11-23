import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, Empty, screenStyles } from '@/components/ui';

/** Une adresse que l'app ne connaît pas, venue d'un lien ancien ou mal recopié : on ramène au jardin. */
export default function NotFoundScreen() {
  return (
    <View style={screenStyles.screen}>
      <Empty title="Cette page n'existe pas" hint="Le lien est peut-être ancien, ou mal recopié. Votre jardin, lui, n'a pas bougé.">
        <Button title="Retour au jardin" icon="home-outline" onPress={() => router.replace('/')} />
      </Empty>
    </View>
  );
}
