
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskItem } from "./TaskItem";
import { DailyTask } from "@/pages/DailyProgram";

interface DailyProgramSectionProps {
  title: string;
  tasks: DailyTask[];
  onUpdateTask: (task: DailyTask) => void;
  onDeleteTask: (taskId: string) => void;
}

export function DailyProgramSection({ 
  title, 
  tasks, 
  onUpdateTask, 
  onDeleteTask 
}: DailyProgramSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          {title}
          <span className="text-sm font-normal text-muted-foreground">
            {tasks.length} {tasks.length === 1 ? 'item' : 'items'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No {title.toLowerCase()} scheduled for this date
          </p>
        ) : (
          tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onUpdate={onUpdateTask}
              onDelete={onDeleteTask}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
