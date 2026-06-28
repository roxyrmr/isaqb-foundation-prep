import { HashRouter, Route, Routes } from "react-router-dom";
import { LangProvider } from "./context/LangContext";
import { ExamPage } from "./pages/ExamPage";
import { ResultsPage } from "./pages/ResultsPage";
import { StartPage } from "./pages/StartPage";

export default function App() {
  return (
    <LangProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<StartPage />} />
          <Route path="/exam/:attemptId" element={<ExamPage />} />
          <Route path="/results/:attemptId" element={<ResultsPage />} />
        </Routes>
      </HashRouter>
    </LangProvider>
  );
}
