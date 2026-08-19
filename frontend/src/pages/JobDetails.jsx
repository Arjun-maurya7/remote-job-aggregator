import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  DollarSign,
  ExternalLink,
  Briefcase,
  Layers,
  Building2,
  Clock,
  ServerOff,
} from 'lucide-react';

import { getJobById } from '../services/api';
import { Loading } from '../components/Loading';
import { decodeHTMLEntities, formatDate, formatSalary } from '../utils/format';

/**
 * JobDetails Page Component
 *
 * Route: /jobs/:id
 * Displays detailed job information in a 2-column desktop / 1-column mobile layout.
 * Sanitizes HTML job descriptions using DOMPurify.
 */
export function JobDetails() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    async function loadJob() {
      setLoading(true);
      setError(null);

      try {
        const data = await getJobById(id);
        setJob(data);
      } catch (err) {
        setError(err.message || 'Job not found');
      } finally {
        setLoading(false);
      }
    }

    loadJob();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  if (loading) {
    return (
      <div className="main-container max-w-4xl py-12">
        <Loading />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="main-container max-w-4xl py-12">
        <Link to="/" className="back-link">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to dashboard</span>
        </Link>
        <div className="status-card">
          <div className="status-icon-wrapper error">
            <ServerOff className="w-8 h-8" />
          </div>
          <h3 className="status-title">Job Not Found</h3>
          <p className="status-desc">{error}</p>
          <Link to="/" className="btn-primary">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const decodedTitle = decodeHTMLEntities(job.title);
  const decodedCompany = decodeHTMLEntities(job.company);
  const decodedLocation = decodeHTMLEntities(job.location);
  const companyLogoUrl = job.company_logo || job.companyLogo;
  const companyInitial = decodedCompany ? decodedCompany.charAt(0).toUpperCase() : 'J';

  // DOMPurify Sanitization of raw Jobicy description
  const sanitizedHTML = DOMPurify.sanitize(job.description || '<p>No job description provided.</p>');

  return (
    <div className="app-shell">
      <main className="job-details-page">
        <Link to="/" className="back-link">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to all jobs</span>
        </Link>

        <div className="details-grid">
          {/* Main Description Column */}
          <div className="details-main">
            <div className="mb-6 flex items-start gap-4">
              <div className="company-logo-container w-14 h-14">
                {companyLogoUrl && !logoError ? (
                  <img
                    src={companyLogoUrl}
                    alt={`${decodedCompany} logo`}
                    className="company-logo-img"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="company-logo-fallback">{companyInitial}</div>
                )}
              </div>
              <div>
                <span className="badge badge-indigo mb-2 inline-block">
                  Jobicy Listing #{job.source_job_id}
                </span>
                <h1 className="text-2xl font-bold text-slate-900 leading-tight">
                  {decodedTitle}
                </h1>
                <p className="text-sm font-medium text-slate-600 mt-1">
                  {decodedCompany} {decodedLocation ? `• ${decodedLocation}` : ''}
                </p>
              </div>
            </div>

            <div className="border-t border-b border-slate-100 py-4 my-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Published: {formatDate(job.published_at)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Fetched: {formatDate(job.fetched_at)}</span>
              </div>
            </div>

            <div className="description-section">
              <h2 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
                Job Description
              </h2>
              <div
                className="prose-content"
                dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
              />
            </div>
          </div>

          {/* Sidebar Overview Column */}
          <div className="details-sidebar">
            <div className="sidebar-card">
              <h3 className="sidebar-title">Job Overview</h3>

              <div className="sidebar-meta-list">
                <div className="sidebar-meta-item">
                  <div className="sidebar-icon-box">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="sidebar-label">Salary Range</div>
                    <div className="sidebar-val">{formatSalary(job)}</div>
                  </div>
                </div>

                <div className="sidebar-meta-item">
                  <div className="sidebar-icon-box">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="sidebar-label">Location</div>
                    <div className="sidebar-val">{decodedLocation || 'Remote'}</div>
                  </div>
                </div>

                <div className="sidebar-meta-item">
                  <div className="sidebar-icon-box">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="sidebar-label">Employment Type</div>
                    <div className="sidebar-val">
                      {(job.employment_type || []).map(decodeHTMLEntities).join(', ') || 'Full-Time'}
                    </div>
                  </div>
                </div>

                <div className="sidebar-meta-item">
                  <div className="sidebar-icon-box">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="sidebar-label">Industry</div>
                    <div className="sidebar-val">
                      {(job.industry || []).map(decodeHTMLEntities).join(', ') || 'General'}
                    </div>
                  </div>
                </div>

                <div className="sidebar-meta-item">
                  <div className="sidebar-icon-box">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="sidebar-label">Experience Level</div>
                    <div className="sidebar-val">
                      {decodeHTMLEntities(job.job_level) || 'All levels'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary w-full justify-center py-3 text-sm"
                  aria-label={`Apply for ${decodedTitle} on original Jobicy listing`}
                >
                  <span>Apply / View Original Job ↗</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
