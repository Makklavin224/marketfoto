import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./stores/auth";
import ProtectedRoute from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import UploadPage from "./pages/UploadPage";
import ProcessingPage from "./pages/ProcessingPage";
import TemplateSelectorPage from "./pages/TemplateSelectorPage";
import EditorPage from "./pages/EditorPage";
import DashboardPage from "./pages/DashboardPage";
import PricingPage from "./pages/PricingPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import StyleSelectorPage from "./pages/StyleSelectorPage";
import ProductInfoPage from "./pages/ProductInfoPage";
import GeneratingPage from "./pages/GeneratingPage";
import GenerationResultPage from "./pages/GenerationResultPage";
import SeriesGeneratingPage from "./pages/SeriesGeneratingPage";
import SeriesResultPage from "./pages/SeriesResultPage";

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">MarketFoto</h1>
          <p className="mt-2 text-gray-500">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" />
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={user ? <Navigate to="/dashboard" /> : <AuthPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/payment/success" element={<PaymentSuccessPage />} />

        {/* Protected — ProtectedRoute renders Header + Outlet */}
        <Route element={<ProtectedRoute />}>
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/processing/:imageId" element={<ProcessingPage />} />
          <Route path="/styles" element={<StyleSelectorPage />} />
          <Route path="/product-info" element={<ProductInfoPage />} />
          <Route path="/generating/:renderId" element={<GeneratingPage />} />
          <Route path="/result/:renderId" element={<GenerationResultPage />} />
          <Route path="/series-generating/:seriesId" element={<SeriesGeneratingPage />} />
          <Route path="/series-result/:seriesId" element={<SeriesResultPage />} />
          <Route path="/templates" element={<TemplateSelectorPage />} />
          <Route path="/editor" element={<EditorPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>
      </Routes>
    </>
  );
}
