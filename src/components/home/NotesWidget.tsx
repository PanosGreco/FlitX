import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
export function NotesWidget() {
  const {
    user
  } = useAuth();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fetchNote = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const {
      data,
      error
    } = await supabase.from('user_notes').select('id, content').eq('user_id', user.id).order('updated_at', {
      ascending: false
    }).limit(1).single();
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching note:', error);
    } else if (data) {
      setNoteId(data.id);
      setContent(data.content);
    }
    setLoading(false);
  }, [user]);
  useEffect(() => {
    fetchNote();
  }, [fetchNote]);
  const saveNote = useCallback(async (newContent: string) => {
    if (!user) return;
    setSaving(true);
    try {
      if (noteId) {
        // Update existing note
        const {
          error
        } = await supabase.from('user_notes').update({
          content: newContent
        }).eq('id', noteId);
        if (error) throw error;
      } else if (newContent.trim()) {
        // Create new note
        const {
          data,
          error
        } = await supabase.from('user_notes').insert({
          user_id: user.id,
          content: newContent.trim()
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
  }, [user, noteId]);
  const handleContentChange = (newContent: string) => {
    setContent(newContent);

    // Debounced auto-save
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
    // Save immediately on blur
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveNote(content);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);
  const showPlaceholder = !isEditing && !content.trim();
  return <div className="bg-white rounded-xl p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-slate-800">
          Notebook
        </h3>
        {saving && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
      </div>

      {/* Content */}
      {loading ? <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
        </div> : <div className={cn("min-h-[100px] rounded-lg cursor-text transition-colors", showPlaceholder && "hover:bg-slate-50")} onClick={handleClick}>
          {showPlaceholder ? <p className="text-sm text-slate-400 italic py-2">
              Take quick notes for anything you want to remember
            </p> : <textarea ref={textareaRef} value={content} onChange={e => handleContentChange(e.target.value)} onBlur={handleBlur} className={cn("w-full min-h-[100px] text-sm text-slate-700 bg-transparent resize-none border-0 p-0 focus:outline-none focus:ring-0", "placeholder:text-slate-400 placeholder:italic")} placeholder="Write quick notes for anything you want to remember" />}
        </div>}
    </div>;
}