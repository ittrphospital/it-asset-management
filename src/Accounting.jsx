import React, { useState } from 'react';

export default function Accounting() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // ข้อมูลโครงสร้างตัวอย่าง (รอเปลี่ยนเป็นข้อมูลจริงเมื่อพร้อม)
  const [documentList] = useState([
    {
      id: 'DOC-001',
      title: 'ใบขอซื้อ / ขอจ้าง (Purchase Requisition - PR)',
      category: 'purchase',
      updatedAt: '15 ก.ย. 2026',
      description: 'แบบฟอร์มมาตรฐานสำหรับตั้งเบิกสั่งซื้อสินค้าหรือค่าบริการของแผนก',
      blankFileUrl: '#', // ลิงก์ไฟล์เปล่า (.xlsx)
      exampleFileUrl: '#', // ลิงก์ไฟล์ตัวอย่าง (.pdf)
      pinned: true
    },
    {
      id: 'DOC-002',
      title: 'แบบฟอร์มเบิกเงินชดเชยค่าเดินทาง (Travel Expense)',
      category: 'expense',
      updatedAt: '10 ก.ย. 2026',
      description: 'เอกสารขอเบิกค่าค่าน้ำมัน ค่าทางด่วน และค่าเดินทางปฏิบัติงานนอกสถานที่',
      blankFileUrl: '#',
      exampleFileUrl: '#',
      pinned: false
    },
    {
      id: 'DOC-003',
      title: 'ใบเสร็จรับเงิน / ใบสำคัญรับเงิน (Receipt Form)',
      category: 'tax',
      updatedAt: '01 ก.ย. 2026',
      description: 'แบบฟอร์มออกใบเสร็จและหักภาษี ณ ที่จ่ายประจำเดือน',
      blankFileUrl: '#',
      exampleFileUrl: '#',
      pinned: false
    }
  ]);

  const categories = [
    { id: 'all', label: 'เอกสารทั้งหมด', icon: '📂', count: documentList.length },
    { id: 'purchase', label: 'แบบฟอร์มจัดซื้อ/ตั้งเบิก', icon: '🛒', count: documentList.filter(d => d.category === 'purchase').length },
    { id: 'expense', label: 'ค่าใช้จ่าย & เดินทาง', icon: '💰', count: documentList.filter(d => d.category === 'expense').length },
    { id: 'tax', label: 'ภาษี & บัญชี', icon: '📑', count: documentList.filter(d => d.category === 'tax').length },
  ];

  const filteredDocs = documentList.filter(doc => {
    const matchCat = selectedCategory === 'all' || doc.category === selectedCategory;
    const matchSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || doc.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#1e1e1e', color: '#cccccc', fontFamily: 'Sarabun, Inter, sans-serif' }}>
      
      {/* 1. Left Sidebar (หมวดหมู่เอกสาร) */}
      <aside style={{ width: '260px', backgroundColor: '#252526', borderRight: '1px solid #333333', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #333333', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>📊</span>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff', margin: 0 }}>Accounting Center</h2>
        </div>

        <div style={{ padding: '12px', fontSize: '11px', color: '#888888', fontWeight: 600 }}>
          CATEGORIES / หมวดหมู่
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 8px' }}>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: selectedCategory === cat.id ? '#37373d' : 'transparent',
                color: selectedCategory === cat.id ? '#ffffff' : '#aaaaaa',
                cursor: 'pointer',
                fontSize: '13px',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </div>
              <span style={{ fontSize: '11px', backgroundColor: '#1e1e1e', padding: '2px 6px', borderRadius: '10px', color: '#888888' }}>
                {cat.count}
              </span>
            </button>
          ))}
        </nav>
      </aside>

      {/* 2. Main Content Area (รายการเอกสาร & ปุ่มดาวน์โหลด) */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#1e1e1e' }}>
        
        {/* Top Search Bar */}
        <header style={{ padding: '12px 24px', borderBottom: '1px solid #333333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#252526' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>
            คลังแบบฟอร์มและเอกสารดาวน์โหลด
          </div>
          <input
            type="text"
            placeholder="🔍 ค้นหาชื่อแบบฟอร์ม หรือ รหัสเอกสาร..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '280px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #444444',
              backgroundColor: '#1e1e1e',
              color: '#ffffff',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </header>

        {/* Document Cards List */}
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredDocs.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#666666', marginTop: '40px' }}>ไม่พบรายการแบบฟอร์มที่ค้นหา</div>
          ) : (
            filteredDocs.map(doc => (
              <div 
                key={doc.id}
                style={{
                  backgroundColor: '#2d2d2d',
                  borderRadius: '8px',
                  border: '1px solid #3c3c3c',
                  padding: '16px',
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                  gap: '16px'
                }}
              >
                {/* Info Part */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', backgroundColor: '#007acc', color: '#ffffff', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, fontFamily: 'monospace' }}>
                      {doc.id}
                    </span>
                    <h3 style={{ margin: 0, fontSize: '15px', color: '#ffffff', fontWeight: 600 }}>
                      {doc.title}
                    </h3>
                    {doc.pinned && <span style={{ fontSize: '12px' }} title="ปักหมุดไว้">📌</span>}
                  </div>
                  
                  <p style={{ margin: '4px 0 8px 0', fontSize: '12.5px', color: '#aaaaaa' }}>
                    {doc.description}
                  </p>
                  
                  <span style={{ fontSize: '11px', color: '#666666' }}>
                    {doc.updatedAt}
                  </span>
                </div>

                {/* Download Actions (แบบฟอร์มเปล่า & แบบฟอร์มที่กรอกแล้ว) */}
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  
                  {/* ปุ่ม 1: แบบฟอร์มเปล่า */}
                  <a
                    href={doc.blankFileUrl}
                    download
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#264f78',
                      color: '#ffffff',
                      padding: '8px 14px',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      fontSize: '12px',
                      fontWeight: 500,
                      border: '1px solid #316598'
                    }}
                  >
                    <span>📄</span>
                    <span>แบบฟอร์มเปล่า (.xlsx)</span>
                  </a>

                  {/* ปุ่ม 2: แบบฟอร์มที่กรอกข้อมูลแล้ว */}
                  <a
                    href={doc.exampleFileUrl}
                    download
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#37373d',
                      color: '#cccccc',
                      padding: '8px 14px',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      fontSize: '12px',
                      fontWeight: 500,
                      border: '1px solid #484848'
                    }}
                  >
                    <span>📝</span>
                    <span>ตัวอย่างที่กรอกแล้ว (.pdf)</span>
                  </a>

                </div>
              </div>
            ))
          )}
        </div>
      </main>

    </div>
  );
}