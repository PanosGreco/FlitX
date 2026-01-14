import { useState, useEffect, useCallback } from "react";
import { StickyNote, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      toast.error(language === 'el' ? 'Σφάλμα δημιουργίας' : 'Error creating note');
    } else {
      toast.success(language === 'el' ? 'Σημείωση προστέθηκε' : 'Note added');
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
      toast.error(language === 'el' ? 'Σφάλμα ενημέρωσης' : 'Error updating note');
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
      toast.error(language === 'el' ? 'Σφάλμα διαγραφής' : 'Error deleting note');
    } else {
      toast.success(language === 'el' ? 'Σημείωση διαγράφηκε' : 'Note deleted');
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
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            {language === 'el' ? 'Σημειώσεις' : 'Notes'}
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Add new note */}
            {isAdding && (
              <div className="space-y-2 p-2 bg-muted/30 rounded-md">
                <Textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder={language === 'el' 
                    ? 'Γράψτε γρήγορες σημειώσεις εδώ για οτιδήποτε θέλετε να θυμάστε.'
                    : 'Write quick notes here for anything you want to remember.'}
                  rows={3}
                  className="text-sm resize-none"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setIsAdding(false);
                      setNewContent("");
                    }}
                  >
                    {language === 'el' ? 'Ακύρωση' : 'Cancel'}
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleAddNote}
                    disabled={isSaving || !newContent.trim()}
                  >
                    {isSaving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                    {language === 'el' ? 'Αποθήκευση' : 'Save'}
                  </Button>
                </div>
              </div>
            )}

            {/* Notes list */}
            {notes.length === 0 && !isAdding ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {language === 'el' 
                  ? 'Γράψτε γρήγορες σημειώσεις εδώ για οτιδήποτε θέλετε να θυμάστε.'
                  : 'Write quick notes here for anything you want to remember.'}
              </p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {notes.map((note) => (
                  <div 
                    key={note.id}
                    className={cn(
                      "group relative p-2 rounded-md border border-transparent hover:border-border hover:bg-muted/30 transition-colors"
                    )}
                  >
                    {editingId === note.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={3}
                          className="text-sm resize-none"
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={cancelEditing}>
                            {language === 'el' ? 'Ακύρωση' : 'Cancel'}
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => handleUpdateNote(note.id)}
                            disabled={isSaving}
                          >
                            {isSaving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                            {language === 'el' ? 'Αποθήκευση' : 'Save'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p 
                          className="text-sm whitespace-pre-wrap cursor-pointer"
                          onClick={() => startEditing(note)}
                        >
                          {note.content}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                          onClick={() => handleDeleteNote(note.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
