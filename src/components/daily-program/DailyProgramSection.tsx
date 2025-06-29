
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  // Sort tasks by scheduled time
  const sortedTasks = [...tasks].sort((a, b) => {
    return a.scheduledTime.localeCompare(b.scheduledTime);
  });

  return (
    <Card className="flex flex-col h-96">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="text-base flex items-center justify-between">
          {title}
          <span className="text-sm font-normal text-muted-foreground">
            {tasks.length} {tasks.length === 1 ? 'item' : 'items'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-3">
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No {title.toLowerCase()} scheduled for this date
          </p>
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-2 pr-2">
              {sortedTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onUpdate={onUpdateTask}
                  onDelete={onDeleteTask}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
