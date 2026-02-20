import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, X, Loader2, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { validateFileSize, compressImage } from '@/utils/imageUtils';

interface DamageReportProps {
  vehicleId: string;
}

interface DamageEntry {
  id: string;
  category: string;
  image_url: string;
  created_at: string;
  description: string | null;
}

const DAMAGE_CATEGORIES = ['Front', 'Back', 'Right Side', 'Left Side', 'Interior', 'Tires'] as const;
type DamageCategory = typeof DAMAGE_CATEGORIES[number];

export function DamageReport({ vehicleId }: DamageReportProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [damages, setDamages] = useState<DamageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<DamageCategory | ''>('');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [damageNotes, setDamageNotes] = useState('');

  const fetchDamages = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('damage_reports')
        .select('id, location, images, created_at, description')
        .eq('vehicle_id', vehicleId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const flattenedDamages: DamageEntry[] = [];
      data?.forEach(report => {
        if (report.images && Array.isArray(report.images)) {
          report.images.forEach((imageUrl: string) => {
            flattenedDamages.push({
              id: report.id,
              category: report.location || 'Unknown',
              image_url: imageUrl,
              created_at: report.created_at,
              description: report.description
            });
          });
        }
      });
      setDamages(flattenedDamages);
    } catch (error) {
      console.error('Error fetching damages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load damage reports',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [user, vehicleId, toast]);

  useEffect(() => {
    fetchDamages();
  }, [fetchDamages]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    const rejectedNames: string[] = [];
    const accepted: File[] = [];

    for (const file of files) {
      const sizeCheck = validateFileSize(file);
      if (!sizeCheck.valid) {
        rejectedNames.push(file.name);
        continue;
      }
      const processed = await compressImage(file);
      accepted.push(processed);
    }

    if (rejectedNames.length > 0) {
      toast({
        title: 'File too large',
        description: `Rejected: ${rejectedNames.join(', ')}. Max 10 MB per file.`,
        variant: 'destructive',
      });
    }

    if (accepted.length > 0) {
      // Convert array to a DataTransfer-based FileList for state compatibility
      const dt = new DataTransfer();
      accepted.forEach(f => dt.items.add(f));
      setSelectedFiles(dt.files);
    } else {
      setSelectedFiles(null);
    }
  };

  const handleSubmit = async () => {
    if (!user || !selectedCategory || !selectedFiles || selectedFiles.length === 0) {
      toast({
        title: 'Missing information',
        description: 'Please select a category and at least one image',
        variant: 'destructive'
      });
      return;
    }
    setUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const rawExt = file.name.split('.').pop() || '';
        const fileExt = rawExt.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
        const fileName = `${vehicleId}/${Date.now()}_${i}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('damage-images').upload(fileName, file, { contentType: file.type });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('damage-images').getPublicUrl(fileName);
        uploadedUrls.push(urlData.publicUrl);
      }

      const description = damageNotes.trim() || `Damage in ${selectedCategory}`;

      const { error: insertError } = await supabase.from('damage_reports').insert({
        vehicle_id: vehicleId,
        user_id: user.id,
        location: selectedCategory,
        description,
        images: uploadedUrls,
        severity: 'minor'
      });
      if (insertError) throw insertError;
      toast({
        title: 'Success',
        description: 'Damage report added successfully'
      });
      setDialogOpen(false);
      setSelectedCategory('');
      setSelectedFiles(null);
      setDamageNotes('');
      fetchDamages();
    } catch (error) {
      console.error('Error uploading damage:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload damage report',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (damage: DamageEntry) => {
    if (!user) return;
    try {
      const urlParts = damage.image_url.split('/damage-images/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('damage-images').remove([filePath]);
      }
      const { data: report, error: fetchError } = await supabase
        .from('damage_reports')
        .select('images')
        .eq('id', damage.id)
        .single();
      if (fetchError) throw fetchError;
      const updatedImages = (report.images as string[]).filter((url: string) => url !== damage.image_url);
      if (updatedImages.length === 0) {
        const { error: deleteError } = await supabase.from('damage_reports').delete().eq('id', damage.id);
        if (deleteError) throw deleteError;
      } else {
        const { error: updateError } = await supabase.from('damage_reports').update({ images: updatedImages }).eq('id', damage.id);
        if (updateError) throw updateError;
      }
      toast({ title: 'Deleted', description: 'Image removed successfully' });
      fetchDamages();
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({ title: 'Error', description: 'Failed to delete image', variant: 'destructive' });
    }
  };

  const getDamagesByCategory = (category: string) => {
    return damages.filter(d => d.category === category);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "dd/MM/yyyy '–' HH:mm");
  };

  const shouldShowNotes = (description: string | null) => {
    if (!description) return false;
    if (description.startsWith('Damage in ')) return false;
    return true;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-start">
        <p className="text-sm text-muted-foreground flex-1 mr-4">
          Here you can keep a record of the vehicle's damages to easily track and review them over time.
        </p>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setDamageNotes('');
            setSelectedCategory('');
            setSelectedFiles(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add New Damage
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Damage</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Damage Category</Label>
                <Select value={selectedCategory} onValueChange={value => setSelectedCategory(value as DamageCategory)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAMAGE_CATEGORIES.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  placeholder="Add any details about this damage..."
                  value={damageNotes}
                  onChange={(e) => setDamageNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Upload Photo(s)</Label>
                <label className="flex items-center gap-2 cursor-pointer border border-input rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent/50 transition-colors">
                  <Upload className="h-4 w-4" />
                  <span>Choose Files</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                {selectedFiles && selectedFiles.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {selectedFiles.length} file(s) selected
                  </p>
                )}
              </div>

              <Button className="w-full" onClick={handleSubmit} disabled={uploading || !selectedCategory || !selectedFiles}>
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Save Damage'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Sections */}
      {DAMAGE_CATEGORIES.map(category => {
        const categoryDamages = getDamagesByCategory(category);
        return (
          <Card key={category} className="overflow-hidden">
            <CardHeader className="py-3 bg-[#739ee7]">
              <CardTitle className="font-medium text-lg">
                {category}
                {categoryDamages.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({categoryDamages.length})
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {categoryDamages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No damage reported</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {categoryDamages.map((damage, index) => (
                    <div key={`${damage.id}-${index}`} className="relative group">
                      <div
                        className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer"
                        onClick={() => setLightboxImage(damage.image_url)}
                      >
                        <img
                          src={damage.image_url}
                          alt={`${category} damage`}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                      </div>
                      <button
                        onClick={() => handleDeleteImage(damage)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <p className="mt-1 text-muted-foreground text-sm">
                        Uploaded: {formatDateTime(damage.created_at)}
                      </p>
                      {shouldShowNotes(damage.description) && (
                        <p className="text-sm text-muted-foreground">
                          Notes: {damage.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Lightbox */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden bg-black/90 border-none flex items-center justify-center">
          {lightboxImage && (
            <img
              src={lightboxImage}
              alt="Damage detail"
              className="max-w-full max-h-[85vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
