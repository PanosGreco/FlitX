import { useState, useEffect } from "react";
import { 
  FileText, 
  Upload, 
  Search, 
  Loader2,
  Trash2,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { validateFileSize, compressImage } from "@/utils/imageUtils";

interface VehicleDocument {
  id: string;
  name: string;
  file_path: string;
  file_type: string;
  file_size: number | null;
  created_at: string;
}

interface VehicleDocumentsProps {
  vehicleId: string;
}

export function VehicleDocuments({ vehicleId }: VehicleDocumentsProps) {
  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [documentName, setDocumentName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewingDocument, setViewingDocument] = useState<VehicleDocument | null>(null);
  const [viewingUrl, setViewingUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const { language } = useLanguage();

  useEffect(() => {
    if (vehicleId && user) {
      fetchDocuments();
    }
  }, [vehicleId, user]);

  // Clean up viewing URL when dialog closes
  useEffect(() => {
    if (!viewingDocument) {
      setViewingUrl(null);
    }
  }, [viewingDocument]);

  const fetchDocuments = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('vehicle_documents')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching documents:", error);
        toast({
          title: language === 'el' ? 'Σφάλμα' : 'Error',
          description: language === 'el' ? 'Αποτυχία φόρτωσης εγγράφων' : 'Failed to load documents',
          variant: 'destructive',
        });
        return;
      }

      setDocuments(data || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      const sizeCheck = validateFileSize(file);
      if (!sizeCheck.valid) {
        toast({
          title: language === 'el' ? 'Αρχείο πολύ μεγάλο' : 'File too large',
          description: sizeCheck.message,
          variant: 'destructive',
        });
        return;
      }

      const processed = await compressImage(file);
      setSelectedFile(processed);
      if (!documentName) {
        setDocumentName(processed.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentName.trim() || !user) {
      toast({
        title: language === 'el' ? 'Σφάλμα' : 'Error',
        description: language === 'el' ? 'Παρακαλώ επιλέξτε αρχείο και όνομα' : 'Please select a file and enter a name',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    
    try {
      // Sanitize filename components to prevent path traversal
      const rawExt = selectedFile.name.split('.').pop() || '';
      const fileExt = rawExt.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
      const timestamp = Date.now();
      const safeName = documentName.trim()
        .replace(/\.\./g, '') // Remove path traversal sequences
        .replace(/[\/\\]/g, '') // Remove path separators
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .substring(0, 100);
      const filePath = `${user.id}/${vehicleId}/${timestamp}_${safeName}.${fileExt}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('vehicle-documents')
        .upload(filePath, selectedFile);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      // Save document metadata to database
      const { error: dbError } = await supabase
        .from('vehicle_documents')
        .insert({
          user_id: user.id,
          vehicle_id: vehicleId,
          name: documentName.trim(),
          file_path: filePath,
          file_type: selectedFile.type,
          file_size: selectedFile.size,
        });

      if (dbError) {
        // If database insert fails, try to clean up the uploaded file
        await supabase.storage.from('vehicle-documents').remove([filePath]);
        throw dbError;
      }

      toast({
        title: language === 'el' ? 'Επιτυχία' : 'Success',
        description: language === 'el' ? 'Το έγγραφο ανέβηκε επιτυχώς' : 'Document uploaded successfully',
      });

      // Refresh documents list
      await fetchDocuments();
      
      setIsAddDialogOpen(false);
      setDocumentName("");
      setSelectedFile(null);
    } catch (error) {
      console.error("Error uploading document:", error);
      toast({
        title: language === 'el' ? 'Σφάλμα' : 'Error',
        description: language === 'el' ? 'Αποτυχία ανεβάσματος εγγράφου' : 'Failed to upload document',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (doc: VehicleDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('vehicle-documents')
        .remove([doc.file_path]);

      if (storageError) {
        console.error("Storage delete error:", storageError);
        // Continue to try database delete even if storage fails
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('vehicle_documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) {
        throw dbError;
      }

      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      
      toast({
        title: language === 'el' ? 'Διαγράφηκε' : 'Deleted',
        description: language === 'el' ? 'Το έγγραφο διαγράφηκε' : 'Document deleted',
      });
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        title: language === 'el' ? 'Σφάλμα' : 'Error',
        description: language === 'el' ? 'Αποτυχία διαγραφής εγγράφου' : 'Failed to delete document',
        variant: 'destructive',
      });
    }
  };

  const handleViewDocument = async (doc: VehicleDocument) => {
    setViewingDocument(doc);
    setLoadingUrl(true);
    
    try {
      // Generate a short-lived signed URL (expires in 1 hour)
      const { data, error } = await supabase.storage
        .from('vehicle-documents')
        .createSignedUrl(doc.file_path, 3600); // 1 hour expiry

      if (error) {
        throw error;
      }

      setViewingUrl(data.signedUrl);
    } catch (error) {
      console.error("Error getting signed URL:", error);
      toast({
        title: language === 'el' ? 'Σφάλμα' : 'Error',
        description: language === 'el' ? 'Αποτυχία φόρτωσης εγγράφου' : 'Failed to load document',
        variant: 'destructive',
      });
      setViewingDocument(null);
    } finally {
      setLoadingUrl(false);
    }
  };

  const handleDownload = async () => {
    if (!viewingDocument || !viewingUrl) return;

    try {
      const response = await fetch(viewingUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = viewingDocument.name + '.' + viewingDocument.file_path.split('.').pop();
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: language === 'el' ? 'Σφάλμα' : 'Error',
        description: language === 'el' ? 'Αποτυχία λήψης αρχείου' : 'Failed to download file',
        variant: 'destructive',
      });
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isImageFile = (fileType: string) => fileType.startsWith('image/');

  const renderDocumentPreview = (doc: VehicleDocument) => {
    // For list view, we don't show actual image previews to avoid generating URLs unnecessarily
    // Instead, we show icons based on file type
    if (isImageFile(doc.file_type)) {
      return (
        <div className="w-full h-24 bg-muted flex items-center justify-center rounded-t-lg">
          <FileText className="h-10 w-10 text-muted-foreground" />
        </div>
      );
    }
    return (
      <div className="w-full h-24 bg-muted flex items-center justify-center rounded-t-lg">
        <FileText className="h-10 w-10 text-muted-foreground" />
      </div>
    );
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          {language === 'el' ? 'Έγγραφα' : 'Documents'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Explanation text */}
          <p className="text-sm text-muted-foreground">
            {language === 'el' 
              ? 'Εδώ μπορείτε να ανεβάσετε και να αποθηκεύσετε όλα τα έγγραφα που σχετίζονται με αυτό το όχημα (ασφάλεια, εγγραφή, συμβόλαια κ.λπ.).'
              : 'Here you can upload and store all documents related to this vehicle (insurance, registration, contracts, etc.).'}
          </p>

          {/* Search and Add Button */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={language === 'el' ? 'Αναζήτηση εγγράφων...' : 'Search documents...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              {language === 'el' ? 'Προσθήκη' : 'Add New'}
            </Button>
          </div>

          {/* Documents Grid */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
              <p>
                {searchQuery 
                  ? (language === 'el' ? 'Δεν βρέθηκαν έγγραφα' : 'No documents found')
                  : (language === 'el' ? 'Δεν υπάρχουν έγγραφα ακόμα' : 'No documents yet')}
              </p>
            </div>
          ) : (
            <ScrollArea className={filteredDocuments.length > 6 ? "h-[400px]" : ""}>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredDocuments.map(doc => (
                  <div 
                    key={doc.id}
                    className="group relative border rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleViewDocument(doc)}
                  >
                    {renderDocumentPreview(doc)}
                    <div className="p-2">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString()}
                        {doc.file_size && ` • ${formatFileSize(doc.file_size)}`}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleDeleteDocument(doc, e)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Add Document Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {language === 'el' ? 'Προσθήκη Εγγράφου' : 'Add New Document'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{language === 'el' ? 'Επιλογή Αρχείου' : 'Select File'}</Label>
                <div className="flex items-center gap-2">
                  <label 
                    htmlFor="document-upload" 
                    className="flex items-center px-4 py-2 border rounded-md bg-background hover:bg-accent cursor-pointer"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {selectedFile ? selectedFile.name : (language === 'el' ? 'Επιλέξτε αρχείο' : 'Choose file')}
                    <input
                      id="document-upload"
                      type="file"
                      className="hidden"
                      onChange={handleFileSelect}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="doc-name">
                  {language === 'el' ? 'Όνομα Εγγράφου' : 'Document Name'}
                </Label>
                <Input
                  id="doc-name"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  placeholder={language === 'el' ? 'π.χ. Ασφάλεια 2024' : 'e.g., Insurance 2024'}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsAddDialogOpen(false);
                setDocumentName("");
                setSelectedFile(null);
              }}>
                {language === 'el' ? 'Ακύρωση' : 'Cancel'}
              </Button>
              <Button onClick={handleUpload} disabled={uploading || !selectedFile}>
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {language === 'el' ? 'Ανέβασμα...' : 'Uploading...'}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {language === 'el' ? 'Ανέβασμα' : 'Upload'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Document Dialog */}
        <Dialog open={!!viewingDocument} onOpenChange={() => setViewingDocument(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{viewingDocument?.name}</span>
                {viewingUrl && (
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    {language === 'el' ? 'Λήψη' : 'Download'}
                  </Button>
                )}
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex items-center justify-center py-4">
              {loadingUrl ? (
                <div className="flex flex-col items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {language === 'el' ? 'Φόρτωση...' : 'Loading...'}
                  </p>
                </div>
              ) : viewingDocument && viewingUrl && isImageFile(viewingDocument.file_type) ? (
                <img 
                  src={viewingUrl}
                  alt={viewingDocument.name}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              ) : viewingDocument?.file_type === 'application/pdf' && viewingUrl ? (
                <iframe
                  src={viewingUrl}
                  className="w-full h-[70vh]"
                  title={viewingDocument.name}
                />
              ) : viewingUrl ? (
                <div className="text-center py-8">
                  <FileText className="mx-auto mb-3 h-16 w-16 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {language === 'el' 
                      ? 'Η προεπισκόπηση δεν είναι διαθέσιμη για αυτόν τον τύπο αρχείου'
                      : 'Preview not available for this file type'}
                  </p>
                  <Button 
                    className="mt-4"
                    onClick={handleDownload}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {language === 'el' ? 'Λήψη' : 'Download'}
                  </Button>
                </div>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
