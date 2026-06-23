import { ChevronRight } from 'lucide-react-native';
import { useState } from 'react';

import Card from './components/Card';
import SectionTitle from './components/SectionTitle';
import SettingsRow from './components/SettingsRow';
import { useTaskReminders } from './hooks/useTaskReminders';
import NotificationsModal from './NotificationsModal';

export default function NotificationsSection({ isDark }: { isDark: boolean }) {
  const { enabled, toggle } = useTaskReminders();
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <SectionTitle isDark={isDark}>Notificações</SectionTitle>
      <Card isDark={isDark}>
        <SettingsRow
          label="Lembretes de tarefas"
          description={enabled ? 'Ativados: avisos 10 min antes e no horário' : 'Desativados'}
          isDark={isDark}
          showDivider={false}
          onPress={() => setModalVisible(true)}
          trailing={<ChevronRight size={20} color={isDark ? '#a1a1aa' : '#71717a'} />}
        />
      </Card>

      <NotificationsModal visible={modalVisible} isDark={isDark} enabled={enabled} onChangeEnabled={toggle} onClose={() => setModalVisible(false)} />
    </>
  );
}
