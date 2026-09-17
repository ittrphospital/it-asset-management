import React, { useState } from 'react';
import { supabase } from './supabaseClient';

export default function ChecklistFormModal({ isOpen, onClose, onSuccess }) {
  const [checkerName, setCheckerName] = useState('');
  const [department, setDepartment] = useState('ฝ่ายเทคโนโลยีสารสนเทศ');
  const [title, setTitle] = useState('Check list systems 09_69');
  const [checkStatus, setCheckStatus] = useState('ปกติ');
  const [remarks, setRemarks] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fluentFontStack = '"Segoe UI Variable Text", "Segoe UI", Tahoma, sans-serif';

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!checkerName.trim()) {
      alert('โปรดระบุชื่อผู้ตรวจสอบ/ผู้กรอกข้อมูล');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('system_checklists')
        .insert([
          {
            title: title,
            checker_name: checkerName,
            department: department,
            check_status: checkStatus,
            remarks: remarks
          }
        ]);

      if (error) throw error;

      alert('บันทึกข้อมูลแบบฟอร์มเข้าสู่ระบบเรียบร้อยแล้ว');
      onSuccess();
      onClose();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, fontFamily: fluentFontStack }}>
      <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', width: '100%', maxWidth: '500px', padding: '24px', boxShadow: '0 12px 32px rgba(0,0,0,0.18)', border: '1px solid #e0e0e0' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f0f0f0', paddingBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1a1a1a' }}>
            📋 แบบฟอร์มกรอกข้อมูลออนไลน์
          </h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer', color: '#616161' }}>✕</button>
        </div>

        {/* Form Input */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, display: 'block', marginBottom: '4px', color: '#1a1a1a' }}>หัวข้อ / หัวเรื่องแบบฟอร์ม</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #d1d1d1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600, display: 'block', marginBottom: '4px', color: '#1a1a1a' }}>ชื่อผู้กรอก / ผู้ตรวจสอบ *</label>
              <input type="text" value={checkerName} onChange={e => setCheckerName(e.target.value)} required placeholder="เช่น สมชาย ใจดี" style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #d1d1d1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600, display: 'block', marginBottom: '4px', color: '#1a1a1a' }}>ฝ่ายงาน</label>
              <input type="text" value={department} onChange={e => setDepartment(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #d1d1d1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, display: 'block', marginBottom: '4px', color: '#1a1a1a' }}>ผลการตรวจสอบ / สถานะ</label>
            <select value={checkStatus} onChange={e => setCheckStatus(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #d1d1d1', fontSize: '13px', outline: 'none', backgroundColor: '#ffffff', boxSizing: 'border-box' }}>
              <option value="ปกติ">✅ ระบบทำงานปกติ (Pass)</option>
              <option value="พบปัญหา">⚠️ พบปัญหาบางส่วน (Issue)</option>
              <option value="รอแก้ไข">⏳ อยู่ระหว่างดำเนินการแก้ไข (Pending)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, display: 'block', marginBottom: '4px', color: '#1a1a1a' }}>หมายเหตุ / รายละเอียดเพิ่มเติม</label>
            <textarea rows="3" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="ระบุรายละเอียดอุปกรณ์ หรือจุดที่พบปัญหา..." style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #d1d1d1', fontSize: '13px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} style={{ padding: '7px 14px', border: '1px solid #d1d1d1', backgroundColor: '#ffffff', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}>
              ยกเลิก
            </button>
            <button type="submit" disabled={isLoading} style={{ padding: '7px 18px', border: 'none', backgroundColor: '#005fb8', color: '#ffffff', borderRadius: '4px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              {isLoading ? 'กำลังบันทึก...' : '💾 บันทึกข้อมูล'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}