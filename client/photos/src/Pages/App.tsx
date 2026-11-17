import { Routes, Route } from 'react-router-dom';
import Gallery from './Gallery';
import type { PhotosAppProps } from '../types';

/**
 * Root of the Photos app, mounted by the portfolio at /apps/photos/*.
 * Mirrors the StarSync app's shape: a single <Routes> tree rendered inside a
 * namespaced wrapper element. For this tracer-bullet slice there is only the
 * placeholder Gallery; later slices add the login and edit routes here.
 */
export default function App(props: PhotosAppProps) {
  return (
    <div className="photos">
      <Routes>
        <Route index element={<Gallery {...props} />} />
      </Routes>
    </div>
  );
}
