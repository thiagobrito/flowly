import { View } from 'react-native';

import type { Task } from '../../NewTask/data';
import TaskCard from './TaskCard';
import TodayHeading from './TodayHeading';

type TaskSectionProps = {
  isDark: boolean;
  title: string;
  tasks: Task[];
  showDate?: boolean;
  date?: Date;
  sortLabel?: string | null;
  highlightFirst?: boolean;
  selected?: boolean;
  /** Sem tarefas, a seção some — exceto quando `forceShow`. */
  forceShow?: boolean;
  onComplete: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onDelete: (task: Task) => void;
};

export default function TaskSection({ isDark, title, tasks, showDate = false, date, sortLabel = null, highlightFirst = false, selected = false, forceShow = false, onComplete, onEdit, onDelete }: TaskSectionProps) {
  if (!forceShow && tasks.length === 0) return null;

  return (
    <View className="mb-5">
      <TodayHeading isDark={isDark} title={title} showDate={showDate} date={date} sortLabel={sortLabel} />
      {tasks.map((task, index) => (
        <TaskCard key={task.randomId} highlight={highlightFirst && index === 0} task={task} selected={selected} isDark={isDark} onComplete={() => onComplete(task)} onEdit={() => onEdit?.(task)} onDelete={() => onDelete(task)} />
      ))}
    </View>
  );
}
