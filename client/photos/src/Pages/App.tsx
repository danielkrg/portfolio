import { Routes, Route } from 'react-router-dom';
import Gallery from './Gallery';
import Login from './Login';
import type { PhotosAppProps } from '../types';

/**
 * Root of the Photos app, mounted by the portfolio at /apps/photos/*.
 * Mirrors the StarSync app's shape: a single <Routes> tree rendered inside a
 * namespaced wrapper element. The public gallery is the index; `login` is the
 * unlisted Owner entry point (ADR-0002) — reachable only by typing its URL,
 * never linked from the visible UI. Edit routes arrive in a later slice.
 */
export default function App(props: PhotosAppProps) {
  return (
    <div className="photos">
      <Routes>
        <Route index element={<Gallery {...props} />} />
        <Route path="login" element={<Login {...props} />} />
      </Routes>
    </div>
  );
}
