import { useState, useEffect } from "react";
import { 
  FileText, 
  Upload, 
  Search, 
  X, 
  File, 
  Image as ImageIcon,
  Loader2,
  Trash2
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

interface VehicleDocument {
  id: string;
  name: string;
  file_path: string;
  file_type: string;
  uploaded_at: string;
  file_url?: string;
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
  
  const { toast } = useToast();
  const { user } = useAuth();
  const { language } = useLanguage();

  useEffect(() => {
    if (vehicleId && user) {
      fetchDocuments();
    }
  }, [vehicleId, user]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      
      // For now, we'll store documents in localStorage as a simple solution
      // In production, this should use Supabase Storage
      const storedDocs = localStorage.getItem(`vehicle_documents_${vehicleId}`);
      if (storedDocs) {
        setDocuments(JSON.parse(storedDocs));
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!documentName) {
        // Auto-fill document name from file name (without extension)
        setDocumentName(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentName.trim()) {
      toast({
        title: language === 'el' ? 'Σφάλμα' : 'Error',
        description: language === 'el' ? 'Παρακαλώ επιλέξτε αρχείο και όνομα' : 'Please select a file and enter a name',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    
    try {
      // Convert file to base64 for localStorage storage
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const newDoc: VehicleDocument = {
            id: crypto.randomUUID(),
            name: documentName.trim(),
            file_path: event.target.result.toString(),
            file_type: selectedFile.type,
            uploaded_at: new Date().toISOString(),
            file_url: event.target.result.toString(),
          };
          
          const updatedDocs = [...documents, newDoc];
          setDocuments(updatedDocs);
          localStorage.setItem(`vehicle_documents_${vehicleId}`, JSON.stringify(updatedDocs));
          
          toast({
            title: language === 'el' ? 'Επιτυχία' : 'Success',
            description: language === 'el' ? 'Το έγγραφο ανέβηκε επιτυχώς' : 'Document uploaded successfully',
          });
          
          setIsAddDialogOpen(false);
          setDocumentName("");
          setSelectedFile(null);
        }
      };
      reader.readAsDataURL(selectedFile);
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

  const handleDeleteDocument = (docId: string) => {
    const updatedDocs = documents.filter(d => d.id !== docId);
    setDocuments(updatedDocs);
    localStorage.setItem(`vehicle_documents_${vehicleId}`, JSON.stringify(updatedDocs));
    
    toast({
      title: language === 'el' ? 'Διαγράφηκε' : 'Deleted',
      description: language === 'el' ? 'Το έγγραφο διαγράφηκε' : 'Document deleted',
    });
  };

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isImageFile = (fileType: string) => fileType.startsWith('image/');

  const renderDocumentPreview = (doc: VehicleDocument) => {
    if (isImageFile(doc.file_type)) {
      return (
        <img 
          src={doc.file_url || doc.file_path} 
          alt={doc.name}
          className="w-full h-24 object-cover rounded-t-lg"
        />
      );
    }
    return (
      <div className="w-full h-24 bg-muted flex items-center justify-center rounded-t-lg">
        <FileText className="h-10 w-10 text-muted-foreground" />
      </div>
    );
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
                    onClick={() => setViewingDocument(doc)}
                  >
                    {renderDocumentPreview(doc)}
                    <div className="p-2">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDocument(doc.id);
                      }}
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
              <DialogTitle>{viewingDocument?.name}</DialogTitle>
            </DialogHeader>
            
            <div className="flex items-center justify-center py-4">
              {viewingDocument && isImageFile(viewingDocument.file_type) ? (
                <img 
                  src={viewingDocument.file_url || viewingDocument.file_path}
                  alt={viewingDocument.name}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              ) : viewingDocument?.file_type === 'application/pdf' ? (
                <iframe
                  src={viewingDocument.file_url || viewingDocument.file_path}
                  className="w-full h-[70vh]"
                  title={viewingDocument.name}
                />
              ) : (
                <div className="text-center py-8">
                  <FileText className="mx-auto mb-3 h-16 w-16 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {language === 'el' 
                      ? 'Η προεπισκόπηση δεν είναι διαθέσιμη για αυτόν τον τύπο αρχείου'
                      : 'Preview not available for this file type'}
                  </p>
                  <Button 
                    className="mt-4"
                    onClick={() => {
                      if (viewingDocument?.file_url) {
                        window.open(viewingDocument.file_url, '_blank');
                      }
                    }}
                  >
                    {language === 'el' ? 'Λήψη' : 'Download'}
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}