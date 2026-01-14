import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Loader2, ChevronRight, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

interface Note {
  id: string;
  content: string;
  updated_at: string;
}

export function NotesWidget() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchNotes = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('user_notes')
      .select('id, content, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
    } else {
      setNotes(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleAddNote = async () => {
    if (!user || !newContent.trim()) return;
    setIsSaving(true);

    const { error } = await supabase
      .from('user_notes')
      .insert({
        user_id: user.id,
        content: newContent.trim()
      });

    if (error) {
      console.error('Error adding note:', error);
      toast.error('Error creating note');
    } else {
      toast.success('Note added');
      setNewContent("");
      setIsAdding(false);
      fetchNotes();
    }
    setIsSaving(false);
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editContent.trim()) return;
    setIsSaving(true);

    const { error } = await supabase
      .from('user_notes')
      .update({ content: editContent.trim() })
      .eq('id', noteId);

    if (error) {
      console.error('Error updating note:', error);
      toast.error('Error updating note');
    } else {
      setEditingId(null);
      fetchNotes();
    }
    setIsSaving(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    const { error } = await supabase
      .from('user_notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      console.error('Error deleting note:', error);
      toast.error('Error deleting note');
    } else {
      toast.success('Note deleted');
      fetchNotes();
    }
  };

  const startEditing = (note: Note) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditContent("");
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-slate-800">
          Prioritize
        </h3>
        <button 
          className="p-1 hover:bg-slate-100 rounded text-slate-400 transition-colors"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
        </div>
      ) : (
        <div className="space-y-1">
          {/* Add new note */}
          {isAdding && (
            <div className="space-y-2 p-2 bg-slate-50 rounded-lg mb-2">
              <Textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Write quick notes here for anything you want to remember."
                rows={2}
                className="text-sm resize-none border-slate-200"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={() => {
                    setIsAdding(false);
                    setNewContent("");
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  className="h-7 text-xs bg-teal-500 hover:bg-teal-600"
                  onClick={handleAddNote}
                  disabled={isSaving || !newContent.trim()}
                >
                  {isSaving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  Save
                </Button>
              </div>
            </div>
          )}

          {/* Notes list - styled like reference */}
          {notes.length === 0 && !isAdding ? (
            <p className="text-sm text-slate-400 text-center py-6">
              Write quick notes here for anything you want to remember.
            </p>
          ) : (
            notes.slice(0, 4).map((note) => (
              <div 
                key={note.id}
                className="group"
              >
                {editingId === note.id ? (
                  <div className="space-y-2 p-2 bg-slate-50 rounded-lg">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={2}
                      className="text-sm resize-none border-slate-200"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={cancelEditing}>
                        Cancel
                      </Button>
                      <Button 
                        size="sm" 
                        className="h-7 text-xs bg-teal-500 hover:bg-teal-600"
                        onClick={() => handleUpdateNote(note.id)}
                        disabled={isSaving}
                      >
                        {isSaving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="flex items-center gap-3 py-2.5 px-1 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                    onClick={() => startEditing(note)}
                  >
                    {/* Icon */}
                    <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                      <Circle className="h-3 w-3 text-teal-500 fill-teal-500" />
                    </div>
                    
                    {/* Title */}
                    <span className="flex-1 text-sm text-slate-700 truncate">
                      {note.content.split('\n')[0].substring(0, 30)}
                      {note.content.length > 30 && '...'}
                    </span>
                    
                    {/* Arrow */}
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-400 transition-colors" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
