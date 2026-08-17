import { LinearGradient } from 'expo-linear-gradient';

import { BACKGROUND } from '@/lib/theme';

/** Fundo em gradiente padrão do Flowly (igual ao da Home/Subscription). */
export default function Background({ isDark }: { isDark: boolean }) {
  return <LinearGradient colors={isDark ? BACKGROUND.dark : BACKGROUND.light} locations={[0, 0.45, 1]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />;
}
