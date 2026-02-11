import { useState, useEffect, useCallback, useRef } from "react";
import { format } from "date-fns";
import { BookOpen, CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function NotesWidget() {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchNote = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const { data, error } = await supabase
      .from('user_notes')
      .select('id, content')
      .eq('user_id', user.id)
      .eq('note_date', dateStr)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching note:', error);
    } else if (data) {
      setNoteId(data.id);
      setContent(data.content);
    } else {
      setNoteId(null);
      setContent("");
    }
    setIsEditing(false);
    setLoading(false);
  }, [user, selectedDate]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  const saveNote = useCallback(async (newContent: string) => {
    if (!user) return;
    setSaving(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    try {
      if (noteId) {
        const { error } = await supabase.from('user_notes').update({
          content: newContent
        }).eq('id', noteId);
        if (error) throw error;
      } else if (newContent.trim()) {
        const { data, error } = await supabase.from('user_notes').insert({
          user_id: user.id,
          content: newContent.trim(),
          note_date: dateStr
        }).select('id').single();
        if (error) throw error;
        if (data) setNoteId(data.id);
      }
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Error saving note');
    } finally {
      setSaving(false);
    }
  }, [user, noteId, selectedDate]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveNote(newContent);
    }, 1000);
  };

  const handleClick = () => {
    setIsEditing(true);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleBlur = () => {
    if (!content.trim()) {
      setIsEditing(false);
    }
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveNote(content);
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const showPlaceholder = !isEditing && !content.trim();

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-base font-semibold text-secondary-foreground">
            Notebook
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
                <CalendarIcon className="h-3 w-3 mr-1" />
                {format(selectedDate, 'dd/MM/yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div
          className={cn(
            "min-h-[100px] rounded-lg cursor-text transition-colors",
            showPlaceholder && "hover:bg-muted/50"
          )}
          onClick={handleClick}
        >
          {showPlaceholder ? (
            <p className="text-sm text-muted-foreground italic py-2">
              Take quick notes for {format(selectedDate, 'dd/MM/yyyy')}
            </p>
          ) : (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onBlur={handleBlur}
              className={cn(
                "w-full min-h-[100px] text-sm text-foreground bg-transparent resize-none border-0 p-0 focus:outline-none focus:ring-0",
                "placeholder:text-muted-foreground placeholder:italic"
              )}
              placeholder={`Write notes for ${format(selectedDate, 'dd/MM/yyyy')}`}
            />
          )}
        </div>
      )}
    </div>
  );
}
