import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useTemplateDetail } from '../api/templates';
import { useEditorStore } from '../stores/editor';
import FabricCanvas from '../components/editor/FabricCanvas';
import RightPanel from '../components/editor/RightPanel';
import { loadAllFonts } from '../lib/fonts';

// Placeholder product image (gray rectangle as data URL) for MVP
const PLACEHOLDER_PRODUCT_IMAGE =
  'data:image/svg+xml;base64,' +
  btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">' +
      '<rect width="600" height="600" fill="#D1D5DB"/>' +
      '<text x="300" y="310" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#6B7280">Product Photo</text>' +
      '</svg>'
  );

export default function EditorPage() {
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('template');

  const { data: template, isLoading, error } = useTemplateDetail(templateId);

  const setTemplate = useEditorStore((s) => s.setTemplate);
  const setProductImageUrl = useEditorStore((s) => s.setProductImageUrl);
  const templateConfig = useEditorStore((s) => s.templateConfig);
  const productImageUrl = useEditorStore((s) => s.productImageUrl);
  const templateName = useEditorStore((s) => s.template?.name);
  const marketplace = useEditorStore((s) => s.marketplace);
  const zoom = useEditorStore((s) => s.zoom);

  // Preload all editor fonts on mount
  useEffect(() => {
    loadAllFonts().then(() => {
      console.log('Editor fonts loaded');
    });
  }, []);

  // Set template in store when loaded
  useEffect(() => {
    if (template) {
      setTemplate(template);
      setProductImageUrl(PLACEHOLDER_PRODUCT_IMAGE);
    }
  }, [template, setTemplate, setProductImageUrl]);

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
          Zoom: {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Canvas area (70%) */}
        <FabricCanvas
          templateConfig={templateConfig}
          productImageUrl={productImageUrl}
        />

        {/* Right: Control panel */}
        <RightPanel />
      </div>
    </div>
  );
}
