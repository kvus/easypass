import React, { useMemo, useState, useEffect } from 'react';
import { searchEntries, listEntries } from '../../modules/vault-manager.js';
import { getCategoryInfo, copyToClipboard } from '../../modules/utils.js';

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'email', label: '📧 Email' },
  { value: 'bank', label: '🏦 Ngân hàng' },
  { value: 'social', label: '👥 Mạng XH' },
  { value: 'work', label: '💼 Công việc' },
  { value: 'shopping', label: '🛒 Mua sắm' },
  { value: 'other', label: '🔑 Khác' }
];

function maskPassword(password) {
  if (!password) return '';
  return '•'.repeat(Math.max(8, Math.min(password.length, 16)));
}

export default function VaultView({
  vaultData,
  onGoAdd,
  onGoEdit,
  onGoGenerator,
  onGoSettings,
  onLogout
}) {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('all');
  const [copiedId, setCopiedId] = useState('');
  const [currentDomain, setCurrentDomain] = useState('');

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.url) {
          try {
            const url = new URL(tabs[0].url);
            setCurrentDomain(url.hostname.replace(/^www\./, '').toLowerCase());
          } catch {
            // Ignore parse error
          }
        }
      });
    }
  }, []);

  const entries = useMemo(() => {
    const source = keyword.trim()
      ? searchEntries(vaultData, keyword.trim())
      : listEntries(vaultData, null);

    let filtered = category === 'all' ? source : source.filter((item) => item.category === category);
    
    if (currentDomain && !keyword.trim()) {
      filtered = [...filtered].sort((a, b) => {
        const urlA = (a.siteUrl || '').toLowerCase();
        const urlB = (b.siteUrl || '').toLowerCase();
        const matchA = urlA.includes(currentDomain) ? 1 : 0;
        const matchB = urlB.includes(currentDomain) ? 1 : 0;
        return matchB - matchA;
      });
    }
    
    return filtered;
  }, [vaultData, keyword, category, currentDomain]);

  const handleAutoFill = async (item) => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length > 0 && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'AUTO_FILL',
            entry: item
          }, (res) => {
            if (!chrome.runtime.lastError) {
              window.close();
            }
          });
        }
      } catch {
        // Ignore
      }
    }
  };

  const handleCopyPassword = async (item) => {
    const ok = await copyToClipboard(item.password || '');
    if (!ok) return;
    setCopiedId(item.itemId);
    setTimeout(() => setCopiedId(''), 1200);
  };

  return (
    <div className="view vault-view" style={{ display: 'flex', flexDirection: 'column', minHeight: 540 }}>
      <header className="header">
        <div className="header-logo">
          <span className="logo-icon">🔐</span>
          EasyPass
        </div>

        <div className="header-actions">
          <button className="icon-btn" onClick={onGoGenerator} title="Sinh mật khẩu" type="button">
            ⚡
          </button>
          <button className="icon-btn" onClick={onGoSettings} title="Cài đặt" type="button">
            ⚙️
          </button>
          <button className="icon-btn" onClick={onLogout} title="Đăng xuất" type="button">
            ↩
          </button>
        </div>
      </header>

      <div className="vault-toolbar">
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        <select
          className="category-filter"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="entry-list" style={{ flex: 1, overflowY: 'auto' }}>
        {entries.length === 0 ? (
          <div
            className="empty-state"
            style={{
              opacity: 0.85,
              textAlign: 'center',
              padding: '24px 16px'
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>🗂️</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Chưa có dữ liệu phù hợp</div>
            <div style={{ fontSize: 13 }}>
              {keyword || category !== 'all'
                ? 'Hãy thử thay đổi từ khóa hoặc bộ lọc.'
                : 'Bấm "Thêm mục mới" để bắt đầu.'}
            </div>
          </div>
        ) : (
          entries.map((item) => {
            const cat = getCategoryInfo(item.category);
            const isMatch = currentDomain && (item.siteUrl || '').toLowerCase().includes(currentDomain);
            return (
              <article
                key={item.itemId}
                className="entry-card"
                style={{
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 10
                }}
              >
                <div
                  className="entry-top"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{item.siteName || '(Không tên)'}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>{item.username || '-'}</div>
                  </div>
                  <span
                    className="category-badge"
                    style={{
                      fontSize: 12,
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.08)'
                    }}
                  >
                    {cat.icon} {cat.label}
                  </span>
                </div>

                <div
                  className="entry-middle"
                  style={{
                    marginTop: 8,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10
                  }}
                >
                  <span style={{ opacity: 0.9 }}>{maskPassword(item.password)}</span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleCopyPassword(item)}
                  >
                    {copiedId === item.itemId ? '✅ Đã chép' : '📋 Copy'}
                  </button>
                </div>

                <div
                  className="entry-actions"
                  style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}
                >
                  <div style={{ fontSize: 12, color: 'var(--color-primary, #646cff)', fontWeight: 600 }}>
                     {isMatch && !keyword.trim() && '🎯 Gợi ý website'}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleAutoFill(item)}
                    >
                      ⚡ Điền
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onGoEdit(item)}
                    >
                      ✏️ Sửa
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      <footer className="vault-bottom" style={{ marginTop: 10 }}>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={onGoAdd} type="button">
          ＋ Thêm mục mới
        </button>
      </footer>
    </div>
  );
}
