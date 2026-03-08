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
import { useTranslation } from "react-i18next";
import { validateFileSize, compressImage } from "@/utils/imageUtils";
import { FilePreviewModal } from "@/components/shared/FilePreviewModal";

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
  const { t } = useTranslation(['fleet', 'common']);

  useEffect(() => {
    if (vehicleId && user) {
      fetchDocuments();
    }
  }, [vehicleId, user]);

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
        toast({ title: t('common:error'), description: t('fleet:documentLoadFailed'), variant: 'destructive' });
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
        toast({ title: t('common:fileTooLarge'), description: sizeCheck.message, variant: 'destructive' });
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
      toast({ title: t('common:error'), description: t('fleet:selectFileAndName'), variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const rawExt = selectedFile.name.split('.').pop() || '';
      const fileExt = rawExt.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
      const timestamp = Date.now();
      const safeName = documentName.trim().replace(/\.\./g, '').replace(/[\/\\]/g, '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);
      const filePath = `${user.id}/${vehicleId}/${timestamp}_${safeName}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('vehicle-documents').upload(filePath, selectedFile, { contentType: selectedFile.type });
      if (uploadError) { console.error("Upload error:", uploadError); throw uploadError; }

      const { error: dbError } = await supabase.from('vehicle_documents').insert({
        user_id: user.id, vehicle_id: vehicleId, name: documentName.trim(),
        file_path: filePath, file_type: selectedFile.type, file_size: selectedFile.size,
      });
      if (dbError) {
        await supabase.storage.from('vehicle-documents').remove([filePath]);
        throw dbError;
      }

      toast({ title: t('common:success'), description: t('fleet:documentUploadSuccess') });
      await fetchDocuments();
      setIsAddDialogOpen(false);
      setDocumentName("");
      setSelectedFile(null);
    } catch (error) {
      console.error("Error uploading document:", error);
      toast({ title: t('common:error'), description: t('fleet:documentUploadFailed'), variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (doc: VehicleDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error: storageError } = await supabase.storage.from('vehicle-documents').remove([doc.file_path]);
      if (storageError) console.error("Storage delete error:", storageError);
      const { error: dbError } = await supabase.from('vehicle_documents').delete().eq('id', doc.id);
      if (dbError) throw dbError;
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      toast({ title: t('common:deleted'), description: t('fleet:documentDeleted') });
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({ title: t('common:error'), description: t('fleet:documentDeleteFailed'), variant: 'destructive' });
    }
  };

  const handleViewDocument = async (doc: VehicleDocument) => {
    setViewingDocument(doc);
    setLoadingUrl(true);
    try {
      const { data, error } = await supabase.storage.from('vehicle-documents').createSignedUrl(doc.file_path, 3600);
      if (error) throw error;
      setViewingUrl(data.signedUrl);
    } catch (error) {
      console.error("Error getting signed URL:", error);
      toast({ title: t('common:error'), description: t('fleet:documentLoadFailed'), variant: 'destructive' });
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
      toast({ title: t('common:error'), description: t('fleet:documentDownloadFailed'), variant: 'destructive' });
    }
  };

  const filteredDocuments = documents.filter(doc => doc.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const isImageFile = (fileType: string) => fileType.startsWith('image/');

  const renderDocumentPreview = (doc: VehicleDocument) => (
    <div className="w-full h-24 bg-muted flex items-center justify-center rounded-t-lg">
      <FileText className="h-10 w-10 text-muted-foreground" />
    </div>
  );

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
          {t('fleet:documents')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('fleet:documentsDescription')}</p>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input placeholder={t('fleet:searchDocuments')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              {t('common:addNew')}
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
              <p>{searchQuery ? t('common:noDocumentsFound') : t('common:noDocumentsYet')}</p>
            </div>
          ) : (
            <ScrollArea className={filteredDocuments.length > 6 ? "h-[400px]" : ""}>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredDocuments.map(doc => (
                  <div key={doc.id} className="group relative border rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleViewDocument(doc)}>
                    {renderDocumentPreview(doc)}
                    <div className="p-2">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString()}
                        {doc.file_size && ` • ${formatFileSize(doc.file_size)}`}
                      </p>
                    </div>
                    <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => handleDeleteDocument(doc, e)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('fleet:addDocument')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t('common:selectFile')}</Label>
                <div className="flex items-center gap-2">
                  <label htmlFor="document-upload" className="flex items-center px-4 py-2 border rounded-md bg-background hover:bg-accent cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    {selectedFile ? selectedFile.name : t('common:chooseFile')}
                    <input id="document-upload" type="file" className="hidden" onChange={handleFileSelect} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" />
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-name">{t('fleet:documentName')}</Label>
                <Input id="doc-name" value={documentName} onChange={(e) => setDocumentName(e.target.value)} placeholder={t('fleet:documentNamePlaceholder')} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); setDocumentName(""); setSelectedFile(null); }}>
                {t('common:cancel')}
              </Button>
              <Button onClick={handleUpload} disabled={uploading || !selectedFile}>
                {uploading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('common:uploading')}</>) : (<><Upload className="h-4 w-4 mr-2" />{t('common:upload')}</>)}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <FilePreviewModal
          open={!!viewingDocument && !loadingUrl}
          onOpenChange={(open) => { if (!open) setViewingDocument(null); }}
          url={viewingUrl}
          fileType={
            viewingDocument?.file_type === 'application/pdf' || (viewingDocument && viewingDocument.file_path.split('?')[0].split('#')[0].toLowerCase().endsWith('.pdf'))
              ? 'pdf'
              : viewingDocument && isImageFile(viewingDocument.file_type)
                ? 'image'
                : 'other'
          }
          title={viewingDocument?.name || 'Document'}
          actions={
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              {t('common:download')}
            </Button>
          }
        />
      </CardContent>
    </Card>
  );
}
