import React, { useEffect, useState, useMemo } from 'react'
import axios from 'axios'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line } from 'react-chartjs-2'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

export const AcademicProgress = ({ studentId }) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!studentId) return

    let isMounted = true
    const fetchProgress = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await axios.get(`/api/v1/students/${studentId}/academic-progress`)
        if (isMounted) {
          setData(res.data)
        }
      } catch (err) {
        console.error('Error loading academic progress:', err)
        if (isMounted) {
          setError(err.response?.data?.detail || 'Failed to load academic progress records.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchProgress()
    return () => {
      isMounted = false
    }
  }, [studentId])

  const phaseTests = useMemo(() => data?.phase_tests || [], [data])
  const summary = useMemo(() => data?.summary || {}, [data])

  // Chart Configuration
  const chartData = useMemo(() => {
    if (!phaseTests || phaseTests.length === 0) return null

    const labels = phaseTests.map((pt, idx) => {
      return `Phase ${idx + 1}`
    })

    const percentageData = phaseTests.map(pt => pt.percentage !== null && pt.percentage !== undefined ? pt.percentage : null)

    return {
      labels,
      datasets: [
        {
          label: 'Marks Percentage (%)',
          data: percentageData,
          fill: true,
          backgroundColor: (context) => {
            const ctx = context.chart.ctx
            const gradient = ctx.createLinearGradient(0, 0, 0, 300)
            gradient.addColorStop(0, 'rgba(27, 63, 115, 0.22)')
            gradient.addColorStop(1, 'rgba(27, 63, 115, 0.0)')
            return gradient
          },
          borderColor: '#2f6f86',
          borderWidth: 3,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#2f6f86',
          pointBorderWidth: 2.5,
          pointRadius: 5.5,
          pointHoverRadius: 8,
          pointHoverBackgroundColor: '#2f6f86',
          pointHoverBorderColor: '#ffffff',
          pointHoverBorderWidth: 2,
          tension: 0.35,
          spanGaps: true
        },
        {
          label: 'Pass Threshold (50%)',
          data: phaseTests.map(() => 50),
          borderColor: 'rgba(239, 68, 68, 0.45)',
          borderWidth: 1.5,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
        }
      ]
    }
  }, [phaseTests])

  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            font: {
              family: 'inherit',
              size: 12,
              weight: 500
            },
            color: '#5b6574'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          titleColor: '#ffffff',
          bodyColor: 'var(--border-color)',
          padding: 12,
          boxPadding: 6,
          usePointStyle: true,
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          callbacks: {
            title: function (tooltipItems) {
              const idx = tooltipItems[0].dataIndex
              const pt = phaseTests[idx]
              return pt ? `${pt.phase_test_name}` : `Phase ${idx + 1}`
            },
            label: function (context) {
              if (context.datasetIndex === 1) {
                return ' Minimum Pass: 50%'
              }
              const idx = context.dataIndex
              const pt = phaseTests[idx]
              if (!pt || pt.percentage === null || pt.percentage === undefined) {
                return ` Status: ${pt?.status || 'No Marks Recorded'}`
              }
              return [
                ` Percentage: ${pt.percentage}%`,
                ` Score: ${pt.marks_obtained} / ${pt.max_marks} marks`,
                ` Grade: ${pt.grade || 'N/A'}`,
                ` Status: ${pt.status}`
              ]
            },
            afterBody: function (tooltipItems) {
              const idx = tooltipItems[0].dataIndex
              const pt = phaseTests[idx]
              if (pt && pt.date) {
                return `Date: ${new Date(pt.date).toLocaleDateString()}`
              }
              return ''
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(226, 232, 240, 0.6)',
            drawBorder: false
          },
          ticks: {
            color: '#5b6574',
            font: {
              family: 'inherit',
              size: 11,
              weight: 600
            }
          }
        },
        y: {
          min: 0,
          max: 100,
          grid: {
            color: 'rgba(226, 232, 240, 0.6)',
            drawBorder: false
          },
          ticks: {
            stepSize: 20,
            color: '#5b6574',
            font: {
              family: 'inherit',
              size: 11
            },
            callback: function (value) {
              return value + '%'
            }
          }
        }
      }
    }
  }, [phaseTests])

  if (loading) {
    return (
      <div className="card slaf-card p-4 text-center my-3">
        <div className="py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading Academic Progress...</span>
          </div>
          <p className="text-muted mt-2 mb-0 small">Retrieving Phase Test academic records...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card slaf-card p-4 my-3">
        <div className="alert alert-warning d-flex align-items-center mb-0 gap-2">
          <i className="bi bi-exclamation-triangle-fill fs-5"></i>
          <div>
            <strong>Notice:</strong> {error}
          </div>
        </div>
      </div>
    )
  }

  const hasPhaseTests = phaseTests && phaseTests.length > 0
  const hasCompletedTests = summary.completed_tests_count > 0

  return (
    <div className="academic-progress-container mb-4">
      {/* Section Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-primary px-2.5 py-1 text-uppercase fw-bold" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>
              Academic Profile
            </span>
            <h5 className="mb-0 text-dark fw-bold display-font">Academic Progress</h5>
          </div>
          <p className="text-muted small mb-0 mt-0.5">
            Phase Test assessment performance, chronological marks progression, and grading overview
          </p>
        </div>
        {hasPhaseTests && (
          <span className="badge bg-secondary-subtle text-dark border px-2.5 py-1 small fw-semibold">
            {phaseTests.length} {phaseTests.length === 1 ? 'Phase Test' : 'Phase Tests'} Recorded
          </span>
        )}
      </div>

      {/* KPI Performance Summary Cards */}
      <div className="row g-3 mb-4">
        {/* Completed Tests */}
        <div className="col-xl-2 col-md-4 col-6">
          <div className="card slaf-card p-3 h-100 border-start border-primary border-3 shadow-xs">
            <div className="d-flex align-items-center justify-content-between mb-1">
              <span className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.675rem' }}>
                Completed Tests
              </span>
              <i className="bi bi-clipboard-check text-primary fs-5"></i>
            </div>
            <div className="h4 mb-0 fw-bold text-dark">{summary.completed_tests_count || 0}</div>
            <span className="text-muted" style={{ fontSize: '0.725rem' }}>
              of {summary.total_tests_count || 0} Total Tests
            </span>
          </div>
        </div>

        {/* Passed Tests */}
        <div className="col-xl-2 col-md-4 col-6">
          <div className="card slaf-card p-3 h-100 border-start border-success border-3 shadow-xs">
            <div className="d-flex align-items-center justify-content-between mb-1">
              <span className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.675rem' }}>
                Passed Tests
              </span>
              <i className="bi bi-check-circle-fill text-success fs-5"></i>
            </div>
            <div className="h4 mb-0 fw-bold text-success">{summary.passed_tests_count || 0}</div>
            <span className="text-muted" style={{ fontSize: '0.725rem' }}>
              {summary.completed_tests_count > 0
                ? `${Math.round(((summary.passed_tests_count || 0) / summary.completed_tests_count) * 100)}% pass rate`
                : 'No tests taken'}
            </span>
          </div>
        </div>

        {/* Failed Tests */}
        <div className="col-xl-2 col-md-4 col-6">
          <div className="card slaf-card p-3 h-100 border-start border-danger border-3 shadow-xs">
            <div className="d-flex align-items-center justify-content-between mb-1">
              <span className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.675rem' }}>
                Failed Tests
              </span>
              <i className="bi bi-x-circle-fill text-danger fs-5"></i>
            </div>
            <div className="h4 mb-0 fw-bold text-danger">{summary.failed_tests_count || 0}</div>
            <span className="text-muted" style={{ fontSize: '0.725rem' }}>
              {summary.failed_tests_count > 0 ? 'Requires attention' : 'Zero failures'}
            </span>
          </div>
        </div>

        {/* Overall Average % */}
        <div className="col-xl-2 col-md-4 col-6">
          <div className="card slaf-card p-3 h-100 border-start border-info border-3 shadow-xs">
            <div className="d-flex align-items-center justify-content-between mb-1">
              <span className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.675rem' }}>
                Overall Average
              </span>
              <i className="bi bi-calculator text-info fs-5"></i>
            </div>
            <div className="h4 mb-0 fw-bold text-dark">
              {summary.average_percentage !== null && summary.average_percentage !== undefined
                ? `${summary.average_percentage}%`
                : 'N/A'}
            </div>
            <span className="text-muted" style={{ fontSize: '0.725rem' }}>
              Cumulative Phase Average
            </span>
          </div>
        </div>

        {/* Latest Phase Test % */}
        <div className="col-xl-2 col-md-4 col-6">
          <div className="card slaf-card p-3 h-100 border-start border-warning border-3 shadow-xs">
            <div className="d-flex align-items-center justify-content-between mb-1">
              <span className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.675rem' }}>
                Latest Test
              </span>
              <i className="bi bi-clock-history text-warning fs-5"></i>
            </div>
            <div className="h4 mb-0 fw-bold text-dark">
              {summary.latest_percentage !== null && summary.latest_percentage !== undefined
                ? `${summary.latest_percentage}%`
                : 'N/A'}
            </div>
            <span className="text-muted" style={{ fontSize: '0.725rem' }}>
              Most Recent Phase Test
            </span>
          </div>
        </div>

        {/* Highest / Lowest Range */}
        <div className="col-xl-2 col-md-4 col-6">
          <div className="card slaf-card p-3 h-100 border-start border-secondary border-3 shadow-xs">
            <div className="d-flex align-items-center justify-content-between mb-1">
              <span className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.675rem' }}>
                Highest / Lowest
              </span>
              <i className="bi bi-arrow-down-up text-secondary fs-5"></i>
            </div>
            <div className="d-flex align-items-baseline gap-1 mb-0">
              <span className="h5 mb-0 fw-bold text-success">
                {summary.highest_percentage !== null && summary.highest_percentage !== undefined
                  ? `${summary.highest_percentage}%`
                  : 'N/A'}
              </span>
              <span className="text-muted small">/</span>
              <span className="h6 mb-0 fw-semibold text-muted">
                {summary.lowest_percentage !== null && summary.lowest_percentage !== undefined
                  ? `${summary.lowest_percentage}%`
                  : 'N/A'}
              </span>
            </div>
            <span className="text-muted" style={{ fontSize: '0.725rem' }}>
              Performance Range
            </span>
          </div>
        </div>
      </div>

      {/* Main Visualization & Table Body */}
      {!hasPhaseTests ? (
        /* Empty State */
        <div className="card slaf-card p-5 text-center my-3">
          <div className="py-4">
            <div
              className="d-inline-flex bg-light text-muted rounded-circle align-items-center justify-content-center mb-3"
              style={{ width: '64px', height: '64px' }}
            >
              <i className="bi bi-mortarboard fs-2 text-secondary opacity-75"></i>
            </div>
            <h5 className="fw-bold text-dark mb-1">No Phase Test results available.</h5>
            <p className="text-muted small mx-auto mb-0" style={{ maxWidth: '420px' }}>
              There are currently no recorded Phase Test examination marks for this trainee in the database. Marks entered in the Examination & Assessment module will automatically populate here.
            </p>
          </div>
        </div>
      ) : (
        <div className="row g-4">
          {/* Line Chart Card */}
          <div className="col-12">
            <div className="card slaf-card p-4">
              <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
                <div>
                  <h6 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                    <i className="bi bi-graph-up text-primary"></i>
                    Phase Test Performance Progression
                  </h6>
                  <span className="text-muted small">
                    Chronological trend of marks percentage across Phase Tests (0–100% scale)
                  </span>
                </div>
                {hasCompletedTests && (
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2.5 py-1 fw-semibold small">
                      Avg: {summary.average_percentage}%
                    </span>
                  </div>
                )}
              </div>

              <div style={{ height: '280px', position: 'relative' }}>
                {chartData ? (
                  <Line data={chartData} options={chartOptions} />
                ) : (
                  <div className="d-flex align-items-center justify-content-center h-100 text-muted small">
                    Insufficient data for line chart visualization
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Phase Test Results Table */}
          <div className="col-12">
            <div className="card slaf-card p-0 shadow-xs">
              <div className="px-4 py-3 border-bottom d-flex justify-content-between align-items-center bg-light-subtle flex-wrap gap-2">
                <h6 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-table text-primary"></i>
                  Phase Test Results Breakdown
                </h6>
                <span className="text-muted small">
                  Showing {phaseTests.length} {phaseTests.length === 1 ? 'record' : 'records'}
                </span>
              </div>

              {/* Desktop Table View */}
              <div className="table-responsive d-none d-md-block">
                <table className="table slaf-table mb-0 align-middle">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }} className="text-center">#</th>
                      <th>Phase Test</th>
                      <th>Subject / Academic Area</th>
                      <th>Date</th>
                      <th className="text-center">Max Marks</th>
                      <th className="text-center">Obtained Marks</th>
                      <th style={{ minWidth: '130px' }}>Percentage</th>
                      <th className="text-center">Grade</th>
                      <th className="text-center">Status</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {phaseTests.map((pt, idx) => {
                      const isPass = pt.status === 'Pass' || (pt.marks_obtained !== null && pt.marks_obtained >= pt.pass_marks)
                      const isFail = pt.status === 'Fail' || (pt.marks_obtained !== null && pt.marks_obtained < pt.pass_marks)
                      const hasMarks = pt.percentage !== null && pt.percentage !== undefined

                      let statusBadgeClass = 'bg-secondary-subtle text-secondary border'
                      if (isPass) statusBadgeClass = 'bg-success-subtle text-success border border-success-subtle'
                      else if (isFail) statusBadgeClass = 'bg-danger-subtle text-danger border border-danger-subtle'
                      else if (pt.status === 'Absent' || pt.status?.includes('LEAVE') || pt.status?.includes('HOSPITAL')) {
                        statusBadgeClass = 'bg-warning-subtle text-warning border border-warning-subtle'
                      }

                      return (
                        <tr key={pt.exam_id || idx}>
                          <td className="text-center text-muted fw-semibold" style={{ fontSize: '0.85rem' }}>
                            {idx + 1}
                          </td>
                          <td>
                            <span className="fw-bold text-dark d-block">
                              {pt.phase_test_name || `Phase ${idx + 1}`}
                            </span>
                            <span className="text-muted small">{pt.exam_type}</span>
                          </td>
                          <td>
                            <span className="fw-semibold text-dark d-block">
                              {pt.subject_name || 'N/A'}
                            </span>
                            {pt.subject_code && (
                              <span className="badge bg-secondary-subtle text-dark border px-1.5 py-0.5" style={{ fontSize: '0.7rem' }}>
                                {pt.subject_code}
                              </span>
                            )}
                          </td>
                          <td>
                            <span className="text-dark small fw-medium">
                              {pt.date ? new Date(pt.date).toLocaleDateString() : 'N/A'}
                            </span>
                          </td>
                          <td className="text-center fw-semibold text-muted">
                            {pt.max_marks}
                          </td>
                          <td className="text-center">
                            {pt.marks_obtained !== null && pt.marks_obtained !== undefined ? (
                              <span className={`fw-bold ${isPass ? 'text-primary' : 'text-danger'}`}>
                                {pt.marks_obtained}
                              </span>
                            ) : (
                              <span className="text-muted fst-italic small">Not recorded</span>
                            )}
                          </td>
                          <td>
                            {hasMarks ? (
                              <div>
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                  <span className="fw-bold small">{pt.percentage}%</span>
                                </div>
                                <div className="progress" style={{ height: '6px' }}>
                                  <div
                                    className={`progress-bar ${pt.percentage >= 75
                                      ? 'bg-success'
                                      : pt.percentage >= 50
                                        ? 'bg-primary'
                                        : 'bg-danger'
                                      }`}
                                    role="progressbar"
                                    style={{ width: `${Math.min(100, Math.max(0, pt.percentage))}%` }}
                                    aria-valuenow={pt.percentage}
                                    aria-valuemin="0"
                                    aria-valuemax="100"
                                  ></div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted small">N/A</span>
                            )}
                          </td>
                          <td className="text-center">
                            {pt.grade ? (
                              <span className="badge bg-light text-dark border px-2 py-1 fw-semibold small">
                                {pt.grade}
                              </span>
                            ) : (
                              <span className="text-muted small">-</span>
                            )}
                          </td>
                          <td className="text-center">
                            <span className={`badge px-2.5 py-1 fw-semibold ${statusBadgeClass}`} style={{ fontSize: '0.75rem' }}>
                              {pt.status || 'Pending'}
                            </span>
                            {pt.is_overridden && (
                              <span className="d-block text-warning small mt-0.5" style={{ fontSize: '0.675rem' }}>
                                <i className="bi bi-shield-check"></i> Overridden
                              </span>
                            )}
                          </td>
                          <td>
                            <span className="text-muted small" style={{ maxWidth: '200px', display: 'inline-block' }}>
                              {pt.remarks || '-'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Phase Test Record Cards */}
              <div className="d-md-none p-2">
                {phaseTests.map((pt, idx) => {
                  const isPass = pt.status === 'Pass' || (pt.marks_obtained !== null && pt.marks_obtained >= pt.pass_marks)
                  const isFail = pt.status === 'Fail' || (pt.marks_obtained !== null && pt.marks_obtained < pt.pass_marks)
                  const hasMarks = pt.percentage !== null && pt.percentage !== undefined

                  let statusBadgeClass = 'bg-secondary-subtle text-secondary border'
                  if (isPass) statusBadgeClass = 'bg-success-subtle text-success border border-success-subtle'
                  else if (isFail) statusBadgeClass = 'bg-danger-subtle text-danger border border-danger-subtle'
                  else if (pt.status === 'Absent' || pt.status?.includes('LEAVE') || pt.status?.includes('HOSPITAL')) {
                    statusBadgeClass = 'bg-warning-subtle text-warning border border-warning-subtle'
                  }

                  return (
                    <div key={pt.exam_id || idx} className="mobile-record-card">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <span className="badge bg-primary-subtle text-primary border me-1.5">
                            Phase {idx + 1}
                          </span>
                          <strong className="text-dark">{pt.phase_test_name || `Phase ${idx + 1}`}</strong>
                          <span className="text-muted small d-block">{pt.exam_type}</span>
                        </div>
                        <span className={`badge px-2 py-0.5 fw-semibold ${statusBadgeClass}`} style={{ fontSize: '0.75rem' }}>
                          {pt.status || 'Pending'}
                        </span>
                      </div>

                      <div className="mb-2">
                        <span className="fw-semibold text-dark small">{pt.subject_name || 'N/A'}</span>
                        {pt.subject_code && (
                          <span className="badge bg-secondary-subtle text-dark border px-1.5 py-0.5 ms-1.5" style={{ fontSize: '0.675rem' }}>
                            {pt.subject_code}
                          </span>
                        )}
                        <span className="text-muted small d-block mt-0.5">
                          <i className="bi bi-calendar3 me-1"></i>{pt.date ? new Date(pt.date).toLocaleDateString() : 'Date N/A'}
                        </span>
                      </div>

                      <div className="d-flex justify-content-between align-items-center bg-light p-2 rounded mb-2 flex-wrap gap-2">
                        <div>
                          <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>SCORE</small>
                          <strong className={isPass ? 'text-primary' : isFail ? 'text-danger' : 'text-dark'}>
                            {pt.marks_obtained !== null && pt.marks_obtained !== undefined ? `${pt.marks_obtained} / ${pt.max_marks}` : 'N/A'}
                          </strong>
                        </div>
                        <div>
                          <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>PERCENTAGE</small>
                          <strong className="text-dark">{hasMarks ? `${pt.percentage}%` : 'N/A'}</strong>
                        </div>
                        <div>
                          <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>GRADE</small>
                          <strong className="text-dark">{pt.grade || '-'}</strong>
                        </div>
                      </div>

                      {hasMarks && (
                        <div className="progress mb-2" style={{ height: '6px' }}>
                          <div
                            className={`progress-bar ${pt.percentage >= 75
                              ? 'bg-success'
                              : pt.percentage >= 50
                                ? 'bg-primary'
                                : 'bg-danger'
                              }`}
                            role="progressbar"
                            style={{ width: `${Math.min(100, Math.max(0, pt.percentage))}%` }}
                            aria-valuenow={pt.percentage}
                            aria-valuemin="0"
                            aria-valuemax="100"
                          ></div>
                        </div>
                      )}

                      {pt.remarks && (
                        <div className="small text-muted border-top pt-1 mt-1">
                          <span className="fst-italic">{pt.remarks}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AcademicProgress
