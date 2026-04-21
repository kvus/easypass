import { useMemo, useState, useEffect } from 'react';
import { searchEntries, listEntries } from '../../modules/vault-manager.js';
import EntryCard from '../components/EntryCard.jsx';

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'email', label: '📧 Email' },
  { value: 'bank', label: '🏦 Ngân hàng' },
  { value: 'social', label: '👥 Mạng XH' },
  { value: 'work', label: '💼 Công việc' },
  { value: 'shopping', label: '🛒 Mua sắm' },
  { value: 'other', label: '🔑 Khác' },
];

export default function VaultView({
  vaultData,
  onGoAdd,
  onGoEdit,
  onGoGenerator,
  onGoSettings,
  onLogout,
}) {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('all');
  const [currentDomain, setCurrentDomain] = useState('');

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        try {
          const url = new URL(tabs[0]?.url || '');
          setCurrentDomain(url.hostname.replace(/^www\./, '').toLowerCase());
        } catch {
          // Non-http tab (e.g. chrome://)
        }
      });
    }
  }, []);

  const entries = useMemo(() => {
    const source = keyword.trim()
      ? searchEntries(vaultData, keyword.trim())
      : listEntries(vaultData, null);

    const filtered =
      category === 'all' ? source : source.filter((item) => item.category === category);

    if (currentDomain && !keyword.trim()) {
      return [...filtered].sort((a, b) => {
        const matchA = (a.siteUrl || '').toLowerCase().includes(currentDomain) ? 1 : 0;
        const matchB = (b.siteUrl || '').toLowerCase().includes(currentDomain) ? 1 : 0;
        return matchB - matchA;
      });
    }

    return filtered;
  }, [vaultData, keyword, category, currentDomain]);

  const handleAutoFill = async (item) => {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) return;
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'AUTO_FILL', entry: item }, () => {
          if (!chrome.runtime.lastError) window.close();
        });
      }
    } catch {
      // Tab not injectable (e.g. chrome:// pages)
    }
  };

  return (
    <div className="vault-view">
      <header className="vault-header">
        <div className="vault-header-logo">
          <span>🔐</span> EasyPass
        </div>
        <div className="vault-header-actions">
          <button className="icon-btn" onClick={onGoGenerator} title="Sinh mật khẩu" type="button">⚡</button>
          <button className="icon-btn" onClick={onGoSettings} title="Cài đặt" type="button">⚙️</button>
          <button className="icon-btn" onClick={onLogout} title="Đăng xuất" type="button">↩</button>
        </div>
      </header>

      <div className="vault-toolbar">
        <div className="vault-search">
          <span className="vault-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
        <select
          className="vault-category-filter"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="vault-entry-list">
        {entries.length === 0 ? (
          <div className="vault-empty">
            <div className="vault-empty-icon">🗂️</div>
            <div className="vault-empty-title">Chưa có dữ liệu phù hợp</div>
            <div className="vault-empty-hint">
              {keyword || category !== 'all'
                ? 'Hãy thử thay đổi từ khóa hoặc bộ lọc.'
                : 'Bấm "Thêm mục mới" để bắt đầu.'}
            </div>
          </div>
        ) : (
          entries.map((item) => {
            const isMatch =
              !!currentDomain &&
              !keyword.trim() &&
              (item.siteUrl || '').toLowerCase().includes(currentDomain);
            return (
              <EntryCard
                key={item.itemId}
                item={item}
                isMatch={isMatch}
                onEdit={onGoEdit}
                onAutoFill={handleAutoFill}
              />
            );
          })
        )}
      </div>

      <footer className="vault-bottom">
        <button className="btn btn-primary" onClick={onGoAdd} type="button" style={{ width: '100%' }}>
          ＋ Thêm mục mới
        </button>
      </footer>
    </div>
  );
}
