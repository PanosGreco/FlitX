import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
interface DamageReportProps {
  vehicleId: string;
}
interface DamageEntry {
  id: string;
  category: string;
  image_url: string;
  created_at: string;
}
const DAMAGE_CATEGORIES = ['Front', 'Back', 'Right Side', 'Left Side', 'Interior', 'Tires'] as const;
type DamageCategory = typeof DAMAGE_CATEGORIES[number];
export function DamageReport({
  vehicleId
}: DamageReportProps) {
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const [damages, setDamages] = useState<DamageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<DamageCategory | ''>('');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const fetchDamages = useCallback(async () => {
    if (!user) return;
    try {
      const {
        data,
        error
      } = await supabase.from('damage_reports').select('id, location, images, created_at').eq('vehicle_id', vehicleId).eq('user_id', user.id).order('created_at', {
        ascending: false
      });
      if (error) throw error;

      // Flatten the data - each image becomes its own entry
      const flattenedDamages: DamageEntry[] = [];
      data?.forEach(report => {
        if (report.images && Array.isArray(report.images)) {
          report.images.forEach((imageUrl: string) => {
            flattenedDamages.push({
              id: report.id,
              category: report.location || 'Unknown',
              image_url: imageUrl,
              created_at: report.created_at
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
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
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

      // Upload each file
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${vehicleId}/${Date.now()}_${i}.${fileExt}`;
        const {
          error: uploadError
        } = await supabase.storage.from('damage-images').upload(fileName, file);
        if (uploadError) throw uploadError;
        const {
          data: urlData
        } = supabase.storage.from('damage-images').getPublicUrl(fileName);
        uploadedUrls.push(urlData.publicUrl);
      }

      // Create damage report
      const {
        error: insertError
      } = await supabase.from('damage_reports').insert({
        vehicle_id: vehicleId,
        user_id: user.id,
        location: selectedCategory,
        description: `Damage in ${selectedCategory}`,
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
      // Extract file path from URL
      const urlParts = damage.image_url.split('/damage-images/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('damage-images').remove([filePath]);
      }

      // Get current report to update images array
      const {
        data: report,
        error: fetchError
      } = await supabase.from('damage_reports').select('images').eq('id', damage.id).single();
      if (fetchError) throw fetchError;
      const updatedImages = (report.images as string[]).filter((url: string) => url !== damage.image_url);
      if (updatedImages.length === 0) {
        // Delete the entire report if no images left
        const {
          error: deleteError
        } = await supabase.from('damage_reports').delete().eq('id', damage.id);
        if (deleteError) throw deleteError;
      } else {
        // Update with remaining images
        const {
          error: updateError
        } = await supabase.from('damage_reports').update({
          images: updatedImages
        }).eq('id', damage.id);
        if (updateError) throw updateError;
      }
      toast({
        title: 'Deleted',
        description: 'Image removed successfully'
      });
      fetchDamages();
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete image',
        variant: 'destructive'
      });
    }
  };
  const handleImageDoubleClick = (imageUrl: string) => {
    setLightboxImage(imageUrl);
  };
  const getDamagesByCategory = (category: string) => {
    return damages.filter(d => d.category === category);
  };
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "dd MMM yyyy '–' HH:mm");
  };
  if (loading) {
    return <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>;
  }
  return <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                    {DAMAGE_CATEGORIES.map(category => <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Upload Photo(s)</Label>
                <Input type="file" accept="image/*" multiple onChange={handleFileChange} />
                {selectedFiles && selectedFiles.length > 0 && <p className="text-sm text-muted-foreground">
                    {selectedFiles.length} file(s) selected
                  </p>}
              </div>
              <Button className="w-full" onClick={handleSubmit} disabled={uploading || !selectedCategory || !selectedFiles}>
                {uploading ? <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </> : 'Save Damage'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Sections */}
      {DAMAGE_CATEGORIES.map(category => {
      const categoryDamages = getDamagesByCategory(category);
      return <Card key={category} className="overflow-hidden">
            <CardHeader className="py-3 bg-[#739ee7]">
              <CardTitle className="text-base font-medium">
                {category}
                {categoryDamages.length > 0 && <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({categoryDamages.length})
                  </span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {categoryDamages.length === 0 ? <p className="text-sm text-muted-foreground">No damage reported</p> : <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {categoryDamages.map((damage, index) => <div key={`${damage.id}-${index}`} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer" onDoubleClick={() => handleImageDoubleClick(damage.image_url)}>
                        <img src={damage.image_url} alt={`${category} damage`} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                      </div>
                      <button onClick={() => handleDeleteImage(damage)} className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="h-3 w-3" />
                      </button>
                      <p className="mt-1 text-muted-foreground text-sm">
                        Uploaded: {formatDateTime(damage.created_at)}
                      </p>
                    </div>)}
                </div>}
            </CardContent>
          </Card>;
    })}

      {/* Lightbox */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {lightboxImage && <img src={lightboxImage} alt="Damage detail" className="w-full h-auto" />}
        </DialogContent>
      </Dialog>
    </div>;
}