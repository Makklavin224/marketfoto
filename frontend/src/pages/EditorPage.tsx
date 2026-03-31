import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { imagesApi } from '../lib/api';
import { useTemplateDetail } from '../api/templates';
import { useEditorStore } from '../stores/editor';
import { useAuthStore } from '../stores/auth';
import FabricCanvas, { type FabricCanvasHandle } from '../components/editor/FabricCanvas';
import RightPanel from '../components/editor/RightPanel';
import ExportPanel from '../components/editor/ExportPanel';
import { loadAllFonts } from '../lib/fonts';

export default function EditorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const templateId = searchParams.get('template');
  const imageId = searchParams.get('image');

  const { data: template, isLoading: templateLoading, error } = useTemplateDetail(templateId);

  // Fetch the processed image record to get its presigned URL
  const { data: imageRecord, isLoading: imageLoading } = useQuery({
    queryKey: ['image', imageId],
    queryFn: async () => {
      const { data } = await imagesApi.get(imageId!);
      return data;
    },
    enabled: !!imageId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const isLoading = templateLoading || imageLoading;

  const setTemplate = useEditorStore((s) => s.setTemplate);
  const setProductImageUrl = useEditorStore((s) => s.setProductImageUrl);
  const templateConfig = useEditorStore((s) => s.templateConfig);
  const productImageUrl = useEditorStore((s) => s.productImageUrl);
  const templateName = useEditorStore((s) => s.template?.name);
  const marketplace = useEditorStore((s) => s.marketplace);
  const zoom = useEditorStore((s) => s.zoom);

  // Canvas ref for client-side export
  const canvasRef = useRef<FabricCanvasHandle>(null);

  // Export state
  const [exportedImageUrl, setExportedImageUrl] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Preload all editor fonts on mount
  useEffect(() => {
    loadAllFonts().then(() => {
      console.log('Editor fonts loaded');
    });
  }, []);

  // Set product image URL from fetched image record
  useEffect(() => {
    if (imageRecord?.processed_url) {
      setProductImageUrl(imageRecord.processed_url);
    }
  }, [imageRecord, setProductImageUrl]);

  // Set template in store when loaded
  useEffect(() => {
    if (template) {
      setTemplate(template);
      // If no image was provided or fetched, use a placeholder SVG
      if (!productImageUrl && !imageRecord?.processed_url) {
        const placeholder =
          'data:image/svg+xml;base64,' +
          btoa(
            '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">' +
              '<rect width="600" height="600" fill="#D1D5DB"/>' +
              '<text x="300" y="310" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#6B7280">Product Photo</text>' +
              '</svg>'
          );
        setProductImageUrl(placeholder);
      }
    }
  }, [template, setTemplate, setProductImageUrl, productImageUrl, imageRecord]);

  // Handle "Create Card" button press — client-side canvas export
  const handleCreateCard = () => {
    if (!canvasRef.current) {
      toast.error('Канвас не готов');
      return;
    }

    setIsExporting(true);

    try {
      // Determine if user is on free plan (needs watermark)
      const user = useAuthStore.getState().user;
      const isFree = !user || user.plan === 'free';

      const dataUrl = canvasRef.current.exportImage({
        format: 'png',
        quality: 1,
        addWatermark: isFree,
      });

      if (!dataUrl) {
        toast.error('Не удалось экспортировать изображение');
        return;
      }

      setExportedImageUrl(dataUrl);
      setShowExport(true);
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Ошибка экспорта карточки');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle returning to editor from export
  const handleEdit = () => {
    setShowExport(false);
    setExportedImageUrl(null);
  };

  // Handle "Create More" -- reset and go to upload
  const handleCreateMore = () => {
    useEditorStore.getState().reset();
    navigate('/upload');
  };

  // Loading state
  if (!templateId) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>Шаблон не указан</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Выберите шаблон на предыдущем шаге</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin h-8 w-8 rounded-full" style={{ border: '4px solid rgba(124,58,237,0.2)', borderTopColor: 'var(--purple-400)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Загрузка редактора...</p>
        </div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <p className="text-lg font-medium" style={{ color: 'var(--red-400)' }}>Шаблон не найден</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>ID: {templateId}</p>
        </div>
      </div>
    );
  }

  if (!templateConfig) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-2 shrink-0"
        style={{
          background: 'rgba(9, 9, 11, 0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-semibold truncate max-w-[200px]" style={{ color: 'var(--text-primary)' }}>
            {templateName || 'Редактор'}
          </h1>
          <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
            {marketplace.toUpperCase()}
          </span>
        </div>
        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {showExport ? 'Экспорт' : `Zoom: ${Math.round(zoom * 100)}%`}
        </div>
      </div>

      {/* Main area */}
      {showExport && exportedImageUrl ? (
        <ExportPanel
          imageDataUrl={exportedImageUrl}
          marketplace={marketplace}
          onEdit={handleEdit}
          onCreateMore={handleCreateMore}
        />
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Canvas area */}
          <FabricCanvas
            ref={canvasRef}
            templateConfig={templateConfig}
            productImageUrl={productImageUrl}
          />

          {/* Right: Control panel */}
          <RightPanel
            onCreateCard={handleCreateCard}
            isCreating={isExporting}
          />
        </div>
      )}
    </div>
  );
}
