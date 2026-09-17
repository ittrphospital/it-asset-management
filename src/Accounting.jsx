import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function Accounting() {
  const [activeTopTab, setActiveTopTab] = useState('Home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // State เมนูข้าง (Collapsible Sidebar)
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(true);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(true);
  const [isAccountOpen, setIsAccountOpen] = useState(true);

  // State จัดการเอกสาร
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [isQuickStepOpen, setIsQuickStepOpen] = useState(false);
  const [viewDensity, setViewDensity] = useState('normal');
  const [isLoading, setIsLoading] = useState(false);

  // Preview State
  const [previewDoc, setPreviewDoc] = useState(null);

  // Document List State
  const [documentList, setDocumentList] = useState([]);

  // Form State
  const [newDoc, setNewDoc] = useState({
    title: '',
    category: 'purchase',
    description: '',
    blankFile: null,
    exampleFile: null
  });

  const macFontStack = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif';
  const topTabs = ['File', 'Home', 'View', 'Help'];

  // 🔄 1. ดึงข้อมูลเอกสารทั้งหมดจาก Supabase
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
        const formatted = data.map(doc => ({
          id: doc.id,
          title: doc.title,
          category: doc.category,
          updatedAt: new Date(doc.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }),
          description: doc.description || 'ไม่มีคำอธิบายเพิ่มเติม',
          blankFileUrl: doc.blank_file_url || '#',
          exampleFileUrl: doc.example_file_url || '#',
          blankFileName: doc.blank_file_name || 'แบบฟอร์มเปล่า.xlsx',
          pinned: doc.pinned || false,
          downloads: doc.downloads || 0
        }));
        setDocumentList(formatted);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 📤 2. อัปโหลดไฟล์ขึ้น Supabase Storage และบันทึกลง Database
  const handleCreateDocSubmit = async (e) => {
    e.preventDefault();
    if (!newDoc.title.trim()) {
      alert('กรุณากรอกชื่อแบบฟอร์มเอกสาร');
      return;
    }

    setIsLoading(true);
    try {
      let blankPublicUrl = '#';
      let examplePublicUrl = '#';

      // อัปโหลดไฟล์แบบฟอร์มเปล่า
      if (newDoc.blankFile) {
        const fileExt = newDoc.blankFile.name.split('.').pop();
        const fileName = `blank_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('accounting-forms')
          .upload(fileName, newDoc.blankFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('accounting-forms')
          .getPublicUrl(fileName);
        
        blankPublicUrl = urlData.publicUrl;
      }

      // อัปโหลดไฟล์ตัวอย่างที่กรอกแล้ว
      if (newDoc.exampleFile) {
        const fileExt = newDoc.exampleFile.name.split('.').pop();
        const fileName = `example_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('accounting-forms')
          .upload(fileName, newDoc.exampleFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('accounting-forms')
          .getPublicUrl(fileName);
        
        examplePublicUrl = urlData.publicUrl;
      }

      // บันทึกข้อมูลลงตาราง accounting_documents
      const { error: dbError } = await supabase
        .from('accounting_documents')
        .insert([
          {
            title: newDoc.title,
            category: newDoc.category,
            description: newDoc.description,
            blank_file_url: blankPublicUrl,
            example_file_url: examplePublicUrl,
            blank_file_name: newDoc.blankFile ? newDoc.blankFile.name : 'แบบฟอร์มเปล่า.xlsx',
            pinned: false,
            downloads: 0
          }
        ]);

      if (dbError) throw dbError;

      alert('อัปโหลดแบบฟอร์มเอกสารขึ้นระบบ Supabase เรียบร้อยแล้ว!');
      setIsAddModalOpen(false);
      setNewDoc({ title: '', category: 'purchase', description: '', blankFile: null, exampleFile: null });
      fetchDocuments();

    } catch (err) {
      console.error('Upload Error:', err);
      alert('เกิดข้อผิดพลาดในการอัปโหลด: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 🗑️ 3. ลบเอกสารที่เลือกจาก Supabase
  const handleDeleteSelected = async () => {
    if (selectedDocIds.length === 0) {
      alert('กรุณาเลือกรายการเอกสารที่ต้องการลบก่อนครับ');
      return;
    }
    if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบเอกสารที่เลือก ${selectedDocIds.length} รายการ?`)) {
      setIsLoading(true);
      try {
        const { error } = await supabase
          .from('accounting_documents')
          .delete()
          .in('id', selectedDocIds);

        if (error) throw error;

        setSelectedDocIds([]);
        fetchDocuments();
      } catch (err) {
        alert('เกิดข้อผิดพลาดในการลบ: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // 📌 4. สลับสถานะปักหมุด
  const handleTogglePinSelected = async () => {
    if (selectedDocIds.length === 0) {
      alert('กรุณาเลือกรายการเอกสารก่อนครับ');
      return;
    }
    try {
      for (const id of selectedDocIds) {
        const targetDoc = documentList.find(d => d.id === id);
        if (targetDoc) {
          await supabase
            .from('accounting_documents')
            .update({ pinned: !targetDoc.pinned })
            .eq('id', id);
        }
      }
      setSelectedDocIds([]);
      fetchDocuments();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการปักหมุด: ' + err.message);
    }
  };

  // 📥 5. ส่งออกเป็นไฟล์ CSV
  const exportToCSV = () => {
    if (filteredDocs.length === 0) {
      alert('ไม่มีรายการเอกสารสำหรับส่งออก');
      return;
    }
    const headers = ['ID', 'Title', 'Category', 'Updated At', 'Description'];
    const rows = filteredDocs.map(d => [`"${d.id}"`, `"${d.title}"`, `"${d.category}"`, `"${d.updatedAt}"`, `"${d.description}"`]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Accounting_Forms_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const categories = [
    { id: 'all', label: 'เอกสารทั้งหมด', icon: '📂', count: documentList.length },
    { id: 'purchase', label: 'แบบฟอร์มจัดซื้อ/ตั้งเบิก', icon: '🛒', count: documentList.filter(d => d.category === 'purchase').length },
    { id: 'expense', label: 'ค่าใช้จ่าย & เดินทาง', icon: '💰', count: documentList.filter(d => d.category === 'expense').length },
    { id: 'tax', label: 'ภาษี & บัญชี', icon: '📑', count: documentList.filter(d => d.category === 'tax').length },
  ];

  const filteredDocs = documentList.filter(doc => {
    const matchCat = selectedCategory === 'all' || doc.category === selectedCategory;
    const matchSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchPinned = !showPinnedOnly || doc.pinned;
    return matchCat && matchSearch && matchPinned;
  });

  const handleSelectDoc = (id) => {
    setSelectedDocIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedDocIds.length === filteredDocs.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(filteredDocs.map(d => d.id));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f5f5f7', color: '#1d1d1f', fontFamily: macFontStack, letterSpacing: '-0.01em' }}>
      
      {/* 1. Top Navigation Bar */}
      <header style={{ height: '44px', backgroundColor: '#ffffff', borderBottom: '1px solid #e5e5e5', display: 'flex', alignItems: 'center', padding: '0 16px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '100%' }}>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title="ซ่อน/แสดง เมนูข้าง"
            style={{ width: '30px', height: '30px', backgroundColor: isSidebarOpen ? '#e8e8ed' : 'transparent', border: 'none', borderRadius: '6px', color: '#1d1d1f', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ☰
          </button>

          <nav style={{ display: 'flex', height: '100%', alignItems: 'center', gap: '4px' }}>
            {topTabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTopTab(tab)}
                style={{
                  height: '100%',
                  padding: '0 14px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: activeTopTab === tab ? '2px solid #0071e3' : '2px solid transparent',
                  color: activeTopTab === tab ? '#0071e3' : '#515154',
                  fontWeight: activeTopTab === tab ? 600 : 400,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* 🖨️ ปุ่มพิมพ์ที่มุมขวาสุด */}
        <button
          onClick={() => window.print()}
          title="พิมพ์เอกสาร / พิมพ์หน้ารายงาน"
          style={{ height: '32px', padding: '0 16px', backgroundColor: '#ffffff', color: '#1d1d1f', border: '1px solid #d2d2d7', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
        >
          <span style={{ fontSize: '15px' }}>🖨️</span>
          <span>พิมพ์</span>
        </button>
      </header>

      {/* 2. Ribbon Toolbar */}
      <div style={{ minHeight: '44px', backgroundColor: '#fbfbfd', borderBottom: '1px solid #e5e5e5', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '8px', flexWrap: 'wrap', position: 'relative' }}>
        {activeTopTab === 'File' && (
          <>
            <button onClick={exportToCSV} style={{ height: '32px', backgroundColor: '#34c759', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '0 12px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📥</span> <span>ส่งออกเอกสาร (CSV)</span>
            </button>
            <button onClick={() => window.location.reload()} style={{ height: '32px', backgroundColor: '#ffffff', color: '#1d1d1f', border: '1px solid #d2d2d7', borderRadius: '6px', padding: '0 12px', fontSize: '12.5px', fontWeight: 500, cursor: 'pointer' }}>
              🔄 รีโหลดระบบ
            </button>
            <span style={{ fontSize: '12px', color: '#86868b', fontWeight: 400, marginLeft: 'auto' }}>ระบบบัญชี v1.0.0 (Production)</span>
          </>
        )}

        {activeTopTab === 'Home' && (
          <>
            <button 
              onClick={() => setIsAddModalOpen(true)} 
              style={{ height: '34px', backgroundColor: '#0071e3', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '0 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 6px rgba(0, 113, 227, 0.25)' }}
            >
              <span style={{ fontSize: '15px' }}>📝</span> <span>เพิ่มเอกสารใหม่</span>
            </button>
            <div style={{ width: '1px', height: '20px', backgroundColor: '#d2d2d7', margin: '0 4px' }} />
            <button onClick={handleDeleteSelected} style={{ height: '32px', backgroundColor: selectedDocIds.length > 0 ? '#ff3b30' : 'transparent', color: selectedDocIds.length > 0 ? '#ffffff' : '#515154', border: 'none', borderRadius: '6px', padding: '0 12px', fontSize: '12.5px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>🗑️</span> <span>ลบ ({selectedDocIds.length})</span>
            </button>
            <button onClick={handleTogglePinSelected} style={{ height: '32px', backgroundColor: 'transparent', color: '#515154', border: 'none', borderRadius: '6px', padding: '0 10px', fontSize: '12.5px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>🚩</span> <span>ปักหมุด</span>
            </button>
            <button onClick={() => setSelectedDocIds([])} style={{ height: '32px', backgroundColor: 'transparent', color: '#515154', border: 'none', borderRadius: '6px', padding: '0 10px', fontSize: '12.5px', fontWeight: 500, cursor: 'pointer' }}>
              🧹 ล้างการเลือก
            </button>
            <div style={{ width: '1px', height: '20px', backgroundColor: '#d2d2d7', margin: '0 4px' }} />
            <div style={{ position: 'relative' }}>
              <button onClick={() => setIsQuickStepOpen(!isQuickStepOpen)} style={{ height: '32px', backgroundColor: '#ffffff', border: '1px solid #d2d2d7', color: '#1d1d1f', borderRadius: '6px', padding: '0 12px', fontSize: '12.5px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>⚡ ขั้นตอนด่วน</span> <span style={{ fontSize: '10px', color: '#86868b' }}>▼</span>
              </button>
              {isQuickStepOpen && (
                <div style={{ position: 'absolute', top: '36px', left: 0, backgroundColor: '#ffffff', border: '1px solid #d2d2d7', borderRadius: '8px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '2px', zIndex: 100, width: '190px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
                  <button onClick={() => { handleSelectAll(); setIsQuickStepOpen(false); }} style={{ padding: '8px 12px', backgroundColor: 'transparent', color: '#1d1d1f', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '12.5px', fontWeight: 400, borderRadius: '4px' }}>
                    ☑️ {selectedDocIds.length === filteredDocs.length ? 'ยกเลิกเลือกทั้งหมด' : 'เลือกทั้งหมดในหน้านี้'}
                  </button>
                  <button onClick={() => { setShowPinnedOnly(!showPinnedOnly); setIsQuickStepOpen(false); }} style={{ padding: '8px 12px', backgroundColor: 'transparent', color: showPinnedOnly ? '#0071e3' : '#1d1d1f', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '12.5px', fontWeight: 400, borderRadius: '4px' }}>
                    📌 {showPinnedOnly ? 'แสดงเอกสารทั้งหมด' : 'แสดงเฉพาะที่ปักหมุด'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {activeTopTab === 'View' && (
          <>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ height: '32px', backgroundColor: isSidebarOpen ? '#e8e8ed' : 'transparent', color: '#1d1d1f', border: '1px solid #d2d2d7', borderRadius: '6px', padding: '0 12px', fontSize: '12.5px', fontWeight: 500, cursor: 'pointer' }}>
              👁️ {isSidebarOpen ? 'ซ่อน Sidebar' : 'แสดง Sidebar'}
            </button>
            <button onClick={() => setShowPinnedOnly(!showPinnedOnly)} style={{ height: '32px', backgroundColor: showPinnedOnly ? '#0071e3' : 'transparent', color: showPinnedOnly ? '#ffffff' : '#1d1d1f', border: '1px solid #d2d2d7', borderRadius: '6px', padding: '0 12px', fontSize: '12.5px', fontWeight: 500, cursor: 'pointer' }}>
              📌 {showPinnedOnly ? 'แสดงทั้งหมด' : 'กรองเฉพาะปักหมุด'}
            </button>
            <div style={{ width: '1px', height: '20px', backgroundColor: '#d2d2d7', margin: '0 4px' }} />
            <button onClick={() => setViewDensity(viewDensity === 'normal' ? 'compact' : 'normal')} style={{ height: '32px', backgroundColor: 'transparent', color: '#515154', border: 'none', borderRadius: '6px', padding: '0 12px', fontSize: '12.5px', fontWeight: 500, cursor: 'pointer' }}>
              📏 ความหนาแน่น: {viewDensity === 'normal' ? 'ปกติ' : 'กะทัดรัด'}
            </button>
          </>
        )}

        {activeTopTab === 'Help' && (
          <>
            <button onClick={() => alert('คำแนะนำ: เลือกหมวดหมู่เอกสารทางซ้ายมือ และดาวน์โหลดแบบฟอร์มเปล่า (.xlsx) หรือตัวอย่างที่กรอกแล้ว (.pdf) ได้ทันที')} style={{ height: '32px', backgroundColor: '#ffffff', color: '#1d1d1f', border: '1px solid #d2d2d7', borderRadius: '6px', padding: '0 14px', fontSize: '12.5px', fontWeight: 500, cursor: 'pointer' }}>
              ❓ คู่มือการใช้งาน
            </button>
            <button onClick={() => alert('ติดต่อทีม IT แผนกสารสนเทศ โทรศัพท์ภายใน หรือส่งข้อความผ่านระบบ Ticket')} style={{ height: '32px', backgroundColor: 'transparent', color: '#515154', border: 'none', borderRadius: '6px', padding: '0 12px', fontSize: '12.5px', fontWeight: 500, cursor: 'pointer' }}>
              📞 ติดต่อ IT Support
            </button>
          </>
        )}
      </div>

      {/* 3. Main Body Layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Left Sidebar */}
        {isSidebarOpen && (
          <aside style={{ width: '250px', backgroundColor: '#ffffff', borderRight: '1px solid #e5e5e5', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto' }}>
            
            <div style={{ borderBottom: '1px solid #f2f2f7' }}>
              <button
                onClick={() => setIsAccountOpen(!isAccountOpen)}
                style={{ width: '100%', padding: '12px 16px', backgroundColor: 'transparent', border: 'none', color: '#1d1d1f', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', textAlign: 'left' }}
              >
                <span style={{ fontSize: '10px', color: '#86868b', transform: isAccountOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>▶</span>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>it.trphospital@gmail.com</span>
              </button>

              {isAccountOpen && (
                <div style={{ padding: '0 8px 10px 28px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '12px', color: '#86868b', fontWeight: 400 }}>📂 แผนกบัญชีและการเงิน</div>
                </div>
              )}
            </div>

            <div style={{ borderBottom: '1px solid #f2f2f7' }}>
              <button
                onClick={() => setIsFavoritesOpen(!isFavoritesOpen)}
                style={{ width: '100%', padding: '10px 16px', backgroundColor: 'transparent', border: 'none', color: '#1d1d1f', fontWeight: 600, fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', textAlign: 'left' }}
              >
                <span style={{ fontSize: '10px', color: '#86868b', transform: isFavoritesOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>▶</span>
                <span>Favorites (รายการโปรด)</span>
              </button>

              {isFavoritesOpen && (
                <div style={{ padding: '0 8px 8px 16px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <button
                    onClick={() => { setSelectedCategory('all'); setShowPinnedOnly(true); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', borderRadius: '6px', border: 'none', backgroundColor: showPinnedOnly ? '#e8f2ff' : 'transparent', color: showPinnedOnly ? '#0071e3' : '#515154', fontWeight: showPinnedOnly ? 600 : 400, fontSize: '12.5px', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <span>📌</span>
                    <span>เอกสารปักหมุดด่วน</span>
                  </button>
                </div>
              )}
            </div>

            <div>
              <button
                onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
                style={{ width: '100%', padding: '10px 16px', backgroundColor: 'transparent', border: 'none', color: '#1d1d1f', fontWeight: 600, fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', textAlign: 'left' }}
              >
                <span style={{ fontSize: '10px', color: '#86868b', transform: isCategoriesOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>▶</span>
                <span>หมวดหมู่แบบฟอร์ม</span>
              </button>

              {isCategoriesOpen && (
                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 8px 12px 16px' }}>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => { setSelectedCategory(cat.id); setShowPinnedOnly(false); }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderRadius: '6px', border: 'none', backgroundColor: (selectedCategory === cat.id && !showPinnedOnly) ? '#e8f2ff' : 'transparent', color: (selectedCategory === cat.id && !showPinnedOnly) ? '#0071e3' : '#515154', fontWeight: (selectedCategory === cat.id && !showPinnedOnly) ? 600 : 400, fontSize: '12.5px', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </div>
                      <span style={{ fontSize: '11px', backgroundColor: '#f2f2f7', padding: '2px 8px', borderRadius: '10px', color: '#86868b', fontWeight: 500 }}>
                        {cat.count}
                      </span>
                    </button>
                  ))}
                </nav>
              )}
            </div>

          </aside>
        )}

        {/* Main Content Area */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#f5f5f7', overflow: 'hidden' }}>
          
          <header style={{ padding: '12px 24px', borderBottom: '1px solid #e5e5e5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>รายการแบบฟอร์ม ({filteredDocs.length} รายการ)</span>
              {showPinnedOnly && <span style={{ fontSize: '11px', backgroundColor: '#e8f2ff', padding: '2px 8px', borderRadius: '10px', color: '#0071e3', fontWeight: 600 }}>เฉพาะปักหมุด 📌</span>}
            </div>

            <input
              type="text"
              placeholder="🔍 ค้นหาชื่อแบบฟอร์ม..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '280px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #d2d2d7', backgroundColor: '#f5f5f7', color: '#1d1d1f', fontSize: '13px', outline: 'none' }}
            />
          </header>

          <div style={{ flex: 1, padding: viewDensity === 'compact' ? '12px 24px' : '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: viewDensity === 'compact' ? '10px' : '16px' }}>
            
            {isLoading ? (
              <div style={{ textAlign: 'center', color: '#86868b', marginTop: '40px', fontSize: '14px' }}>⏳ กำลังโหลดข้อมูลแบบฟอร์มจาก Supabase...</div>
            ) : filteredDocs.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#86868b', marginTop: '40px', fontSize: '14px' }}>ไม่พบรายการแบบฟอร์มที่ต้องการ</div>
            ) : (
              filteredDocs.map(doc => {
                const isChecked = selectedDocIds.includes(doc.id);

                return (
                  <div 
                    key={doc.id}
                    style={{
                      backgroundColor: isChecked ? '#f0f7ff' : '#ffffff',
                      borderRadius: '12px',
                      border: isChecked ? '1px solid #0071e3' : '1px solid #e5e5e5',
                      padding: viewDensity === 'compact' ? '14px 18px' : '20px 24px',
                      display: 'flex',
                      justify: 'space-between',
                      alignItems: 'center',
                      gap: '20px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1 }}>
                      <input 
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleSelectDoc(doc.id)}
                        style={{ marginTop: '5px', cursor: 'pointer', width: '18px', height: '18px' }}
                      />

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                          <h3 style={{ margin: 0, fontSize: '16px', color: '#1d1d1f', fontWeight: 600 }}>
                            {doc.title}
                          </h3>
                          {doc.pinned && <span style={{ fontSize: '14px' }} title="ปักหมุดไว้">📌</span>}
                        </div>
                        
                        <p style={{ margin: '6px 0 10px 0', fontSize: '13.5px', color: '#515154', fontWeight: 400, lineHeight: 1.5 }}>
                          {doc.description}
                        </p>
                        
                        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', fontSize: '12px', color: '#86868b', fontWeight: 400 }}>
                          <span>อัปเดตเมื่อ: {doc.updatedAt}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', flexShrink: 0, alignItems: 'center' }}>
                      <button
                        onClick={() => setPreviewDoc({
                          title: doc.title,
                          description: doc.description,
                          blankUrl: doc.blankFileUrl,
                          exampleUrl: doc.exampleFileUrl
                        })}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#ffffff', color: '#1d1d1f', padding: '9px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, border: '1px solid #d2d2d7', cursor: 'pointer' }}
                      >
                        <span>👁️</span>
                        <span>ดูตัวอย่าง</span>
                      </button>

                      <a
                        href={doc.blankFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        download={doc.blankFileName}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#0071e3', color: '#ffffff', padding: '9px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600, border: 'none' }}
                      >
                        <span>📄</span>
                        <span>ดาวน์โหลดแบบฟอร์ม</span>
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>

      </div>

      {/* 4. Modal ขนาดใหญ่สะใจ สำหรับอัปโหลดแบบฟอร์มเอกสารขึ้น Supabase */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #d2d2d7', borderRadius: '18px', width: '100%', maxWidth: '720px', padding: '32px', color: '#1d1d1f', boxShadow: '0 24px 48px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #e5e5e5', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '22px' }}>📤</span>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>อัปโหลดแบบฟอร์มเอกสารขึ้น Supabase</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'none', border: 'none', color: '#86868b', fontSize: '22px', cursor: 'pointer', padding: '4px' }}>✕</button>
            </div>

            <form onSubmit={handleCreateDocSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: '#1d1d1f', fontWeight: 600, display: 'block', marginBottom: '6px' }}>ชื่อแบบฟอร์มเอกสาร *</label>
                  <input 
                    type="text" 
                    required 
                    value={newDoc.title}
                    onChange={e => setNewDoc({ ...newDoc, title: e.target.value })}
                    placeholder="เช่น ใบขอซื้อ / ขอจ้าง (PR Form)" 
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #d2d2d7', backgroundColor: '#f5f5f7', color: '#1d1d1f', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: '#1d1d1f', fontWeight: 600, display: 'block', marginBottom: '6px' }}>หมวดหมู่เอกสาร</label>
                  <select 
                    value={newDoc.category}
                    onChange={e => setNewDoc({ ...newDoc, category: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #d2d2d7', backgroundColor: '#f5f5f7', color: '#1d1d1f', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
                  >
                    <option value="purchase">จัดซื้อ / ตั้งเบิก</option>
                    <option value="expense">ค่าใช้จ่าย & เดินทาง</option>
                    <option value="tax">ภาษี & บัญชี</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', color: '#1d1d1f', fontWeight: 600, display: 'block', marginBottom: '6px' }}>คำอธิบายรายละเอียดแบบฟอร์ม</label>
                <textarea 
                  rows="3"
                  value={newDoc.description}
                  onChange={e => setNewDoc({ ...newDoc, description: e.target.value })}
                  placeholder="ระบุรายละเอียด หรือข้อแนะนำสั้นๆ ในการกรอกเอกสารนี้..." 
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #d2d2d7', backgroundColor: '#f5f5f7', color: '#1d1d1f', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical', outline: 'none', lineHeight: 1.5 }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: '#fafafa', padding: '18px', borderRadius: '12px', border: '1px dashed #c7c7cc' }}>
                <div>
                  <label style={{ fontSize: '13.5px', color: '#1d1d1f', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                    📄 1. แนบไฟล์แบบฟอร์มเปล่า (.xlsx, .docx, .pdf)
                  </label>
                  <input 
                    type="file" 
                    accept=".xlsx,.xls,.docx,.doc,.pdf"
                    onChange={e => setNewDoc({ ...newDoc, blankFile: e.target.files[0] })}
                    style={{ width: '100%', fontSize: '13px', color: '#515154', cursor: 'pointer', padding: '6px 0' }}
                  />
                </div>

                <div style={{ borderTop: '1px dashed #e5e5e5', paddingTop: '12px' }}>
                  <label style={{ fontSize: '13.5px', color: '#1d1d1f', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                    📝 2. แนบไฟล์ตัวอย่างที่กรอกแล้ว (.pdf, .jpg, .png)
                  </label>
                  <input 
                    type="file" 
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => setNewDoc({ ...newDoc, exampleFile: e.target.files[0] })}
                    style={{ width: '100%', fontSize: '13px', color: '#515154', cursor: 'pointer', padding: '6px 0' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', borderTop: '1px solid #e5e5e5', paddingTop: '20px' }}>
                <button type="button" onClick={() => setIsAddModalOpen(false)} style={{ padding: '10px 22px', backgroundColor: '#ffffff', color: '#1d1d1f', border: '1px solid #d2d2d7', borderRadius: '10px', cursor: 'pointer', fontSize: '13.5px', fontWeight: 500 }}>ยกเลิก</button>
                <button type="submit" disabled={isLoading} style={{ padding: '10px 28px', backgroundColor: '#0071e3', color: '#ffffff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '13.5px', fontWeight: 600, boxShadow: '0 2px 8px rgba(0, 113, 227, 0.3)' }}>
                  {isLoading ? 'กำลังบันทึกลง Supabase...' : 'อัปโหลดแบบฟอร์ม'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Preview Document Modal */}
      {previewDoc && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', zIndex: 2000 }}>
          <div style={{ height: '52px', backgroundColor: '#ffffff', borderBottom: '1px solid #e5e5e5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>👁️</span>
              <h3 style={{ margin: 0, color: '#1d1d1f', fontSize: '15px', fontWeight: 600 }}>
                ตัวอย่างแบบฟอร์ม: {previewDoc.title}
              </h3>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <a
                href={previewDoc.blankUrl}
                target="_blank"
                rel="noreferrer"
                download
                style={{ backgroundColor: '#0071e3', color: '#ffffff', padding: '6px 14px', borderRadius: '6px', textDecoration: 'none', fontSize: '12px', fontWeight: 600 }}
              >
                📄 ดาวน์โหลดฟอร์มเปล่า
              </a>
              <button
                onClick={() => setPreviewDoc(null)}
                style={{ background: 'none', border: 'none', color: '#86868b', fontSize: '20px', cursor: 'pointer', padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>
          </div>

          <div style={{ flex: 1, backgroundColor: '#f5f5f7', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {previewDoc.exampleUrl !== '#' ? (
              <iframe 
                src={previewDoc.exampleUrl} 
                style={{ width: '100%', height: '100%', border: 'none', borderRadius: '12px', backgroundColor: '#ffffff', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}
                title="Document Preview"
              />
            ) : (
              <div style={{ width: '100%', maxWidth: '720px', height: '100%', maxHeight: '800px', backgroundColor: '#ffffff', color: '#1d1d1f', borderRadius: '12px', padding: '40px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                <div style={{ borderBottom: '2px solid #0071e3', paddingBottom: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ margin: 0, color: '#0071e3', fontSize: '18px', fontWeight: 700 }}>{previewDoc.title}</h2>
                    <span style={{ fontSize: '12px', color: '#86868b', fontWeight: 400 }}>แบบฟอร์มมาตรฐานประจำองค์กร (Preview Mode)</span>
                  </div>
                  <span style={{ border: '1px solid #0071e3', color: '#0071e3', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>ตัวอย่าง</span>
                </div>

                <div style={{ backgroundColor: '#f5f5f7', border: '1px solid #e5e5e5', padding: '16px', borderRadius: '8px', marginBottom: '24px', fontSize: '13px', color: '#515154', fontWeight: 400 }}>
                  📌 <strong>รายละเอียดแบบฟอร์ม:</strong> {previewDoc.description}
                </div>

                <div style={{ flex: 1, border: '1px dashed #d2d2d7', borderRadius: '8px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1d1d1f' }}>รายละเอียดฟอร์มเอกสาร (Sample Preview Layout):</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ height: '36px', backgroundColor: '#f5f5f7', borderRadius: '6px', border: '1px solid #e5e5e5' }} />
                    <div style={{ height: '36px', backgroundColor: '#f5f5f7', borderRadius: '6px', border: '1px solid #e5e5e5' }} />
                  </div>
                  <div style={{ height: '140px', backgroundColor: '#fafafa', borderRadius: '6px', border: '1px solid #e5e5e5', marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#86868b', fontSize: '13px' }}>
                    (สามารถดาวน์โหลดไฟล์ต้นฉบับมาเปิดบนคอมพิวเตอร์เพื่อเปิดแก้ไขได้)
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #e5e5e5', paddingTop: '16px', marginTop: '24px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#86868b' }}>
                  <span>พิมพ์เมื่อ: {new Date().toLocaleDateString('th-TH')}</span>
                  <span>ระบบคลังแบบฟอร์มบัญชีและการเงิน</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}