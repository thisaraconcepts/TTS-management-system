import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'

export const ClassicalReportModal = ({
  show,
  onClose,
  title,
  endpoint,
  params = {},
  initialData = null,
  defaultOrientation = 'landscape'
}) => {
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState(initialData)
  const [orientation, setOrientation] = useState(defaultOrientation)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [filterSearch, setFilterSearch] = useState('')

  useEffect(() => {
    if (initialData) {
      setReportData(initialData)
    } else if (show && endpoint) {
      fetchReport()
    }
  }, [show, endpoint, JSON.stringify(params), initialData])

  useEffect(() => {
    if (defaultOrientation) {
      setOrientation(defaultOrientation)
    }
  }, [defaultOrientation, show])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const cleanParams = {}
      Object.keys(params || {}).forEach(k => {
        if (params[k] !== '' && params[k] !== null && params[k] !== undefined) {
          cleanParams[k] = params[k]
        }
      })
      const res = await axios.get(endpoint, { params: cleanParams })
      setReportData(res.data)
    } catch (err) {
      console.error('Failed to load official report', err)
      toast.error(err.response?.data?.detail || 'Failed to compile report from database')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExportExcel = async () => {
    if (!reportData || !reportData.rows || reportData.rows.length === 0) {
      toast.warning('No records to export.')
      return
    }

    setExportingExcel(true)
    try {
      const payload = {
        report_type: reportData.report_type || 'report',
        title: reportData.header?.title || title || 'SLAF Official Report',
        header_info: reportData.header,
        summary_stats: reportData.summary_stats?.reduce((acc, curr) => {
          acc[curr.label] = curr.value
          return acc
        }, {}),
        columns: reportData.columns,
        rows: reportData.rows
      }

      const res = await axios.post('/api/v1/reports/export/excel', payload, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `SLAF_TTS_${(reportData.report_type || 'REPORT').toUpperCase()}_${new Date().toISOString().substring(0, 10)}.xlsx`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('Official Excel spreadsheet downloaded')
    } catch (err) {
      console.error(err)
      toast.error('Failed to export Excel')
    } finally {
      setExportingExcel(false)
    }
  }

  const handleExportPdf = async () => {
    if (!reportData || !reportData.rows || reportData.rows.length === 0) {
      toast.warning('No records to export.')
      return
    }

    setExportingPdf(true)
    try {
      const payload = {
        report_type: reportData.report_type || 'report',
        title: reportData.header?.title || title || 'SLAF Official Report',
        header_info: reportData.header,
        summary_stats: reportData.summary_stats?.reduce((acc, curr) => {
          acc[curr.label] = curr.value
          return acc
        }, {}),
        columns: reportData.columns,
        rows: reportData.rows
      }

      const res = await axios.post('/api/v1/reports/export/pdf', payload, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `SLAF_TTS_${(reportData.report_type || 'REPORT').toUpperCase()}_${new Date().toISOString().substring(0, 10)}.pdf`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('Classical PDF document downloaded')
    } catch (err) {
      console.error(err)
      toast.error('Failed to export PDF')
    } finally {
      setExportingPdf(false)
    }
  }

  if (!show) return null

  const rows = reportData?.rows || []
  const filteredRows = filterSearch.trim()
    ? rows.filter(r => Object.values(r).some(v => v !== null && v !== undefined && String(v).toLowerCase().includes(filterSearch.toLowerCase())))
    : rows

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 1060, overflowY: 'auto' }}>
      <div
        className={`modal-dialog modal-dialog-scrollable modal-dialog-centered ${orientation === 'landscape' ? 'modal-xl' : 'modal-lg'}`}
        style={{
          maxWidth: orientation === 'landscape' ? 'min(96vw, 1400px)' : 'min(94vw, 1050px)',
          width: '100%',
          margin: '0.75rem auto'
        }}
      >
        <div className="modal-content border-0 shadow-lg" style={{ maxHeight: '94vh' }}>
          {/* Modal Header Toolbar (Hidden during print) */}
          <div className="modal-header bg-dark text-white px-3 py-2 no-print d-flex flex-wrap align-items-center justify-content-between gap-2 border-bottom border-secondary">
            {/* Left: Brand & Report Title */}
            <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ minWidth: '160px', maxWidth: 'calc(100% - 50px)' }}>
              <div className="bg-info bg-opacity-25 text-info rounded p-1.5 d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '32px', height: '32px' }}>
                <i className="bi bi-file-earmark-ruled-fill fs-6"></i>
              </div>
              <div className="overflow-hidden">
                <h6 className="modal-title fw-bold mb-0 text-truncate text-white" style={{ fontSize: '0.9rem' }} title={reportData?.header?.title || title || 'Official Institutional System Report'}>
                  {reportData?.header?.title || title || 'Official Institutional System Report'}
                </h6>
                <small className="text-white-50 d-block text-truncate" style={{ fontSize: '0.7rem' }}>
                  Sri Lanka Air Force • TTS Ekala
                </small>
              </div>
            </div>

            {/* Right: Controls & Actions + Close Button */}
            <div className="d-flex align-items-center flex-wrap gap-1.5 ms-auto">
              {/* Orientation Switcher */}
              <div className="btn-group btn-group-sm shadow-xs" role="group">
                <button
                  type="button"
                  className={`btn btn-xs px-2 py-1 ${orientation === 'portrait' ? 'btn-info text-dark fw-bold' : 'btn-outline-light'}`}
                  onClick={() => setOrientation('portrait')}
                  title="A4 Portrait (210mm x 297mm)"
                >
                  <i className="bi bi-file-earmark me-0.5"></i>
                  <span className="d-none d-sm-inline">Port</span>
                </button>
                <button
                  type="button"
                  className={`btn btn-xs px-2 py-1 ${orientation === 'landscape' ? 'btn-info text-dark fw-bold' : 'btn-outline-light'}`}
                  onClick={() => setOrientation('landscape')}
                  title="A4 Landscape (297mm x 210mm)"
                >
                  <i className="bi bi-file-earmark-landscape me-0.5"></i>
                  <span className="d-none d-sm-inline">Land</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="d-flex align-items-center gap-1">
                <button
                  type="button"
                  className="btn btn-xs btn-outline-success fw-semibold shadow-xs px-2 py-1"
                  onClick={handleExportExcel}
                  disabled={loading || exportingExcel || !rows.length}
                  title="Export to Excel Spreadsheet (.xlsx)"
                >
                  {exportingExcel ? (
                    <span className="spinner-border spinner-border-sm me-1"></span>
                  ) : (
                    <i className="bi bi-file-earmark-excel"></i>
                  )}
                  <span className="d-none d-md-inline ms-1">Excel</span>
                </button>

                <button
                  type="button"
                  className="btn btn-xs btn-outline-danger fw-semibold shadow-xs px-2 py-1"
                  onClick={handleExportPdf}
                  disabled={loading || exportingPdf || !rows.length}
                  title="Download Classical PDF Document"
                >
                  {exportingPdf ? (
                    <span className="spinner-border spinner-border-sm me-1"></span>
                  ) : (
                    <i className="bi bi-file-earmark-pdf"></i>
                  )}
                  <span className="d-none d-md-inline ms-1">PDF</span>
                </button>

                <button
                  type="button"
                  className="btn btn-xs btn-primary fw-semibold shadow-xs px-2 py-1"
                  onClick={handlePrint}
                  disabled={loading || !rows.length}
                  title="Print Official Institutional Report"
                >
                  <i className="bi bi-printer-fill me-0.5"></i>
                  <span>Print</span>
                </button>
              </div>

              {/* Explicit, Uncrushable Close Button */}
              <button
                type="button"
                className="btn btn-sm btn-outline-light border-0 ms-1 flex-shrink-0 d-flex align-items-center justify-content-center touch-target"
                onClick={onClose}
                aria-label="Close"
                title="Close Report View"
                style={{ width: '36px', height: '36px', borderRadius: '6px' }}
              >
                <i className="bi bi-x-lg fs-6"></i>
              </button>
            </div>
          </div>

          {/* Modal Body Container */}
          <div className="modal-body p-2 p-sm-3 p-md-4" style={{ backgroundColor: 'var(--bg-app)', overflowY: 'auto', overflowX: 'hidden' }}>
            {/* Quick Search inside Modal (Hidden during print) */}
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 no-print">
              <small className="text-muted">
                Showing <strong>{filteredRows.length}</strong> of <strong>{rows.length}</strong> compiled database records
              </small>
              <div style={{ minWidth: '200px', maxWidth: '300px', flex: '1 1 auto' }} className="ms-auto">
                <div className="input-group input-group-sm shadow-xs">
                  <span className="input-group-text border-end-0"><i className="bi bi-search text-muted"></i></span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="Filter records in view..."
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                  />
                  {filterSearch && (
                    <button className="btn btn-outline-secondary border-start-0" type="button" onClick={() => setFilterSearch('')}>
                      <i className="bi bi-x"></i>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Classical Formal Paper Document Container */}
            <div className={`report-paper-classical ${orientation === 'landscape' ? 'orientation-landscape' : 'orientation-portrait'} p-3 p-sm-4 p-md-5 bg-white`}>
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-dark" role="status"></div>
                  <p className="mt-2 text-muted small">Executing SQL query and compiling official report...</p>
                </div>
              ) : !reportData ? (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-file-earmark-x fs-1 d-block mb-2"></i>
                  No report data available.
                </div>
              ) : (
                <>
                  {/* 1. Official SLAF Header */}
                  <div className="text-center mb-2">
                    <div className="d-flex justify-content-between align-items-center mb-1 text-muted" style={{ fontSize: '0.75rem' }}>
                      <span>SRI LANKA AIR FORCE • TRADE TRAINING SCHOOL</span>
                      <span className="fw-bold text-dark">{reportData.header?.security_classification || 'RESTRICTED / OFFICIAL USE ONLY'}</span>
                    </div>

                    <div className="report-double-rule-top"></div>

                    <h4 className="fw-bold mb-0 text-uppercase" style={{ letterSpacing: '0.8px', fontSize: '1.25rem' }}>
                      {reportData.header?.organization || 'SRI LANKA AIR FORCE'}
                    </h4>
                    <h5 className="fw-bold mb-1" style={{ fontSize: '1.05rem', color: '#1f2937' }}>
                      {reportData.header?.school_name || 'TRADE TRAINING SCHOOL (TTS EKALA)'}
                    </h5>

                    <div className="fs-6 fw-bold text-uppercase mt-2" style={{ letterSpacing: '0.4px', textDecoration: 'underline' }}>
                      {reportData.header?.title || title}
                    </div>
                    <div className="text-muted small mt-0.5" style={{ fontSize: '0.825rem' }}>
                      {reportData.header?.subtitle}
                    </div>

                    <div className="report-double-rule-bottom"></div>
                  </div>

                  {/* 2. Section 1: Report Information & Parameters */}
                  <div className="report-section-header">1. REPORT INFORMATION & PARAMETERS</div>
                  <div className="table-responsive">
                    <table className="report-formal-table mb-3">
                      <tbody>
                        <tr>
                          <td style={{ width: '18%', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>Organization:</td>
                          <td style={{ width: '32%' }}>Sri Lanka Air Force (TTS Ekala)</td>
                          <td style={{ width: '20%', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>Generated Date/Time:</td>
                          <td style={{ width: '30%' }}>{reportData.header?.generated_at}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 'bold', backgroundColor: '#f8fafc' }}>Security Classification:</td>
                          <td>RESTRICTED / OFFICIAL USE ONLY</td>
                          <td style={{ fontWeight: 'bold', backgroundColor: '#f8fafc' }}>Authorized Officer:</td>
                          <td>{reportData.header?.generated_by}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 'bold', backgroundColor: '#f8fafc' }}>Applied Parameters:</td>
                          <td>
                            {reportData.header?.parameters && Object.keys(reportData.header.parameters).length > 0 ? (
                              Object.entries(reportData.header.parameters)
                                .filter(([_, v]) => v)
                                .map(([k, v]) => `${k.replace('_', ' ').toUpperCase()}: ${v}`)
                                .join(' | ') || 'All Master Records'
                            ) : 'All Master Records'}
                          </td>
                          <td style={{ fontWeight: 'bold', backgroundColor: '#f8fafc' }}>Total Records Compiled:</td>
                          <td><strong>{reportData.total_records || rows.length} Records</strong></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* 3. Section 2: Statistical Summary Table */}
                  {reportData.summary_stats && reportData.summary_stats.length > 0 && (
                    <>
                      <div className="report-section-header">2. STATISTICAL SUMMARY & KEY METRICS</div>
                      <div className="text-muted small mb-1" style={{ fontSize: '0.75rem' }}>
                        <em>Table 1: Aggregated Performance & Strength Metrics</em>
                      </div>
                      <div className="table-responsive">
                        <table className="report-formal-table mb-3">
                          <thead>
                            <tr>
                              <th style={{ width: '35%', textAlign: 'left' }}>Metric / Parameter</th>
                              <th style={{ width: '15%', textAlign: 'right' }}>Value</th>
                              <th style={{ width: '35%', textAlign: 'left' }}>Metric / Parameter</th>
                              <th style={{ width: '15%', textAlign: 'right' }}>Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from({ length: Math.ceil(reportData.summary_stats.length / 2) }).map((_, rIdx) => {
                              const item1 = reportData.summary_stats[rIdx * 2]
                              const item2 = reportData.summary_stats[rIdx * 2 + 1]
                              return (
                                <tr key={rIdx}>
                                  <td style={{ fontWeight: '600' }}>{item1.label}</td>
                                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                    {item1.value} {item1.percentage !== null && item1.percentage !== undefined ? `(${item1.percentage}%)` : ''}
                                  </td>
                                  <td style={{ fontWeight: '600' }}>{item2 ? item2.label : ''}</td>
                                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                    {item2 ? `${item2.value} ${item2.percentage !== null && item2.percentage !== undefined ? `(${item2.percentage}%)` : ''}` : ''}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {/* 4. Section 3: Detailed Records Table */}
                  <div className="report-section-header">
                    {reportData.summary_stats?.length > 0 ? '3. DETAILED SYSTEM RECORDS' : '2. DETAILED SYSTEM RECORDS'}
                  </div>
                  <div className="text-muted small mb-1" style={{ fontSize: '0.75rem' }}>
                    <em>Table 2: Trainee Master Register & Logged Records</em>
                  </div>

                  <div className="table-responsive">
                    <table className="report-formal-table mb-2">
                      <thead>
                        <tr>
                          {reportData.columns?.map((col, cIdx) => (
                            <th
                              key={cIdx}
                              style={{ minWidth: col.min_width || 'auto', textAlign: col.align || 'left' }}
                            >
                              {col.label.toUpperCase()}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.length === 0 ? (
                          <tr>
                            <td colSpan={reportData.columns?.length || 8} className="text-center py-4 text-muted">
                              {reportData.empty_message || 'No records found matching the specified parameters.'}
                            </td>
                          </tr>
                        ) : (
                          filteredRows.map((row, rIdx) => (
                            <tr key={rIdx}>
                              {reportData.columns?.map((col, cIdx) => {
                                const val = row[col.field]
                                const isNumericOrStatus = ['s_no', 'service_number', 'status', 'result_status', 'marks_obtained', 'batch'].includes(col.field)
                                return (
                                  <td
                                    key={cIdx}
                                    style={{
                                      textAlign: col.align || 'left',
                                      fontWeight: isNumericOrStatus ? '600' : 'normal'
                                    }}
                                  >
                                    {val !== null && val !== undefined ? String(val) : '—'}
                                  </td>
                                )
                              })}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* 5. Section 4: Official Authentication & Certification Block */}
                  <div className="report-signature-block">
                    <div className="report-section-header">OFFICIAL AUTHENTICATION & CERTIFICATION</div>
                    <div className="d-flex flex-wrap justify-content-between gap-3 text-start mt-3">
                      <div className="report-sig-col flex-grow-1" style={{ minWidth: '220px', maxWidth: '32%' }}>
                        <div className="fw-bold">PREPARED BY:</div>
                        <div className="report-sig-line"></div>
                        <div className="small">Name: ....................................................</div>
                        <div className="small">Service No: ............................................</div>
                        <div className="small">Designation: System Officer / Instructor</div>
                        <div className="small">Date: .....................................................</div>
                      </div>

                      <div className="report-sig-col flex-grow-1" style={{ minWidth: '220px', maxWidth: '32%' }}>
                        <div className="fw-bold">CHECKED & VERIFIED BY:</div>
                        <div className="report-sig-line"></div>
                        <div className="small">Name: ....................................................</div>
                        <div className="small">Service No: ............................................</div>
                        <div className="small">Designation: Chief Ground Instructor</div>
                        <div className="small">Date: .....................................................</div>
                      </div>

                      <div className="report-sig-col flex-grow-1" style={{ minWidth: '220px', maxWidth: '32%' }}>
                        <div className="fw-bold">APPROVED & AUTHENTICATED BY:</div>
                        <div className="report-sig-line"></div>
                        <div className="small">Name: ....................................................</div>
                        <div className="small">Service No: ............................................</div>
                        <div className="small">Designation: Commanding Officer / OC</div>
                        <div className="small">Date: .....................................................</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ClassicalReportModal
