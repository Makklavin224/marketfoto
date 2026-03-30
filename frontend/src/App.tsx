import { Routes, Route } from "react-router";
import TemplateSelectorPage from "./pages/TemplateSelectorPage";
import EditorPage from "./pages/EditorPage";

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900">MarketFoto</h1>
              <p className="mt-2 text-gray-600">Infrastructure is running</p>
            </div>
          </div>
        }
      />
      <Route path="/templates" element={<TemplateSelectorPage />} />
      <Route path="/editor" element={<EditorPage />} />
    </Routes>
  );
}
