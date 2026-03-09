import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TaskItem } from "./TaskItem";
import { DailyTask } from "@/hooks/useDailyTasks";
import { useTranslation } from "react-i18next";

interface DailyProgramSectionProps { title: string; tasks: DailyTask[]; onUpdateTask: (task: DailyTask) => void; onDeleteTask: (taskId: string) => void; }

const VISIBLE_TASKS_COUNT = 4;
const TASKS_PER_PAGE = 10;

export function DailyProgramSection({ title, tasks, onUpdateTask, onDeleteTask }: DailyProgramSectionProps) {
  const { t } = useTranslation(['dailyProgram', 'common']);
  const [isViewAllOpen, setIsViewAllOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return a.scheduledTime.localeCompare(b.scheduledTime);
  });

  const visibleTasks = sortedTasks.slice(0, VISIBLE_TASKS_COUNT);
  const hasMoreTasks = sortedTasks.length > VISIBLE_TASKS_COUNT;
  const totalPages = Math.ceil(sortedTasks.length / TASKS_PER_PAGE);
  const paginatedTasks = sortedTasks.slice((currentPage - 1) * TASKS_PER_PAGE, currentPage * TASKS_PER_PAGE);

  return (
    <>
      <Card className="flex flex-col h-auto min-h-[200px]">
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle className="text-base flex items-center justify-center">
            <span className="text-center flex-1">{title}</span>
            <span className="text-sm font-normal text-muted-foreground ml-2">{tasks.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-3 pt-0">
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t('dailyProgram:noScheduled', { title: title.toLowerCase() })}</p>
          ) : (
            <div className="space-y-2">
              {visibleTasks.map((task) => (<TaskItem key={task.id} task={task} onUpdate={onUpdateTask} onDelete={onDeleteTask} />))}
              {hasMoreTasks && (
                <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-foreground" onClick={() => { setCurrentPage(1); setIsViewAllOpen(true); }}>
                  <ChevronDown className="h-4 w-4 mr-1" />{t('dailyProgram:viewAll', { count: sortedTasks.length })}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={isViewAllOpen} onOpenChange={setIsViewAllOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
          <DialogHeader><DialogTitle className="text-center">{title} ({sortedTasks.length} {t('dailyProgram:tasks')})</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-2 pr-4">{paginatedTasks.map((task) => (<TaskItem key={task.id} task={task} onUpdate={onUpdateTask} onDelete={onDeleteTask} />))}</div>
          </ScrollArea>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4 border-t">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronUp className="h-4 w-4 rotate-[-90deg]" />{t('common:previous')}
              </Button>
              <span className="text-sm text-muted-foreground px-2">{t('common:page')} {currentPage} {t('common:of')} {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                {t('common:next')}<ChevronUp className="h-4 w-4 rotate-90" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
