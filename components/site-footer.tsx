export const INSTAGRAM_URL = "https://www.instagram.com/tsogoo_1120/";

export function SiteFooter() {
  return <footer className="site-footer">
    <div>
      <p className="eyebrow">ХОЛБОО БАРИХ</p>
      <p>Асуулт, санал, төлбөртэй холбоотой асуудлаар Instagram-аар бичээрэй.</p>
    </div>
    <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Instagram: @tsogoo_1120 (шинэ цонхонд нээгдэнэ)">
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".6" fill="currentColor" /></svg>
      <span>@tsogoo_1120</span>
    </a>
  </footer>;
}
