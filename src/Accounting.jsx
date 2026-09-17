import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

export default function Accounting() {
  const [currentTab, setCurrentTab] = useState('all');
  const [isAdmin, setIsAdmin] = useState(true);

  // Sidebar & Dropdown Navigation State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(true);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [openGroupIds, setOpenGroupIds] = useState([]);

  // Selection & Filter State
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFileType, setSelectedFileType] = useState('all');
  const [sortBy, setSortBy] = useState('latest');

  // Data & Modal State
  const [documentList, setDocumentList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // 👁️ Full Screen File Viewer State
  const [previewDoc, setPreviewDoc] = useState(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [targetCategory, setTargetCategory] = useState('hr');

  // Form Upload State
  const [formData, setFormData] = useState({
    title: '',
    category: 'it',
    department: 'ฝ่ายเทคโนโลยีสารสนเทศ',
    version: '1.0',
    description: '',
    dataType: 'file',
    externalUrl: '',
    file: null
  });

  // Form Edit State
  const [editFormData, setEditFormData] = useState({
    id: null,
    title: '',
    category: 'it',
    department: 'ฝ่ายเทคโนโลยีสารสนเทศ',
    version: '1.0',
    description: '',
    dataType: 'file',
    externalUrl: '',
    existingUrl: '',
    existingFileName: '',
    file: null
  });

  // 🪟 Windows 11 Font Stack
  const fluentFontStack = '"Segoe UI Variable Text", "Segoe UI", -apple-system, BlinkMacSystemFont, "Sukhumvit Set", Tahoma, sans-serif';

  // 📂 ปรับปรุงหมวดหมู่โดยถอดกลุ่ม "เอกสารเสนอขออนุมัติ" ออกเรียบร้อยแล้ว
  const categoryGroups = [
    {
      id: 'dept',
      groupName: '🏢 จำแนกตามฝ่ายงาน',
      items: [
        { id: 'hr', label: 'ฝ่ายทรัพยากรบุคคล (HR)', icon: '👤', dept: 'ฝ่ายทรัพยากรบุคคล' },
        { id: 'finance', label: 'ฝ่ายการเงินและบัญชี', icon: '💰', dept: 'ฝ่ายการเงินและบัญชี' },
        { id: 'purchase', label: 'ฝ่ายจัดซื้อและพัสดุ', icon: '🛒', dept: 'ฝ่ายจัดซื้อ' },
        { id: 'it', label: 'ฝ่ายเทคโนโลยีสารสนเทศ', icon: '🖥️', dept: 'ฝ่ายเทคโนโลยีสารสนเทศ' },
        { id: 'admin', label: 'ฝ่ายบริหารงานทั่วไป', icon: '🏢', dept: 'ฝ่ายบริหารงานทั่วไป' },
        { id: 'warehouse', label: 'ฝ่ายคลังสินค้า', icon: '📦', dept: 'ฝ่ายคลังสินค้า' },
      ]
    },
    {
      id: 'request',
      groupName: '📋 แบบคำร้องและแบบอนุมัติทั่วไป',
      items: [
        { id: 'req_purchase', label: 'ใบขอซื้อ / ขอจ้าง (PR)', icon: '🛍️', dept: 'ฝ่ายจัดซื้อ' },
        { id: 'req_transfer', label: 'ใบขอโอนย้าย / สับเปลี่ยน', icon: '🔄', dept: 'ฝ่ายบริหารงานทั่วไป' },
        { id: 'request', label: 'แบบคำร้องทั่วไป', icon: '📋', dept: 'ส่วนกลาง' },
      ]
    },
    {
      id: 'general',
      groupName: '📑 แบบฟอร์มมาตรฐานส่วนกลาง',
      items: [
        { id: 'general', label: 'แบบฟอร์มเอกสารทั่วไป', icon: '📑', dept: 'ส่วนกลาง' },
      ]
    }
  ];

  const categoriesList = categoryGroups.flatMap(group => group.items);

  const toggleGroup = (groupId) => {
    setOpenGroupIds(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId) 
        : [...prev, groupId]
    );
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsCategoryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
            description: doc.description || 'ไม่มีรายละเอียดเพิ่มเติม',
            fileType: ext,
            fileUrl: doc.blank_file_url || '#',
            fileName: doc.blank_file_name || 'แบบฟอร์มเอกสาร.pdf',
            createdAt: new Date(doc.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            rawDate: new Date(doc.created_at)
          };
        });
        setDocumentList(formatted);
      }
    } catch (err) {
      console.error('Fetch error:', err);
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

  const handleOpenEditModal = () => {
    if (selectedDocIds.length === 0) return;
    if (selectedDocIds.length > 1) {
      alert('โปรดเลือกรายการที่ต้องการแก้ไขเพียง 1 รายการเท่านั้น');
      return;
    }
    const targetDoc = documentList.find(d => d.id === selectedDocIds[0]);
    if (targetDoc) {
      const isLink = targetDoc.fileType === 'LINK';
      setEditFormData({
        id: targetDoc.id,
        title: targetDoc.title,
        category: targetDoc.category,
        department: targetDoc.department,
        version: targetDoc.version,
        description: targetDoc.description === 'ไม่มีรายละเอียดเพิ่มเติม' ? '' : targetDoc.description,
        dataType: isLink ? 'link' : 'file',
        externalUrl: isLink ? targetDoc.fileUrl : '',
        existingUrl: targetDoc.fileUrl,
        existingFileName: targetDoc.fileName,
        file: null
      });
      setIsEditModalOpen(true);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editFormData.title.trim()) {
      alert('โปรดระบุชื่อแบบฟอร์มเอกสาร');
      return;
    }

    setIsLoading(true);
    try {
      let publicUrl = editFormData.existingUrl;
      let fileName = editFormData.existingFileName;

      if (editFormData.dataType === 'link') {
        publicUrl = editFormData.externalUrl || '#';
        fileName = 'LINK';
      } else if (editFormData.file) {
        const fileExt = editFormData.file.name.split('.').pop();
        fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('accounting-forms')
          .upload(fileName, editFormData.file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('accounting-forms')
          .getPublicUrl(fileName);

        publicUrl = urlData.publicUrl;
      }

      const { error: dbError } = await supabase
        .from('accounting_documents')
        .update({
          title: editFormData.title,
          category: editFormData.category,
          department: editFormData.department,
          version: editFormData.version,
          description: editFormData.description,
          blank_file_url: publicUrl,
          blank_file_name: fileName
        })
        .eq('id', editFormData.id);

      if (dbError) throw dbError;

      alert('ปรับปรุงข้อมูลแบบฟอร์มเอกสารเรียบร้อยแล้ว');
      setIsEditModalOpen(false);
      setSelectedDocIds([]);
      fetchDocuments();

    } catch (err) {
      alert('เกิดข้อผิดพลาดในการปรับปรุงข้อมูล: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedDocIds.length === 0) return;
    if (window.confirm(`คุณต้องการลบแบบฟอร์มที่เลือกจำนวน ${selectedDocIds.length} รายการใช่หรือไม่?`)) {
      setIsLoading(true);
      try {
        const { error } = await supabase
          .from('accounting_documents')
          .delete()
          .in('id', selectedDocIds);

        if (error) throw error;

        alert('ลบรายการแบบฟอร์มเรียบร้อยแล้ว');
        setSelectedDocIds([]);
        fetchDocuments();
      } catch (err) {
        alert('เกิดข้อผิดพลาดในการลบรายการ: ' + err.message);
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

  const handleBatchCategorizeSubmit = async () => {
    setIsLoading(true);
    try {
      const newDept = getDeptByCategory(targetCategory);
      const { error } = await supabase
        .from('accounting_documents')
        .update({ category: targetCategory, department: newDept })
        .in('id', selectedDocIds);

      if (error) throw error;

      alert(`เปลี่ยนหมวดหมู่แบบฟอร์มจำนวน ${selectedDocIds.length} รายการเรียบร้อยแล้ว`);
      setIsCategoryModalOpen(false);
      setSelectedDocIds([]);
      fetchDocuments();
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('โปรดระบุชื่อแบบฟอร์มเอกสาร');
      return;
    }

    setIsLoading(true);
    try {
      let publicUrl = formData.externalUrl || '#';
      let fileName = 'LINK';

      if (formData.dataType === 'file' && formData.file) {
        const fileExt = formData.file.name.split('.').pop();
        fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('accounting-forms')
          .upload(fileName, formData.file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('accounting-forms')
          .getPublicUrl(fileName);

        publicUrl = urlData.publicUrl;
      }

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
            blank_file_name: fileName
          }
        ]);

      if (dbError) throw dbError;

      alert('เพิ่มแบบฟอร์มเอกสารสำเร็จ');
      setIsAddModalOpen(false);
      setFormData({ title: '', category: 'it', department: 'ฝ่ายเทคโนโลยีสารสนเทศ', version: '1.0', description: '', dataType: 'file', externalUrl: '', file: null });
      fetchDocuments();

    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + err.message);
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
    ? { label: 'แบบฟอร์มเอกสารทั้งหมด', icon: '📂' }
    : (categoriesList.find(c => c.id === selectedCategory) || { label: 'หมวดหมู่เอกสาร', icon: '📁' });

  // 🪟 Windows 11 Component Styles
  const win11PrimaryBtn = {
    padding: '7px 18px',
    backgroundColor: '#005fb8',
    color: '#ffffff',
    border: '1px solid #005fb8',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: fluentFontStack,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
    transition: 'all 0.15s ease-in-out'
  };

  const win11SecondaryBtn = {
    padding: '7px 14px',
    backgroundColor: '#ffffff',
    color: '#1a1a1a',
    border: '1px solid #d1d1d1',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 500,
    fontFamily: fluentFontStack,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    transition: 'all 0.15s ease-in-out'
  };

  const win11Input = {
    padding: '8px 12px',
    borderRadius: '4px',
    border: '1px solid #d1d1d1',
    backgroundColor: '#ffffff',
    fontSize: '13.5px',
    fontFamily: fluentFontStack,
    outline: 'none',
    boxSizing: 'border-box'
  };

  // 🔍 Full Screen File Viewer Renderer
  const renderFileViewer = (doc) => {
    if (!doc || !doc.fileUrl || doc.fileUrl === '#') {
      return <div style={{ padding: '40px', textAlign: 'center', color: '#616161' }}>ไม่พบ URL สำหรับแสดงผลไฟล์</div>;
    }

    const type = doc.fileType.toUpperCase();

    if (type === 'PDF') {
      return (
        <iframe
          src={doc.fileUrl}
          title={doc.title}
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      );
    }

    if (type === 'DOCX' || type === 'DOC' || type === 'XLSX' || type === 'XLS' || type === 'PPTX') {
      const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(doc.fileUrl)}`;
      return (
        <iframe
          src={officeViewerUrl}
          title={doc.title}
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      );
    }

    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ fontSize: '15px', color: '#1a1a1a', marginBottom: '16px' }}>
          เอกสารนี้เป็นลิงก์เชื่อมโยงไปยังระบบภายนอก
        </p>
        <a
          href={doc.fileUrl}
          target="_blank"
          rel="noreferrer"
          style={{ ...win11PrimaryBtn, backgroundColor: '#7e22ce', borderColor: '#7e22ce', textDecoration: 'none' }}
        >
          🔗 เปิดลิงก์ระบบในหน้าต่างใหม่ ↗
        </a>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f3f3f3', color: '#1a1a1a', fontFamily: fluentFontStack }}>
      
      {/* TOP TOOLBAR */}
      <header style={{ height: '52px', backgroundColor: '#ffffff', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between', flexShrink: 0, position: 'sticky', top: 0, zIndex: 100 }}>
        
        {isAdmin && selectedDocIds.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={win11SecondaryBtn}>☰</button>
              <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#005fb8' }}>
                เลือกแล้ว {selectedDocIds.length} รายการ
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={handleOpenEditModal} style={win11SecondaryBtn}>✏️ แก้ไขข้อมูล</button>
              <button onClick={() => setIsCategoryModalOpen(true)} style={win11SecondaryBtn}>📁 จัดหมวดหมู่</button>
              <button onClick={handleBatchDownload} style={win11SecondaryBtn}>⬇️ ดาวน์โหลด</button>
              <button onClick={handleBatchDelete} style={{ ...win11SecondaryBtn, color: '#c42b1c', borderColor: '#f3d6d3', backgroundColor: '#fdf3f2' }}>🗑️ ลบรายการ</button>
              <button onClick={() => setSelectedDocIds([])} style={win11SecondaryBtn}>✕ ยกเลิก</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={win11SecondaryBtn}>☰</button>

              <nav style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button 
                  onClick={() => { setSelectedCategory('all'); setCurrentTab('all'); }} 
                  style={win11PrimaryBtn}
                >
                  🏠 แบบฟอร์มเอกสารทั้งหมด
                </button>

                {/* 📁 หมวดหมู่ Dropdown Menu */}
                <div style={{ position: 'relative' }} ref={dropdownRef}>
                  <button 
                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                    style={isCategoryDropdownOpen || selectedCategory !== 'all' ? win11PrimaryBtn : win11SecondaryBtn}
                  >
                    📁 {selectedCategory === 'all' ? 'หมวดหมู่เอกสาร' : selectedCatObj.label}
                    <span style={{ fontSize: '10px', marginLeft: '4px' }}>▼</span>
                  </button>

                  {isCategoryDropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: '4px',
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                      border: '1px solid #e0e0e0',
                      padding: '6px',
                      minWidth: '240px',
                      maxHeight: '380px',
                      overflowY: 'auto',
                      zIndex: 200
                    }}>
                      <button
                        onClick={() => { setSelectedCategory('all'); setIsCategoryDropdownOpen(false); }}
                        style={{ ...win11SecondaryBtn, width: '100%', justifyContent: 'flex-start', border: 'none', boxShadow: 'none', backgroundColor: selectedCategory === 'all' ? '#e5f0fb' : 'transparent', color: selectedCategory === 'all' ? '#005fb8' : '#1a1a1a' }}
                      >
                        📂 แบบฟอร์มเอกสารทั้งหมด
                      </button>

                      {categoryGroups.map((group, gIdx) => (
                        <div key={gIdx} style={{ marginTop: '6px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#616161', padding: '4px 8px', borderTop: gIdx > 0 ? '1px solid #f0f0f0' : 'none' }}>
                            {group.groupName}
                          </div>
                          {group.items.map(cat => (
                            <button
                              key={cat.id}
                              onClick={() => {
                                setSelectedCategory(cat.id);
                                setIsCategoryDropdownOpen(false);
                              }}
                              style={{
                                ...win11SecondaryBtn,
                                width: '100%',
                                justifyContent: 'flex-start',
                                border: 'none',
                                boxShadow: 'none',
                                backgroundColor: selectedCategory === cat.id ? '#e5f0fb' : 'transparent',
                                color: selectedCategory === cat.id ? '#005fb8' : '#1a1a1a',
                                fontWeight: selectedCategory === cat.id ? 600 : 400
                              }}
                            >
                              <span>{cat.icon}</span>
                              <span>{cat.label}</span>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </nav>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button onClick={() => { setIsAdmin(!isAdmin); setSelectedDocIds([]); }} style={win11SecondaryBtn}>
                {isAdmin ? '🛠️ โหมด Admin' : '👤 โหมด User'}
              </button>

              <input
                type="text"
                placeholder="🔍 ค้นหาแบบฟอร์มเอกสาร..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ ...win11Input, width: '200px' }}
              />

              {isAdmin && (
                <button onClick={() => setIsAddModalOpen(true)} style={win11PrimaryBtn}>
                  <span>＋</span> <span>เพิ่มแบบฟอร์มเอกสาร</span>
                </button>
              )}
            </div>
          </>
        )}

      </header>

      {/* MAIN BODY LAYOUT */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Left Sidebar Menu */}
        {isSidebarOpen && (
          <aside style={{ width: '250px', backgroundColor: '#f9f9f9', borderRight: '1px solid #e0e0e0', padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: '14px', flexShrink: 0, overflowY: 'auto' }}>
            
            {/* รายการทางลัด */}
            <div>
              <button
                onClick={() => setIsFavoritesOpen(!isFavoritesOpen)}
                style={{ width: '100%', padding: '6px 8px', backgroundColor: 'transparent', border: 'none', color: '#1a1a1a', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', textAlign: 'left', borderRadius: '4px' }}
              >
                <span style={{ fontSize: '10px', color: '#616161', transition: 'transform 0.2s', display: 'inline-block', transform: isFavoritesOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                <span>รายการทางลัด</span>
              </button>

              {isFavoritesOpen && (
                <div style={{ paddingLeft: '12px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <button
                    onClick={() => { setSelectedCategory('all'); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px 10px',
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: selectedCategory === 'all' ? '#e5f0fb' : 'transparent',
                      color: selectedCategory === 'all' ? '#005fb8' : '#424242',
                      fontWeight: selectedCategory === 'all' ? 600 : 400,
                      fontSize: '13px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      gap: '8px'
                    }}
                  >
                    <span>📂</span>
                    <span>แบบฟอร์มเอกสารทั้งหมด</span>
                  </button>
                </div>
              )}
            </div>

            {/* หมวดหมู่แบบฟอร์มเอกสาร */}
            <div>
              <button
                onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
                style={{ width: '100%', padding: '6px 8px', backgroundColor: 'transparent', border: 'none', color: '#1a1a1a', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', textAlign: 'left', borderRadius: '4px' }}
              >
                <span style={{ fontSize: '10px', color: '#616161', transition: 'transform 0.2s', display: 'inline-block', transform: isCategoriesOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                <span>หมวดหมู่แบบฟอร์มเอกสาร</span>
              </button>

              {isCategoriesOpen && (
                <div style={{ paddingLeft: '8px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {categoryGroups.map((group) => {
                    const isGroupOpen = openGroupIds.includes(group.id);

                    return (
                      <div key={group.id}>
                        <button
                          onClick={() => toggleGroup(group.id)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            fontSize: '13px',
                            fontWeight: 500,
                            color: '#1a1a1a',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            borderRadius: '4px'
                          }}
                        >
                          <span style={{ fontSize: '10px', color: '#616161', transition: 'transform 0.2s', display: 'inline-block', transform: isGroupOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                            ▶
                          </span>
                          <span>{group.groupName}</span>
                        </button>

                        {isGroupOpen && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '12px', marginTop: '2px' }}>
                            {group.items.map(cat => {
                              const isSelected = selectedCategory === cat.id;

                              return (
                                <button
                                  key={cat.id}
                                  onClick={() => setSelectedCategory(cat.id)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '7px 10px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    backgroundColor: isSelected ? '#e5f0fb' : 'transparent',
                                    color: isSelected ? '#005fb8' : '#424242',
                                    fontWeight: isSelected ? 600 : 400,
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    gap: '8px',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}
                                >
                                  <span style={{ fontSize: '14px', flexShrink: 0 }}>{cat.icon}</span>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </aside>
        )}

        {/* Right Content Area */}
        <main style={{ flex: 1, padding: '24px 32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e0e0e0', paddingBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '22px' }}>{selectedCatObj.icon}</span>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#1a1a1a' }}>
                {selectedCatObj.label}
              </h2>
              <span style={{ fontSize: '13px', color: '#616161', fontWeight: 400 }}>
                ({filteredDocs.length} รายการ)
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select value={selectedFileType} onChange={(e) => setSelectedFileType(e.target.value)} style={{ ...win11Input, fontSize: '12.5px' }}>
                <option value="all">ประเภทไฟล์และลิงก์ทั้งหมด ▼</option>
                <option value="docx">DOCX (Microsoft Word)</option>
                <option value="xlsx">XLSX (Microsoft Excel)</option>
                <option value="pdf">PDF (Document)</option>
                <option value="link">LINK (ระบบภายนอก)</option>
              </select>

              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ ...win11Input, fontSize: '12.5px' }}>
                <option value="latest">เรียงลำดับ: ปรับปรุงล่าสุด ▼</option>
                <option value="title">เรียงลำดับ: ตัวอักษร ก-ฮ ▼</option>
              </select>
            </div>
          </div>

          {/* Document Cards */}
          {isLoading ? (
            <div style={{ textAlign: 'center', color: '#616161', marginTop: '40px', fontSize: '13.5px' }}>⏳ กำลังโหลดข้อมูลแบบฟอร์มเอกสาร...</div>
          ) : filteredDocs.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#616161', marginTop: '40px', fontSize: '13.5px' }}>
              ไม่พบบันทึกแบบฟอร์มเอกสารในระบบ
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredDocs.map(doc => {
                const isChecked = selectedDocIds.includes(doc.id);
                const isLink = doc.fileType === 'LINK';

                return (
                  <div
                    key={doc.id}
                    style={{
                      backgroundColor: isChecked ? '#f0f6fc' : '#ffffff',
                      borderRadius: '8px',
                      padding: '16px 20px',
                      border: isChecked ? '1px solid #005fb8' : '1px solid #e0e0e0',
                      display: 'flex',
                      justify: 'space-between',
                      alignItems: 'center',
                      gap: '16px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                      transition: 'all 0.15s ease-in-out'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1 }}>
                      {isAdmin && (
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectDoc(doc.id)}
                          style={{ marginTop: '5px', width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                      )}

                      <span style={{
                        padding: '6px 10px',
                        borderRadius: '4px',
                        backgroundColor: isLink ? '#f3e8ff' : doc.fileType === 'XLSX' ? '#e6f4ea' : doc.fileType === 'DOCX' ? '#e8f2ff' : '#fce8e6',
                        color: isLink ? '#7e22ce' : doc.fileType === 'XLSX' ? '#137333' : doc.fileType === 'DOCX' ? '#005fb8' : '#c5221f',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        marginTop: '1px'
                      }}>
                        {isLink ? '🔗 LINK' : doc.fileType}
                      </span>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1a1a1a' }}>
                            {doc.title}
                          </h3>
                          <span style={{ fontSize: '11px', backgroundColor: '#f3f3f3', color: '#616161', padding: '2px 6px', borderRadius: '4px' }}>
                            ฉบับที่ {doc.version}
                          </span>
                        </div>

                        <p style={{ margin: '4px 0 6px 0', fontSize: '13px', color: '#424242', lineHeight: 1.4 }}>
                          {doc.description}
                        </p>

                        <div style={{ fontSize: '12px', color: '#616161' }}>
                          หน่วยงานรับผิดชอบ: <strong>{doc.department}</strong> • ปรับปรุงล่าสุด: {doc.createdAt}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                      
                      <button onClick={() => setPreviewDoc(doc)} style={win11SecondaryBtn}>
                        👁️ เปิดดูเอกสาร
                      </button>
                      
                      {isLink ? (
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ ...win11PrimaryBtn, backgroundColor: '#7e22ce', borderColor: '#7e22ce', textDecoration: 'none' }}
                        >
                          🔗 เข้าสู่ระบบ
                        </a>
                      ) : (
                        <a
                          href={doc.fileUrl}
                          download={doc.fileName}
                          style={{ ...win11PrimaryBtn, textDecoration: 'none' }}
                        >
                          ⬇️ ดาวน์โหลด
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

      {/* Full Screen File Viewer Modal */}
      {previewDoc && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: '#ffffff', zIndex: 1000, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          <header style={{ height: '52px', padding: '0 20px', backgroundColor: '#ffffff', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={() => setPreviewDoc(null)} style={win11SecondaryBtn}>
                ✕ ปิดหน้าต่าง
              </button>

              <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, backgroundColor: previewDoc.fileType === 'LINK' ? '#f3e8ff' : '#e5f0fb', color: previewDoc.fileType === 'LINK' ? '#7e22ce' : '#005fb8' }}>
                {previewDoc.fileType}
              </span>

              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1a1a1a' }}>
                {previewDoc.title} <span style={{ fontSize: '12px', fontWeight: 400, color: '#616161' }}>(ฉบับที่ {previewDoc.version})</span>
              </h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <a
                href={previewDoc.fileUrl}
                download={previewDoc.fileName}
                target="_blank"
                rel="noreferrer"
                style={{ ...win11PrimaryBtn, textDecoration: 'none' }}
              >
                ⬇️ ดาวน์โหลดไฟล์ลงเครื่อง
              </a>
            </div>
          </header>

          <div style={{ flex: 1, backgroundColor: '#f3f3f3', overflow: 'hidden' }}>
            {renderFileViewer(previewDoc)}
          </div>

        </div>
      )}

      {/* Categorize Modal */}
      {isCategoryModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', width: '100%', maxWidth: '420px', padding: '24px', boxShadow: '0 12px 32px rgba(0,0,0,0.18)' }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', fontWeight: 600 }}>📁 เปลี่ยนหมวดหมู่แบบฟอร์ม ({selectedDocIds.length} รายการ)</h3>
            
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>เลือกหมวดหมู่ปลายทาง:</label>
            <select value={targetCategory} onChange={e => setTargetCategory(e.target.value)} style={{ ...win11Input, width: '100%', marginBottom: '20px' }}>
              {categoryGroups.map((group, idx) => (
                <optgroup key={idx} label={group.groupName}>
                  {group.items.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </optgroup>
              ))}
            </select>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setIsCategoryModalOpen(false)} style={win11SecondaryBtn}>ยกเลิก</button>
              <button onClick={handleBatchCategorizeSubmit} style={win11PrimaryBtn}>บันทึกข้อมูล</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: '#f3f3f3', zIndex: 1000, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <header style={{ height: '52px', padding: '0 24px', backgroundColor: '#ffffff', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={() => setIsEditModalOpen(false)} style={win11SecondaryBtn}>← ย้อนกลับ</button>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1a1a1a' }}>แก้ไขข้อมูลแบบฟอร์มเอกสาร</h2>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={() => setIsEditModalOpen(false)} style={win11SecondaryBtn}>ยกเลิก</button>
              <button onClick={handleEditSubmit} disabled={isLoading} style={win11PrimaryBtn}>{isLoading ? 'กำลังบันทึก...' : 'บันทึกการปรับปรุง'}</button>
            </div>
          </header>

          <form onSubmit={handleEditSubmit} style={{ flex: 1, overflowY: 'auto', padding: '28px 40px', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: '1000px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'start' }}>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #e0e0e0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1a1a1a', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px' }}>📌 รายละเอียดแบบฟอร์ม</h3>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>ชื่อแบบฟอร์มเอกสาร *</label>
                  <input type="text" required value={editFormData.title} onChange={e => setEditFormData({ ...editFormData, title: e.target.value })} style={{ ...win11Input, width: '100%' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>หมวดหมู่เอกสาร</label>
                    <select value={editFormData.category} onChange={e => setEditFormData({ ...editFormData, category: e.target.value, department: getDeptByCategory(e.target.value) })} style={{ ...win11Input, width: '100%' }}>
                      {categoryGroups.map((group, idx) => (
                        <optgroup key={idx} label={group.groupName}>
                          {group.items.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>หน่วยงานรับผิดชอบ</label>
                    <input type="text" value={editFormData.department} onChange={e => setEditFormData({ ...editFormData, department: e.target.value })} style={{ ...win11Input, width: '100%' }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>เลขฉบับปรับปรุง (Version)</label>
                  <input type="text" value={editFormData.version} onChange={e => setEditFormData({ ...editFormData, version: e.target.value })} style={{ ...win11Input, width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>คำอธิบายและวัตถุประสงค์</label>
                  <textarea rows="4" value={editFormData.description} onChange={e => setEditFormData({ ...editFormData, description: e.target.value })} style={{ ...win11Input, width: '100%', resize: 'vertical' }} />
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #e0e0e0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1a1a1a', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px' }}>📁 รูปแบบการจัดเก็บข้อมูล</h3>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>เลือกประเภทการแนบข้อมูล</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ padding: '12px', borderRadius: '6px', border: editFormData.dataType === 'file' ? '2px solid #005fb8' : '1px solid #d1d1d1', backgroundColor: editFormData.dataType === 'file' ? '#f0f6fc' : '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input type="radio" name="editDataType" value="file" checked={editFormData.dataType === 'file'} onChange={() => setEditFormData({ ...editFormData, dataType: 'file' })} />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a' }}>📄 แนบไฟล์เอกสารมาตรฐาน</div>
                        <div style={{ fontSize: '11.5px', color: '#616161' }}>ไฟล์ .docx, .xlsx, .pdf</div>
                      </div>
                    </label>

                    <label style={{ padding: '12px', borderRadius: '6px', border: editFormData.dataType === 'link' ? '2px solid #7e22ce' : '1px solid #d1d1d1', backgroundColor: editFormData.dataType === 'link' ? '#f3e8ff' : '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input type="radio" name="editDataType" value="link" checked={editFormData.dataType === 'link'} onChange={() => setEditFormData({ ...editFormData, dataType: 'link' })} />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a' }}>🔗 ลิงก์เชื่อมโยงระบบภายนอก</div>
                        <div style={{ fontSize: '11.5px', color: '#616161' }}>URL ระบบงานออนไลน์ หรือ Google Drive</div>
                      </div>
                    </label>
                  </div>
                </div>

                {editFormData.dataType === 'link' ? (
                  <div style={{ backgroundColor: '#f3e8ff', padding: '14px', borderRadius: '6px', border: '1px solid #d8b4fe' }}>
                    <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#6b21a8', display: 'block', marginBottom: '6px' }}>🔗 URL ลิงก์ระบบภายนอก *</label>
                    <input type="url" required value={editFormData.externalUrl} onChange={e => setEditFormData({ ...editFormData, externalUrl: e.target.value })} placeholder="https://..." style={{ ...win11Input, width: '100%' }} />
                  </div>
                ) : (
                  <div style={{ backgroundColor: '#f9f9f9', padding: '18px', borderRadius: '6px', border: '2px dashed #d1d1d1', textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', marginBottom: '4px' }}>📄</div>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>อัปโหลดไฟล์ฉบับใหม่ (กรณีเปลี่ยนไฟล์)</label>
                    <input type="file" accept=".xlsx,.xls,.docx,.doc,.pdf" onChange={e => setEditFormData({ ...editFormData, file: e.target.files[0] })} style={{ fontSize: '12px', cursor: 'pointer' }} />
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: '#f3f3f3', zIndex: 1000, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <header style={{ height: '52px', padding: '0 24px', backgroundColor: '#ffffff', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={() => setIsAddModalOpen(false)} style={win11SecondaryBtn}>← ย้อนกลับ</button>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1a1a1a' }}>เพิ่มแบบฟอร์มเอกสาร / ลิงก์ระบบภายนอก</h2>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={() => setIsAddModalOpen(false)} style={win11SecondaryBtn}>ยกเลิก</button>
              <button onClick={handleUploadSubmit} disabled={isLoading} style={win11PrimaryBtn}>{isLoading ? 'กำลังนำเข้า...' : 'บันทึกแบบฟอร์ม'}</button>
            </div>
          </header>

          <form onSubmit={handleUploadSubmit} style={{ flex: 1, overflowY: 'auto', padding: '28px 40px', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: '1000px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'start' }}>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #e0e0e0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1a1a1a', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px' }}>📌 รายละเอียดแบบฟอร์ม</h3>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>ชื่อแบบฟอร์มเอกสาร *</label>
                  <input type="text" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="เช่น ใบขออนุมัติปฏิบัติงานนอกสถานที่" style={{ ...win11Input, width: '100%' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>หมวดหมู่เอกสาร</label>
                    <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value, department: getDeptByCategory(e.target.value) })} style={{ ...win11Input, width: '100%' }}>
                      {categoryGroups.map((group, idx) => (
                        <optgroup key={idx} label={group.groupName}>
                          {group.items.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>หน่วยงานรับผิดชอบ</label>
                    <input type="text" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} placeholder="เช่น ฝ่ายเทคโนโลยีสารสนเทศ" style={{ ...win11Input, width: '100%' }} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>เลขฉบับปรับปรุง (Version)</label>
                  <input type="text" value={formData.version} onChange={e => setFormData({ ...formData, version: e.target.value })} placeholder="1.0" style={{ ...win11Input, width: '100%' }} />
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>คำอธิบายและวัตถุประสงค์</label>
                  <textarea rows="4" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="ระบุรายละเอียด หรือวัตถุประสงค์ในการใช้งาน..." style={{ ...win11Input, width: '100%', resize: 'vertical' }} />
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #e0e0e0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1a1a1a', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px' }}>📁 รูปแบบการจัดเก็บข้อมูล</h3>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>เลือกประเภทการแนบข้อมูล</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ padding: '12px', borderRadius: '6px', border: formData.dataType === 'file' ? '2px solid #005fb8' : '1px solid #d1d1d1', backgroundColor: formData.dataType === 'file' ? '#f0f6fc' : '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input type="radio" name="dataType" value="file" checked={formData.dataType === 'file'} onChange={() => setFormData({ ...formData, dataType: 'file' })} />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a' }}>📄 แนบไฟล์เอกสารมาตรฐาน</div>
                        <div style={{ fontSize: '11.5px', color: '#616161' }}>.docx, .xlsx, .pdf</div>
                      </div>
                    </label>

                    <label style={{ padding: '12px', borderRadius: '6px', border: formData.dataType === 'link' ? '2px solid #7e22ce' : '1px solid #d1d1d1', backgroundColor: formData.dataType === 'link' ? '#f3e8ff' : '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input type="radio" name="dataType" value="link" checked={formData.dataType === 'link'} onChange={() => setFormData({ ...formData, dataType: 'link' })} />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a' }}>🔗 ลิงก์ระบบภายนอก</div>
                        <div style={{ fontSize: '11.5px', color: '#616161' }}>URL ระบบงานออนไลน์ หรือ Google Drive</div>
                      </div>
                    </label>
                  </div>
                </div>

                {formData.dataType === 'link' ? (
                  <div style={{ backgroundColor: '#f3e8ff', padding: '14px', borderRadius: '6px', border: '1px solid #d8b4fe' }}>
                    <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#6b21a8', display: 'block', marginBottom: '6px' }}>🔗 URL ลิงก์ระบบภายนอก *</label>
                    <input type="url" required value={formData.externalUrl} onChange={e => setFormData({ ...formData, externalUrl: e.target.value })} placeholder="https://..." style={{ ...win11Input, width: '100%' }} />
                  </div>
                ) : (
                  <div style={{ backgroundColor: '#f9f9f9', padding: '18px', borderRadius: '6px', border: '2px dashed #d1d1d1', textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', marginBottom: '4px' }}>📄</div>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>อัปโหลดไฟล์เอกสาร *</label>
                    <input type="file" required accept=".xlsx,.xls,.docx,.doc,.pdf" onChange={e => setFormData({ ...formData, file: e.target.files[0] })} style={{ fontSize: '12px', cursor: 'pointer' }} />
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}