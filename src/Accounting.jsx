import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function Accounting() {
  const [currentTab, setCurrentTab] = useState('all');
  const [isAdmin, setIsAdmin] = useState(true);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(true);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFileType, setSelectedFileType] = useState('all');
  const [sortBy, setSortBy] = useState('latest');

  const [documentList, setDocumentList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [targetCategory, setTargetCategory] = useState('hr');

  // Form Upload State
  const [formData, setFormData] = useState({
    title: '',
    category: 'it',
    department: 'ฝ่ายสารสนเทศ',
    version: '1.0',
    description: '',
    dataType: 'file', // 'file' หรือ 'link'
    externalUrl: '',
    file: null
  });

  const macFontStack = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif';

  const categoriesList = [
    { id: 'hr', label: 'บุคคล / HR', icon: '👤', dept: 'ฝ่ายบุคคล' },
    { id: 'finance', label: 'การเงิน', icon: '💰', dept: 'ฝ่ายการเงิน' },
    { id: 'purchase', label: 'จัดซื้อ', icon: '🛒', dept: 'ฝ่ายจัดซื้อ' },
    { id: 'it', label: 'IT', icon: '🖥️', dept: 'ฝ่ายสารสนเทศ' },
    { id: 'admin', label: 'ธุรการ', icon: '🏢', dept: 'ฝ่ายธุรการ' },
    { id: 'warehouse', label: 'คลังสินค้า', icon: '📦', dept: 'ฝ่ายคลังสินค้า' },
    { id: 'request', label: 'แบบคำขอ', icon: '📋', dept: 'ทุกแผนก' },
    { id: 'general', label: 'แบบฟอร์มทั่วไป', icon: '📑', dept: 'ส่วนกลาง' },
  ];

  // 🔄 1. ดึงข้อมูลจาก Supabase Database
  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('accounting_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formatted = data.map(doc => {
          let ext = 'LINK';
          if (doc.blank_file_name && doc.blank_file_name.includes('.')) {
            ext = doc.blank_file_name.split('.').pop().toUpperCase();
          } else if (doc.blank_file_url && !doc.blank_file_url.startsWith('http')) {
            ext = 'PDF';
          }

          return {
            id: doc.id,
            title: doc.title,
            category: doc.category || 'general',
            department: doc.department || getDeptByCategory(doc.category),
            version: doc.version || '1.0',
            description: doc.description || 'ไม่มีคำอธิบายรายละเอียด',
            fileType: ext,
            fileUrl: doc.blank_file_url || '#',
            fileName: doc.blank_file_name || 'แบบฟอร์ม.pdf',
            createdAt: new Date(doc.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            rawDate: new Date(doc.created_at)
          };
        });
        setDocumentList(formatted);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      alert('ไม่สามารถเชื่อมต่อ Supabase ได้: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getDeptByCategory = (cat) => {
    const found = categoriesList.find(c => c.id === cat);
    return found && found.dept ? found.dept : 'ส่วนกลาง';
  };

  const toggleSelectDoc = (id) => {
    setSelectedDocIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // 🗑️ ลบข้อมูลใน Supabase
  const handleBatchDelete = async () => {
    if (selectedDocIds.length === 0) return;
    if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบรายการที่เลือก ${selectedDocIds.length} รายการ จาก Supabase?`)) {
      setIsLoading(true);
      try {
        const { error } = await supabase
          .from('accounting_documents')
          .delete()
          .in('id', selectedDocIds);

        if (error) throw error;

        alert('ลบรายการจาก Supabase เรียบร้อยแล้ว!');
        setSelectedDocIds([]);
        fetchDocuments();
      } catch (err) {
        alert('เกิดข้อผิดพลาดในการลบ: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBatchDownload = () => {
    const selectedDocs = documentList.filter(d => selectedDocIds.includes(d.id));
    selectedDocs.forEach(doc => {
      if (doc.fileUrl !== '#') {
        const link = document.createElement('a');
        link.href = doc.fileUrl;
        link.download = doc.fileName;
        link.target = '_blank';
        link.click();
      }
    });
  };

  // 📁 ย้ายหมวดหมู่ใน Supabase
  const handleBatchCategorizeSubmit = async () => {
    setIsLoading(true);
    try {
      const newDept = getDeptByCategory(targetCategory);
      const { error } = await supabase
        .from('accounting_documents')
        .update({ category: targetCategory, department: newDept })
        .in('id', selectedDocIds);

      if (error) throw error;

      alert(`ย้ายหมวดหมู่ใน Supabase ${selectedDocIds.length} รายการเรียบร้อยแล้ว!`);
      setIsCategoryModalOpen(false);
      setSelectedDocIds([]);
      fetchDocuments();
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 📤 อัปโหลดไฟล์ขึ้น Supabase Storage และบันทึกลง Database
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('กรุณากรอกชื่อแบบฟอร์ม');
      return;
    }

    setIsLoading(true);
    try {
      let publicUrl = formData.externalUrl || '#';
      let fileName = 'LINK';

      // ถ้าเป็นไฟล์ -> อัปโหลดขึ้น Supabase Storage Bucket "accounting-forms"
      if (formData.dataType === 'file' && formData.file) {
        fileName = `${Date.now()}_${formData.file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('accounting-forms')
          .upload(fileName, formData.file);

        if (uploadError) throw uploadError;

        // ดึง Public URL ของไฟล์ใน Storage
        const { data: urlData } = supabase.storage
          .from('accounting-forms')
          .getPublicUrl(fileName);

        publicUrl = urlData.publicUrl;
      }

      // บันทึกรายละเอียดลงตาราง accounting_documents
      const { error: dbError } = await supabase
        .from('accounting_documents')
        .insert([
          {
            title: formData.title,
            category: formData.category,
            department: formData.department,
            version: formData.version,
            description: formData.description,
            blank_file_url: publicUrl,
            blank_file_name: formData.dataType === 'file' && formData.file ? formData.file.name : 'LINK'
          }
        ]);

      if (dbError) throw dbError;

      alert('อัปโหลดไฟล์ขึ้น Supabase เรียบร้อยแล้ว!');
      setIsAddModalOpen(false);
      setFormData({ title: '', category: 'it', department: 'ฝ่ายสารสนเทศ', version: '1.0', description: '', dataType: 'file', externalUrl: '', file: null });
      fetchDocuments();

    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึกขึ้น Supabase: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDocs = documentList.filter(doc => {
    const matchSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        doc.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = selectedCategory === 'all' || doc.category === selectedCategory;
    const matchType = selectedFileType === 'all' || doc.fileType.toLowerCase() === selectedFileType.toLowerCase();
    return matchSearch && matchCat && matchType;
  }).sort((a, b) => {
    if (sortBy === 'title') return a.title.localeCompare(b.title, 'th');
    return b.rawDate - a.rawDate;
  });

  const selectedCatObj = selectedCategory === 'all' 
    ? { label: 'แบบฟอร์มทั้งหมด', icon: '📂' }
    : (categoriesList.find(c => c.id === selectedCategory) || { label: 'หมวดหมู่', icon: '📁' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f5f5f7', color: '#1d1d1f', fontFamily: macFontStack }}>
      
      {/* 1. TOP TOOLBAR */}
      <header style={{ height: '56px', backgroundColor: '#ffffff', borderBottom: '1px solid #e5e5e5', display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between', flexShrink: 0, position: 'sticky', top: 0, zIndex: 100 }}>
        
        {isAdmin && selectedDocIds.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' }}>☰</button>
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#0071e3' }}>
                เลือก {selectedDocIds.length} รายการ
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button onClick={() => alert(`แก้ไขรายการ: ${selectedDocIds.join(', ')}`)} style={{ padding: '8px 14px', backgroundColor: '#ffffff', border: '1px solid #d2d2d7', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>✏️ แก้ไข</button>
              <button onClick={() => setIsCategoryModalOpen(true)} style={{ padding: '8px 14px', backgroundColor: '#ffffff', border: '1px solid #d2d2d7', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>📁 จัดหมวดหมู่</button>
              <button onClick={handleBatchDownload} style={{ padding: '8px 14px', backgroundColor: '#ffffff', border: '1px solid #d2d2d7', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>⬇️ ดาวน์โหลด</button>
              <button onClick={handleBatchDelete} style={{ padding: '8px 16px', backgroundColor: '#ff3b30', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>🗑️ ลบ</button>
              <button onClick={() => setSelectedDocIds([])} style={{ border: 'none', background: 'none', color: '#86868b', fontSize: '13px', cursor: 'pointer', marginLeft: '6px' }}>✕ ยกเลิก</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' }}>☰</button>

              <nav style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => { setCurrentTab('home'); setSelectedCategory('all'); }} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', backgroundColor: currentTab === 'home' ? '#e8f2ff' : 'transparent', color: currentTab === 'home' ? '#0071e3' : '#515154', fontWeight: currentTab === 'home' ? 600 : 400, fontSize: '13.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🏠</span> <span>หน้าแรก</span>
                </button>
                <button onClick={() => setCurrentTab('categories')} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', backgroundColor: currentTab === 'categories' ? '#e8f2ff' : 'transparent', color: currentTab === 'categories' ? '#0071e3' : '#515154', fontWeight: currentTab === 'categories' ? 600 : 400, fontSize: '13.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📁</span> <span>หมวดหมู่</span>
                </button>
                <button onClick={() => { setCurrentTab('all'); setSelectedCategory('all'); }} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', backgroundColor: currentTab === 'all' ? '#e8f2ff' : 'transparent', color: currentTab === 'all' ? '#0071e3' : '#515154', fontWeight: currentTab === 'all' ? 600 : 400, fontSize: '13.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📄</span> <span>แบบฟอร์มทั้งหมด</span>
                </button>
              </nav>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={() => { setIsAdmin(!isAdmin); setSelectedDocIds([]); }} style={{ padding: '5px 12px', borderRadius: '20px', border: isAdmin ? '1px solid #ff9500' : '1px solid #d2d2d7', backgroundColor: isAdmin ? '#fff9e6' : '#ffffff', color: isAdmin ? '#d97706' : '#515154', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                {isAdmin ? '🛠️ Admin' : '👤 User'}
              </button>

              {!isAdmin ? (
                <input
                  type="text"
                  placeholder="🔍 ค้นหาแบบฟอร์ม..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: '220px', padding: '8px 14px', borderRadius: '10px', border: '1px solid #d2d2d7', backgroundColor: '#f9f9fb', fontSize: '13px', outline: 'none' }}
                />
              ) : (
                <button onClick={() => setIsAddModalOpen(true)} style={{ height: '36px', padding: '0 18px', backgroundColor: '#0071e3', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(0, 113, 227, 0.25)' }}>
                  <span>＋</span> <span>เพิ่มแบบฟอร์ม</span>
                </button>
              )}
            </div>
          </>
        )}

      </header>

      {/* 2. MAIN BODY LAYOUT */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Left Sidebar Menu */}
        {isSidebarOpen && (
          <aside style={{ width: '250px', backgroundColor: '#ffffff', borderRight: '1px solid #e5e5e5', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '12px', flexShrink: 0, overflowY: 'auto' }}>
            
            <div>
              <button
                onClick={() => setIsFavoritesOpen(!isFavoritesOpen)}
                style={{ width: '100%', padding: '6px 8px', backgroundColor: 'transparent', border: 'none', color: '#1d1d1f', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', textAlign: 'left' }}
              >
                <span style={{ fontSize: '11px', color: '#86868b', transition: 'transform 0.2s', display: 'inline-block', transform: isFavoritesOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                <span>เมนูด่วน</span>
              </button>

              {isFavoritesOpen && (
                <div style={{ paddingLeft: '12px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <button
                    onClick={() => { setSelectedCategory('all'); setCurrentTab('all'); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: selectedCategory === 'all' ? '#e8f2ff' : 'transparent',
                      color: selectedCategory === 'all' ? '#0071e3' : '#515154',
                      fontWeight: selectedCategory === 'all' ? 600 : 400,
                      fontSize: '13px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>📂</span>
                      <span>แบบฟอร์มทั้งหมด</span>
                    </div>
                    <span style={{ fontSize: '11px', backgroundColor: '#f2f2f7', color: '#86868b', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                      {documentList.length}
                    </span>
                  </button>
                </div>
              )}
            </div>

            <div>
              <button
                onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
                style={{ width: '100%', padding: '6px 8px', backgroundColor: 'transparent', border: 'none', color: '#1d1d1f', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', textAlign: 'left' }}
              >
                <span style={{ fontSize: '11px', color: '#86868b', transition: 'transform 0.2s', display: 'inline-block', transform: isCategoriesOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                <span>หมวดหมู่แบบฟอร์ม</span>
              </button>

              {isCategoriesOpen && (
                <div style={{ paddingLeft: '12px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {categoriesList.map(cat => {
                    const isSelected = selectedCategory === cat.id;
                    const count = documentList.filter(d => d.category === cat.id).length;

                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          setCurrentTab('all');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justify: 'space-between',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: isSelected ? '#e8f2ff' : 'transparent',
                          color: isSelected ? '#0071e3' : '#515154',
                          fontWeight: isSelected ? 600 : 400,
                          fontSize: '13px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '15px' }}>{cat.icon}</span>
                          <span>{cat.label}</span>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '11px', backgroundColor: isSelected ? '#ffffff' : '#f2f2f7', color: isSelected ? '#0071e3' : '#86868b', padding: '2px 7px', borderRadius: '10px', fontWeight: 600 }}>
                            {count}
                          </span>
                          <span style={{ fontSize: '10px', color: isSelected ? '#0071e3' : '#c7c7cc' }}>›</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

          </aside>
        )}

        {/* Right Content Area */}
        <main style={{ flex: 1, padding: '28px 36px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e5e5', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>{selectedCatObj.icon}</span>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#1d1d1f' }}>
                {selectedCatObj.label}
              </h2>
              <span style={{ fontSize: '13px', color: '#86868b', fontWeight: 400 }}>
                ({filteredDocs.length} รายการ)
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select value={selectedFileType} onChange={(e) => setSelectedFileType(e.target.value)} style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #d2d2d7', fontSize: '12.5px', outline: 'none', backgroundColor: '#ffffff' }}>
                <option value="all">ทุกประเภทไฟล์ / ลิงก์ ▼</option>
                <option value="docx">DOCX (Word)</option>
                <option value="xlsx">XLSX (Excel)</option>
                <option value="pdf">PDF</option>
                <option value="link">LINK (ลิงก์ภายนอก)</option>
              </select>

              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #d2d2d7', fontSize: '12.5px', outline: 'none', backgroundColor: '#ffffff' }}>
                <option value="latest">เรียงตาม: ล่าสุด ▼</option>
                <option value="title">เรียงตาม: ชื่อ A-Z ▼</option>
              </select>
            </div>
          </div>

          {/* Document Cards */}
          {isLoading ? (
            <div style={{ textAlign: 'center', color: '#86868b', marginTop: '40px' }}>⏳ กำลังดึงข้อมูลจาก Supabase...</div>
          ) : filteredDocs.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#86868b', marginTop: '40px', fontSize: '14px' }}>
              ยังไม่มีแบบฟอร์มหรือลิงก์ในระบบ Supabase (กด "+ เพิ่มแบบฟอร์ม" ด้านบนเพื่อเพิ่มข้อมูล)
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredDocs.map(doc => {
                const isChecked = selectedDocIds.includes(doc.id);
                const isLink = doc.fileType === 'LINK';

                return (
                  <div
                    key={doc.id}
                    style={{
                      backgroundColor: isChecked ? '#f0f7ff' : '#ffffff',
                      borderRadius: '14px',
                      padding: '20px 24px',
                      border: isChecked ? '1px solid #0071e3' : '1px solid #e5e5e5',
                      display: 'flex',
                      justify: 'space-between',
                      alignItems: 'center',
                      gap: '20px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1 }}>
                      {isAdmin && (
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectDoc(doc.id)}
                          style={{ marginTop: '6px', width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                      )}

                      <span style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        backgroundColor: isLink ? '#f3e8ff' : doc.fileType === 'XLSX' ? '#e6f4ea' : doc.fileType === 'DOCX' ? '#e8f2ff' : '#fce8e6',
                        color: isLink ? '#7e22ce' : doc.fileType === 'XLSX' ? '#137333' : doc.fileType === 'DOCX' ? '#1a73e8' : '#c5221f',
                        fontSize: '12px',
                        fontWeight: 700,
                        marginTop: '2px'
                      }}>
                        {isLink ? '🔗 LINK' : doc.fileType}
                      </span>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1d1d1f' }}>
                            {doc.title}
                          </h3>
                          <span style={{ fontSize: '11px', backgroundColor: '#f2f2f7', color: '#86868b', padding: '2px 8px', borderRadius: '10px' }}>
                            v{doc.version}
                          </span>
                        </div>

                        <p style={{ margin: '4px 0 8px 0', fontSize: '13.5px', color: '#515154', lineHeight: 1.4 }}>
                          {doc.description}
                        </p>

                        <div style={{ fontSize: '12px', color: '#86868b' }}>
                          ฝ่าย: <strong>{doc.department}</strong> • อัปเดตเมื่อ: {doc.createdAt}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                      <button onClick={() => setPreviewDoc(doc)} style={{ padding: '8px 16px', backgroundColor: '#f2f2f7', color: '#1d1d1f', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>👁️ ดู</button>
                      
                      {isLink ? (
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ padding: '8px 18px', backgroundColor: '#7e22ce', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(126, 34, 206, 0.25)' }}
                        >
                          <span>🔗</span>
                          <span>เปิดลิงก์แจ้งซ่อม</span>
                        </a>
                      ) : (
                        <a
                          href={doc.fileUrl}
                          download={doc.fileName}
                          style={{ padding: '8px 18px', backgroundColor: '#0071e3', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(0, 113, 227, 0.2)' }}
                        >
                          <span>⬇️</span>
                          <span>ดาวน์โหลด</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </main>
      </div>

      {/* Preview Modal */}
      {previewDoc && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', width: '100%', maxWidth: '580px', padding: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', border: '1px solid #e5e5e5' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '11px', backgroundColor: previewDoc.fileType === 'LINK' ? '#f3e8ff' : '#e8f2ff', color: previewDoc.fileType === 'LINK' ? '#7e22ce' : '#0071e3', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                  {previewDoc.fileType === 'LINK' ? '🔗 ลิงก์ระบบภายนอก' : previewDoc.fileType} • Version {previewDoc.version}
                </span>
                <h3 style={{ margin: '8px 0 0 0', fontSize: '18px', fontWeight: 700 }}>{previewDoc.title}</h3>
              </div>
              <button onClick={() => setPreviewDoc(null)} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#86868b', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ backgroundColor: '#f9f9fb', padding: '16px', borderRadius: '12px', border: '1px solid #e5e5e5', marginBottom: '20px', fontSize: '13.5px', color: '#515154', lineHeight: 1.6 }}>
              📌 <strong>รายละเอียด:</strong><br />
              {previewDoc.description}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px', color: '#86868b', marginBottom: '24px' }}>
              <div><strong>ผู้รับผิดชอบ:</strong> {previewDoc.department}</div>
              <div><strong>วันที่อัปโหลด:</strong> {previewDoc.createdAt}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e5e5e5', paddingTop: '20px' }}>
              <button onClick={() => setPreviewDoc(null)} style={{ padding: '10px 20px', backgroundColor: '#ffffff', border: '1px solid #d2d2d7', borderRadius: '10px', fontSize: '13px', cursor: 'pointer' }}>ปิดหน้าต่าง</button>
              
              {previewDoc.fileType === 'LINK' ? (
                <a href={previewDoc.fileUrl} target="_blank" rel="noreferrer" style={{ padding: '10px 24px', backgroundColor: '#7e22ce', color: '#ffffff', borderRadius: '10px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
                  🔗 เปิดไปยังหน้าแจ้งซ่อม
                </a>
              ) : (
                <a href={previewDoc.fileUrl} download={previewDoc.fileName} style={{ padding: '10px 24px', backgroundColor: '#0071e3', color: '#ffffff', borderRadius: '10px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
                  ⬇️ ดาวน์โหลดไฟล์เอกสาร
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Categorize Modal */}
      {isCategoryModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', width: '100%', maxWidth: '440px', padding: '28px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: 600 }}>📁 ย้ายหมวดหมู่แบบฟอร์ม ({selectedDocIds.length} รายการ)</h3>
            
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>เลือกหมวดหมู่ปลายทาง:</label>
            <select value={targetCategory} onChange={e => setTargetCategory(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #d2d2d7', backgroundColor: '#f5f5f7', fontSize: '14px', outline: 'none', marginBottom: '24px' }}>
              {categoriesList.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setIsCategoryModalOpen(false)} style={{ padding: '9px 18px', backgroundColor: '#ffffff', border: '1px solid #d2d2d7', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>ยกเลิก</button>
              <button onClick={handleBatchCategorizeSubmit} style={{ padding: '9px 22px', backgroundColor: '#0071e3', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>บันทึกย้ายหมวดหมู่</button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Add Modal (โยนไฟล์เข้า Supabase Storage หรือ ลิงก์) */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', width: '100%', maxWidth: '640px', padding: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e5e5e5', paddingBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>📤 อัปโหลดแบบฟอร์ม / เพิ่มลิงก์ลง Supabase</h3>
              <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#86868b', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>รูปแบบข้อมูลที่จะเพิ่ม</label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{ fontSize: '13.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="radio"
                      name="dataType"
                      value="file"
                      checked={formData.dataType === 'file'}
                      onChange={() => setFormData({ ...formData, dataType: 'file' })}
                    />
                    📄 แนบไฟล์เอกสาร (ส่งขึ้น Supabase Storage)
                  </label>
                  <label style={{ fontSize: '13.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="radio"
                      name="dataType"
                      value="link"
                      checked={formData.dataType === 'link'}
                      onChange={() => setFormData({ ...formData, dataType: 'link' })}
                    />
                    🔗 ลิงก์ระบบภายนอก (เช่น ระบบแจ้งซ่อม IT)
                  </label>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>ชื่อรายการ *</label>
                <input type="text" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="เช่น แบบฟอร์มขออนุมัติการลา หรือ ระบบแจ้งซ่อม IT Online" style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #d2d2d7', backgroundColor: '#f5f5f7', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>หมวดหมู่</label>
                  <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value, department: getDeptByCategory(e.target.value) })} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #d2d2d7', backgroundColor: '#f5f5f7', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}>
                    {categoriesList.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>ผู้รับผิดชอบ</label>
                  <input type="text" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} placeholder="เช่น ฝ่ายสารสนเทศ" style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #d2d2d7', backgroundColor: '#f5f5f7', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }} />
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>เวอร์ชัน</label>
                  <input type="text" value={formData.version} onChange={e => setFormData({ ...formData, version: e.target.value })} placeholder="1.0" style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #d2d2d7', backgroundColor: '#f5f5f7', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>คำอธิบายรายละเอียด</label>
                <textarea rows="2" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="ระบุวัตถุประสงค์ หรือคำแนะนำในการใช้งาน..." style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #d2d2d7', backgroundColor: '#f5f5f7', fontSize: '14px', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>

              {formData.dataType === 'link' ? (
                <div style={{ backgroundColor: '#f3e8ff', padding: '18px', borderRadius: '12px', border: '1px solid #d8b4fe' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#6b21a8', display: 'block', marginBottom: '6px' }}>🔗 ระบุ URL ลิงก์แจ้งซ่อม / ระบบภายนอก *</label>
                  <input
                    type="url"
                    required
                    value={formData.externalUrl}
                    onChange={e => setFormData({ ...formData, externalUrl: e.target.value })}
                    placeholder="https://helpdesk.company.com หรือ https://forms.google.com/..."
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #c084fc', backgroundColor: '#ffffff', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ) : (
                <div style={{ backgroundColor: '#f9f9fb', padding: '18px', borderRadius: '12px', border: '1px dashed #c7c7cc' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>📄 แนบไฟล์ส่งเข้า Supabase Storage (.xlsx, .docx, .pdf) *</label>
                  <input type="file" required accept=".xlsx,.xls,.docx,.doc,.pdf" onChange={e => setFormData({ ...formData, file: e.target.files[0] })} style={{ width: '100%', fontSize: '13px', cursor: 'pointer' }} />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', borderTop: '1px solid #e5e5e5', paddingTop: '20px' }}>
                <button type="button" onClick={() => setIsAddModalOpen(false)} style={{ padding: '10px 22px', backgroundColor: '#ffffff', border: '1px solid #d2d2d7', borderRadius: '10px', cursor: 'pointer', fontSize: '13.5px' }}>ยกเลิก</button>
                <button type="submit" disabled={isLoading} style={{ padding: '10px 28px', backgroundColor: '#0071e3', color: '#ffffff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '13.5px', fontWeight: 600 }}>{isLoading ? 'กำลังบันทึกลง Supabase...' : 'อัปโหลดลง Supabase'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}