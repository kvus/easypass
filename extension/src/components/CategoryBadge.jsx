/**
 * CategoryBadge — badge hiển thị danh mục với icon
 * Props:
 *  - category: string (email | bank | social | work | shopping | other)
 *  - info: { icon, label } (từ getCategoryInfo)
 */
export default function CategoryBadge({ info }) {
  if (!info) return null;
  return (
    <span className="category-badge">
      {info.icon} {info.label}
    </span>
  );
}
