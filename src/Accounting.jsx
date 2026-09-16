import React from 'react';

export default function Accounting() {
  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      {/* Header เฉพาะของฝั่งบัญชี */}
      <header style={{ borderBottom: '1px solid #ccc', pb: '10px', mb: '20px' }}>
        <h2 style={{ margin: 0, color: '#1e293b' }}>🏢 ระบบบัญชีและการเงิน (Accounting System)</h2>
        <span style={{ fontSize: '12px', color: '#64748b' }}>โมดูลแยกเดี่ยว - อยู่ระหว่างการวางโครงสร้าง</span>
      </header>

      {/* พื้นที่สำหรับใส่ฟังก์ชันบัญชีในอนาคต */}
      <main style={{ background: '#f8fafc', padding: '40px', borderRadius: '8px', textAlign: 'center' }}>
        <p style={{ color: '#475569', fontSize: '16px' }}>
          พื้นที่เตรียมพร้อมสำหรับการพัฒนาหน้า /accounting
        </p>
      </main>
    </div>
  );
}