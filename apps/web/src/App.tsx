import { Link, Route, Routes } from 'react-router';
import { CanvasPage } from '@/pages/CanvasPage';
import { SpacesPage } from '@/pages/SpacesPage';
import { Notice } from '@/ui/Notice';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<SpacesPage />} />
      <Route path="/spaces/:spaceId" element={<CanvasPage />} />
      <Route
        path="*"
        element={
          <section className="page">
            <Notice action={<Link to="/">К пространствам</Link>}>Страница не найдена.</Notice>
          </section>
        }
      />
    </Routes>
  );
}
