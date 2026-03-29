import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ThemeToggle } from './components/ThemeToggle';
import { MainLayout } from './layouts/MainLayout';
import { ArticlePage } from './pages/ArticlePage';
import { HomePage } from './pages/HomePage';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeToggle />
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/articles/:id" element={<ArticlePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
