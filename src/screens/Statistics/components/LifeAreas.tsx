import { Text, View } from 'react-native';

import { GetLifeArea } from '../../common';

export default function LifeAreas({ areas }: { areas: string[] }) {
  return (
    <View className="flex-col">
      {areas.map((areaId) => {
        const area = GetLifeArea(areaId);
        if (!area) return null;

        const { Icon } = area;
        return (
          <View key={areaId} className="mt-3 flex-row items-center">
            <Icon size={24} color={area.accent} />
            <Text className="ml-2 text-base font-medium text-zinc-700 dark:text-zinc-200">{area.label}</Text>
          </View>
        );
      })}
    </View>
  );
}
