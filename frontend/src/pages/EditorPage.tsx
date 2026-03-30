import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import toast from 'react-hot-toast';
import { useTemplateDetail } from '../api/templates';
import { useCreateRender, useRenderStatus } from '../api/renders';
import { useEditorStore } from '../stores/editor';
import FabricCanvas from '../components/editor/FabricCanvas';
import RightPanel from '../components/editor/RightPanel';
import ExportPanel from '../components/editor/ExportPanel';
import { loadAllFonts } from '../lib/fonts';

export default function EditorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const templateId = searchParams.get('template');
  const imageId = searchParams.get('image');

  const { data: template, isLoading, error } = useTemplateDetail(templateId);

  const setTemplate = useEditorStore((s) => s.setTemplate);
  const setProductImageUrl = useEditorStore((s) => s.setProductImageUrl);
  const templateConfig = useEditorStore((s) => s.templateConfig);
  const productImageUrl = useEditorStore((s) => s.productImageUrl);
  const templateName = useEditorStore((s) => s.template?.name);
  const marketplace = useEditorStore((s) => s.marketplace);
  const zoom = useEditorStore((s) => s.zoom);

  // Export state
  const [renderId, setRenderId] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);

  const createRender = useCreateRender();
  const renderStatus = useRenderStatus(renderId);

  // Preload all editor fonts on mount
  useEffect(() => {
    loadAllFonts().then(() => {
      console.log('Editor fonts loaded');
    });
  }, []);

  // Set template in store when loaded, use processed image if available
  useEffect(() => {
    if (template) {
      setTemplate(template);
      // If we have a processed image URL from previous steps, use it
      // Otherwise use a placeholder SVG
      if (!productImageUrl) {
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
  }, [template, setTemplate, setProductImageUrl, productImageUrl]);

  // Handle "Create Card" button press
  const handleCreateCard = async () => {
    const editorState = useEditorStore.getState();
    const overlayData = editorState.getOverlayData();
    if (!overlayData || !editorState.template) return;

    if (!imageId) {
      toast.error('Изображение не выбрано');
      return;
    }

    try {
      const render = await createRender.mutateAsync({
        image_id: imageId,
        template_id: editorState.template.id,
        overlay_data: overlayData,
        marketplace: editorState.marketplace,
      });
      setRenderId(render.id);
      setShowExport(true);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      const detail = error?.response?.data?.detail || 'Ошибка создания карточки';
      toast.error(detail);
    }
  };

  // Handle returning to editor from export
  const handleEdit = () => {
    setShowExport(false);
    setRenderId(null);
  };

  // Handle "Create More" -- reset and go to upload
  const handleCreateMore = () => {
    useEditorStore.getState().reset();
    navigate('/upload');
  };

  // Loading state
  if (!templateId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 text-lg">Template not specified</p>
          <p className="text-gray-400 text-sm mt-1">Add ?template=ID to URL</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
          <p className="text-gray-500">Loading template...</p>
        </div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 text-lg font-medium">Template not found</p>
          <p className="text-gray-400 text-sm mt-1">ID: {templateId}</p>
        </div>
      </div>
    );
  }

  if (!templateConfig) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-semibold text-gray-800 truncate max-w-[200px]">
            {templateName || 'Editor'}
          </h1>
          <span className="text-xs text-gray-400 uppercase tracking-wide">
            {marketplace.toUpperCase()}
          </span>
        </div>
        <div className="text-xs text-gray-400">
          {showExport ? 'Экспорт' : `Zoom: ${Math.round(zoom * 100)}%`}
        </div>
      </div>

      {/* Main area */}
      {showExport && renderId ? (
        <ExportPanel
          renderId={renderId}
          renderStatus={renderStatus.data}
          marketplace={marketplace}
          isLoading={renderStatus.isLoading}
          onEdit={handleEdit}
          onCreateMore={handleCreateMore}
        />
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Canvas area */}
          <FabricCanvas
            templateConfig={templateConfig}
            productImageUrl={productImageUrl}
          />

          {/* Right: Control panel */}
          <RightPanel
            onCreateCard={handleCreateCard}
            isCreating={createRender.isPending}
          />
        </div>
      )}
    </div>
  );
}
