// Update records are served by the backend at GET /changelog.
// The client only owns the shape and rendering.
export interface ChangelogEntry {
  date: string;
  title: string;
  summary: string;
  items: string[];
}
