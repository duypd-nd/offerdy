export default function ImportPage() {
  return (
    <div className="oa-wrap">
      <div className="oa-header">
        <div>
          <h1 className="oa-title">Import Excel</h1>
          <div className="oa-breadcrumb">Home / Import</div>
        </div>
      </div>
      <div style={{ background: '#fff', border: '1.5px solid #e4eaf2', borderRadius: 12, padding: 40, textAlign: 'center', color: '#64748b' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📥</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#0f1929', marginBottom: 8 }}>Import Stores &amp; Offers từ Excel</div>
        <div style={{ fontSize: 14, marginBottom: 24 }}>Tính năng đang được xây dựng. Dùng file template <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>offerdy_import_v3.xlsx</code> để chuẩn bị dữ liệu.</div>
        <div style={{ fontSize: 13, color: '#94a3b8' }}>Template tại: <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>d:\Offerdy\import-templates\offerdy_import_v3.xlsx</code></div>
      </div>
    </div>
  )
}
