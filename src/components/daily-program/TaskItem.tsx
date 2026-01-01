import { useState } from "react";
import { Clock, Edit, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EditTaskDialog } from "./EditTaskDialog";
import { DailyTask } from "@/hooks/useDailyTasks";

interface TaskItemProps {
  task: DailyTask;
  onUpdate: (task: DailyTask) => void;
  onDelete: (taskId: string) => void;
}

export function TaskItem({ task, onUpdate, onDelete }: TaskItemProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggleComplete = async () => {
    setIsUpdating(true);
    await onUpdate({ ...task, completed: !task.completed });
    setIsUpdating(false);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'return': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'delivery': return 'bg-green-100 text-green-800 border-green-200';
      case 'other': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className={`border ${task.completed ? 'opacity-60 bg-muted/30' : ''}`}>
      <CardContent className="p-3">
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <Badge className={`${getTypeColor(task.type)} text-xs px-2 py-0.5`}>
                  {task.type.charAt(0).toUpperCase() + task.type.slice(1)}
                </Badge>
                {task.completed && (
                  <Badge variant="secondary" className="text-green-600 text-xs px-2 py-0.5">
                    <Check className="h-3 w-3 mr-1" />
                    Done
                  </Badge>
                )}
              </div>
              {task.vehicleName ? (
                <h4 className={`font-medium text-sm truncate ${task.completed ? 'line-through' : ''}`}>
                  {task.vehicleName}
                </h4>
              ) : (
                <h4 className={`font-medium text-sm text-muted-foreground ${task.completed ? 'line-through' : ''}`}>
                  General Task
                </h4>
              )}
            </div>
            <div className="flex space-x-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsEditDialogOpen(true)}
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => onDelete(task.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Time */}
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{task.scheduledTime}</span>
          </div>

          {/* Notes */}
          {task.notes && (
            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded line-clamp-2">
              {task.notes}
            </p>
          )}

          {/* Complete Button */}
          <div className="flex justify-end pt-1">
            <Button
              variant={task.completed ? "secondary" : "default"}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={handleToggleComplete}
              disabled={isUpdating}
            >
              {isUpdating ? '...' : task.completed ? "Reopen" : "Complete"}
            </Button>
          </div>
        </div>

        <EditTaskDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          task={task}
          onUpdate={onUpdate}
        />
      </CardContent>
    </Card>
  );
}
